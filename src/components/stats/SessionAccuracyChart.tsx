import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { useChartTheme } from '../../hooks/useChartTheme';
import type { SessionPoint } from '../../lib/stats';
import { ChartTooltip } from './ChartTooltip';

/** Accuracy per practice session, oldest to newest. */
export function SessionAccuracyChart({ points }: { points: SessionPoint[] }) {
  const theme = useChartTheme();
  const last = points[points.length - 1];

  const renderTooltip = ({ active, payload }: TooltipContentProps) => {
    const point = payload?.[0]?.payload as SessionPoint | undefined;
    if (!active || !point) return null;
    return (
      <ChartTooltip
        title={point.label}
        rows={[
          { label: 'Accuracy', value: `${point.accuracy}%`, color: theme.series1 },
          { label: 'Answers', value: `${point.correct} / ${point.total}` },
        ]}
      />
    );
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Session accuracy</h2>
        <p>{last ? `Last session: ${last.accuracy}%` : 'Last sessions'}</p>
      </div>
      {points.length === 0 ? (
        <div className="empty-state">
          <p>Complete a practice session to track your accuracy over time.</p>
        </div>
      ) : (
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 12, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke={theme.grid} />
              <XAxis
                dataKey="id"
                tickFormatter={(id: string) => points.find((p) => p.id === id)?.label ?? ''}
                tick={{ fill: theme.axisText, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: theme.axis }}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fill: theme.axisText, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip content={renderTooltip} cursor={{ stroke: theme.axis, strokeWidth: 1 }} />
              <Line
                type="monotone"
                dataKey="accuracy"
                name="Accuracy"
                stroke={theme.series1}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={{ r: 4, fill: theme.series1, stroke: theme.surface, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: theme.series1, stroke: theme.surface, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
