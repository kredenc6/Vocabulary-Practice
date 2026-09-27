import { useState } from 'react';
import { useUser } from '../context/auth';
import { useWords } from '../context/words';
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
}

export function PracticePage({ active, onGoToVocabulary }: Props) {
  const user = useUser();
  const { words } = useWords();
  const [settings, setSettings] = useState<PracticeSettings>(loadSettings);
  const [phase, setPhase] = useState<Phase>({ name: 'setup' });

  const changeSettings = (next: PracticeSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const start = (selected: VocabWord[], shuffleOrder = false) => {
    const ordered = shuffleOrder ? shuffle(selected) : selected;
    setPhase({
      name: 'session',
      id: Date.now(),
      cards: ordered.map((w) => makeCard(w, settings, words)),
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

  if (words.length === 0) {
    return (
      <div className="card empty-state">
        <div className="emoji" aria-hidden="true">
          📚
        </div>
        <h2>Your vocabulary is empty</h2>
        <p>Add some Spanish–English word pairs or import a CSV file to start practicing.</p>
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
          <PracticeSetup words={words} settings={settings} onChange={changeSettings} onStart={(s) => start(s)} />
        </>
      );
  }
}
