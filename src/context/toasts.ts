import { createContext, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warn';
export interface ToastOptions {
  type: ToastType;
  message: string;
  action?: { label: string; onClick: () => void };
}

export const ToastContext = createContext<((toast: ToastOptions) => void) | null>(null);

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error('useToast must be used inside ToastProvider');
  return notify;
}
