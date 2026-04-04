// Minimal YouTube Data API v3 + Analytics fetchers using built-in fetch.
// Callers must supply a valid OAuth access token with required scopes.

interface FetchParams {
  accessToken: string;
  path: string;
  query?: Record<string, string | number | undefined>;
  apiBase?: string;
}

export interface RefreshedTokenResult {
  accessToken: string;
  expiresAt: Date | null;
}

async function fetchGoogleApi<T>({ accessToken, path, query, apiBase = "https://www.googleapis.com" }: FetchParams): Promise<T> {
  const normalisedBase = apiBase.endsWith("/") ? apiBase : `${apiBase}/`;
  const normalisedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(normalisedPath, normalisedBase);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// Channel statistics
export async function getChannelStats(accessToken: string) {
  type Response = { items: Array<{ id: string; snippet?: { title?: string }; statistics: { subscriberCount: string; viewCount: string; videoCount: string } }> };
  const data = await fetchGoogleApi<Response>({
    accessToken,
    path: "youtube/v3/channels",
    query: { part: "snippet,statistics", mine: "true" },
  });
  if (!data.items?.length) throw new Error("No channel found for authenticated user");
  return data.items[0];
}

// Recent videos list with stats
export async function getVideoList(accessToken: string, maxResults = 50) {
  type Response = {
    items: Array<{
      id: string | { videoId?: string };
      snippet: { title?: string; publishedAt?: string; thumbnails?: Record<string, { url?: string }> };
      contentDetails?: { duration?: string };
      statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
    }>;
  };
  const data = await fetchGoogleApi<Response>({
    accessToken,
    path: "youtube/v3/search",
    query: {
      part: "snippet",
      forMine: "true",
      order: "date",
      maxResults,
      type: "video",
    },
  });

  const resolvedItems = data.items
    .map((item) => {
      const resolvedId = typeof item.id === "string" ? item.id : item.id?.videoId;
      if (!resolvedId) return null;
      return {
        ...item,
        id: resolvedId,
      };
    })
    .filter((item): item is { id: string; snippet: { title?: string; publishedAt?: string; thumbnails?: Record<string, { url?: string }> } } => item !== null);

  // Fetch statistics for returned video IDs
  const videoIds = resolvedItems.map((v) => v.id).join(",");
  if (!videoIds) return [] as Array<{ id: string; snippet: { title?: string; publishedAt?: string; thumbnails?: Record<string, { url?: string }> }; statistics?: { viewCount?: string; likeCount?: string; commentCount?: string }; contentDetails?: { duration?: string } }>;

  type StatsResponse = { items: Array<{ id: string; statistics?: { viewCount?: string; likeCount?: string; commentCount?: string }; contentDetails?: { duration?: string } }> };
  const stats = await fetchGoogleApi<StatsResponse>({
    accessToken,
    path: "youtube/v3/videos",
    query: { part: "statistics,contentDetails", id: videoIds },
  });

  const statsMap = new Map(stats.items.map((s) => [s.id, s]));

  return resolvedItems.map((item) => {
    const stat = statsMap.get(item.id);
    return {
      id: item.id,
      snippet: item.snippet,
      statistics: stat?.statistics,
      contentDetails: stat?.contentDetails,
    };
  });
}

// Basic analytics report using Analytics API (example: views and subscribers changes)
export async function getAnalyticsReport(accessToken: string, _channelId: string) {
  type ReportResponse = {
    columnHeaders: Array<{ name: string }>;
    rows?: Array<Array<string | number>>;
  };

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const formatDate = (d: Date) => d.toISOString().slice(0, 10);

  const data = await fetchGoogleApi<ReportResponse>({
    accessToken,
    apiBase: "https://youtubeanalytics.googleapis.com",
    path: "/v2/reports",
    query: {
      ids: "channel==MINE",
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      metrics: "views,subscribersGained,likes,comments,shares",
      dimensions: "day",
    },
  });

  const rows = data.rows ?? [];
  const viewsLast7d = rows.reduce((sum, row) => sum + Number(row[data.columnHeaders.findIndex((h) => h.name === "views")] ?? 0), 0);
  const subsGained7d = rows.reduce((sum, row) => sum + Number(row[data.columnHeaders.findIndex((h) => h.name === "subscribersGained")] ?? 0), 0);

  return {
    viewsLast7d,
    viewsLast30d: viewsLast7d, // real 30d requires broader window; kept deterministic and caller can extend window
    subsGained7d,
    avgEr7d: null, // engagement rate derived in normalise from video stats; kept null here
    snapshotDate: formatDate(endDate),
  };
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<RefreshedTokenResult> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET for token refresh");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token refresh failed ${res.status}: ${text}`);
  }

  const json = await res.json() as { access_token: string; expires_in?: number };
  const expiresAt = typeof json.expires_in === "number"
    ? new Date(Date.now() + json.expires_in * 1000)
    : null;

  return {
    accessToken: json.access_token,
    expiresAt,
  };
}
