import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastContext } from './toasts';
import type { ToastOptions } from './toasts';
import { MAX_TOAST_MESSAGE_LENGTH, toastDuration, toastMessageLength } from '../lib/toast';

interface Toast extends ToastOptions {
  id: number;
  details?: string;
}
const LABELS = { success: 'Success', error: 'Error', info: 'Information', warn: 'Warning' };

function ToastItem({ toast, dismiss, showDetails }: {
  toast: Toast;
  dismiss: (id: number) => void;
  showDetails: (toast: Toast) => void;
}) {
  const duration = toastDuration(toast.message);
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, dismiss, duration]);

  return (
    <div className={`toast toast-${toast.type}`}>
      <div className="toast-body" role={toast.type === 'error' ? 'alert' : 'status'} aria-atomic="true">
        <strong className="toast-label">{LABELS[toast.type]}</strong>
        <p>{toast.message}</p>
      </div>
      {toast.details ? (
        <button type="button" className="toast-action link-btn" onClick={() => {
          showDetails(toast);
          dismiss(toast.id);
        }}>
          View details
        </button>
      ) : toast.action && (
        <button type="button" className="toast-action link-btn" onClick={() => {
          toast.action?.onClick();
          dismiss(toast.id);
        }}>
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        className="toast-close icon-btn"
        aria-label="Dismiss notification"
        onClick={() => dismiss(toast.id)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
        </svg>
      </button>
      <div className="toast-timer" aria-hidden="true">
        <div className="toast-timer-bar" style={{ animationDuration: `${duration}ms` }} />
      </div>
    </div>
  );
}

/** Full text stays available in a modal until explicitly closed, including any original action. */
function ToastDetails({ toast, close }: { toast: Toast; close: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog ref={dialogRef} className="toast-details" aria-labelledby={titleId} onCancel={(event) => {
      event.preventDefault();
      close();
    }}>
      <div className="toast-details-header">
        <h2 id={titleId}>{LABELS[toast.type]}</h2>
        <button type="button" className="icon-btn" aria-label="Close message details" onClick={close}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <p className="toast-details-message">{toast.details}</p>
      <div className="toast-details-actions">
        {toast.action && (
          <button type="button" className="btn btn-primary" onClick={() => {
            toast.action?.onClick();
            close();
          }}>{toast.action.label}</button>
        )}
        <button type="button" className="btn btn-secondary" onClick={close}>Close</button>
      </div>
    </dialog>
  );
}

/** App-wide notifications survive navigation and dismiss after 5–9 seconds based on body length. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [details, setDetails] = useState<Toast | null>(null);
  const nextId = useRef(0);
  const notify = useCallback((toast: ToastOptions) => {
    if (!toast.message.trim()) return;
    const id = nextId.current++;
    const longMessage = toastMessageLength(toast.message) > MAX_TOAST_MESSAGE_LENGTH;
    const notification: Toast = {
      ...toast,
      id,
      message: longMessage ? 'View the full message for details.' : toast.message,
      details: longMessage ? toast.message : undefined,
    };
    setToasts((current) => [...current, notification]);
  }, []);
  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <aside className="toast-stack" aria-label="Notifications">
        {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} dismiss={dismiss} showDetails={setDetails} />)}
      </aside>
      {details && <ToastDetails key={details.id} toast={details} close={() => setDetails(null)} />}
    </ToastContext.Provider>
  );
}
