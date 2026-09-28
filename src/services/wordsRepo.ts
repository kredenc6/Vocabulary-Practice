import {
  deleteDoc,
  deleteField,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import type { FieldValue, Unsubscribe } from 'firebase/firestore';
import { WORD_SCHEMA_VERSION } from '../constants/word';
import { db } from '../firebase/firebase';
import { dailyStatDocRaw, wordDoc, wordsCol } from '../firebase/paths';
import { applyReview, initialSrsState, outcomeToQuality, pickSrs } from '../lib/srs';
import { dayKey } from '../lib/dates';
import type { AnswerOutcome, PracticeMode, SrsState, VocabWord, WordInput, WordPairInput, WordUpdate } from '../types';

/** Firestore allows at most 500 writes per batch. */
const BATCH_SIZE = 400;

/** Trimmed input; absent or empty optional fields are left out entirely (never undefined). */
function cleanInput(input: WordInput): WordInput {
  const plural = input.plural?.trim();
  return {
    spanish: input.spanish.trim(),
    english: input.english.trim(),
    ...(input.type && { type: input.type }),
    ...(input.article && { article: input.article }),
    ...(plural && { plural }),
  };
}

function newWord(uid: string, input: WordInput, now: number): VocabWord {
  const ref = doc(wordsCol(uid));
  return {
    id: ref.id,
    ...cleanInput(input),
    ...initialSrsState(now),
    createdAt: now,
    updatedAt: now,
    schemaVersion: WORD_SCHEMA_VERSION,
  };
}

/** Optional field update: omitted → unchanged, null/empty → deleteField(). */
function optionalField<T extends string>(value: T | null | undefined): T | FieldValue | undefined {
  if (value === undefined) return undefined;
  if (value === null || !value.trim()) return deleteField();
  return value.trim() as T;
}

export function subscribeWords(
  uid: string,
  onData: (words: VocabWord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(wordsCol(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => onData(snap.docs.map((d) => d.data())), onError);
}

export async function addWord(uid: string, input: WordInput): Promise<void> {
  const word = newWord(uid, input, Date.now());
  await setDoc(wordDoc(uid, word.id), word);
}

export async function updateWord(uid: string, wordId: string, changes: WordUpdate): Promise<void> {
  const data: Record<string, string | number | FieldValue> = {
    updatedAt: Date.now(),
    schemaVersion: WORD_SCHEMA_VERSION,
  };
  if (changes.spanish !== undefined) {
    const spanish = changes.spanish.trim();
    if (!spanish) throw new Error('The Spanish word cannot be empty.');
    data.spanish = spanish;
  }
  if (changes.english !== undefined) data.english = changes.english.trim();
  for (const key of ['type', 'article', 'plural'] as const) {
    const value = optionalField(changes[key]);
    if (value !== undefined) data[key] = value;
  }
  await updateDoc(wordDoc(uid, wordId), data);
}

export async function deleteWord(uid: string, wordId: string): Promise<void> {
  await deleteDoc(wordDoc(uid, wordId));
}

/** Import many pairs using batched writes. Returns the number of words added. */
export async function importWords(uid: string, pairs: WordPairInput[]): Promise<number> {
  const now = Date.now();
  for (let start = 0; start < pairs.length; start += BATCH_SIZE) {
    const batch = writeBatch(db);
    pairs.slice(start, start + BATCH_SIZE).forEach((pair, i) => {
      // Offset createdAt so imported words keep the file's order.
      const word = newWord(uid, pair, now + start + i);
      batch.set(wordDoc(uid, word.id), word);
    });
    await batch.commit();
  }
  return pairs.length;
}

/** Reset the learning progress of a word to "new". */
export async function resetWordProgress(uid: string, wordId: string): Promise<void> {
  const now = Date.now();
  await updateDoc(wordDoc(uid, wordId), {
    ...initialSrsState(now),
    updatedAt: now,
    schemaVersion: WORD_SCHEMA_VERSION,
  });
}

/**
 * Apply an answer to a word's spaced-repetition state and update today's
 * review counters in a single atomic batch. Returns the new SRS state.
 */
export function recordReview(
  uid: string,
  word: VocabWord,
  outcome: AnswerOutcome,
  mode: PracticeMode,
): SrsState {
  const now = Date.now();
  const next = applyReview(pickSrs(word), outcomeToQuality(outcome, mode), now);
  const day = dayKey(now);

  const batch = writeBatch(db);
  batch.update(wordDoc(uid, word.id), { ...next, updatedAt: now, schemaVersion: WORD_SCHEMA_VERSION });
  batch.set(
    dailyStatDocRaw(uid, day),
    { date: day, reviews: increment(1), correct: increment(outcome === 'incorrect' ? 0 : 1) },
    { merge: true },
  );
  // Don't block the UI on the server round-trip: the local cache is updated
  // immediately and the write is synced (also after going offline).
  batch.commit().catch((error) => console.error('Failed to save review', error));
  return next;
}
