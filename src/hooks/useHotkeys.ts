import { useEffect, useRef } from 'react';

/**
 * Global keyboard shortcuts. Ignores keys typed into form fields and
 * Enter/Space on focused buttons (the browser already "clicks" those).
 */
export function useHotkeys(enabled: boolean, handler: (event: KeyboardEvent) => void): void {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if ((event.key === 'Enter' || event.key === ' ') && target?.closest('button, a')) return;
      handlerRef.current(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
