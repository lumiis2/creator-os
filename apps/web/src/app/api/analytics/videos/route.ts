import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { listVideos } from "@creator-os/db/queries/analytics";
import type { VideoMetric } from "@creator-os/db";
import { db, eq, platformConnections } from "@creator-os/db";

interface VideosResponse {
  data: VideoMetric[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
}

const QuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sort: z.enum(["views", "publishedAt"]).default("views"),
  direction: z.enum(["asc", "desc"]).default("desc"),
  platform: z.enum(["youtube", "instagram", "combined"]).default("youtube"),
});

const CACHE_TTL_SECONDS = 300; // 5 minutes

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const connections = await db.query.platformConnections.findMany({
    where: eq(platformConnections.userId, session.userId),
  });
  const youtubeConnection = connections.find((conn: { platform: string }) => conn.platform === "youtube");
  const hasYouTubeScopes = (youtubeConnection?.scopes ?? []).some(
    (scope: string) => scope === "https://www.googleapis.com/auth/youtube.readonly" || scope === "https://www.googleapis.com/auth/yt-analytics.readonly",
  );
  if (parsed.data.platform !== "youtube") {
    return NextResponse.json({ data: [], pagination: { limit: parsed.data.limit, offset: parsed.data.offset, count: 0 } });
  }
  if (!youtubeConnection || !hasYouTubeScopes) {
    return NextResponse.json({ data: [], pagination: { limit: parsed.data.limit, offset: parsed.data.offset, count: 0 } });
  }

  const { limit, offset, sort, direction, platform } = parsed.data;
  const cacheKey = `analytics:videos:${session.userId}:${platform}:${limit}:${offset}:${sort}:${direction}`;
  try {
    const cached = await redis.get<VideosResponse>(cacheKey);
    if (cached) return NextResponse.json(cached);
  } catch (cacheError) {
    // eslint-disable-next-line no-console
    console.warn("[analytics-videos] cache read failed", {
      userId: session.userId,
      error: cacheError instanceof Error ? cacheError.message : String(cacheError),
    });
  }

  const videos = await listVideos({
    userId: session.userId,
    limit,
    offset,
    sort,
    direction,
  });

  const responseData = {
    data: videos,
    pagination: {
      limit,
      offset,
      count: videos.length,
    },
  };

  try {
    await redis.set(cacheKey, responseData, { ex: CACHE_TTL_SECONDS });
  } catch (cacheError) {
    // eslint-disable-next-line no-console
    console.warn("[analytics-videos] cache write failed", {
      userId: session.userId,
      error: cacheError instanceof Error ? cacheError.message : String(cacheError),
    });
  }
  return NextResponse.json(responseData);
}
