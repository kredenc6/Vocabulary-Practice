import { Suspense, lazy, useLayoutEffect, useMemo, useRef } from 'react';
import { useAuth, useUser } from '../context/auth';
import { useWords } from '../context/words';
import { useHashTab } from '../hooks/useHashTab';
import { isDue } from '../lib/srs';
import { DraftsPage } from '../pages/DraftsPage';
import { ExcludedPage } from '../pages/ExcludedPage';
import { PracticePage } from '../pages/PracticePage';
import { VocabularyPage } from '../pages/VocabularyPage';
import { Spinner } from './Spinner';
import { ToastMessage } from './ToastMessage';
import { useToast } from '../context/toasts';

// Statistics (and the charting library) load only when the tab is opened.
const StatsPage = lazy(() => import('../pages/StatsPage').then((m) => ({ default: m.StatsPage })));

const TABS = ['practice', 'vocabulary', 'drafts', 'excluded', 'stats'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  practice: 'Practice',
  vocabulary: 'Vocabulary',
  drafts: 'Drafts',
  excluded: 'Excluded',
  stats: 'Statistics',
};

function UserMenu() {
  const user = useUser();
  const { signOut } = useAuth();
  const notify = useToast();
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
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => void signOut().catch(() => notify({ type: 'error', message: 'Could not sign out. Please try again.' }))}
      >
        Sign out
      </button>
    </div>
  );
}

export function AppShell() {
  const [tab, setTab] = useHashTab(TABS, 'practice');
  const scrollPositions = useRef<Partial<Record<Tab, number>>>({});
  const activeTab = useRef(tab);
  const { practiceWords, draftWords, excludedWords, loading, error } = useWords();
  const draftCount = draftWords.length;
  const excludedCount = excludedWords.length;
  const dueCount = useMemo(() => {
    const now = Date.now();
    return practiceWords.filter((w) => isDue(w, now)).length;
  }, [practiceWords]);

  useLayoutEffect(() => {
    activeTab.current = tab;
    window.scrollTo({ top: scrollPositions.current[tab] ?? 0, behavior: 'auto' });
  }, [tab]);

  useLayoutEffect(() => {
    const rememberPosition = () => {
      scrollPositions.current[activeTab.current] = window.scrollY;
    };
    window.addEventListener('scroll', rememberPosition, { passive: true });
    return () => window.removeEventListener('scroll', rememberPosition);
  }, []);

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
                {t === 'excluded' && excludedCount > 0 && (
                  <span className="nav-count nav-count-muted" aria-label={`${excludedCount} excluded`}>
                    {excludedCount > 99 ? '99+' : excludedCount}
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
          <ToastMessage type="error" message={error} />
        )}
        {loading ? (
          <div className="center-screen">
            <Spinner label="Loading your vocabulary…" />
          </div>
        ) : (
          <>
            {/* Practice stays mounted so a running session survives tab switches. */}
            <div hidden={tab !== 'practice'}>
              <PracticePage
                active={tab === 'practice'}
                onGoToVocabulary={() => setTab('vocabulary')}
                onGoToExcluded={() => setTab('excluded')}
              />
            </div>
            {tab === 'vocabulary' && (
              <VocabularyPage onGoToDrafts={() => setTab('drafts')} onGoToExcluded={() => setTab('excluded')} />
            )}
            {tab === 'drafts' && <DraftsPage onGoToVocabulary={() => setTab('vocabulary')} />}
            {tab === 'excluded' && (
              <ExcludedPage onGoToVocabulary={() => setTab('vocabulary')} onGoToDrafts={() => setTab('drafts')} />
            )}
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
