interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function WordSearchInput({ value, onChange }: Props) {
  return (
    <input
      className="input"
      type="search"
      placeholder="Search Spanish or English…"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Search words"
    />
  );
}
