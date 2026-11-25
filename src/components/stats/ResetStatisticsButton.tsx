import { useRef, useState } from 'react';
import type { SubmitEvent } from 'react';
import { useToast } from '../../context/toasts';
import { resetStatistics, type StatisticsScope } from '../../services/statsRepo';

const options = [
  { scope: 'sessions', label: 'Session history', description: 'Clear your session list, last session score, and session accuracy chart.' },
  { scope: 'daily', label: 'Daily activity', description: 'Clear your daily reviews, 7-day accuracy, and day streak.' },
  { scope: 'words', label: 'Word learning progress', description: 'Reset every word to new, restart its review schedule, and clear its answer counts.' },
] satisfies { scope: StatisticsScope; label: string; description: string }[];

export function ResetStatisticsButton({ uid }: { uid: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const notify = useToast();
  const [scopes, setScopes] = useState<StatisticsScope[]>([]);
  const selected = options.filter(option => scopes.includes(option.scope));
  const labels = selected.map(option => option.label.toLowerCase());
  const list = labels.length > 1 ? labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1] : labels.join('');
  const phrase = 'reset ' + list;

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !scopes.length || confirmation !== phrase) return;
    setBusy(true);
    setError('');
    try {
      await resetStatistics(uid, scopes);
      dialog.current?.close();
      setScopes([]);
      notify({ type: 'success', message: `Reset complete: ${list}.` });
    } catch (err) {
      console.error('Could not reset statistics', err);
      setError('The reset could not finish. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function openDialog() {
    setConfirmation('');
    setError('');
    dialog.current?.showModal();
  }

  const resetButton = (
    <button type="button" className="btn btn-danger" disabled={!scopes.length} onClick={openDialog}>Reset selected</button>
  );
  const controls = (
    <div className="reset-controls">
      <div className="reset-choices" role="group" aria-label="Statistics to reset">
        {options.map(option => (
          <label className="reset-choice" key={option.scope}>
            <input type="checkbox" checked={scopes.includes(option.scope)} onChange={event => {
              const checked = event.target.checked;
              setScopes(current => checked ? [...current, option.scope] : current.filter(scope => scope !== option.scope));
            }} />
            <span>{option.label}<small>{option.description}</small></span>
          </label>
        ))}
      </div>
      <div className="reset-action">{resetButton}</div>
    </div>
  );

  return (
    <>
      <details className="reset-section">
        <summary>Reset statistics</summary>
        <div className="reset-panel">
          <div className="reset-heading">
            <p>Select the statistics you want to clear. You’ll confirm before the reset.</p>
          </div>
          {controls}
        </div>
      </details>
      <dialog ref={dialog} className="reset-stats-dialog" data-resetting={busy} aria-labelledby="reset-stats-title"
        onCancel={event => { if (busy) event.preventDefault(); }}>
        <form className="stack" onSubmit={submit}>
          <h2 id="reset-stats-title">{busy ? 'Reset in progress…' : 'Reset selected statistics?'}</h2>
          <ul>{selected.map(option => <li key={option.scope}>{option.label}</li>)}</ul>
          <label className="field">
            <span>Type <strong>{phrase}</strong> to confirm.</span>
            <input className="input" autoFocus autoComplete="off" autoCapitalize="off" spellCheck={false}
              value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} />
          </label>
          <span className="sr-only" role="status">{busy ? 'Resetting selected statistics…' : ''}</span>
          {error && <p role="alert">{error}</p>}
          <div className="row">
            <button type="submit" className="btn btn-danger" disabled={busy || confirmation !== phrase}>
              {busy && <span className="reset-spinner" aria-hidden="true" />}
              {busy ? 'Resetting…' : 'Reset selected'}
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => dialog.current?.close()}>
              Cancel
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
