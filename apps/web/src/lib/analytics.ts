import type {
  AnalyticsPlatformType,
  AnalyticsSummary,
  AudienceDemographic,
  ReachMetrics,
  RetentionMetrics,
  TrafficSourceBreakdown,
  RetentionCurvePoint,
} from "./analytics/compute";
import { buildRetentionCurve, computeAverageViewPercentage, filterVideosById } from "./analytics/compute";
import type { VideoMetric } from "@creator-os/db";

export type DashboardPlatform = "youtube" | "instagram" | "facebook" | "combined";

export function resolvePlatformType(platform: DashboardPlatform): AnalyticsPlatformType {
  if (platform === "youtube") return "youtube_channel";
  if (platform === "instagram") return "instagram_business";
  if (platform === "facebook") return "facebook_page";
  if (platform === "combined") return "combined";
  return "unknown";
}

function fallbackTrafficSources(views7d: number): TrafficSourceBreakdown[] {
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

function fallbackRetention(summary: Pick<AnalyticsSummary, "avgEngagementRate7d" | "views7d">): RetentionMetrics {
  return {
    averageViewPercentage: Math.min(Math.max((summary.avgEngagementRate7d ?? 35) * 1.15, 8), 92),
    averageViewDuration: Math.max(18, Math.round((summary.views7d || 0) / 500) + 24),
  };
}

function fallbackDemographics(summary: Pick<AnalyticsSummary, "totalViews" | "views7d" | "subscribers">): AudienceDemographic[] {
  const total = Math.max(summary.totalViews, summary.views7d, summary.subscribers, 1000);
  return [
    { ageGroup: "25-34", gender: "Male", count: Math.round(total * 0.42) },
    { ageGroup: "18-24", gender: "Female", count: Math.round(total * 0.28) },
    { ageGroup: "35-44", gender: "Male", count: Math.round(total * 0.17) },
    { ageGroup: "25-34", gender: "Female", count: Math.round(total * 0.13) },
  ];
}

function fallbackReach(summary: Pick<AnalyticsSummary, "totalViews" | "views7d">): ReachMetrics {
  const impressions = Math.max(summary.totalViews * 2, summary.views7d * 4, 1000);
  const ctr = Math.min(Math.max((summary.views7d / Math.max(impressions, 1)) * 100, 1.2), 12.5);
  return { impressions, ctr };
}

export function buildStudioFallbackSummary(
  platform: DashboardPlatform,
  overrides?: Partial<Pick<AnalyticsSummary, "views7d" | "totalViews" | "subscribers" | "avgEngagementRate7d">>,
): AnalyticsSummary {
  const base = {
    subscribers: overrides?.subscribers ?? 0,
    totalViews: overrides?.totalViews ?? 0,
    views7d: overrides?.views7d ?? 0,
    views7dChange: null,
    subsGained7d: 0,
    avgEngagementRate7d: overrides?.avgEngagementRate7d ?? null,
    dataAsOf: new Date(),
    platform,
    platformType: resolvePlatformType(platform),
  } satisfies Pick<AnalyticsSummary, "subscribers" | "totalViews" | "views7d" | "views7dChange" | "subsGained7d" | "avgEngagementRate7d" | "dataAsOf" | "platform" | "platformType">;

  const trafficSources = fallbackTrafficSources(base.views7d);
  const reach = fallbackReach(base);
  const retention = fallbackRetention(base);
  const demographics = fallbackDemographics(base);

  return {
    ...base,
    averageViewPercentage: retention.averageViewPercentage,
    impressions: reach.impressions,
    trafficSourceType: trafficSources[0]?.source ?? null,
    trafficSources,
    retention,
    demographics,
    reach,
  };
}

export function buildStudioSummaryResponse(summary: AnalyticsSummary) {
  return {
    ...summary,
    platform_type: summary.platformType,
  };
}

export interface VideoPerformanceSummary {
  id: string;
  dbId: string;
  title: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  views: number;
  likes: number;
  comments: number;
  watchTimeHours: number;
  subsGained: number;
  averageViewDurationSeconds: number;
  averageViewPercentage: number;
  durationSecs: number;
  retentionCurve: RetentionCurvePoint[];
}

function estimateSubsFromVideo(video: VideoMetric): number {
  const base = (video.views ?? 0) * 0.0045;
  return Math.max(0, Math.round(base));
}

export function mapVideoPerformance(videos: VideoMetric[], videoId?: string): VideoPerformanceSummary | null {
  const filtered = filterVideosById(videos, videoId);
  const video = filtered[0];
  if (!video) return null;

  const views = video.views ?? 0;
  const watchTimeHours = (video.watchTimeMins ?? 0) / 60;
  const averageViewDurationSeconds = views > 0
    ? Math.max(1, Math.round(((video.watchTimeMins ?? 0) * 60) / views))
    : Math.max(1, Math.round((video.durationSecs ?? 90) * 0.36));

  const durationSecs = Math.max(video.durationSecs ?? 0, averageViewDurationSeconds, 30);
  const averageViewPercentage = computeAverageViewPercentage(averageViewDurationSeconds, durationSecs) ?? 0;

  return {
    id: video.platformVideoId ?? video.id,
    dbId: video.id,
    title: video.title,
    thumbnailUrl: video.thumbnailUrl,
    publishedAt: video.publishedAt ? video.publishedAt.toISOString() : null,
    views,
    likes: video.likes ?? 0,
    comments: video.comments ?? 0,
    watchTimeHours,
    subsGained: estimateSubsFromVideo(video),
    averageViewDurationSeconds,
    averageViewPercentage,
    durationSecs,
    retentionCurve: buildRetentionCurve({ durationSecs, averageViewPercentage }),
  };
}
