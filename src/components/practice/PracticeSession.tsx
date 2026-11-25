import { useMemo, useRef, useState } from 'react';
import { useWords } from '../../context/words';
import { DIRECTION_LABELS, MODE_LABELS, answerSide, answerText, makeCard, repeatCard, sideText } from '../../lib/practice';
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
  const { practiceWords, recordReview } = useWords();
  const practiceById = useMemo(() => new Map(practiceWords.map((word) => [word.id, word])), [practiceWords]);
  const [queue, setQueue] = useState(initialCards);
  const [completedCount, setCompletedCount] = useState(0);
  const [results, setResults] = useState<CardResult[]>([]);
  const [pendingAnswer, setPendingAnswer] = useState<{ cardKey: string; answer: PendingAnswer } | null>(null);

  /** Latest SRS state of words answered in this session (ahead of the Firestore snapshot). */
  const latest = useRef(new Map<string, VocabWord>());
  const repeats = useRef(new Map<string, number>());
  /** Words already rated "I was close" in this session. Lives only as long as the session. */
  const closeUsed = useRef(new Set<string>());

  const eligibleQueue = queue.filter((item) => practiceById.has(item.word.id));
  // Drop unavailable cards so restoring a word doesn't interrupt this session's current card.
  if (eligibleQueue.length !== queue.length) setQueue(eligibleQueue);
  const [nextCard, ...remaining] = eligibleQueue;
  if (!nextCard) {
    return (
      <div className="session card empty-state">
        <p>No more words are available in this session.</p>
        <button type="button" className="btn btn-primary" onClick={() => onFinish(results)}>
          Finish session
        </button>
      </div>
    );
  }

  const pending = pendingAnswer?.cardKey === nextCard.key ? pendingAnswer.answer : null;
  let card = nextCard;
  // Options are generated when a card is queued and may have since left the practice pool.
  if (nextCard.options) {
    const side = answerSide(nextCard.direction);
    const available = new Set(practiceWords.map((word) => sideText(word, side)));
    const correct = answerText(nextCard);
    const options = nextCard.options.filter((option) => option === correct || available.has(option));
    card = options.length > 1 || pending
      ? { ...nextCard, options }
      : { ...nextCard, mode: 'flashcard', options: undefined };
  }

  const setPending = (answer: PendingAnswer) => setPendingAnswer({ cardKey: card.key, answer });
  const advance = (nextQueue: PracticeCard[], nextResults: CardResult[]) => {
    setPendingAnswer(null);
    if (!nextQueue.length) {
      onFinish(nextResults);
      return;
    }
    setQueue(nextQueue);
    setCompletedCount(completedCount + 1);
  };

  /** Save the answer to the word's SRS state and move to the next card. */
  const commit = (answer: PendingAnswer) => {
    const base = latest.current.get(card.word.id) ?? practiceById.get(card.word.id) ?? card.word;
    const updated = { ...base, ...recordReview(base, answer.outcome, card.mode) };
    latest.current.set(updated.id, updated);

    const nextResults = [...results, { card, outcome: answer.outcome, userAnswer: answer.userAnswer }];
    setResults(nextResults);

    if (answer.outcome === 'incorrect' && settings.repeatMistakes) {
      const count = repeats.current.get(updated.id) ?? 0;
      if (count < MAX_REPEATS_PER_WORD) {
        repeats.current.set(updated.id, count + 1);
        remaining.push(makeCard(updated, settings, practiceWords));
      }
    }

    advance(remaining, nextResults);
  };

  const rateFlashcard = (rating: FlashcardRating) => {
    if (rating === 'close' && !closeUsed.current.has(card.word.id)) {
      // First "I was close": save nothing (SRS state incl. ease factor stays as is)
      // and ask the same card again later in this session.
      closeUsed.current.add(card.word.id);
      advance([...remaining, repeatCard(card)], results);
      return;
    }
    // A repeated "I was close" counts exactly like "I didn't know it".
    commit({ outcome: rating === 'known' ? 'correct' : 'incorrect' });
  };

  const total = completedCount + remaining.length + 1;
  const progress = (completedCount / total) * 100;
  const isNew = (latest.current.get(card.word.id) ?? card.word).lastReviewedAt === null;

  return (
    <div className="session">
      <div className="session-top">
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Session progress"
        >
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <span className="session-count">
          {completedCount + 1} / {total}
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
            remaining.length === 0 &&
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
