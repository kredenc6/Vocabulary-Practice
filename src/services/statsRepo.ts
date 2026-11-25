import { doc, getDocsFromServer, limit, onSnapshot, orderBy, query, setDoc, writeBatch } from 'firebase/firestore';
import type { Unsubscribe, WriteBatch } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { dailyStatsCol, sessionsCol, wordsCol } from '../firebase/paths';
import { WORD_SCHEMA_VERSION } from '../constants/word';
import { initialSrsState } from '../lib/srs';
import type { DailyStat, PracticeSessionData, PracticeSessionRecord } from '../types';

export type StatisticsScope = 'sessions' | 'daily' | 'words';

export async function resetStatistics(uid: string, scopes: readonly StatisticsScope[]): Promise<void> {
  const [words, sessions, days] = await Promise.all([
    scopes.includes('words') ? getDocsFromServer(wordsCol(uid)) : null,
    scopes.includes('sessions') ? getDocsFromServer(sessionsCol(uid)) : null,
    scopes.includes('daily') ? getDocsFromServer(dailyStatsCol(uid)) : null,
  ]);
  const now = Date.now();
  const progress = { ...initialSrsState(now), updatedAt: now, schemaVersion: WORD_SCHEMA_VERSION };
  const writes: ((batch: WriteBatch) => void)[] = [];
  for (const word of words?.docs ?? []) writes.push(batch => batch.update(word.ref, progress));
  for (const session of sessions?.docs ?? []) writes.push(batch => batch.delete(session.ref));
  for (const day of days?.docs ?? []) writes.push(batch => batch.delete(day.ref));

  const batchSize = 400;
  for (let start = 0; start < writes.length; start += batchSize) {
    const batch = writeBatch(db);
    for (const write of writes.slice(start, start + batchSize)) write(batch);
    await batch.commit();
  }
}

export async function saveSession(uid: string, data: PracticeSessionData): Promise<void> {
  const ref = doc(sessionsCol(uid));
  await setDoc(ref, { id: ref.id, ...data });
}

/** Most recent sessions, newest first. */
export function subscribeSessions(
  uid: string,
  count: number,
  onData: (sessions: PracticeSessionRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(sessionsCol(uid), orderBy('startedAt', 'desc'), limit(count));
  return onSnapshot(q, (snap) => onData(snap.docs.map((d) => d.data())), onError);
}

/** Daily review counters for the most recent `count` active days, newest first. */
export function subscribeDailyStats(
  uid: string,
  count: number,
  onData: (stats: DailyStat[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(dailyStatsCol(uid), orderBy('date', 'desc'), limit(count));
  return onSnapshot(q, (snap) => onData(snap.docs.map((d) => d.data())), onError);
}
