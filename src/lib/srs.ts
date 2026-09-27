/**
 * Spaced repetition based on the SM-2 algorithm (SuperMemo 2).
 *
 * - Every word has an ease factor (EF), an interval in days and a count of
 *   consecutive successful repetitions.
 * - A successful recall (quality >= 3) grows the interval: 1 day, 6 days,
 *   then previous interval × EF.
 * - A failed recall (quality < 3) resets repetitions and makes the word due
 *   again immediately, so it is relearned before its interval grows again.
 * - The EF is adjusted after every answer according to the answer quality.
 */
import type {
  AnswerOutcome,
  EpochMs,
  PracticeMode,
  RecallQuality,
  SrsState,
  VocabWord,
  WordStatus,
} from '../types';
import { DAY_MS } from './dates';

export const DEFAULT_EASE = 2.5;
export const MIN_EASE = 1.3;
/** Words whose interval reaches this many days count as "mastered". */
export const MASTERED_INTERVAL_DAYS = 21;

export function initialSrsState(now: EpochMs = Date.now()): SrsState {
  return {
    easeFactor: DEFAULT_EASE,
    interval: 0,
    repetitions: 0,
    nextReviewDate: now,
    lastReviewedAt: null,
    lapses: 0,
    totalReviews: 0,
    correctReviews: 0,
  };
}

/**
 * Translate an answer into an SM-2 quality score. Recognising the answer among
 * multiple choices is easier than producing it, so it earns a lower score.
 */
export function outcomeToQuality(outcome: AnswerOutcome, mode: PracticeMode): RecallQuality {
  if (outcome === 'incorrect') return mode === 'multiple-choice' ? 0 : 1;
  if (outcome === 'close') return 3;
  switch (mode) {
    case 'typed':
      return 5;
    case 'flashcard':
      return 4;
    case 'multiple-choice':
      return 3;
  }
}

/** Apply one review to an SRS state and return the new state. */
export function applyReview(state: SrsState, quality: RecallQuality, now: EpochMs = Date.now()): SrsState {
  const passed = quality >= 3;

  let { repetitions, interval, lapses } = state;
  if (passed) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * state.easeFactor);
    repetitions += 1;
  } else {
    if (repetitions > 0) lapses += 1;
    repetitions = 0;
    interval = 0;
  }

  const q = quality;
  const easeFactor = Math.max(
    MIN_EASE,
    Math.round((state.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))) * 100) / 100,
  );

  return {
    easeFactor,
    interval,
    repetitions,
    lapses,
    nextReviewDate: now + interval * DAY_MS,
    lastReviewedAt: now,
    totalReviews: state.totalReviews + 1,
    correctReviews: state.correctReviews + (passed ? 1 : 0),
  };
}

export const STATUS_LABELS: Record<WordStatus, string> = {
  new: 'New',
  learning: 'Learning',
  mastered: 'Mastered',
};

export function wordStatus(word: SrsState): WordStatus {
  if (word.lastReviewedAt === null) return 'new';
  if (word.interval >= MASTERED_INTERVAL_DAYS) return 'mastered';
  return 'learning';
}

export function isDue(word: SrsState, now: EpochMs = Date.now()): boolean {
  return word.nextReviewDate <= now;
}

/** Pick the SRS fields out of a full word (e.g. to write them back). */
export function pickSrs(word: VocabWord): SrsState {
  const {
    easeFactor,
    interval,
    repetitions,
    nextReviewDate,
    lastReviewedAt,
    lapses,
    totalReviews,
    correctReviews,
  } = word;
  return {
    easeFactor,
    interval,
    repetitions,
    nextReviewDate,
    lastReviewedAt,
    lapses,
    totalReviews,
    correctReviews,
  };
}
