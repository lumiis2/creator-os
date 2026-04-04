"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendPoint } from "@/hooks/use-analytics";

interface ViewsChartProps {
  data: TrendPoint[];
}

export function ViewsChart({ data }: ViewsChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-card text-sm text-muted">
        No trend data yet.
      </div>
    );
  }

  return (
    <div className="h-64 rounded-lg border border-border bg-card p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <Tooltip contentStyle={{ background: "#0b1021", border: "1px solid #1f2937" }} />
          <Line type="monotone" dataKey="views7d" stroke="#60a5fa" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
