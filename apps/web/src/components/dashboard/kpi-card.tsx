import { Activity, BarChart3, Eye, LineChart, LucideIcon, Users } from "lucide-react";

export interface KpiCardItem {
  label: string;
  value: string;
  sub?: string;
}

interface KpiCardProps {
  items: KpiCardItem[];
}

function iconForLabel(label: string): LucideIcon {
  if (label.toLowerCase().includes("subscriber")) return Users;
  if (label.toLowerCase().includes("engagement")) return Activity;
  if (label.toLowerCase().includes("reach")) return BarChart3;
  if (label.toLowerCase().includes("profile")) return LineChart;
  return Eye;
}

export function KpiCard({ items }: KpiCardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {items.map((item) => {
        const Icon = iconForLabel(item.label);
        return (
          <div key={item.label} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.75)]">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>{item.label}</span>
              <Icon className="h-4 w-4" />
            </div>
            <div className="mt-1 text-2xl font-semibold text-zinc-100">{item.value}</div>
            {item.sub ? <div className="mt-1 text-xs text-zinc-400">{item.sub}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
