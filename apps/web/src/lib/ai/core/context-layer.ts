import type { AnalyticsSummary } from "@/lib/analytics/compute";

interface RecentPerformancePoint {
  date: Date;
  views7d: number | null;
  subsGained7d: number | null;
}

interface TopVideoPoint {
  title: string | null;
  views: number;
  engagementRate: number | null;
}

interface ProfileContext {
  displayName?: string | null;
  niche?: string | null;
  subNiche?: string | null;
  contentStyle?: string[] | null;
  audienceDesc?: string | null;
  postingGoalFreq?: number | null;
}

export interface ContextLayerInput {
  profile: ProfileContext | null;
  analyticsSummary: AnalyticsSummary | null;
  recentPerformance: RecentPerformancePoint[];
  topVideos: TopVideoPoint[];
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0] ?? "unknown";
}

export function buildContextLayer(input: ContextLayerInput): string {
  const profile = input.profile;

  const profileBlock = profile
    ? [
        "=== Profile Data ===",
        `creator_name: ${profile.displayName ?? "unknown"}`,
        `niche: ${profile.niche ?? "unknown"}`,
        `sub_niche: ${profile.subNiche ?? "unknown"}`,
        `content_style: ${profile.contentStyle?.length ? profile.contentStyle.join(", ") : "unknown"}`,
        `audience_desc: ${profile.audienceDesc ?? "unknown"}`,
        `posting_goal_freq_per_week: ${profile.postingGoalFreq ?? "unknown"}`,
      ].join("\n")
    : "=== Profile Data ===\nNo profile data available.";

  const analyticsBlock = input.analyticsSummary
    ? [
        "=== Analytics Summary ===",
        `platform: ${input.analyticsSummary.platform}`,
        `views_7d: ${input.analyticsSummary.views7d.toLocaleString()}`,
        `views_7d_change_percent: ${input.analyticsSummary.views7dChange !== null ? input.analyticsSummary.views7dChange.toFixed(1) : "n/a"}`,
        `subscribers: ${input.analyticsSummary.subscribers.toLocaleString()}`,
        `subs_gained_7d: ${input.analyticsSummary.subsGained7d.toLocaleString()}`,
        `avg_engagement_rate_7d: ${input.analyticsSummary.avgEngagementRate7d !== null ? input.analyticsSummary.avgEngagementRate7d.toFixed(2) : "n/a"}`,
        `data_as_of: ${formatDate(input.analyticsSummary.dataAsOf)}`,
      ].join("\n")
    : "=== Analytics Summary ===\nNo analytics data available yet.";

  const recentPerformanceBlock = input.recentPerformance.length
    ? [
        "=== Recent Performance ===",
        ...input.recentPerformance.map((row, idx) =>
          `${idx + 1}. date=${formatDate(row.date)}, views_7d=${(row.views7d ?? 0).toLocaleString()}, subs_gained_7d=${row.subsGained7d ?? 0}`),
      ].join("\n")
    : "=== Recent Performance ===\nNo recent performance timeline available.";

  const topVideosBlock = input.topVideos.length
    ? [
        "=== Top Videos ===",
        ...input.topVideos.map((video, idx) =>
          `${idx + 1}. title=${video.title ?? "Untitled"}; views=${video.views.toLocaleString()}; engagement_rate=${video.engagementRate !== null ? `${video.engagementRate.toFixed(2)}%` : "n/a"}`),
      ].join("\n")
    : "=== Top Videos ===\nNo video-level performance data available.";

  return [profileBlock, analyticsBlock, recentPerformanceBlock, topVideosBlock].join("\n\n");
}
