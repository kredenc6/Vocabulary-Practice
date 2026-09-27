import { useMemo } from 'react';
import type { CardResult, VocabWord } from '../../types';

interface Props {
  results: CardResult[];
  onReviewMistakes: (words: VocabWord[]) => void;
  onDone: () => void;
}

export function SessionSummary({ results, onReviewMistakes, onDone }: Props) {
  const summary = useMemo(() => {
    const count = (outcome: CardResult['outcome']) => results.filter((r) => r.outcome === outcome).length;
    const missed = new Map<string, VocabWord>();
    for (const r of results) if (r.outcome === 'incorrect') missed.set(r.card.word.id, r.card.word);
    const correct = count('correct');
    const close = count('close');
    return {
      correct,
      close,
      incorrect: count('incorrect'),
      accuracy: results.length ? Math.round(((correct + close) / results.length) * 100) : 0,
      missed: [...missed.values()],
    };
  }, [results]);

  if (results.length === 0) {
    return (
      <div className="session card empty-state">
        <p>No answers recorded in this session.</p>
        <button type="button" className="btn btn-primary" onClick={onDone}>
          Back to practice
        </button>
      </div>
    );
  }

  const message =
    summary.accuracy >= 90 ? '¡Excelente! 🎉' : summary.accuracy >= 70 ? '¡Muy bien! 👏' : 'Keep going – practice makes perfect 💪';

  return (
    <div className="session">
      <div className="card">
        <div className="summary-score">
          <div className="big">{summary.accuracy}%</div>
          <p className="muted" style={{ marginTop: '0.35rem' }}>
            accuracy · {results.length} answers
          </p>
          <h2 style={{ marginTop: '0.75rem' }}>{message}</h2>
        </div>
        <div className="legend" style={{ justifyContent: 'center' }}>
          <span className="legend-item">
            ✓ Correct <strong>{summary.correct}</strong>
          </span>
          <span className="legend-item">
            ≈ Close enough <strong>{summary.close}</strong>
          </span>
          <span className="legend-item">
            ✗ Missed <strong>{summary.incorrect}</strong>
          </span>
        </div>
      </div>

      {summary.missed.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Words to review</h2>
            <p>These will come back sooner.</p>
          </div>
          <ul className="missed-list">
            {summary.missed.map((w) => (
              <li key={w.id}>
                <strong lang="es">{w.spanish}</strong>
                <span className="muted">{w.english}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="row" style={{ justifyContent: 'center' }}>
        {summary.missed.length > 0 && (
          <button type="button" className="btn btn-secondary" onClick={() => onReviewMistakes(summary.missed)}>
            Review missed words
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={onDone} autoFocus>
          Done
        </button>
      </div>
    </div>
  );
}
