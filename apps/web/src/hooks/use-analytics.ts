import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type DashboardPlatform = "youtube" | "instagram" | "combined";

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
    reach7d?: number;
  } | null;
  syncedAt: string | null;
  synced: boolean;
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
    title: string | null;
    publishedAt: string | null;
    views: number | null;
    likes: number | null;
    comments: number | null;
  }>;
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

async function fetchVideosByPlatform(platform: DashboardPlatform): Promise<VideosResponse> {
  const res = await fetch(`/api/analytics/videos?limit=10&offset=0&sort=views&direction=desc&platform=${platform}`, { cache: "no-store" });
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

export function useAnalytics(platform: DashboardPlatform = "youtube") {
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
    queryKey: ["videos", platform, 10, 0],
    queryFn: () => fetchVideosByPlatform(platform),
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
    legacy: {
      fetchSnapshot,
      fetchTrends,
      fetchVideos,
    },
  };
}
