import type { AnswerOutcome } from '../../types';

interface Props {
  outcome: AnswerOutcome;
  correctAnswer: string;
  note?: string;
  /** Offer "I was right" to accept an answer the checker rejected (e.g. a synonym). */
  canOverride: boolean;
  onOverride: () => void;
  onNext: () => void;
  isLast: boolean;
}

const HEADLINES: Record<AnswerOutcome, { icon: string; text: string }> = {
  correct: { icon: '✓', text: 'Correct!' },
  close: { icon: '≈', text: 'Close enough' },
  incorrect: { icon: '✗', text: 'Not quite' },
};

export function FeedbackBar({ outcome, correctAnswer, note, canOverride, onOverride, onNext, isLast }: Props) {
  const { icon, text } = HEADLINES[outcome];
  return (
    <div className={`feedback feedback-${outcome}`} role="status">
      <div>
        <div>
          <span className="feedback-icon" aria-hidden="true">
            {icon}
          </span>
          {text}
          {note && <span className="small"> {note}</span>}
        </div>
        <div className="small">
          {outcome === 'correct' ? 'Answer' : 'Correct answer'}: <strong>{correctAnswer}</strong>
        </div>
      </div>
      <div className="row">
        {canOverride && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onOverride}>
            I was right
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={onNext} autoFocus>
          {isLast ? 'Finish' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
