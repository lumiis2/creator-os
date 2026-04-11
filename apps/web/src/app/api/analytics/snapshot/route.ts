import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import {
  getLatestSnapshotByPlatform,
  getPreviousSnapshotByPlatform,
} from "@creator-os/db/queries/analytics";
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

type DashboardPlatform = "youtube" | "instagram" | "combined";

function resolvePlatform(input: string | null): DashboardPlatform {
  if (input === "instagram" || input === "combined") return input;
  return "youtube";
}

export async function GET(req: Request) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const platform = resolvePlatform(url.searchParams.get("platform"));

  const cacheKey = `analytics:snapshot:${session.userId}:${platform}`;
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

  const connections = await db.query.platformConnections.findMany({
    where: eq(platformConnections.userId, session.userId),
  });

  const youtubeConnection = connections.find((conn: { platform: string }) => conn.platform === "youtube");
  const hasYouTubeScopes = (youtubeConnection?.scopes ?? []).some(
    (scope: string) => scope === "https://www.googleapis.com/auth/youtube.readonly" || scope === "https://www.googleapis.com/auth/yt-analytics.readonly",
  );

  const hasInstagram = connections.some((conn: { platform: string }) => conn.platform === "instagram");

  if (platform === "youtube" && (!youtubeConnection || !hasYouTubeScopes)) {
    return NextResponse.json({ data: null, syncedAt: null, synced: false });
  }

  if (platform === "instagram" && !hasInstagram) {
    return NextResponse.json({ data: null, syncedAt: null, synced: false });
  }

  if (platform === "combined" && !hasYouTubeScopes && !hasInstagram) {
    return NextResponse.json({ data: null, syncedAt: null, synced: false });
  }

  if (platform === "combined") {
    const [ytLatest, ytPrevious, igLatest, igPrevious] = await Promise.all([
      hasYouTubeScopes ? getLatestSnapshotByPlatform(session.userId, "youtube") : Promise.resolve(null),
      hasYouTubeScopes ? getPreviousSnapshotByPlatform(session.userId, "youtube", 7) : Promise.resolve(null),
      hasInstagram ? getLatestSnapshotByPlatform(session.userId, "instagram") : Promise.resolve(null),
      hasInstagram ? getPreviousSnapshotByPlatform(session.userId, "instagram", 7) : Promise.resolve(null),
    ]);

    if (!ytLatest && !igLatest) {
      return NextResponse.json({ data: null, syncedAt: null, synced: false });
    }

    const ytSummary = ytLatest ? buildAnalyticsSummary(ytLatest, ytPrevious) : null;
    const igSummary = igLatest ? buildAnalyticsSummary(igLatest, igPrevious) : null;

    const currentViews7d = (ytSummary?.views7d ?? 0) + (igSummary?.views7d ?? 0);
    const previousViews7d = (ytPrevious?.views7d ?? 0) + (igPrevious?.views7d ?? 0);
    const views7dChange = previousViews7d > 0 ? ((currentViews7d - previousViews7d) / previousViews7d) * 100 : null;

    const latestDate = [ytLatest?.createdAt, igLatest?.createdAt]
      .filter((d): d is Date => !!d)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    const combined = {
      data: {
        subscribers: (ytSummary?.subscribers ?? 0) + (igSummary?.subscribers ?? 0),
        totalViews: (ytSummary?.totalViews ?? 0) + (igSummary?.totalViews ?? 0),
        views7d: currentViews7d,
        views7dChange,
        subsGained7d: (ytSummary?.subsGained7d ?? 0) + (igSummary?.subsGained7d ?? 0),
        avgEngagementRate7d: (() => {
          const weightedSum = (ytSummary?.avgEngagementRate7d ?? 0) * (ytSummary?.views7d ?? 0)
            + (igSummary?.avgEngagementRate7d ?? 0) * (igSummary?.views7d ?? 0);
          return currentViews7d > 0 ? weightedSum / currentViews7d : null;
        })(),
        dataAsOf: latestDate?.toISOString() ?? new Date().toISOString(),
        platform: "combined",
      },
      syncedAt: latestDate?.toISOString() ?? null,
      synced: true,
    } satisfies SnapshotResponse;

    try {
      await redis.set(cacheKey, combined, { ex: CACHE_TTL_SECONDS });
    } catch {}

    return NextResponse.json(combined);
  }

  const latest = await getLatestSnapshotByPlatform(session.userId, platform);
  if (!latest) {
    return NextResponse.json({ data: null, synced: false, syncedAt: null });
  }

  const previous = await getPreviousSnapshotByPlatform(session.userId, platform, 7);
  const summary = buildAnalyticsSummary(latest, previous);

  const responseShape = {
    data: {
      ...summary,
      dataAsOf: summary.dataAsOf.toISOString(),
      reach7d: platform === "instagram" ? (latest.views7d ?? 0) : undefined,
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
