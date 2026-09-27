export function Spinner({ label }: { label?: string }) {
  return (
    <div className="stack" style={{ alignItems: 'center', gap: '0.6rem' }} role="status">
      <div className="spinner" aria-hidden="true" />
      {label ? <span className="muted small">{label}</span> : <span className="sr-only">Loading</span>}
    </div>
  );
}
