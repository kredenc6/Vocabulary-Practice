import { Suspense, lazy, useMemo } from 'react';
import { useAuth, useUser } from '../context/auth';
import { useWords } from '../context/words';
import { useHashTab } from '../hooks/useHashTab';
import { isDue } from '../lib/srs';
import { DraftsPage } from '../pages/DraftsPage';
import { PracticePage } from '../pages/PracticePage';
import { VocabularyPage } from '../pages/VocabularyPage';
import { Spinner } from './Spinner';

// Statistics (and the charting library) load only when the tab is opened.
const StatsPage = lazy(() => import('../pages/StatsPage').then((m) => ({ default: m.StatsPage })));

const TABS = ['practice', 'vocabulary', 'drafts', 'stats'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  practice: 'Practice',
  vocabulary: 'Vocabulary',
  drafts: 'Drafts',
  stats: 'Statistics',
};

function UserMenu() {
  const user = useUser();
  const { signOut } = useAuth();
  const name = user.displayName ?? user.email ?? 'Account';

  return (
    <div className="user-menu">
      {user.photoURL ? (
        <img className="avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
      ) : (
        <span className="avatar" aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="user-name small">{name}</span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => void signOut()}>
        Sign out
      </button>
    </div>
  );
}

export function AppShell() {
  const [tab, setTab] = useHashTab(TABS, 'practice');
  const { practiceWords, draftWords, loading, error } = useWords();
  const draftCount = draftWords.length;
  const dueCount = useMemo(() => {
    const now = Date.now();
    return practiceWords.filter((w) => isDue(w, now)).length;
  }, [practiceWords]);

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              ES
            </span>
            <span>Vocab Practice</span>
          </div>
          <nav className="nav-tabs" aria-label="Main">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                className="nav-tab"
                aria-current={tab === t ? 'page' : undefined}
                onClick={() => setTab(t)}
              >
                {TAB_LABELS[t]}
                {t === 'practice' && dueCount > 0 && (
                  <span className="nav-count" aria-label={`${dueCount} due`}>
                    {dueCount > 99 ? '99+' : dueCount}
                  </span>
                )}
                {t === 'drafts' && draftCount > 0 && (
                  <span className="nav-count nav-count-muted" aria-label={`${draftCount} drafts`}>
                    {draftCount > 99 ? '99+' : draftCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <UserMenu />
        </div>
      </header>

      <main className="container">
        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}
        {loading ? (
          <div className="center-screen">
            <Spinner label="Loading your vocabulary…" />
          </div>
        ) : (
          <>
            {/* Practice stays mounted so a running session survives tab switches. */}
            <div hidden={tab !== 'practice'}>
              <PracticePage active={tab === 'practice'} onGoToVocabulary={() => setTab('vocabulary')} />
            </div>
            {tab === 'vocabulary' && <VocabularyPage onGoToDrafts={() => setTab('drafts')} />}
            {tab === 'drafts' && <DraftsPage onGoToVocabulary={() => setTab('vocabulary')} />}
            {tab === 'stats' && (
              <Suspense fallback={<Spinner label="Loading statistics…" />}>
                <StatsPage />
              </Suspense>
            )}
          </>
        )}
      </main>
    </>
  );
}
