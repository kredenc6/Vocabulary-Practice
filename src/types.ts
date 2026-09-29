import type { Conjugations } from './constants/conjugation';
import type { Article, WordType } from './constants/word';

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

/**
 * A vocabulary word as stored in Firestore at users/{uid}/words/{id}.
 * Optional fields that are absent mean "not filled in" and are omitted from
 * the document (never stored as undefined/null). See docs/word-model.md.
 */
export interface VocabWordData extends SrsState {
  /** The Spanish word WITHOUT its article. Required, non-empty. */
  spanish: string;
  /** English translation. May be empty while the word is a draft. */
  english: string;
  type?: WordType;
  /** `not_used` = noun used without article; absent = not filled in. */
  article?: Article;
  /** Plural form, without article. */
  plural?: string;
  /**
   * Verbs only, grouped as configured in src/constants/conjugation.ts, e.g.
   * conjugations.indicative.present.yo, conjugations.progressive.gerund.
   * Only non-empty values are stored.
   */
  conjugations?: Conjugations;
  /** Written as WORD_SCHEMA_VERSION on every write; absent only on legacy documents. */
  schemaVersion?: number;
  createdAt: EpochMs;
  updatedAt: EpochMs;
}

/** A vocabulary word including its Firestore document id. */
export interface VocabWord extends VocabWordData {
  id: string;
}

/** The two basic text fields of a word (used by CSV import). */
export interface WordPairInput {
  spanish: string;
  english: string;
}

/** Editable fields when creating a word. Omitted optional fields are not written. */
export interface WordInput extends WordPairInput {
  type?: WordType;
  article?: Article;
  plural?: string;
  conjugations?: Conjugations;
}

/**
 * Changes to an existing word. Omitted keys stay unchanged; `null` clears an
 * optional field (removed from the document with deleteField()).
 */
export interface WordUpdate {
  spanish?: string;
  english?: string;
  type?: WordType | null;
  article?: Article | null;
  plural?: string | null;
  conjugations?: Conjugations | null;
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
