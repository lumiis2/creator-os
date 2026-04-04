import { z } from "zod";
import type { NewAnalyticsSnapshot, NewVideoMetric } from "@creator-os/db";
import { computeEngagementRate } from "./compute";

// Zod schemas to validate YouTube API responses before use
const channelStatsSchema = z.object({
  id: z.string(),
  snippet: z.object({
    title: z.string().optional(),
  }).optional(),
  statistics: z.object({
    subscriberCount: z.string(),
    viewCount: z.string(),
    videoCount: z.string(),
  }),
});

const videoItemSchema = z.object({
  id: z.string(),
  snippet: z.object({
    title: z.string().optional(),
    publishedAt: z.string().optional(),
    thumbnails: z.record(z.object({ url: z.string().url().optional() })).optional(),
  }),
  statistics: z.object({
    viewCount: z.string().optional(),
    likeCount: z.string().optional(),
    commentCount: z.string().optional(),
  }).optional(),
  contentDetails: z.object({
    duration: z.string().optional(),
  }).optional(),
});

const analyticsReportSchema = z.object({
  viewsLast7d: z.number(),
  viewsLast30d: z.number(),
  subsGained7d: z.number(),
  avgEr7d: z.number().nullable(),
  snapshotDate: z.string(),
});

export function normaliseChannelSnapshot(params: {
  userId: string;
  connectionId: string;
  platform: string;
  channel: unknown;
  report: unknown;
}): NewAnalyticsSnapshot {
  const channelParsed = channelStatsSchema.parse(params.channel);
  const reportParsed = analyticsReportSchema.parse(params.report);

  return {
    userId: params.userId,
    connectionId: params.connectionId,
    platform: params.platform,
    snapshotDate: new Date(reportParsed.snapshotDate),
    subscribers: Number(channelParsed.statistics.subscriberCount),
    totalViews: Number(channelParsed.statistics.viewCount),
    totalVideos: Number(channelParsed.statistics.videoCount),
    views7d: reportParsed.viewsLast7d,
    views30d: reportParsed.viewsLast30d,
    subsGained7d: reportParsed.subsGained7d,
    avgEr7d: reportParsed.avgEr7d === null ? null : reportParsed.avgEr7d,
    rawPayload: params.channel as object,
  } as unknown as NewAnalyticsSnapshot;
}

export function normaliseVideoMetrics(params: {
  userId: string;
  connectionId: string;
  platform: string;
  videos: unknown[];
}): NewVideoMetric[] {
  const items = params.videos.map((v) => videoItemSchema.parse(v));

  return items.map((item) => {
    const views = Number(item.statistics?.viewCount ?? 0);
    const likes = Number(item.statistics?.likeCount ?? 0);
    const comments = Number(item.statistics?.commentCount ?? 0);
    const publishedAt = item.snippet.publishedAt ? new Date(item.snippet.publishedAt) : null;
    const er = computeEngagementRate(views, likes, comments, 0);

    // Pick highest-resolution thumbnail available
    const thumbUrl = item.snippet.thumbnails
      ? Object.values(item.snippet.thumbnails)
          .filter((t) => t?.url)
          .sort((a, b) => (b?.url?.length ?? 0) - (a?.url?.length ?? 0))[0]?.url
      : undefined;

    return {
      userId: params.userId,
      connectionId: params.connectionId,
      platform: params.platform,
      platformVideoId: item.id,
      title: item.snippet.title,
      thumbnailUrl: thumbUrl,
      publishedAt: publishedAt ?? undefined,
      durationSecs: undefined,
      views,
      likes,
      comments,
      shares: 0,
      watchTimeMins: 0,
      estimatedRevenue: null,
      engagementRate: er === null ? null : er,
      workspaceItemId: null,
      perfScore: null,
      syncedAt: new Date(),
    } as unknown as NewVideoMetric;
  });
}

export function buildAnalyticsReportFromVideos(videos: NewVideoMetric[]): { viewsLast7d: number; viewsLast30d: number; subsGained7d: number; avgEr7d: number | null; snapshotDate: string } {
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  const views7d = videos
    .filter((v) => v.publishedAt && v.publishedAt >= daysAgo(7))
    .reduce((sum, v) => sum + (v.views ?? 0), 0);

  const views30d = videos
    .filter((v) => v.publishedAt && v.publishedAt >= daysAgo(30))
    .reduce((sum, v) => sum + (v.views ?? 0), 0);

  const engagementRates: number[] = [];
  videos.forEach((v) => {
    if (typeof v.engagementRate === "number") {
      engagementRates.push(v.engagementRate);
      return;
    }

    if (typeof v.engagementRate === "string") {
      const parsed = Number(v.engagementRate);
      if (!Number.isNaN(parsed)) engagementRates.push(parsed);
    }
  });

  const avgEr = engagementRates.length ? engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length : null;

  return {
    viewsLast7d: views7d,
    viewsLast30d: views30d,
    subsGained7d: 0,
    avgEr7d: avgEr,
    snapshotDate: now.toISOString().slice(0, 10),
  };
}
