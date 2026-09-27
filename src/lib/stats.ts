import type { DailyStat, PracticeSessionRecord, VocabWord, WordStatus } from '../types';
import { dayKey, formatDayKey, lastNDays } from './dates';
import { isDue, wordStatus } from './srs';

export interface DailyPoint {
  date: string;
  label: string;
  reviews: number;
  correct: number;
  incorrect: number;
}

export interface SessionPoint {
  id: string;
  label: string;
  accuracy: number;
  total: number;
  correct: number;
}

export function statusCounts(words: VocabWord[]): Record<WordStatus, number> {
  const counts: Record<WordStatus, number> = { new: 0, learning: 0, mastered: 0 };
  for (const w of words) counts[wordStatus(w)]++;
  return counts;
}

export function dueCount(words: VocabWord[], now = Date.now()): number {
  return words.filter((w) => isDue(w, now)).length;
}

/** One point per calendar day for the last `days` days (zeros for inactive days). */
export function dailySeries(stats: DailyStat[], days: number): DailyPoint[] {
  const byDate = new Map(stats.map((s) => [s.date, s]));
  return lastNDays(days).map((date) => {
    const s = byDate.get(date);
    const reviews = s?.reviews ?? 0;
    const correct = Math.min(s?.correct ?? 0, reviews);
    return { date, label: formatDayKey(date), reviews, correct, incorrect: reviews - correct };
  });
}

/** Sessions oldest → newest, for the accuracy trend. */
export function sessionSeries(sessions: PracticeSessionRecord[], count: number): SessionPoint[] {
  return sessions
    .slice(0, count)
    .reverse()
    .map((s) => ({
      id: s.id,
      label: new Date(s.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      accuracy: s.total ? Math.round((s.correct / s.total) * 100) : 0,
      total: s.total,
      correct: s.correct,
    }));
}

export function accuracyOver(points: { reviews: number; correct: number }[]): number | null {
  const reviews = points.reduce((sum, p) => sum + p.reviews, 0);
  const correct = points.reduce((sum, p) => sum + p.correct, 0);
  return reviews ? Math.round((correct / reviews) * 100) : null;
}

/** Consecutive days with at least one review, ending today (or yesterday). */
export function currentStreak(stats: DailyStat[]): number {
  const active = new Set(stats.filter((s) => s.reviews > 0).map((s) => s.date));
  const day = new Date();
  if (!active.has(dayKey(day))) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (active.has(dayKey(day))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

/** Words forgotten most often (by lapses, then by wrong answers). */
export function hardestWords(words: VocabWord[], count: number): VocabWord[] {
  const wrong = (w: VocabWord) => w.totalReviews - w.correctReviews;
  return words
    .filter((w) => wrong(w) > 0)
    .sort((a, b) => b.lapses - a.lapses || wrong(b) - wrong(a))
    .slice(0, count);
}
