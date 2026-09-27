export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

/** Tooltip body shared by all charts: title plus label/value rows with color keys. */
export function ChartTooltip({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{title}</div>
      {rows.map((row) => (
        <div className="chart-tooltip-row" key={row.label}>
          <span>
            {row.color && <span className="swatch" style={{ background: row.color }} aria-hidden="true" />}
            {row.label}
          </span>
          <strong>{row.value}</strong>
        </div>
      ))}
    </div>
  );
}
