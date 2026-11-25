import { useRef, useState } from 'react';
import type { SubmitEvent } from 'react';
import { useToast } from '../../context/toasts';
import { resetAllStatistics } from '../../services/statsRepo';

const phrase = 'reset all statistics';

export function ResetStatisticsButton({ uid }: { uid: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const notify = useToast();

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || confirmation !== phrase) return;
    setBusy(true);
    setError('');
    try {
      await resetAllStatistics(uid);
      dialog.current?.close();
      notify({ type: 'success', message: 'All statistics have been reset.' });
    } catch (err) {
      console.error('Could not reset statistics', err);
      setError('The reset could not finish. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-danger" style={{ alignSelf: 'flex-end' }} onClick={() => {
        setConfirmation('');
        setError('');
        dialog.current?.showModal();
      }}>
        Reset all statistics
      </button>
      <dialog ref={dialog} className="reset-stats-dialog" aria-labelledby="reset-stats-title"
        onCancel={event => { if (busy) event.preventDefault(); }}>
        <form className="stack" onSubmit={submit}>
          <h2 id="reset-stats-title">Reset all statistics?</h2>
          <p>This permanently clears your practice history and resets every word’s review schedule.
            Your vocabulary entries are kept.</p>
          <label className="field">
            <span>Type <strong>{phrase}</strong> to confirm.</span>
            <input className="input" autoFocus autoComplete="off" autoCapitalize="off" spellCheck={false}
              value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} />
          </label>
          {error && <p role="alert">{error}</p>}
          <div className="row">
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => dialog.current?.close()}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={busy || confirmation !== phrase}>
              {busy ? 'Resetting…' : 'Reset all statistics'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
