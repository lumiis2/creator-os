import type { InternalMetric } from "@creator-os/types";

export function normalizeYouTubeToInternalMetric(input: {
  snapshotDate: Date;
  views7d: number | null;
  subscribers: number | null;
  avgEr7d: number | null;
}): InternalMetric {
  return {
    platform: "youtube",
    date: input.snapshotDate.toISOString().slice(0, 10),
    views: input.views7d ?? 0,
    reach: null,
    subscribers: input.subscribers,
    likes: null,
    comments: null,
    engagementRate: input.avgEr7d,
  };
}

export function normalizeInstagramToInternalMetric(input: {
  snapshotDate: Date;
  impressions7d: number;
  reach7d: number;
}): InternalMetric {
  return {
    platform: "instagram",
    date: input.snapshotDate.toISOString().slice(0, 10),
    views: input.impressions7d,
    reach: input.reach7d,
    subscribers: null,
    likes: null,
    comments: null,
    engagementRate: null,
  };
}
