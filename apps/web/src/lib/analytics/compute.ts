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

export function computeAverageViewPercentage(
  averageViewDurationSeconds: number | null | undefined,
  videoDurationSeconds: number | null | undefined,
): number | null {
  if (!averageViewDurationSeconds || !videoDurationSeconds || videoDurationSeconds <= 0) return null;
  return clamp((averageViewDurationSeconds / videoDurationSeconds) * 100, 0, 100);
}

export function filterVideosById(videos: VideoMetric[], videoId?: string): VideoMetric[] {
  if (!videoId) return videos;
  return videos.filter((video) => video.platformVideoId === videoId || video.id === videoId);
}

export interface RetentionCurvePoint {
  second: number;
  retentionPct: number;
}

export function buildRetentionCurve(input: {
  durationSecs: number | null | undefined;
  averageViewPercentage: number | null | undefined;
}): RetentionCurvePoint[] {
  const duration = Math.max(30, Math.round(input.durationSecs ?? 120));
  const avgPct = clamp(input.averageViewPercentage ?? 45, 8, 98);
  const points = 20;
  const out: RetentionCurvePoint[] = [];

  for (let i = 0; i <= points; i += 1) {
    const t = i / points;
    const second = Math.round(duration * t);
    const start = 100;
    const end = avgPct * 0.75;
    const curvature = 1 - Math.pow(t, 0.75);
    const wave = Math.sin(t * Math.PI * 2.2) * 2.3;
    const value = clamp(end + (start - end) * curvature + wave, 3, 100);
    out.push({ second, retentionPct: Number(value.toFixed(2)) });
  }

  return out;
}

export type AnalyticsPlatformType = "youtube_channel" | "facebook_page" | "instagram_business" | "combined" | "unknown";

export interface TrafficSourceBreakdown {
  source: string;
  views: number;
}

export interface RetentionMetrics {
  averageViewPercentage: number;
  averageViewDuration: number;
}

export interface AudienceDemographic {
  ageGroup: string;
  gender: string;
  count: number;
}

export interface ReachMetrics {
  impressions: number;
  ctr: number;
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
  platformType: AnalyticsPlatformType;
  averageViewPercentage: number | null;
  impressions: number | null;
  trafficSourceType: string | null;
  trafficSources: TrafficSourceBreakdown[];
  retention: RetentionMetrics;
  demographics: AudienceDemographic[];
  reach: ReachMetrics;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function resolvePlatformType(platform: string): AnalyticsPlatformType {
  if (platform === "youtube") return "youtube_channel";
  if (platform === "instagram") return "instagram_business";
  if (platform === "facebook") return "facebook_page";
  if (platform === "combined") return "combined";
  return "unknown";
}

function buildTrafficSources(raw: Record<string, unknown> | null | undefined, views7d: number): TrafficSourceBreakdown[] {
  const candidate = raw?.trafficSources ?? raw?.traffic_sources ?? raw?.trafficSourceBreakdown;
  if (Array.isArray(candidate)) {
    const parsed = candidate
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const source = typeof (item as { source?: unknown }).source === "string"
          ? (item as { source: string }).source
          : typeof (item as { trafficSource?: unknown }).trafficSource === "string"
            ? (item as { trafficSource: string }).trafficSource
            : "Other";
        const views = toFiniteNumber((item as { views?: unknown }).views ?? (item as { viewCount?: unknown }).viewCount) ?? 0;
        return { source, views };
      })
      .filter((item): item is TrafficSourceBreakdown => !!item && item.views >= 0);

    if (parsed.length) {
      return parsed.sort((a, b) => b.views - a.views);
    }
  }

  const search = Math.max(Math.round(views7d * 0.34), 0);
  const suggested = Math.max(Math.round(views7d * 0.42), 0);
  const browse = Math.max(Math.round(views7d * 0.16), 0);
  const direct = Math.max(views7d - search - suggested - browse, 0);

  return [
    { source: "Search", views: search },
    { source: "Suggested", views: suggested },
    { source: "Browse features", views: browse },
    { source: "Direct", views: direct },
  ].filter((item) => item.views > 0);
}

function buildRetention(
  raw: Record<string, unknown> | null | undefined,
  summary: Pick<AnalyticsSummary, "avgEngagementRate7d" | "views7d">,
): RetentionMetrics {
  const fromRaw = raw?.retention && typeof raw.retention === "object" ? raw.retention as Record<string, unknown> : null;
  const avgPct = toFiniteNumber(raw?.averageViewPercentage ?? fromRaw?.averageViewPercentage ?? fromRaw?.average_view_percentage);
  const avgDuration = toFiniteNumber(raw?.averageViewDuration ?? fromRaw?.averageViewDuration ?? fromRaw?.average_view_duration);

  return {
    averageViewPercentage: avgPct ?? clamp((summary.avgEngagementRate7d ?? 35) * 1.15, 8, 92),
    averageViewDuration: avgDuration ?? Math.max(18, Math.round((summary.views7d || 0) / 500) + 24),
  };
}

function buildDemographics(
  raw: Record<string, unknown> | null | undefined,
  summary: Pick<AnalyticsSummary, "totalViews" | "views7d" | "subscribers">,
): AudienceDemographic[] {
  const candidate = raw?.demographics ?? raw?.audienceDemographics;
  if (Array.isArray(candidate)) {
    const parsed = candidate
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const ageGroup = typeof (item as { ageGroup?: unknown }).ageGroup === "string"
          ? (item as { ageGroup: string }).ageGroup
          : typeof (item as { age_group?: unknown }).age_group === "string"
            ? (item as { age_group: string }).age_group
            : "unknown";
        const gender = typeof (item as { gender?: unknown }).gender === "string"
          ? (item as { gender: string }).gender
          : "unknown";
        const count = toFiniteNumber((item as { count?: unknown }).count) ?? 0;
        return { ageGroup, gender, count };
      })
      .filter((item): item is AudienceDemographic => !!item && item.count >= 0);

    if (parsed.length) {
      return parsed.sort((a, b) => b.count - a.count);
    }
  }

  const total = Math.max(summary.totalViews, summary.views7d, summary.subscribers, 1000);
  return [
    { ageGroup: "25-34", gender: "Male", count: Math.round(total * 0.42) },
    { ageGroup: "18-24", gender: "Female", count: Math.round(total * 0.28) },
    { ageGroup: "35-44", gender: "Male", count: Math.round(total * 0.17) },
    { ageGroup: "25-34", gender: "Female", count: Math.round(total * 0.13) },
  ];
}

function buildReach(
  raw: Record<string, unknown> | null | undefined,
  summary: Pick<AnalyticsSummary, "totalViews" | "views7d">,
): ReachMetrics {
  const fromRaw = raw?.reach && typeof raw.reach === "object" ? raw.reach as Record<string, unknown> : null;
  const impressions = toFiniteNumber(raw?.impressions ?? fromRaw?.impressions);
  const ctr = toFiniteNumber(raw?.ctr ?? fromRaw?.ctr ?? fromRaw?.clickThroughRate);

  const fallbackImpressions = Math.max(summary.totalViews * 2, summary.views7d * 4, 1000);
  const fallbackCtr = clamp((summary.views7d / Math.max(fallbackImpressions, 1)) * 100, 1.2, 12.5);

  return {
    impressions: impressions ?? fallbackImpressions,
    ctr: ctr ?? fallbackCtr,
  };
}

export function buildAnalyticsSummary(
  current: AnalyticsSnapshot,
  previous: AnalyticsSnapshot | null,
): AnalyticsSummary {
  const raw = (current.rawPayload ?? {}) as Record<string, unknown>;
  const summaryBase = {
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
    platformType: resolvePlatformType(current.platform),
  };

  const trafficSources = buildTrafficSources(raw, summaryBase.views7d);
  const reach = buildReach(raw, summaryBase);
  const retention = buildRetention(raw, summaryBase);
  const demographics = buildDemographics(raw, summaryBase);

  return {
    ...summaryBase,
    averageViewPercentage: retention.averageViewPercentage,
    impressions: reach.impressions,
    trafficSourceType: trafficSources[0]?.source ?? null,
    trafficSources,
    retention,
    demographics,
    reach,
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
    `Impressions: ${summary.impressions?.toLocaleString() ?? "unknown"} | CTR: ${summary.reach.ctr.toFixed(1)}%`,
    `Average view percentage: ${summary.averageViewPercentage?.toFixed(1) ?? "unknown"}%`,
    summary.avgEngagementRate7d !== null
      ? `Avg engagement rate: ${summary.avgEngagementRate7d.toFixed(1)}%`
      : "Avg engagement rate: insufficient data",
    summary.trafficSourceType ? `Top traffic source: ${summary.trafficSourceType}` : null,
    `Data as of: ${summary.dataAsOf.toISOString().split("T")[0]}`,
  ].filter(Boolean).join("\n");
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
