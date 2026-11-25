import type { WordRowState } from '../../hooks/useWordRow';
import { formatSpanish } from '../../lib/wordDisplay';
import { isComplete } from '../../lib/wordValidation';
import type { VocabWord } from '../../types';
import { WordForm } from './WordForm';

function PracticeIcon({ resume }: { resume: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d={resume ? 'M8 5v14l11-7Z' : 'M9 5v14m6-14v14'} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

export function ResetProgressIconButton({ word, state }: {
  word: VocabWord;
  state: WordRowState;
}) {
  if (word.lastReviewedAt === null) return <span className="reset-icon-slot" aria-hidden="true" />;
  return (
    <button type="button" className="icon-btn reset-icon-slot" title="Reset learning progress"
      aria-label={`Reset learning progress for ${formatSpanish(word)}`}
      onClick={() => state.setMode('confirm-reset')}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 4v6h6 M3.8 10a8.5 8.5 0 1 1 .4 5" />
      </svg>
    </button>
  );
}

export function WordRowEditor({ word, state }: { word: VocabWord; state: WordRowState }) {
  return (
    <div className="word-row editing">
      <WordForm
        values={state.values}
        onChange={state.setValues}
        onSubmit={state.save}
        submitLabels={{ complete: 'Save', draft: 'Save as draft' }}
        allowExclusion={!isComplete(word)}
        autoFocus
      >
        <button type="button" className="btn btn-ghost" onClick={() => state.setMode('view')}>
          Cancel
        </button>
      </WordForm>
    </div>
  );
}

export function WordRowActions({ word, state }: { word: VocabWord; state: WordRowState }) {
  const isExcluded = word.excludedFromPractice === true;
  const practiceAction = isExcluded ? 'Return to practice' : 'Exclude from practice';
  return (
    <span className="word-actions">
      {state.mode === 'confirm-delete' || state.mode === 'confirm-reset' ? (
        <span className="confirm-inline">
          <button type="button" className="btn btn-danger btn-sm"
            onClick={state.mode === 'confirm-reset' ? state.resetProgress : state.remove} autoFocus>
            {state.mode === 'confirm-reset' ? 'Reset' : 'Delete'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => state.setMode('view')}>
            Keep
          </button>
        </span>
      ) : (
        <>
          {isExcluded && isComplete(word) && <ResetProgressIconButton word={word} state={state} />}
          {isComplete(word) && (
            <button
              type="button"
              className="icon-btn"
              aria-label={`${practiceAction} for ${formatSpanish(word)}`}
              title={practiceAction}
              disabled={state.changingPracticeExclusion}
              onClick={state.togglePracticeExclusion}
            >
              <PracticeIcon resume={isExcluded} />
            </button>
          )}
          <button type="button" className="icon-btn" onClick={state.startEdit} aria-label={`Edit ${formatSpanish(word)}`} title="Edit">
            <EditIcon />
          </button>
          <button
            type="button"
            className="icon-btn danger"
            onClick={() => state.setMode('confirm-delete')}
            aria-label={`Delete ${formatSpanish(word)}`}
            title="Delete"
          >
            <TrashIcon />
          </button>
        </>
      )}
    </span>
  );
}

