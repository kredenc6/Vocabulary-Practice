/** Epoch milliseconds (Date.now()). Stored as a number in Firestore. */
export type EpochMs = number;

/** Spaced-repetition state tracked for every word (SM-2 algorithm). */
export interface SrsState {
  /** SM-2 ease factor, starts at 2.5, never below 1.3. */
  easeFactor: number;
  /** Current review interval in days (0 = due again immediately). */
  interval: number;
  /** Number of consecutive successful reviews. */
  repetitions: number;
  /** When the word is next due for review. */
  nextReviewDate: EpochMs;
  /** When the word was last reviewed, or null if never practiced. */
  lastReviewedAt: EpochMs | null;
  /** How many times the word was forgotten after having been learned. */
  lapses: number;
  totalReviews: number;
  correctReviews: number;
}

/** A vocabulary pair as stored in Firestore at users/{uid}/words/{id}. */
export interface VocabWordData extends SrsState {
  spanish: string;
  english: string;
  createdAt: EpochMs;
  updatedAt: EpochMs;
}

/** A vocabulary pair including its Firestore document id. */
export interface VocabWord extends VocabWordData {
  id: string;
}

/** The two editable text fields of a word. */
export interface WordPairInput {
  spanish: string;
  english: string;
}

export type WordStatus = 'new' | 'learning' | 'mastered';

/** Concrete direction of a single card. */
export type CardDirection = 'es-en' | 'en-es';

/** Direction chosen for a session ('mixed' picks randomly per card). */
export type PracticeDirection = CardDirection | 'mixed';

export type PracticeMode = 'flashcard' | 'multiple-choice' | 'typed';

/** Which words a practice session draws from. */
export type WordSource = 'due' | 'weakest' | 'random';

export interface PracticeSettings {
  direction: PracticeDirection;
  modes: PracticeMode[];
  source: WordSource;
  sessionSize: number;
  /** Re-ask words that were answered wrong at the end of the session. */
  repeatMistakes: boolean;
}

/** One question inside a practice session. */
export interface PracticeCard {
  key: string;
  word: VocabWord;
  direction: CardDirection;
  mode: PracticeMode;
  /** Answer options for multiple-choice cards (includes the correct one). */
  options?: string[];
}

/**
 * Result of a single answer.
 * - `correct`: exact (normalized) match / self-rated as known
 * - `close`: accepted, but with a typo or missing accent
 * - `incorrect`: wrong / self-rated as unknown
 */
export type AnswerOutcome = 'correct' | 'close' | 'incorrect';

/** SM-2 recall quality, 0 (blackout) – 5 (perfect). */
export type RecallQuality = 0 | 1 | 2 | 3 | 4 | 5;

export interface CardResult {
  card: PracticeCard;
  outcome: AnswerOutcome;
  userAnswer?: string;
}

/** A finished practice session, stored at users/{uid}/sessions/{id}. */
export interface PracticeSessionData {
  startedAt: EpochMs;
  endedAt: EpochMs;
  direction: PracticeDirection;
  modes: PracticeMode[];
  total: number;
  correct: number;
}

export interface PracticeSessionRecord extends PracticeSessionData {
  id: string;
}

/** Per-day review counters, stored at users/{uid}/dailyStats/{YYYY-MM-DD}. */
export interface DailyStat {
  /** Local calendar day, formatted YYYY-MM-DD (also the document id). */
  date: string;
  reviews: number;
  correct: number;
}
