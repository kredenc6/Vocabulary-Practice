import { useMemo } from 'react';
import { DIRECTION_LABELS, MODE_LABELS, canUseMultipleChoice, selectWords } from '../../lib/practice';
import { isDue, wordStatus } from '../../lib/srs';
import type { PracticeDirection, PracticeMode, PracticeSettings, VocabWord, WordSource } from '../../types';

interface Props {
  words: VocabWord[];
  settings: PracticeSettings;
  onChange: (settings: PracticeSettings) => void;
  onStart: (selected: VocabWord[]) => void;
}

const MODE_DESCRIPTIONS: Record<PracticeMode, string> = {
  flashcard: 'Recall, flip, rate yourself',
  'multiple-choice': 'Pick from 4 options',
  typed: 'Type the translation',
};

const SOURCE_OPTIONS: { value: WordSource; label: string; description: string }[] = [
  { value: 'due', label: 'Due for review', description: 'Spaced repetition schedule' },
  { value: 'weakest', label: 'Weakest words', description: 'Lowest success rate first' },
  { value: 'random', label: 'Random', description: 'Any words, practice ahead' },
];

const DIRECTIONS: PracticeDirection[] = ['es-en', 'en-es', 'mixed'];
const MODES: PracticeMode[] = ['flashcard', 'multiple-choice', 'typed'];
const SIZES = [10, 20, 30, 50];

export function PracticeSetup({ words, settings, onChange, onStart }: Props) {
  const counts = useMemo(() => {
    const now = Date.now();
    let due = 0;
    let fresh = 0;
    for (const w of words) {
      if (isDue(w, now)) due++;
      if (wordStatus(w) === 'new') fresh++;
    }
    return { due, fresh };
  }, [words]);

  const selected = useMemo(
    () => selectWords(words, settings.source, settings.sessionSize),
    [words, settings.source, settings.sessionSize],
  );

  const mcAvailable = canUseMultipleChoice(words);
  const update = (patch: Partial<PracticeSettings>) => onChange({ ...settings, ...patch });

  const toggleMode = (mode: PracticeMode) => {
    const modes = settings.modes.includes(mode)
      ? settings.modes.filter((m) => m !== mode)
      : [...settings.modes, mode];
    update({ modes });
  };

  const usableModes = settings.modes.filter((m) => m !== 'multiple-choice' || mcAvailable);
  const canStart = selected.length > 0 && usableModes.length > 0;

  return (
    <div className="stack">
      <div className="card due-banner">
        <div>
          <div className="due-number">{counts.due}</div>
          <div className="muted">words due now</div>
        </div>
        <div className="due-meta">
          <div>
            <strong>{words.length}</strong>total words
          </div>
          <div>
            <strong>{counts.fresh}</strong>not yet practiced
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          style={{ marginLeft: 'auto' }}
          disabled={!canStart}
          onClick={() => onStart(selected)}
        >
          Start practice ({selected.length})
        </button>
      </div>

      {settings.source === 'due' && counts.due === 0 && (
        <div className="alert alert-success">
          🎉 You're all caught up! Nothing is due right now. Choose <strong>Weakest words</strong> or{' '}
          <strong>Random</strong> to keep practicing.
        </div>
      )}

      <div className="card">
        <div className="settings-section">
          <span className="field-label">Direction</span>
          <div className="option-group" role="radiogroup" aria-label="Direction">
            {DIRECTIONS.map((d) => (
              <label key={d} className="option">
                <input
                  type="radio"
                  name="direction"
                  checked={settings.direction === d}
                  onChange={() => update({ direction: d })}
                />
                {d === 'mixed' ? 'Random mix' : DIRECTION_LABELS[d]}
              </label>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <span className="field-label">Practice modes (choose one or mix several)</span>
          <div className="option-group">
            {MODES.map((m) => (
              <label key={m} className="option">
                <input type="checkbox" checked={settings.modes.includes(m)} onChange={() => toggleMode(m)} />
                <span>
                  {MODE_LABELS[m]}
                  <span className="option-desc">{MODE_DESCRIPTIONS[m]}</span>
                </span>
              </label>
            ))}
          </div>
          {settings.modes.length === 0 && <p className="small" style={{ color: 'var(--bad-text)' }}>Select at least one mode.</p>}
          {settings.modes.includes('multiple-choice') && !mcAvailable && (
            <p className="small muted">
              Multiple choice needs at least 4 different words – {usableModes.length ? 'other modes will be used' : 'add more words'}.
            </p>
          )}
        </div>

        <div className="settings-section">
          <span className="field-label">Words</span>
          <div className="option-group" role="radiogroup" aria-label="Word source">
            {SOURCE_OPTIONS.map((s) => (
              <label key={s.value} className="option">
                <input
                  type="radio"
                  name="source"
                  checked={settings.source === s.value}
                  onChange={() => update({ source: s.value })}
                />
                <span>
                  {s.label}
                  <span className="option-desc">{s.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <div className="row" style={{ gap: '1.5rem' }}>
            <label className="field">
              <span className="field-label">Session size</span>
              <select
                className="input"
                value={settings.sessionSize}
                onChange={(e) => update({ sessionSize: Number(e.target.value) })}
              >
                {SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n} words
                  </option>
                ))}
              </select>
            </label>
            <label className="option" style={{ alignSelf: 'flex-end' }}>
              <input
                type="checkbox"
                checked={settings.repeatMistakes}
                onChange={(e) => update({ repeatMistakes: e.target.checked })}
              />
              Repeat missed words at the end
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
