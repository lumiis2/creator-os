import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { getLatestSnapshot, getPreviousSnapshot } from "@creator-os/db/queries/analytics";
import { buildAnalyticsSummary } from "@/lib/analytics/compute";

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
  const cached = await redis.get<SnapshotResponse>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
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

  await redis.set(cacheKey, responseShape, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(responseShape);
}
