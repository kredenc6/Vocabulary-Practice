import { useEffect, useState } from 'react';
import { subscribeDailyStats, subscribeSessions } from '../services/statsRepo';
import type { DailyStat, PracticeSessionRecord } from '../types';

export interface StatsData {
  sessions: PracticeSessionRecord[];
  dailyStats: DailyStat[];
  loading: boolean;
  error: string | null;
}

/** Live subscription to recent sessions and daily review counters. */
export function useStatsData(uid: string, sessionCount = 30, dayCount = 60): StatsData {
  const [sessions, setSessions] = useState<PracticeSessionRecord[] | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onError = (err: Error) => {
      console.error(err);
      setError('Could not load statistics.');
    };
    const unsubSessions = subscribeSessions(uid, sessionCount, setSessions, onError);
    const unsubDaily = subscribeDailyStats(uid, dayCount, setDailyStats, onError);
    return () => {
      unsubSessions();
      unsubDaily();
    };
  }, [uid, sessionCount, dayCount]);

  return {
    sessions: sessions ?? [],
    dailyStats: dailyStats ?? [],
    loading: (sessions === null || dailyStats === null) && !error,
    error,
  };
}
