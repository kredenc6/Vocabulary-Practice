import { useWordRow } from '../../hooks/useWordRow';
import { formatDue } from '../../lib/dates';
import { STATUS_LABELS, wordStatus } from '../../lib/srs';
import type { VocabWord, WordStatus } from '../../types';
import { RowError, WordRowActions, WordRowEditor } from './WordRowParts';

export function StatusBadge({ status }: { status: WordStatus }) {
  return (
    <span className="badge">
      <span className={`swatch swatch-${status}`} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

/** A complete word in the vocabulary list. */
export function WordRow({ word, now }: { word: VocabWord; now: number }) {
  const state = useWordRow(word);

  if (state.mode === 'edit') return <WordRowEditor word={word} state={state} />;

  const status = wordStatus(word);
  return (
    <div className="word-row">
      <span className="word-text word-es" lang="es">
        {word.spanish}
      </span>
      <span className="word-text word-en">{word.english}</span>
      <span className="word-status">
        <StatusBadge status={status} />
      </span>
      <span className="word-due small muted" title={new Date(word.nextReviewDate).toLocaleString()}>
        {status === 'new' ? 'Not practiced' : formatDue(word.nextReviewDate, now)}
      </span>
      <WordRowActions word={word} state={state} />
      <RowError error={state.error} />
    </div>
  );
}
