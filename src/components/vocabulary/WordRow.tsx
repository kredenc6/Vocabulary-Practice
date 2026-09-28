import { useState } from 'react';
import { useWords } from '../../context/words';
import { formatDue } from '../../lib/dates';
import { STATUS_LABELS, wordStatus } from '../../lib/srs';
import { formToWordUpdate, wordToFormValues } from '../../lib/wordForm';
import type { WordFormValues } from '../../lib/wordForm';
import type { VocabWord, WordStatus } from '../../types';
import { WordForm } from './WordForm';

export function StatusBadge({ status }: { status: WordStatus }) {
  return (
    <span className="badge">
      <span className={`swatch swatch-${status}`} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

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

export function WordRow({ word, now }: { word: VocabWord; now: number }) {
  const { updateWord, deleteWord, resetProgress } = useWords();
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm-delete'>('view');
  const [values, setValues] = useState<WordFormValues>(() => wordToFormValues(word));
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setValues(wordToFormValues(word));
    setError(null);
    setMode('edit');
  };

  // An incomplete word simply stays (or becomes) a draft – the status is derived.
  const save = async () => {
    try {
      await updateWord(word.id, formToWordUpdate(values));
      setMode('view');
    } catch (err) {
      console.error(err);
      setError('Could not save changes.');
    }
  };

  const remove = async () => {
    try {
      await deleteWord(word.id);
    } catch (err) {
      console.error(err);
      setError('Could not delete the word.');
      setMode('view');
    }
  };

  if (mode === 'edit') {
    return (
      <div className="word-row editing">
        <WordForm
          values={values}
          onChange={setValues}
          onSubmit={save}
          submitLabels={{ complete: 'Save', draft: 'Save as draft' }}
          autoFocus
        >
          <button type="button" className="btn btn-ghost" onClick={() => setMode('view')}>
            Cancel
          </button>
          {word.lastReviewedAt !== null && (
            <button
              type="button"
              className="btn btn-ghost"
              title="Reset learning progress to “new”"
              onClick={() => {
                void resetProgress(word.id);
                setMode('view');
              }}
            >
              Reset progress
            </button>
          )}
        </WordForm>
        {error && <span className="small" style={{ color: 'var(--bad-text)' }}>{error}</span>}
      </div>
    );
  }

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
      <span className="word-actions">
        {mode === 'confirm-delete' ? (
          <span className="confirm-inline">
            <button type="button" className="btn btn-danger btn-sm" onClick={remove} autoFocus>
              Delete
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode('view')}>
              Keep
            </button>
          </span>
        ) : (
          <>
            <button type="button" className="icon-btn" onClick={startEdit} aria-label={`Edit ${word.spanish}`} title="Edit">
              <EditIcon />
            </button>
            <button
              type="button"
              className="icon-btn danger"
              onClick={() => setMode('confirm-delete')}
              aria-label={`Delete ${word.spanish}`}
              title="Delete"
            >
              <TrashIcon />
            </button>
          </>
        )}
      </span>
      {error && <span className="small" style={{ color: 'var(--bad-text)', gridColumn: '1 / -1' }}>{error}</span>}
    </div>
  );
}
