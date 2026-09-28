import { useState } from 'react';
import { useUser } from '../context/auth';
import { useWords } from '../context/words';
import { loadSettings, makeCard, saveSettings, shuffle } from '../lib/practice';
import { isComplete } from '../lib/wordValidation';
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
}

export function PracticePage({ active, onGoToVocabulary }: Props) {
  const user = useUser();
  // Drafts never reach practice: everything below works on complete words only.
  const { words, practiceWords } = useWords();
  const [settings, setSettings] = useState<PracticeSettings>(loadSettings);
  const [phase, setPhase] = useState<Phase>({ name: 'setup' });

  const changeSettings = (next: PracticeSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const start = (selected: VocabWord[], shuffleOrder = false) => {
    // A word may have become a draft since it was selected (e.g. "Review missed words").
    const complete = selected.filter(isComplete);
    if (complete.length === 0) return;
    const ordered = shuffleOrder ? shuffle(complete) : complete;
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
      }).catch((err) => console.error('Failed to save session', err));
    }
    setPhase({ name: 'summary', results });
  };

  if (practiceWords.length === 0) {
    const drafts = words.length;
    return (
      <div className="card empty-state">
        <div className="emoji" aria-hidden="true">
          📚
        </div>
        <h2>{drafts ? 'No words ready to practice' : 'Your vocabulary is empty'}</h2>
        <p>
          {drafts
            ? `All ${drafts} of your words are drafts (missing translation, word type or article) and can't be practiced yet.`
            : 'Add some Spanish–English word pairs or import a CSV file to start practicing.'}
        </p>
        <button type="button" className="btn btn-primary" onClick={onGoToVocabulary}>
          Add words
        </button>
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
