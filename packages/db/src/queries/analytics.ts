import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../index";
import { analyticsSnapshots } from "../schema/analytics";
import { videoMetrics } from "../schema/videoMetrics";

export type AnalyticsPlatform = "youtube" | "instagram" | "facebook";

export async function getLatestSnapshot(userId: string) {
  return db.query.analyticsSnapshots.findFirst({
    where: eq(analyticsSnapshots.userId, userId),
    orderBy: desc(analyticsSnapshots.snapshotDate),
  });
}

export async function getLatestSnapshotByPlatform(userId: string, platform: AnalyticsPlatform) {
  return db.query.analyticsSnapshots.findFirst({
    where: and(eq(analyticsSnapshots.userId, userId), eq(analyticsSnapshots.platform, platform)),
    orderBy: desc(analyticsSnapshots.snapshotDate),
  });
}

export async function getPreviousSnapshot(userId: string, offsetDays = 1) {
  const rows = await db.query.analyticsSnapshots.findMany({
    where: eq(analyticsSnapshots.userId, userId),
    orderBy: desc(analyticsSnapshots.snapshotDate),
    limit: 1,
    offset: offsetDays,
  });
  return rows[0] ?? null;
}

export async function getPreviousSnapshotByPlatform(userId: string, platform: AnalyticsPlatform, offsetDays = 1) {
  const rows = await db.query.analyticsSnapshots.findMany({
    where: and(eq(analyticsSnapshots.userId, userId), eq(analyticsSnapshots.platform, platform)),
    orderBy: desc(analyticsSnapshots.snapshotDate),
    limit: 1,
    offset: offsetDays,
  });
  return rows[0] ?? null;
}

export async function listSnapshots(userId: string, limit = 14) {
  return db.query.analyticsSnapshots.findMany({
    where: eq(analyticsSnapshots.userId, userId),
    orderBy: desc(analyticsSnapshots.snapshotDate),
    limit,
  });
}

export async function listSnapshotsByPlatform(userId: string, platform: AnalyticsPlatform, limit = 14) {
  return db.query.analyticsSnapshots.findMany({
    where: and(eq(analyticsSnapshots.userId, userId), eq(analyticsSnapshots.platform, platform)),
    orderBy: desc(analyticsSnapshots.snapshotDate),
    limit,
  });
}

export async function listSnapshotsForPlatforms(userId: string, platforms: AnalyticsPlatform[], limit = 60) {
  return db.query.analyticsSnapshots.findMany({
    where: and(
      eq(analyticsSnapshots.userId, userId),
      inArray(analyticsSnapshots.platform, platforms),
    ),
    orderBy: desc(analyticsSnapshots.snapshotDate),
    limit,
  });
}

export interface ListVideosParams {
  userId: string;
  platform?: AnalyticsPlatform;
  videoId?: string;
  limit?: number;
  offset?: number;
  sort?: "views" | "publishedAt";
  direction?: "asc" | "desc";
}

export async function listVideos(params: ListVideosParams) {
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  const sortField = params.sort === "publishedAt" ? videoMetrics.publishedAt : videoMetrics.views;
  const order = params.direction === "asc" ? asc(sortField) : desc(sortField);

  const whereClauses = [eq(videoMetrics.userId, params.userId)];
  if (params.platform) {
    whereClauses.push(eq(videoMetrics.platform, params.platform));
  }
  if (params.videoId) {
    whereClauses.push(eq(videoMetrics.platformVideoId, params.videoId));
  }

  const rows = await db.query.videoMetrics.findMany({
    where: and(...whereClauses),
    limit,
    offset,
    orderBy: order,
  });

  return rows;
}
