"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendPoint } from "@/hooks/use-analytics";

interface ViewsChartProps {
  data: TrendPoint[];
  mode: "youtube" | "instagram" | "combined";
}

export function ViewsChart({ data, mode }: ViewsChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/70 text-sm text-zinc-400">
        No trend data yet.
      </div>
    );
  }

  return (
    <div className="h-64 rounded-lg border border-zinc-800 bg-zinc-900/70 p-4 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.75)]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="studioPrimaryWave" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="studioInstaWave" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f472b6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f472b6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="studioTotalWave" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} />
          <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <Tooltip contentStyle={{ background: "#0b1021", border: "1px solid #1f2937" }} />
          {mode === "combined" ? (
            <>
              <Area type="monotone" dataKey="totalViews7d" name="Total" stroke="#f59e0b" fill="url(#studioTotalWave)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Area type="monotone" dataKey="youtubeViews7d" name="YouTube" stroke="#60a5fa" fill="url(#studioPrimaryWave)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Area type="monotone" dataKey="instagramViews7d" name="Instagram" stroke="#f472b6" fill="url(#studioInstaWave)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </>
          ) : (
            <Area
              type="monotone"
              dataKey={mode === "youtube" ? "youtubeViews7d" : "instagramViews7d"}
              stroke={mode === "youtube" ? "#60a5fa" : "#f472b6"}
              fill={mode === "youtube" ? "url(#studioPrimaryWave)" : "url(#studioInstaWave)"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
