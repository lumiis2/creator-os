import { asc, desc, eq } from "drizzle-orm";
import { db } from "../index";
import { analyticsSnapshots } from "../schema/analytics";
import { videoMetrics } from "../schema/videoMetrics";

export async function getLatestSnapshot(userId: string) {
  return db.query.analyticsSnapshots.findFirst({
    where: eq(analyticsSnapshots.userId, userId),
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

export async function listSnapshots(userId: string, limit = 14) {
  return db.query.analyticsSnapshots.findMany({
    where: eq(analyticsSnapshots.userId, userId),
    orderBy: desc(analyticsSnapshots.snapshotDate),
    limit,
  });
}

export interface ListVideosParams {
  userId: string;
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

  const rows = await db.query.videoMetrics.findMany({
    where: eq(videoMetrics.userId, params.userId),
    limit,
    offset,
    orderBy: order,
  });

  return rows;
}
