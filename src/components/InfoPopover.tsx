import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 11v6" strokeLinecap="round" />
      <circle cx="12" cy="7.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

/**
 * An (i) button that toggles a popover on click/tap – works on touch devices,
 * unlike a hover tooltip. Closes on outside click and Escape.
 */
export function InfoPopover({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <span className="info-popover" ref={rootRef}>
      <button
        type="button"
        className="icon-btn"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <InfoIcon />
      </button>
      {open && (
        <div id={id} className="popover" role="dialog" aria-label={label}>
          {children}
        </div>
      )}
    </span>
  );
}
