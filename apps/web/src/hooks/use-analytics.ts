import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
  } | null;
  syncedAt: string | null;
  synced: boolean;
}

export interface TrendPoint {
  date: string;
  views7d: number | null;
  subscribers: number | null;
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

async function fetchSnapshot(): Promise<SnapshotResponse> {
  const res = await fetch("/api/analytics/snapshot", { cache: "no-store" });
  if (!res.ok) throw new HttpError(res.status, "Failed to load snapshot");
  return res.json();
}

async function fetchTrends(): Promise<TrendsResponse> {
  const res = await fetch("/api/analytics/trends", { cache: "no-store" });
  if (!res.ok) throw new HttpError(res.status, "Failed to load trends");
  return res.json();
}

async function fetchVideos(): Promise<VideosResponse> {
  const res = await fetch("/api/analytics/videos?limit=10&offset=0&sort=views&direction=desc", { cache: "no-store" });
  if (!res.ok) throw new HttpError(res.status, "Failed to load videos");
  return res.json();
}

async function triggerSync() {
  const res = await fetch("/api/analytics/sync", { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { details?: string; error?: string }).details ?? (data as { error?: string }).error ?? "Failed to sync analytics");
  }
  return data;
}

export function useAnalytics() {
  const queryClient = useQueryClient();

  const snapshot = useQuery({
    queryKey: ["snapshot"],
    queryFn: fetchSnapshot,
    retry: (count, error) => {
      if (error instanceof HttpError && error.status === 401) return false;
      return count < 2;
    },
  });

  const trends = useQuery({
    queryKey: ["trends"],
    queryFn: fetchTrends,
    retry: (count, error) => {
      if (error instanceof HttpError && error.status === 401) return false;
      return count < 2;
    },
  });

  const videos = useQuery({
    queryKey: ["videos", 10, 0],
    queryFn: fetchVideos,
    retry: (count, error) => {
      if (error instanceof HttpError && error.status === 401) return false;
      return count < 2;
    },
  });

  const syncMutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["trends"] }),
        queryClient.invalidateQueries({ queryKey: ["videos"] }),
      ]);
    },
  });

  return {
    snapshot,
    trends,
    videos,
    syncMutation,
  };
}
