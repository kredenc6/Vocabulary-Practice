import { useState } from 'react';
import type { FormEvent } from 'react';
import { useWords } from '../../context/words';
import { formatDue } from '../../lib/dates';
import { STATUS_LABELS, wordStatus } from '../../lib/srs';
import type { VocabWord, WordStatus } from '../../types';

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
  const [spanish, setSpanish] = useState(word.spanish);
  const [english, setEnglish] = useState(word.english);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setSpanish(word.spanish);
    setEnglish(word.english);
    setError(null);
    setMode('edit');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!spanish.trim() || !english.trim()) return;
    try {
      await updateWord(word.id, { spanish, english });
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
      <form className="word-row editing" onSubmit={save}>
        <input
          className="input"
          value={spanish}
          onChange={(e) => setSpanish(e.target.value)}
          aria-label="Spanish"
          lang="es"
          maxLength={300}
          autoFocus
        />
        <input
          className="input"
          value={english}
          onChange={(e) => setEnglish(e.target.value)}
          aria-label="English"
          maxLength={300}
        />
        <div className="row">
          <button type="submit" className="btn btn-primary btn-sm" disabled={!spanish.trim() || !english.trim()}>
            Save
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode('view')}>
            Cancel
          </button>
          {word.lastReviewedAt !== null && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              title="Reset learning progress to “new”"
              onClick={() => {
                void resetProgress(word.id);
                setMode('view');
              }}
            >
              Reset progress
            </button>
          )}
        </div>
        {error && <span className="small" style={{ color: 'var(--bad-text)' }}>{error}</span>}
      </form>
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
