import { doc, limit, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { dailyStatsCol, sessionsCol } from '../firebase/paths';
import type { DailyStat, PracticeSessionData, PracticeSessionRecord } from '../types';

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
