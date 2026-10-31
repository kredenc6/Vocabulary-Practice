import { useEffect, useRef } from 'react';
import { useToast } from '../context/toasts';
import type { ToastOptions } from '../context/toasts';

/** Show a notification when a state-driven message changes, without repeating on rerenders. */
export function ToastMessage({ type, message }: ToastOptions) {
  const notify = useToast();
  const previous = useRef('');
  useEffect(() => {
    const key = `${type}\u0000${message}`;
    if (message && previous.current !== key) notify({ type, message });
    previous.current = key;
  }, [notify, type, message]);
  return null;
}
