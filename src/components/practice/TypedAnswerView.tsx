import { useState } from 'react';
import type { FormEvent } from 'react';
import { checkTypedAnswer } from '../../lib/answerCheck';
import { LANGUAGE_NAMES, answerSide, answerText } from '../../lib/practice';
import type { AnswerOutcome, PracticeCard } from '../../types';
import { CardPrompt } from './CardPrompt';

interface Props {
  card: PracticeCard;
  /** Outcome once answered (may be overridden by the user). */
  outcome: AnswerOutcome | null;
  onAnswer: (outcome: AnswerOutcome, userAnswer: string, note?: string) => void;
}

const INPUT_CLASS: Record<AnswerOutcome, string> = {
  correct: 'is-correct',
  close: 'is-close',
  incorrect: 'is-wrong',
};

/** The user types the translation; it's checked with typo tolerance. */
export function TypedAnswerView({ card, outcome, onAnswer }: Props) {
  const [value, setValue] = useState('');
  const answered = outcome !== null;
  const targetLang = LANGUAGE_NAMES[answerSide(card.direction)];

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (answered || !value.trim()) return;
    const result = checkTypedAnswer(value, answerText(card));
    onAnswer(result.outcome, value, result.note);
  };

  return (
    <div className="stack">
      <div className="card">
        <CardPrompt card={card} />
        <form className="typed-form" onSubmit={handleSubmit}>
          <input
            className={`input input-lg${outcome ? ` ${INPUT_CLASS[outcome]}` : ''}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Type the ${targetLang} translation…`}
            aria-label={`${targetLang} translation`}
            lang={card.direction === 'es-en' ? 'en' : 'es'}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            readOnly={answered}
          />
          {!answered && (
            <button type="submit" className="btn btn-primary btn-lg" disabled={!value.trim()}>
              Check
            </button>
          )}
        </form>
        {!answered && (
          <div className="row row-between" style={{ marginTop: '0.75rem' }}>
            <span className="shortcut-hint">
              <kbd>Enter</kbd> to check · accents & small typos are tolerated
              {answerSide(card.direction) === 'spanish' && ' · include the article for nouns'}
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onAnswer('incorrect', '')}>
              I don't know
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
