"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface RetentionPoint {
  second: number;
  retentionPct: number;
}

interface RetentionChartProps {
  data: RetentionPoint[];
}

function formatClock(second: number): string {
  const safe = Math.max(0, Math.round(second));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function RetentionChart({ data }: RetentionChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/70 text-sm text-zinc-400">
        No retention data available.
      </div>
    );
  }

  return (
    <div className="h-72 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.75)]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="retentionWave" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="second"
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            axisLine={{ stroke: "#3f3f46" }}
            tickLine={false}
            tickFormatter={formatClock}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{ background: "#0b1021", border: "1px solid #1f2937" }}
            formatter={(value: number) => `${value.toFixed(1)}%`}
            labelFormatter={(label) => `At ${formatClock(Number(label))}`}
          />
          <Area
            type="monotone"
            dataKey="retentionPct"
            stroke="#a78bfa"
            fill="url(#retentionWave)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
