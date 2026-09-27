import { useCallback, useEffect, useState } from 'react';

/** Keeps the active tab in the URL hash so it survives reloads and supports back/forward. */
export function useHashTab<T extends string>(tabs: readonly T[], fallback: T): [T, (tab: T) => void] {
  const read = useCallback((): T => {
    const hash = window.location.hash.replace(/^#\/?/, '') as T;
    return tabs.includes(hash) ? hash : fallback;
  }, [tabs, fallback]);

  const [tab, setTabState] = useState<T>(read);

  useEffect(() => {
    const onHashChange = () => setTabState(read());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [read]);

  const setTab = useCallback((next: T) => {
    window.location.hash = `/${next}`;
    setTabState(next);
  }, []);

  return [tab, setTab];
}
