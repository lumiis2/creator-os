import type { AnalyticsSnapshot, VideoMetric } from "@creator-os/db";

// All functions are pure and deterministic.
export function computeEngagementRate(views: number, likes: number, comments: number, shares: number): number | null {
  if (views === 0) return null;
  return ((likes + comments + shares) / views) * 100;
}

export function computeGrowthRate(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export interface AnalyticsSummary {
  subscribers: number;
  totalViews: number;
  views7d: number;
  views7dChange: number | null;
  subsGained7d: number;
  avgEngagementRate7d: number | null;
  dataAsOf: Date;
  platform: string;
}

export function buildAnalyticsSummary(
  current: AnalyticsSnapshot,
  previous: AnalyticsSnapshot | null,
): AnalyticsSummary {
  return {
    subscribers: current.subscribers ?? 0,
    totalViews: current.totalViews ?? 0,
    views7d: current.views7d ?? 0,
    views7dChange: previous?.views7d
      ? computeGrowthRate(current.views7d ?? 0, previous.views7d)
      : null,
    subsGained7d: current.subsGained7d ?? 0,
    avgEngagementRate7d: current.avgEr7d ? Number(current.avgEr7d) : null,
    dataAsOf: current.createdAt,
    platform: current.platform,
  };
}

export function formatAnalyticsForAI(summary: AnalyticsSummary): string {
  const changeStr = summary.views7dChange !== null
    ? `(${summary.views7dChange > 0 ? "+" : ""}${summary.views7dChange.toFixed(1)}% vs prev 7d)`
    : "(no comparison data)";

  return [
    `=== Performance Summary (${summary.platform}, last 7 days) ===`,
    `Total views: ${summary.views7d.toLocaleString()} ${changeStr}`,
    `Subscribers: ${summary.subscribers.toLocaleString()} (+${summary.subsGained7d} this week)`,
    summary.avgEngagementRate7d !== null
      ? `Avg engagement rate: ${summary.avgEngagementRate7d.toFixed(1)}%`
      : "Avg engagement rate: insufficient data",
    `Data as of: ${summary.dataAsOf.toISOString().split("T")[0]}`,
  ].join("\n");
}

export interface CompressedAnalyticsContext {
  summary: AnalyticsSummary;
  topVideos: VideoMetric[];
  bottomVideo: VideoMetric | null;
}

export function compressAnalyticsContext(
  summary: AnalyticsSummary,
  videos: VideoMetric[],
): CompressedAnalyticsContext {
  const sorted = [...videos].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
  const topVideos = sorted.slice(0, 3);
  const bottomVideo = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  return { summary, topVideos, bottomVideo };
}
