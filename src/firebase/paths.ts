import { collection, doc } from 'firebase/firestore';
import type {
  CollectionReference,
  DocumentData,
  FirestoreDataConverter,
  PartialWithFieldValue,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { DailyStat, PracticeSessionRecord, VocabWord } from '../types';
import { isArticle, isWordType } from '../constants/word';
import { cleanAdjective } from '../lib/adjective';
import { cleanConjugations } from '../lib/conjugations';
import { initialSrsState } from '../lib/srs';
import { db } from './firebase';

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The document id is never stored as a field, and `undefined` values are never written. */
function withoutId<T extends object>(model: PartialWithFieldValue<T>): DocumentData {
  const data: DocumentData = {};
  for (const [key, value] of Object.entries(model)) {
    if (key !== 'id' && value !== undefined) data[key] = value;
  }
  return data;
}

/**
 * Converts Firestore documents to VocabWord, filling defaults for missing SRS
 * fields. Optional word fields are only set when present and valid, so
 * documents without them (or with unknown values) read as "not filled in".
 */
const wordConverter: FirestoreDataConverter<VocabWord> = {
  toFirestore: (word: PartialWithFieldValue<VocabWord>) => withoutId(word),
  fromFirestore(snapshot: QueryDocumentSnapshot): VocabWord {
    const d = snapshot.data();
    const createdAt = num(d.createdAt, 0);
    const defaults = initialSrsState(createdAt);
    const conjugations = cleanConjugations(d.conjugations);
    const adjective = cleanAdjective(d.adjective);
    return {
      id: snapshot.id,
      spanish: String(d.spanish ?? ''),
      english: String(d.english ?? ''),
      createdAt,
      updatedAt: num(d.updatedAt, createdAt),
      easeFactor: num(d.easeFactor, defaults.easeFactor),
      interval: num(d.interval, defaults.interval),
      repetitions: num(d.repetitions, defaults.repetitions),
      nextReviewDate: num(d.nextReviewDate, defaults.nextReviewDate),
      lastReviewedAt: typeof d.lastReviewedAt === 'number' ? d.lastReviewedAt : null,
      lapses: num(d.lapses, 0),
      totalReviews: num(d.totalReviews, 0),
      correctReviews: num(d.correctReviews, 0),
      ...(isWordType(d.type) && { type: d.type }),
      ...(isArticle(d.article) && { article: d.article }),
      ...(typeof d.plural === 'string' && d.plural.trim() && { plural: d.plural }),
      ...(conjugations && { conjugations }),
      ...(adjective && { adjective }),
      ...(typeof d.schemaVersion === 'number' && { schemaVersion: d.schemaVersion }),
    };
  },
};

const sessionConverter: FirestoreDataConverter<PracticeSessionRecord> = {
  toFirestore: (session: PartialWithFieldValue<PracticeSessionRecord>) => withoutId(session),
  fromFirestore(snapshot: QueryDocumentSnapshot): PracticeSessionRecord {
    const d = snapshot.data();
    return {
      id: snapshot.id,
      startedAt: num(d.startedAt, 0),
      endedAt: num(d.endedAt, 0),
      direction: d.direction ?? 'es-en',
      modes: Array.isArray(d.modes) ? d.modes : [],
      total: num(d.total, 0),
      correct: num(d.correct, 0),
    };
  },
};

const dailyStatConverter: FirestoreDataConverter<DailyStat> = {
  toFirestore: (stat: PartialWithFieldValue<DailyStat>) => ({ ...stat }),
  fromFirestore(snapshot: QueryDocumentSnapshot): DailyStat {
    const d = snapshot.data();
    return {
      date: snapshot.id,
      reviews: num(d.reviews, 0),
      correct: num(d.correct, 0),
    };
  },
};

export const wordsCol = (uid: string): CollectionReference<VocabWord> =>
  collection(db, 'users', uid, 'words').withConverter(wordConverter);

export const wordDoc = (uid: string, wordId: string) => doc(wordsCol(uid), wordId);

export const sessionsCol = (uid: string): CollectionReference<PracticeSessionRecord> =>
  collection(db, 'users', uid, 'sessions').withConverter(sessionConverter);

export const dailyStatsCol = (uid: string): CollectionReference<DailyStat> =>
  collection(db, 'users', uid, 'dailyStats').withConverter(dailyStatConverter);

/** Untyped ref, used for increment() updates that the converter can't express. */
export const dailyStatDocRaw = (uid: string, day: string) => doc(db, 'users', uid, 'dailyStats', day);
