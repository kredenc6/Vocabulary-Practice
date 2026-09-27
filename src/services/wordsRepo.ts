import {
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { dailyStatDocRaw, wordDoc, wordsCol } from '../firebase/paths';
import { applyReview, initialSrsState, outcomeToQuality, pickSrs } from '../lib/srs';
import { dayKey } from '../lib/dates';
import type { AnswerOutcome, PracticeMode, SrsState, VocabWord, WordPairInput } from '../types';

/** Firestore allows at most 500 writes per batch. */
const BATCH_SIZE = 400;

function cleanPair(pair: WordPairInput): WordPairInput {
  return { spanish: pair.spanish.trim(), english: pair.english.trim() };
}

function newWord(uid: string, pair: WordPairInput, now: number): VocabWord {
  const ref = doc(wordsCol(uid));
  return {
    id: ref.id,
    ...cleanPair(pair),
    ...initialSrsState(now),
    createdAt: now,
    updatedAt: now,
  };
}

export function subscribeWords(
  uid: string,
  onData: (words: VocabWord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(wordsCol(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => onData(snap.docs.map((d) => d.data())), onError);
}

export async function addWord(uid: string, pair: WordPairInput): Promise<void> {
  const word = newWord(uid, pair, Date.now());
  await setDoc(wordDoc(uid, word.id), word);
}

export async function updateWordText(uid: string, wordId: string, pair: WordPairInput): Promise<void> {
  await updateDoc(wordDoc(uid, wordId), { ...cleanPair(pair), updatedAt: Date.now() });
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
  await updateDoc(wordDoc(uid, wordId), { ...initialSrsState(now), updatedAt: now });
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
  batch.update(wordDoc(uid, word.id), { ...next, updatedAt: now });
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
