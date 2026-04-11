export interface FacebookPageInsightsResult {
  pageId: string;
  values: Record<string, number | null>;
  raw: unknown;
}

export interface InstagramInsightsResult {
  igUserId: string;
  values: Record<string, number | null>;
  raw: {
    last7d: unknown;
    last30d: unknown;
  };
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
  const totalValue = entry?.total_value?.value;
  if (typeof totalValue === "number") return totalValue;
  if (typeof totalValue === "string") {
    const parsed = Number(totalValue);
    if (Number.isFinite(parsed)) return parsed;
  }

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
  const metrics = ["reach", "views", "content_views", "profile_views"];

  const fetchWindow = async (days: number) => {
    const today = new Date();
    const since = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    const data = await graphRequest<{ data?: any[] }>(`/${igUserId}/insights`, token, {
      metric: metrics.join(","),
      metric_type: "total_value",
      period: "day",
      since: since.toISOString().slice(0, 10),
      until: today.toISOString().slice(0, 10),
    });

    const values: Record<string, number | null> = {};
    for (const metric of metrics) {
      const row = (data.data ?? []).find((item) => item?.name === metric);
      values[metric] = extractLatestMetricValue(row);
    }

    values.impressions = values.views ?? values.content_views ?? null;

    return {
      values,
      raw: data,
    };
  };

  const [last7d, last30d] = await Promise.all([
    fetchWindow(7),
    fetchWindow(30),
  ]);

  if (process.env.DEBUG_META_ANALYTICS === "true") {
    // eslint-disable-next-line no-console
    console.log("[meta][instagram][raw-insights]", {
      igUserId,
      metrics,
      last7d: last7d.raw,
      last30d: last30d.raw,
    });
  }

  const values: Record<string, number | null> = {
    impressions_7d: last7d.values.impressions ?? null,
    impressions_30d: last30d.values.impressions ?? null,
    reach_7d: last7d.values.reach ?? null,
    reach_30d: last30d.values.reach ?? null,
    profile_views_7d: last7d.values.profile_views ?? null,
    profile_views_30d: last30d.values.profile_views ?? null,
    // backward-compatible aliases
    impressions: last7d.values.impressions ?? null,
    views: last7d.values.views ?? null,
    content_views: last7d.values.content_views ?? null,
    profile_views: last7d.values.profile_views ?? null,
    reach: last7d.values.reach ?? null,
  };

  if (process.env.DEBUG_META_ANALYTICS === "true") {
    // eslint-disable-next-line no-console
    console.log("[meta][instagram][mapped-values]", {
      igUserId,
      values,
    });
  }

  return {
    igUserId,
    values,
    raw: {
      last7d: last7d.raw,
      last30d: last30d.raw,
    },
  };
}
