import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastContext } from './toasts';
import type { ToastOptions } from './toasts';

const DURATION = 5000;
interface Toast extends ToastOptions {
  id: number;
}
const LABELS = { success: 'Success', error: 'Error', info: 'Information', warn: 'Warning' };

function ToastItem({ toast, dismiss }: { toast: Toast; dismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), DURATION);
    return () => window.clearTimeout(timer);
  }, [toast.id, dismiss]);

  return (
    <div className={`toast toast-${toast.type}`}>
      <div className="toast-body" role={toast.type === 'error' ? 'alert' : 'status'} aria-atomic="true">
        <strong className="toast-label">{LABELS[toast.type]}</strong>
        <p>{toast.message}</p>
      </div>
      {toast.action && (
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
        <div className="toast-timer-bar" style={{ animationDuration: `${DURATION}ms` }} />
      </div>
    </div>
  );
}

/** App-wide notifications survive navigation and dismiss independently after five seconds. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const notify = useCallback((toast: ToastOptions) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { ...toast, id }]);
  }, []);
  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <aside className="toast-stack" aria-label="Notifications">
        {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} dismiss={dismiss} />)}
      </aside>
    </ToastContext.Provider>
  );
}
