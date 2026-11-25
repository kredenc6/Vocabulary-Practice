import { useState } from 'react';
import { useUser } from '../context/auth';
import { useWords } from '../context/words';
import { useToast } from '../context/toasts';
import { loadSettings, makeCard, saveSettings, shuffle } from '../lib/practice';
import { saveSession } from '../services/statsRepo';
import type { CardResult, PracticeCard, PracticeSettings, VocabWord } from '../types';
import { PracticeSetup } from '../components/practice/PracticeSetup';
import { PracticeSession } from '../components/practice/PracticeSession';
import { SessionSummary } from '../components/practice/SessionSummary';

type Phase =
  | { name: 'setup' }
  | { name: 'session'; id: number; cards: PracticeCard[]; startedAt: number }
  | { name: 'summary'; results: CardResult[] };

interface Props {
  active: boolean;
  onGoToVocabulary: () => void;
  onGoToExcluded: () => void;
}

export function PracticePage({ active, onGoToVocabulary, onGoToExcluded }: Props) {
  const user = useUser();
  const notify = useToast();
  const { draftWords, excludedWords, practiceWords } = useWords();
  const [settings, setSettings] = useState<PracticeSettings>(loadSettings);
  const [phase, setPhase] = useState<Phase>({ name: 'setup' });

  const changeSettings = (next: PracticeSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const start = (selected: VocabWord[], shuffleOrder = false) => {
    // Resolve old session results against the current practice list.
    const byId = new Map(practiceWords.map((word) => [word.id, word]));
    const eligible = selected.flatMap((word) => byId.get(word.id) ?? []);
    if (eligible.length === 0) return;
    const ordered = shuffleOrder ? shuffle(eligible) : eligible;
    setPhase({
      name: 'session',
      id: Date.now(),
      cards: ordered.map((w) => makeCard(w, settings, practiceWords)),
      startedAt: Date.now(),
    });
    window.scrollTo({ top: 0 });
  };

  const finish = (results: CardResult[]) => {
    if (phase.name !== 'session') return;
    if (results.length > 0) {
      saveSession(user.uid, {
        startedAt: phase.startedAt,
        endedAt: Date.now(),
        direction: settings.direction,
        modes: settings.modes,
        total: results.length,
        correct: results.filter((r) => r.outcome !== 'incorrect').length,
      }).catch((err) => {
        console.error('Failed to save session', err);
        notify({ type: 'error', message: 'Could not save the session summary. Your individual answers are saved separately.' });
      });
    }
    setPhase({ name: 'summary', results });
  };

  if (phase.name === 'setup' && practiceWords.length === 0) {
    const hasExcluded = excludedWords.length > 0;
    const hasDrafts = draftWords.length > 0;
    return (
      <div className="card empty-state">
        <div className="emoji" aria-hidden="true">
          📚
        </div>
        <h2>{hasExcluded || hasDrafts ? 'No words ready to practice' : 'Your vocabulary is empty'}</h2>
        <p>
          {hasExcluded
            ? 'Return words from Excluded or add new words to practice.'
            : hasDrafts
              ? 'Complete your drafts to make them available for practice.'
              : 'Add some Spanish–English word pairs or import a CSV file to start practicing.'}
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          {hasExcluded && (
            <button type="button" className="btn btn-secondary" onClick={onGoToExcluded}>
              Open excluded words
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={onGoToVocabulary}>
            Add words
          </button>
        </div>
      </div>
    );
  }

  switch (phase.name) {
    case 'session':
      return (
        <PracticeSession
          key={phase.id}
          initialCards={phase.cards}
          settings={settings}
          active={active}
          onFinish={finish}
        />
      );
    case 'summary':
      return (
        <SessionSummary
          results={phase.results}
          practiceWords={practiceWords}
          onReviewMistakes={(missed) => start(missed, true)}
          onDone={() => setPhase({ name: 'setup' })}
        />
      );
    case 'setup':
      return (
        <>
          <div className="page-header">
            <div>
              <h1>Practice</h1>
              <p>Choose how you want to practice, then start a session.</p>
            </div>
          </div>
          <PracticeSetup words={practiceWords} settings={settings} onChange={changeSettings} onStart={(s) => start(s)} />
        </>
      );
  }
}
