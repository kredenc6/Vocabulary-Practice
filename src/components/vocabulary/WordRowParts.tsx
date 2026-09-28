import type { WordRowState } from '../../hooks/useWordRow';
import type { VocabWord } from '../../types';
import { WordForm } from './WordForm';

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A row in edit mode: the shared word form plus Cancel / Reset progress. */
export function WordRowEditor({ word, state }: { word: VocabWord; state: WordRowState }) {
  return (
    <div className="word-row editing">
      <WordForm
        values={state.values}
        onChange={state.setValues}
        onSubmit={state.save}
        submitLabels={{ complete: 'Save', draft: 'Save as draft' }}
        autoFocus
      >
        <button type="button" className="btn btn-ghost" onClick={() => state.setMode('view')}>
          Cancel
        </button>
        {word.lastReviewedAt !== null && (
          <button
            type="button"
            className="btn btn-ghost"
            title="Reset learning progress to “new”"
            onClick={state.resetProgress}
          >
            Reset progress
          </button>
        )}
      </WordForm>
      <RowError error={state.error} />
    </div>
  );
}

/** Edit and delete buttons, with the inline "Delete / Keep" confirmation. */
export function WordRowActions({ word, state }: { word: VocabWord; state: WordRowState }) {
  return (
    <span className="word-actions">
      {state.mode === 'confirm-delete' ? (
        <span className="confirm-inline">
          <button type="button" className="btn btn-danger btn-sm" onClick={state.remove} autoFocus>
            Delete
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => state.setMode('view')}>
            Keep
          </button>
        </span>
      ) : (
        <>
          <button type="button" className="icon-btn" onClick={state.startEdit} aria-label={`Edit ${word.spanish}`} title="Edit">
            <EditIcon />
          </button>
          <button
            type="button"
            className="icon-btn danger"
            onClick={() => state.setMode('confirm-delete')}
            aria-label={`Delete ${word.spanish}`}
            title="Delete"
          >
            <TrashIcon />
          </button>
        </>
      )}
    </span>
  );
}

export function RowError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <span className="small" style={{ color: 'var(--bad-text)', gridColumn: '1 / -1' }}>
      {error}
    </span>
  );
}
