import { useRef, useState } from 'react';
import { useWords } from '../../context/words';
import { DIRECTION_LABELS, MODE_LABELS, answerSide, makeCard, repeatCard } from '../../lib/practice';
import { WordSide } from '../SpanishWord';
import type { AnswerOutcome, CardResult, PracticeCard, PracticeSettings, VocabWord } from '../../types';
import { FeedbackBar } from './FeedbackBar';
import { FlashcardView } from './FlashcardView';
import type { FlashcardRating } from './FlashcardView';
import { MultipleChoiceView } from './MultipleChoiceView';
import { TypedAnswerView } from './TypedAnswerView';

interface PendingAnswer {
  outcome: AnswerOutcome;
  userAnswer?: string;
  note?: string;
}

interface Props {
  initialCards: PracticeCard[];
  settings: PracticeSettings;
  /** False while the practice tab is hidden – disables keyboard shortcuts. */
  active: boolean;
  onFinish: (results: CardResult[]) => void;
}

/** How often a missed word is re-asked within one session. */
const MAX_REPEATS_PER_WORD = 2;

export function PracticeSession({ initialCards, settings, active, onFinish }: Props) {
  // Complete words only: a word that became a draft mid-session is no longer recorded or re-asked.
  const { practiceWords, recordReview } = useWords();
  const [queue, setQueue] = useState(initialCards);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<CardResult[]>([]);
  const [pending, setPending] = useState<PendingAnswer | null>(null);

  /** Latest SRS state of words answered in this session (ahead of the Firestore snapshot). */
  const latest = useRef(new Map<string, VocabWord>());
  const repeats = useRef(new Map<string, number>());
  /** Words already rated "I was close" in this session. Lives only as long as the session. */
  const closeUsed = useRef(new Set<string>());

  const card = queue[index];

  /** Save the answer to the word's SRS state and move to the next card. */
  const commit = (answer: PendingAnswer) => {
    const stored = practiceWords.find((w) => w.id === card.word.id);
    const base = latest.current.get(card.word.id) ?? stored ?? card.word;
    let updated = base;
    // Skip persisting if the word was deleted or became a draft in the meantime.
    if (stored) {
      updated = { ...base, ...recordReview(base, answer.outcome, card.mode) };
      latest.current.set(updated.id, updated);
    }

    const nextResults = [...results, { card, outcome: answer.outcome, userAnswer: answer.userAnswer }];
    setResults(nextResults);

    let nextQueue = queue;
    if (stored && answer.outcome === 'incorrect' && settings.repeatMistakes) {
      const count = repeats.current.get(updated.id) ?? 0;
      if (count < MAX_REPEATS_PER_WORD) {
        repeats.current.set(updated.id, count + 1);
        nextQueue = [...queue, makeCard(updated, settings, practiceWords)];
        setQueue(nextQueue);
      }
    }

    setPending(null);
    if (index + 1 >= nextQueue.length) onFinish(nextResults);
    else setIndex(index + 1);
  };

  const rateFlashcard = (rating: FlashcardRating) => {
    if (rating === 'close' && !closeUsed.current.has(card.word.id)) {
      // First "I was close": save nothing (SRS state incl. ease factor stays as is)
      // and ask the same card again later in this session.
      closeUsed.current.add(card.word.id);
      setQueue([...queue, repeatCard(card)]);
      setIndex(index + 1);
      return;
    }
    // A repeated "I was close" counts exactly like "I didn't know it".
    commit({ outcome: rating === 'known' ? 'correct' : 'incorrect' });
  };

  const progress = (index / queue.length) * 100;
  const isNew = (latest.current.get(card.word.id) ?? card.word).lastReviewedAt === null;

  return (
    <div className="session">
      <div className="session-top">
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={index}
          aria-valuemin={0}
          aria-valuemax={queue.length}
          aria-label="Session progress"
        >
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <span className="session-count">
          {index + 1} / {queue.length}
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onFinish(results)}>
          End
        </button>
      </div>

      <div className="card-meta">
        <span>
          {MODE_LABELS[card.mode]} · {DIRECTION_LABELS[card.direction]}
        </span>
        {isNew && <span>New word</span>}
      </div>

      {card.mode === 'flashcard' && (
        <FlashcardView
          key={card.key}
          card={card}
          active={active}
          closeCountsAsMiss={closeUsed.current.has(card.word.id)}
          onRate={rateFlashcard}
        />
      )}
      {card.mode === 'multiple-choice' && (
        <MultipleChoiceView
          key={card.key}
          card={card}
          active={active && !pending}
          onAnswer={(outcome, userAnswer) => setPending({ outcome, userAnswer })}
        />
      )}
      {card.mode === 'typed' && (
        <TypedAnswerView
          key={card.key}
          card={card}
          outcome={pending?.outcome ?? null}
          onAnswer={(outcome, userAnswer, note) => setPending({ outcome, userAnswer, note })}
        />
      )}

      {pending && (
        <FeedbackBar
          outcome={pending.outcome}
          correctAnswer={<WordSide word={card.word} side={answerSide(card.direction)} />}
          note={pending.note}
          canOverride={card.mode === 'typed' && pending.outcome === 'incorrect' && !!pending.userAnswer}
          onOverride={() => setPending({ ...pending, outcome: 'correct', note: 'Marked as correct.' })}
          onNext={() => commit(pending)}
          isLast={
            index + 1 >= queue.length &&
            !(
              pending.outcome === 'incorrect' &&
              settings.repeatMistakes &&
              (repeats.current.get(card.word.id) ?? 0) < MAX_REPEATS_PER_WORD
            )
          }
        />
      )}
    </div>
  );
}
