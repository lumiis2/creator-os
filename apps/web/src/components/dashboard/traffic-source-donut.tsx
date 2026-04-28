"use client";

import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { Compass } from "lucide-react";

interface TrafficSourcePoint {
  source: string;
  views: number;
}

interface TrafficSourceDonutProps {
  data: TrafficSourcePoint[];
}

const COLORS = ["#60a5fa", "#a78bfa", "#f472b6", "#f59e0b", "#34d399", "#f87171"];

export function TrafficSourceDonut({ data }: TrafficSourceDonutProps) {
  const safeData = data.filter((item) => Number.isFinite(item.views) && item.views > 0);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.75)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-100">Traffic Sources</h3>
        <Compass className="h-4 w-4 text-zinc-400" />
      </div>

      {!safeData.length ? (
        <div className="flex h-56 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/70 text-sm text-zinc-500">
          No traffic source data yet.
        </div>
      ) : (
        <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={safeData}
                  innerRadius={58}
                  outerRadius={86}
                  paddingAngle={2}
                  dataKey="views"
                  nameKey="source"
                >
                  {safeData.map((entry, index) => (
                    <Cell key={entry.source} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#0a0a0a", border: "1px solid #27272a", borderRadius: 8 }}
                  formatter={(value: number) => value.toLocaleString()}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-1 grid gap-2 text-xs text-zinc-300">
            {safeData.slice(0, 5).map((item, index) => (
              <div key={item.source} className="flex items-center justify-between rounded-md border border-zinc-800 px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="capitalize">{item.source}</span>
                </div>
                <span className="font-medium text-zinc-100">{item.views.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
