import { Bar, BarChart, CartesianGrid, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BarShapeProps, TooltipContentProps } from 'recharts';
import { useChartTheme } from '../../hooks/useChartTheme';
import type { DailyPoint } from '../../lib/stats';
import { ChartTooltip } from './ChartTooltip';

const BAR_MAX = 24;

/** Stacked columns of correct vs. incorrect answers per day. */
export function DailyReviewsChart({ points }: { points: DailyPoint[] }) {
  const theme = useChartTheme();
  const total = points.reduce((sum, p) => sum + p.reviews, 0);

  // The lower segment gets a rounded top only when it is the top of the stack.
  const correctShape = (props: BarShapeProps) => {
    const point = props.payload as DailyPoint;
    return (
      <Rectangle
        x={props.x}
        y={props.y}
        width={props.width}
        height={props.height}
        fill={theme.series1}
        stroke={theme.surface}
        strokeWidth={2}
        radius={point.incorrect > 0 ? 0 : [4, 4, 0, 0]}
      />
    );
  };

  const renderTooltip = ({ active, payload }: TooltipContentProps) => {
    const point = payload?.[0]?.payload as DailyPoint | undefined;
    if (!active || !point) return null;
    const accuracy = point.reviews ? `${Math.round((point.correct / point.reviews) * 100)}%` : '–';
    return (
      <ChartTooltip
        title={point.label}
        rows={[
          { label: 'Correct', value: String(point.correct), color: theme.series1 },
          { label: 'Incorrect', value: String(point.incorrect), color: theme.series2 },
          { label: 'Accuracy', value: accuracy },
        ]}
      />
    );
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Daily reviews</h2>
        <p>Last {points.length} days · {total} answers</p>
      </div>
      <div className="legend" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
        <span className="legend-item">
          <span className="swatch" style={{ background: theme.series1 }} aria-hidden="true" />
          Correct
        </span>
        <span className="legend-item">
          <span className="swatch" style={{ background: theme.series2 }} aria-hidden="true" />
          Incorrect
        </span>
      </div>
      {total === 0 ? (
        <div className="empty-state">
          <p>No reviews yet. Finish a practice session to see your activity here.</p>
        </div>
      ) : (
        <>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid vertical={false} stroke={theme.grid} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: theme.axisText, fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: theme.axis }}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: theme.axisText, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip content={renderTooltip} cursor={{ fill: theme.grid, fillOpacity: 0.5 }} />
                <Bar
                  dataKey="correct"
                  name="Correct"
                  stackId="reviews"
                  fill={theme.series1}
                  maxBarSize={BAR_MAX}
                  shape={correctShape}
                />
                <Bar
                  dataKey="incorrect"
                  name="Incorrect"
                  stackId="reviews"
                  fill={theme.series2}
                  maxBarSize={BAR_MAX}
                  stroke={theme.surface}
                  strokeWidth={2}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <details style={{ marginTop: '0.5rem' }}>
            <summary className="small muted" style={{ cursor: 'pointer' }}>
              Show as table
            </summary>
            <div className="table-wrap" style={{ marginTop: '0.5rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th className="num">Correct</th>
                    <th className="num">Incorrect</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {points
                    .filter((p) => p.reviews > 0)
                    .reverse()
                    .map((p) => (
                      <tr key={p.date}>
                        <td>{p.label}</td>
                        <td className="num">{p.correct}</td>
                        <td className="num">{p.incorrect}</td>
                        <td className="num">{p.reviews}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
