"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendPoint } from "@/hooks/use-analytics";

interface ViewsChartProps {
  data: TrendPoint[];
  mode: "youtube" | "instagram" | "combined";
}

export function ViewsChart({ data, mode }: ViewsChartProps) {
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
          {mode === "combined" ? (
            <>
              <Line type="monotone" dataKey="totalViews7d" name="Total" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="youtubeViews7d" name="YouTube" stroke="#60a5fa" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="instagramViews7d" name="Instagram" stroke="#f472b6" strokeWidth={2} dot={false} />
            </>
          ) : (
            <Line
              type="monotone"
              dataKey={mode === "youtube" ? "youtubeViews7d" : "instagramViews7d"}
              stroke={mode === "youtube" ? "#60a5fa" : "#f472b6"}
              strokeWidth={2}
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
