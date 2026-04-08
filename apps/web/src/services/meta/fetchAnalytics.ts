export interface FacebookPageInsightsResult {
  pageId: string;
  values: Record<string, number | null>;
  raw: unknown;
}

export interface InstagramInsightsResult {
  igUserId: string;
  values: Record<string, number | null>;
  raw: unknown;
}

const GRAPH_BASE = "https://graph.facebook.com/v19.0";

async function graphRequest<T>(path: string, accessToken: string, query?: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.searchParams.set("access_token", accessToken);

  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { error?: { message?: string } }).error?.message ?? "Meta API request failed";
    throw new Error(message);
  }

  return body as T;
}

function extractLatestMetricValue(entry: any): number | null {
  const candidate = Array.isArray(entry?.values) ? entry.values[0]?.value : null;
  if (typeof candidate === "number") return candidate;
  if (typeof candidate === "string") {
    const parsed = Number(candidate);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function fetchFacebookPageInsights(pageId: string, token: string): Promise<FacebookPageInsightsResult> {
  const metrics = ["page_impressions", "page_post_engagements", "page_fans"];

  const data = await graphRequest<{ data?: any[] }>(`/${pageId}/insights`, token, {
    metric: metrics.join(","),
    period: "day",
    date_preset: "last_28d",
  });

  const values: Record<string, number | null> = {};
  for (const metric of metrics) {
    const row = (data.data ?? []).find((item) => item?.name === metric);
    values[metric] = extractLatestMetricValue(row);
  }

  return {
    pageId,
    values,
    raw: data,
  };
}

export async function fetchInstagramInsights(igUserId: string, token: string): Promise<InstagramInsightsResult> {
  const metrics = ["reach", "impressions", "profile_views"];

  const data = await graphRequest<{ data?: any[] }>(`/${igUserId}/insights`, token, {
    metric: metrics.join(","),
    period: "day",
  });

  const values: Record<string, number | null> = {};
  for (const metric of metrics) {
    const row = (data.data ?? []).find((item) => item?.name === metric);
    values[metric] = extractLatestMetricValue(row);
  }

  return {
    igUserId,
    values,
    raw: data,
  };
}
