export interface KpiCardItem {
  label: string;
  value: string;
  sub?: string;
}

interface KpiCardProps {
  items: KpiCardItem[];
}

export function KpiCard({ items }: KpiCardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted">{item.label}</div>
          <div className="mt-1 text-2xl font-semibold">{item.value}</div>
          {item.sub ? <div className="mt-1 text-xs text-muted">{item.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}
