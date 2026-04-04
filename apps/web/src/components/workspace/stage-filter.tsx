const stages = ["idea", "draft", "script", "scheduled", "published"];

interface StageFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function StageFilter({ value, onChange }: StageFilterProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-md border border-border bg-background px-2 py-1 text-sm"
    >
      <option value="">All stages</option>
      {stages.map((stage) => (
        <option key={stage} value={stage}>
          {stage}
        </option>
      ))}
    </select>
  );
}
