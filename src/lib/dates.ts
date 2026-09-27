import type { EpochMs } from '../types';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(date: Date | EpochMs = Date.now()): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** The last `count` local days (oldest first) as YYYY-MM-DD keys. */
export function lastNDays(count: number, now: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    keys.push(dayKey(d));
  }
  return keys;
}

/** Short label like "Sep 27" for a YYYY-MM-DD key. */
export function formatDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateTime(ms: EpochMs): string {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Human-friendly relative due date: "Due now", "in 3 days", … */
export function formatDue(nextReviewDate: EpochMs, now: EpochMs = Date.now()): string {
  const diff = nextReviewDate - now;
  if (diff <= 0) return 'Due now';
  const hours = diff / (60 * 60 * 1000);
  if (hours < 1) return 'in < 1 hour';
  if (hours < 24) return `in ${Math.round(hours)} h`;
  const days = Math.round(diff / DAY_MS);
  if (days < 31) return `in ${days} day${days === 1 ? '' : 's'}`;
  const months = Math.round(days / 30);
  return `in ${months} month${months === 1 ? '' : 's'}`;
}
