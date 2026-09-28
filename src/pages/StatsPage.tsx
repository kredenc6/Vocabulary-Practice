import { useMemo } from 'react';
import { useUser } from '../context/auth';
import { useWords } from '../context/words';
import { useStatsData } from '../hooks/useStatsData';
import { formatDateTime } from '../lib/dates';
import {
  accuracyOver,
  currentStreak,
  dailySeries,
  dueCount,
  hardestWords,
  sessionSeries,
  statusCounts,
} from '../lib/stats';
import { Spinner } from '../components/Spinner';
import { StatTiles } from '../components/stats/StatTiles';
import type { Tile } from '../components/stats/StatTiles';
import type { PracticeDirection, PracticeMode } from '../types';
import { StatusBreakdown } from '../components/stats/StatusBreakdown';
import { DailyReviewsChart } from '../components/stats/DailyReviewsChart';
import { SessionAccuracyChart } from '../components/stats/SessionAccuracyChart';

const CHART_DAYS = 30;
const CHART_SESSIONS = 20;

/** Compact labels so the sessions table fits in a half-width card. */
const SHORT_DIRECTION: Record<PracticeDirection, string> = { 'es-en': 'ES → EN', 'en-es': 'EN → ES', mixed: 'Mixed' };
const SHORT_MODE: Record<PracticeMode, string> = { flashcard: 'Cards', 'multiple-choice': 'Quiz', typed: 'Typed' };

export function StatsPage() {
  const user = useUser();
  // Statistics count complete words only; drafts are reported but not counted.
  const { words: allWords, practiceWords: words } = useWords();
  const draftCount = allWords.length - words.length;
  const { sessions, dailyStats, loading, error } = useStatsData(user.uid, CHART_SESSIONS, 90);

  const counts = useMemo(() => statusCounts(words), [words]);
  const daily = useMemo(() => dailySeries(dailyStats, CHART_DAYS), [dailyStats]);
  const sessionPoints = useMemo(() => sessionSeries(sessions, CHART_SESSIONS), [sessions]);
  const hardest = useMemo(() => hardestWords(words, 8), [words]);

  const lastSession = sessions[0];
  const weekAccuracy = accuracyOver(daily.slice(-7));
  const weekReviews = daily.slice(-7).reduce((sum, p) => sum + p.reviews, 0);
  const streak = currentStreak(dailyStats);

  const tiles: Tile[] = [
    {
      label: 'Total words',
      value: words.length.toLocaleString('en-US'),
      sub: draftCount ? `+ ${draftCount} draft${draftCount === 1 ? '' : 's'} not counted` : 'in your vocabulary',
    },
    { label: 'Due now', value: String(dueCount(words)), sub: 'ready for review' },
    { label: 'New', value: String(counts.new), sub: 'not practiced yet' },
    { label: 'Learning', value: String(counts.learning), sub: 'in progress' },
    { label: 'Mastered', value: String(counts.mastered), sub: 'interval ≥ 21 days' },
    {
      label: 'Last session',
      value: lastSession ? `${Math.round((lastSession.correct / Math.max(lastSession.total, 1)) * 100)}%` : '–',
      sub: lastSession ? `${lastSession.correct}/${lastSession.total} correct` : 'no sessions yet',
    },
    {
      label: '7-day accuracy',
      value: weekAccuracy === null ? '–' : `${weekAccuracy}%`,
      sub: `${weekReviews} answers this week`,
    },
    { label: 'Day streak', value: String(streak), sub: streak === 1 ? 'day in a row' : 'days in a row' },
  ];

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Statistics</h1>
          <p>Your progress across all devices.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <StatTiles tiles={tiles} />
      <StatusBreakdown counts={counts} />

      {loading ? (
        <div className="card center-screen" style={{ minHeight: 200 }}>
          <Spinner label="Loading statistics…" />
        </div>
      ) : (
        <>
          <div className="grid-2">
            <DailyReviewsChart points={daily} />
            <SessionAccuracyChart points={sessionPoints} />
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <h2>Recent sessions</h2>
              </div>
              {sessions.length === 0 ? (
                <p className="muted">No sessions yet.</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Direction</th>
                        <th>Modes</th>
                        <th className="num">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.slice(0, 10).map((s) => (
                        <tr key={s.id}>
                          <td>{formatDateTime(s.startedAt)}</td>
                          <td>{SHORT_DIRECTION[s.direction]}</td>
                          <td>{s.modes.map((m) => SHORT_MODE[m]).join(', ')}</td>
                          <td className="num">
                            {s.correct}/{s.total} ({Math.round((s.correct / Math.max(s.total, 1)) * 100)}%)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <h2>Most difficult words</h2>
                <p>Forgotten most often</p>
              </div>
              {hardest.length === 0 ? (
                <p className="muted">No mistakes recorded yet. ¡Perfecto!</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Spanish</th>
                        <th>English</th>
                        <th className="num">Wrong</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hardest.map((w) => (
                        <tr key={w.id}>
                          <td lang="es">{w.spanish}</td>
                          <td>{w.english}</td>
                          <td className="num">
                            {w.totalReviews - w.correctReviews}/{w.totalReviews}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
