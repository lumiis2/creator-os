interface GraphMetricEntry {
  name?: string;
  values?: Array<{ value?: number | string }>;
  total_value?: { value?: number | string };
}

interface GraphInsightsResponse {
  data?: GraphMetricEntry[];
}

export interface InstagramInsightsSummary {
  impressions7d: number;
  impressions30d: number;
  reach7d: number;
  reach30d: number;
  profileViews7d: number;
  profileViews30d: number;
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

function numericValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function sumMetric(entries: GraphMetricEntry[], metricName: string): number {
  const metric = entries.find((item) => item.name === metricName);
  const total = metric?.total_value?.value;
  if (typeof total === "number") return total;
  if (typeof total === "string") {
    const parsed = Number(total);
    if (Number.isFinite(parsed)) return parsed;
  }

  return (metric?.values ?? []).reduce((sum, row) => sum + numericValue(row?.value), 0);
}

async function fetchInstagramWindow(params: {
  igUserId: string;
  token: string;
  days: number;
}) {
  const today = new Date();
  const since = new Date(today.getTime() - params.days * 24 * 60 * 60 * 1000);

  const data = await graphRequest<GraphInsightsResponse>(`/${params.igUserId}/insights`, params.token, {
    metric: "reach,views,content_views,profile_views",
    metric_type: "total_value",
    period: "day",
    since: since.toISOString().slice(0, 10),
    until: today.toISOString().slice(0, 10),
  });

  const entries = data.data ?? [];
  return {
    impressions: sumMetric(entries, "views") || sumMetric(entries, "content_views"),
    reach: sumMetric(entries, "reach"),
    profileViews: sumMetric(entries, "profile_views"),
    raw: data,
  };
}

export async function fetchInstagramInsightsSummary(igUserId: string, token: string): Promise<InstagramInsightsSummary> {
  const [last7d, last30d] = await Promise.all([
    fetchInstagramWindow({ igUserId, token, days: 7 }),
    fetchInstagramWindow({ igUserId, token, days: 30 }),
  ]);

  if (process.env.DEBUG_META_ANALYTICS === "true") {
    // eslint-disable-next-line no-console
    console.log("[worker][instagram][raw-insights]", {
      igUserId,
      last7d: last7d.raw,
      last30d: last30d.raw,
    });
  }

  const mapped = {
    impressions7d: last7d.impressions,
    impressions30d: last30d.impressions,
    reach7d: last7d.reach,
    reach30d: last30d.reach,
    profileViews7d: last7d.profileViews,
    profileViews30d: last30d.profileViews,
    raw: {
      last7d: last7d.raw,
      last30d: last30d.raw,
    },
  };

  if (process.env.DEBUG_META_ANALYTICS === "true") {
    // eslint-disable-next-line no-console
    console.log("[worker][instagram][mapped-values]", {
      igUserId,
      mapped,
    });
  }

  return mapped;
}
