import { STATUS_LABELS } from '../../lib/srs';
import type { WordStatus } from '../../types';

const ORDER: WordStatus[] = ['new', 'learning', 'mastered'];

const DESCRIPTIONS: Record<WordStatus, string> = {
  new: 'never practiced',
  learning: 'interval under 21 days',
  mastered: 'interval of 21+ days',
};

/** Stacked meter of word counts per learning status, with a labeled legend. */
export function StatusBreakdown({ counts }: { counts: Record<WordStatus, number> }) {
  const total = ORDER.reduce((sum, s) => sum + counts[s], 0);
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div className="card">
      <div className="card-header">
        <h2>Learning progress</h2>
        <p>{total} words</p>
      </div>
      <div
        className="meter"
        role="img"
        aria-label={ORDER.map((s) => `${STATUS_LABELS[s]}: ${counts[s]}`).join(', ')}
      >
        {ORDER.map((s) =>
          counts[s] > 0 ? (
            <div key={s} className={`meter-seg swatch-${s}`} style={{ flexGrow: counts[s] }} title={`${STATUS_LABELS[s]}: ${counts[s]}`} />
          ) : null,
        )}
      </div>
      <div className="legend">
        {ORDER.map((s) => (
          <span className="legend-item" key={s} title={DESCRIPTIONS[s]}>
            <span className={`swatch swatch-${s}`} aria-hidden="true" />
            {STATUS_LABELS[s]} <strong>{counts[s]}</strong>
            <span className="muted">({pct(counts[s])}%)</span>
          </span>
        ))}
      </div>
    </div>
  );
}
