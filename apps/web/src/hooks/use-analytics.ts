import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type DashboardPlatform = "youtube" | "instagram" | "combined";
export interface UseAnalyticsParams {
  platform?: DashboardPlatform;
  videoId?: string;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface SnapshotResponse {
  data: {
    subscribers: number;
    totalViews: number;
    views7d: number;
    views7dChange: number | null;
    subsGained7d: number;
    avgEngagementRate7d: number | null;
    dataAsOf: string;
    platform: string;
    platformType: string;
    averageViewPercentage: number | null;
    impressions: number | null;
    trafficSourceType: string | null;
    trafficSources: Array<{ source: string; views: number }>;
    retention: { averageViewPercentage: number; averageViewDuration: number };
    demographics: Array<{ ageGroup: string; gender: string; count: number }>;
    reach: { impressions: number; ctr: number };
  } | null;
  syncedAt: string | null;
  synced: boolean;
  platform_type: string;
}

export interface TrendPoint {
  date: string;
  totalViews7d: number | null;
  youtubeViews7d: number | null;
  instagramViews7d: number | null;
}

export interface TrendsResponse {
  data: TrendPoint[];
}

export interface VideosResponse {
  data: Array<{
    id: string;
    dbId: string;
    title: string | null;
    thumbnailUrl: string | null;
    publishedAt: string | null;
    views: number | null;
    likes: number | null;
    comments: number | null;
    watchTimeHours: number;
    subsGained: number;
    averageViewDurationSeconds: number;
    averageViewPercentage: number;
    durationSecs: number;
  }>;
  selectedVideo: {
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
    retentionCurve: Array<{ second: number; retentionPct: number }>;
  } | null;
}

export interface InstagramInsightMetric {
  name: string;
  title: string;
  description: string | null;
  period: string | null;
  value: number | null;
}

export interface InstagramInsightsResponse {
  hasSnapshot: boolean;
  mapped?: {
    snapshotDate: string;
    views7d: number | null;
    views30d: number | null;
    totalViews: number | null;
    createdAt: string;
  };
  windows: {
    last7d: InstagramInsightMetric[];
    last30d: InstagramInsightMetric[];
  };
}

export interface YouTubeTrafficSource {
  source: string;
  views: number;
}

export interface YouTubeRetention {
  averageViewPercentage: number;
  averageViewDuration: number;
}

export interface YouTubeDemographicPoint {
  ageGroup: string;
  gender: string;
  count: number;
}

export interface YouTubeReach {
  impressions: number;
  ctr: number;
}

export interface YouTubeAnalyticsResponse {
  trafficSources: YouTubeTrafficSource[];
  retention: YouTubeRetention;
  demographics: YouTubeDemographicPoint[];
  reach: YouTubeReach;
}

async function fetchSnapshot(): Promise<SnapshotResponse> {
  const res = await fetch("/api/analytics/snapshot", { cache: "no-store" });
  if (!res.ok) throw new HttpError(res.status, "Failed to load snapshot");
  return res.json();
}

async function fetchSnapshotByPlatform(platform: DashboardPlatform): Promise<SnapshotResponse> {
  const res = await fetch(`/api/analytics/snapshot?platform=${platform}`, { cache: "no-store" });
  if (!res.ok) throw new HttpError(res.status, "Failed to load snapshot");
  return res.json();
}

async function fetchTrends(): Promise<TrendsResponse> {
  const res = await fetch("/api/analytics/trends", { cache: "no-store" });
  if (!res.ok) throw new HttpError(res.status, "Failed to load trends");
  return res.json();
}

async function fetchTrendsByPlatform(platform: DashboardPlatform): Promise<TrendsResponse> {
  const res = await fetch(`/api/analytics/trends?platform=${platform}`, { cache: "no-store" });
  if (!res.ok) throw new HttpError(res.status, "Failed to load trends");
  return res.json();
}

async function fetchVideos(): Promise<VideosResponse> {
  const res = await fetch("/api/analytics/videos?limit=10&offset=0&sort=views&direction=desc", { cache: "no-store" });
  if (!res.ok) throw new HttpError(res.status, "Failed to load videos");
  return res.json();
}

async function fetchVideosByPlatform(platform: DashboardPlatform, videoId?: string): Promise<VideosResponse> {
  const params = new URLSearchParams({
    limit: videoId ? "1" : "10",
    offset: "0",
    sort: "views",
    direction: "desc",
    platform,
  });
  if (videoId) params.set("videoId", videoId);

  const res = await fetch(`/api/analytics/videos?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new HttpError(res.status, "Failed to load videos");
  return res.json();
}

async function fetchInstagramInsights(): Promise<InstagramInsightsResponse> {
  const res = await fetch("/api/analytics/instagram/insights", { cache: "no-store" });
  if (!res.ok) throw new HttpError(res.status, "Failed to load Instagram insights");
  return res.json();
}

async function triggerSync(platform: DashboardPlatform) {
  const res = await fetch("/api/analytics/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ platform }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { details?: string; error?: string }).details ?? (data as { error?: string }).error ?? "Failed to sync analytics");
  }
  return data;
}

export function useAnalytics(input: DashboardPlatform | UseAnalyticsParams = "youtube") {
  const platform = typeof input === "string" ? input : (input.platform ?? "youtube");
  const videoId = typeof input === "string" ? undefined : input.videoId;
  const queryClient = useQueryClient();

  const snapshot = useQuery({
    queryKey: ["snapshot", platform],
    queryFn: () => fetchSnapshotByPlatform(platform),
    retry: (count, error) => {
      if (error instanceof HttpError && error.status === 401) return false;
      return count < 2;
    },
  });

  const trends = useQuery({
    queryKey: ["trends", platform],
    queryFn: () => fetchTrendsByPlatform(platform),
    retry: (count, error) => {
      if (error instanceof HttpError && error.status === 401) return false;
      return count < 2;
    },
  });

  const videos = useQuery({
    queryKey: ["videos", platform, videoId ?? "all", videoId ? 1 : 10, 0],
    queryFn: () => fetchVideosByPlatform(platform, videoId),
    enabled: platform === "youtube",
    retry: (count, error) => {
      if (error instanceof HttpError && error.status === 401) return false;
      return count < 2;
    },
  });

  const syncMutation = useMutation({
    mutationFn: (syncPlatform: DashboardPlatform) => triggerSync(syncPlatform),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["trends"] }),
        queryClient.invalidateQueries({ queryKey: ["videos"] }),
        queryClient.invalidateQueries({ queryKey: ["instagram-insights"] }),
      ]);
    },
  });

  const instagramInsights = useQuery({
    queryKey: ["instagram-insights"],
    queryFn: fetchInstagramInsights,
    enabled: platform === "instagram",
    retry: (count, error) => {
      if (error instanceof HttpError && error.status === 401) return false;
      return count < 2;
    },
  });

  return {
    snapshot,
    trends,
    videos,
    instagramInsights,
    syncMutation,
    platform,
    videoId,
    legacy: {
      fetchSnapshot,
      fetchTrends,
      fetchVideos,
    },
  };
}
