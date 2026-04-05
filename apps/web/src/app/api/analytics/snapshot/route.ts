import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { getLatestSnapshot, getPreviousSnapshot } from "@creator-os/db/queries/analytics";
import { buildAnalyticsSummary } from "@/lib/analytics/compute";
import { db, eq, platformConnections } from "@creator-os/db";

interface SnapshotResponse {
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

const CACHE_TTL_SECONDS = 3600; // 1 hour

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cacheKey = `analytics:snapshot:${session.userId}`;
  try {
    const cached = await redis.get<SnapshotResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
  } catch (cacheError) {
    // eslint-disable-next-line no-console
    console.warn("[analytics-snapshot] cache read failed", {
      userId: session.userId,
      error: cacheError instanceof Error ? cacheError.message : String(cacheError),
    });
  }

  const connection = await db.query.platformConnections.findFirst({
    where: eq(platformConnections.userId, session.userId),
  });
  const hasYouTubeScopes = (connection?.scopes ?? []).some(
    (scope: string) => scope === "https://www.googleapis.com/auth/youtube.readonly" || scope === "https://www.googleapis.com/auth/yt-analytics.readonly",
  );
  if (!connection || !hasYouTubeScopes) {
    return NextResponse.json({ data: null, syncedAt: null, synced: false });
  }

  const latest = await getLatestSnapshot(session.userId);
  if (!latest) {
    return NextResponse.json({ data: null, synced: false });
  }

  const previous = await getPreviousSnapshot(session.userId, 7);
  const summary = buildAnalyticsSummary(latest, previous);

  const responseShape = {
    data: {
      ...summary,
      dataAsOf: summary.dataAsOf.toISOString(),
    },
    syncedAt: latest.createdAt?.toISOString() ?? null,
    synced: true,
  };

  try {
    await redis.set(cacheKey, responseShape, { ex: CACHE_TTL_SECONDS });
  } catch (cacheError) {
    // eslint-disable-next-line no-console
    console.warn("[analytics-snapshot] cache write failed", {
      userId: session.userId,
      error: cacheError instanceof Error ? cacheError.message : String(cacheError),
    });
  }
  return NextResponse.json(responseShape);
}
