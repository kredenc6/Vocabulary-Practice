import { useState } from 'react';
import { useHotkeys } from '../../hooks/useHotkeys';
import { LANGUAGE_NAMES, answerSide, answerText, promptSide, promptText } from '../../lib/practice';
import type { PracticeCard } from '../../types';

interface Props {
  card: PracticeCard;
  active: boolean;
  onRate: (knewIt: boolean) => void;
}

/** Show a word, let the user recall the translation, flip and self-rate. */
export function FlashcardView({ card, active, onRate }: Props) {
  const [flipped, setFlipped] = useState(false);

  useHotkeys(active, (event) => {
    if (!flipped && (event.key === ' ' || event.key === 'Enter')) {
      event.preventDefault();
      setFlipped(true);
    } else if (flipped && (event.key === '1' || event.key === 'ArrowLeft')) {
      onRate(false);
    } else if (flipped && (event.key === '2' || event.key === 'ArrowRight')) {
      onRate(true);
    }
  });

  const answerLang = answerSide(card.direction);

  return (
    <div className="stack">
      <button
        type="button"
        className={`flashcard${flipped ? ' flipped' : ''}`}
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? 'Show the question side' : 'Flip the card to reveal the translation'}
      >
        <div className="flashcard-inner">
          <div className="flashcard-face" aria-hidden={flipped}>
            <div className="prompt-lang">{LANGUAGE_NAMES[promptSide(card.direction)]}</div>
            <div className="prompt-word">{promptText(card)}</div>
            <div className="flashcard-hint">Recall the translation, then tap to flip</div>
          </div>
          <div className="flashcard-face flashcard-back" aria-hidden={!flipped}>
            <div className="prompt-lang">{LANGUAGE_NAMES[answerLang]}</div>
            <div className="prompt-word">{answerText(card)}</div>
            <div className="flashcard-hint">{promptText(card)}</div>
          </div>
        </div>
      </button>

      {flipped ? (
        <>
          <div className="rate-buttons">
            <button type="button" className="btn btn-lg btn-secondary" onClick={() => onRate(false)}>
              ✗ I didn't know it
            </button>
            <button type="button" className="btn btn-lg btn-good" onClick={() => onRate(true)}>
              ✓ I knew it
            </button>
          </div>
          <p className="shortcut-hint">
            <kbd>1</kbd> didn't know · <kbd>2</kbd> knew it
          </p>
        </>
      ) : (
        <>
          <button type="button" className="btn btn-lg btn-primary btn-block" onClick={() => setFlipped(true)}>
            Show answer
          </button>
          <p className="shortcut-hint">
            <kbd>Space</kbd> to flip
          </p>
        </>
      )}
    </div>
  );
}
