import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { listVideos } from "@creator-os/db/queries/analytics";
import type { VideoMetric } from "@creator-os/db";

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
});

const CACHE_TTL_SECONDS = 300; // 5 minutes

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const { limit, offset, sort, direction } = parsed.data;
  const cacheKey = `analytics:videos:${session.userId}:${limit}:${offset}:${sort}:${direction}`;
  const cached = await redis.get<VideosResponse>(cacheKey);
  if (cached) return NextResponse.json(cached);

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

  await redis.set(cacheKey, responseData, { ex: CACHE_TTL_SECONDS });
  return NextResponse.json(responseData);
}
