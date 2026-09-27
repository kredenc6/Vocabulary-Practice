import { useState } from 'react';
import { useHotkeys } from '../../hooks/useHotkeys';
import { LANGUAGE_NAMES, answerSide, answerText, promptSide, promptText } from '../../lib/practice';
import type { PracticeCard } from '../../types';

export type FlashcardRating = 'unknown' | 'close' | 'known';

interface Props {
  card: PracticeCard;
  active: boolean;
  /** "I was close" was already used for this word in the session, so it now counts as not known. */
  closeCountsAsMiss: boolean;
  onRate: (rating: FlashcardRating) => void;
}

/** Show a word, let the user recall the translation, flip and self-rate. */
export function FlashcardView({ card, active, closeCountsAsMiss, onRate }: Props) {
  const [flipped, setFlipped] = useState(false);

  useHotkeys(active, (event) => {
    if (!flipped && (event.key === ' ' || event.key === 'Enter')) {
      event.preventDefault();
      setFlipped(true);
    } else if (flipped && (event.key === '1' || event.key === 'ArrowLeft')) {
      onRate('unknown');
    } else if (flipped && (event.key === '2' || event.key === 'ArrowDown')) {
      onRate('close');
    } else if (flipped && (event.key === '3' || event.key === 'ArrowRight')) {
      onRate('known');
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
            <button type="button" className="btn btn-lg btn-secondary" onClick={() => onRate('unknown')}>
              ✗ I didn't know it
            </button>
            <button type="button" className="btn btn-lg btn-close" onClick={() => onRate('close')}>
              ≈ I was close
            </button>
            <button type="button" className="btn btn-lg btn-good" onClick={() => onRate('known')}>
              ✓ I knew it
            </button>
          </div>
          <p className="shortcut-hint">
            <kbd>1</kbd> didn't know · <kbd>2</kbd> close · <kbd>3</kbd> knew it
          </p>
          {closeCountsAsMiss && (
            <p className="shortcut-hint">"I was close" was already used for this word – this time it counts as "I didn't know it".</p>
          )}
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
