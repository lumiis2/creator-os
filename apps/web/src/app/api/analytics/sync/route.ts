import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { getAnalyticsQueue } from "@/lib/queue";
import { getAnalyticsReport, getChannelStats, getVideoList, refreshGoogleAccessToken } from "@/lib/analytics/youtube";
import { buildAnalyticsReportFromVideos, normaliseChannelSnapshot, normaliseVideoMetrics } from "@/lib/analytics/normalise";
import { fetchInstagramInsights } from "@/services/meta/fetchAnalytics";
import { redis } from "@/lib/redis";
import { analyticsSnapshots, db, platformConnections, and, eq, videoMetrics } from "@creator-os/db";

const BodySchema = z.object({
  connectionId: z.string().uuid().optional(),
  platform: z.enum(["youtube", "instagram", "combined"]).optional(),
});

type SupportedPlatform = "youtube" | "instagram";

function hasYouTubeScopes(scopes: string[] | null | undefined) {
  return (scopes ?? []).some(
    (scope: string) => scope === "https://www.googleapis.com/auth/youtube.readonly" || scope === "https://www.googleapis.com/auth/yt-analytics.readonly",
  );
}

async function runInstagramSyncInline(params: {
  userId: string;
  connection: typeof platformConnections.$inferSelect;
}) {
  const { userId, connection } = params;
  const meta = (connection.meta ?? {}) as Record<string, unknown>;
  const igUserId = (meta.ig_user_id as string | undefined) ?? connection.platformUserId;

  const insights = await fetchInstagramInsights(igUserId, connection.accessTokenEnc);
  const today = new Date();
  const snapshotDate = new Date(today.toISOString().slice(0, 10));

  const snapshot = {
    userId,
    connectionId: connection.id,
    platform: "instagram",
    snapshotDate,
    subscribers: null,
    totalViews: insights.values.impressions_30d ?? insights.values.impressions ?? null,
    totalVideos: null,
    views7d: insights.values.impressions_7d ?? insights.values.impressions ?? null,
    views30d: insights.values.impressions_30d ?? insights.values.impressions ?? null,
    subsGained7d: null,
    avgEr7d: null,
    rawPayload: insights.raw as object,
  };

  await db.insert(analyticsSnapshots)
    .values(snapshot)
    .onConflictDoUpdate({
      target: [analyticsSnapshots.userId, analyticsSnapshots.platform, analyticsSnapshots.snapshotDate],
      set: { ...snapshot, createdAt: new Date() },
    });
}

async function runYouTubeSyncInline(params: {
  userId: string;
  connection: typeof platformConnections.$inferSelect;
}) {
  const { userId, connection } = params;
  let accessToken = connection.accessTokenEnc;

  const expiresSoon = connection.tokenExpiresAt
    ? connection.tokenExpiresAt.getTime() - Date.now() < 60_000
    : false;

  if (expiresSoon && connection.refreshTokenEnc) {
    try {
      const refreshed = await refreshGoogleAccessToken(connection.refreshTokenEnc);
      accessToken = refreshed.accessToken;

      await db.update(platformConnections)
        .set({
          accessTokenEnc: refreshed.accessToken,
          tokenExpiresAt: refreshed.expiresAt,
          syncError: null,
          syncStatus: "idle",
        })
        .where(eq(platformConnections.id, connection.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const revoked = /invalid_grant|expired or revoked/i.test(message);

      await db.update(platformConnections)
        .set({
          syncStatus: "error",
          syncError: revoked
            ? "Google refresh token expired or revoked. Reconnect YouTube from Profile."
            : message,
          refreshTokenEnc: revoked ? null : connection.refreshTokenEnc,
          tokenExpiresAt: revoked ? null : connection.tokenExpiresAt,
        })
        .where(eq(platformConnections.id, connection.id));

      if (revoked) {
        throw new Error("Google refresh token expired or revoked. Reconnect YouTube from Profile.");
      }

      throw error;
    }
  }

  const [channel, videos] = await Promise.all([
    getChannelStats(accessToken),
    getVideoList(accessToken),
  ]);

  let report: { viewsLast7d: number; viewsLast30d: number; subsGained7d: number; avgEr7d: number | null; snapshotDate: string } | null = null;
  try {
    report = await getAnalyticsReport(accessToken, connection.platformUserId);
  } catch {
    report = null;
  }

  const normalisedVideos = normaliseVideoMetrics({
    userId,
    connectionId: connection.id,
    platform: connection.platform,
    videos,
  });

  const derived = buildAnalyticsReportFromVideos(normalisedVideos);

  const effectiveReport = {
    viewsLast7d: report && report.viewsLast7d > 0 ? report.viewsLast7d : derived.viewsLast7d,
    viewsLast30d: report && report.viewsLast30d > 0 ? report.viewsLast30d : derived.viewsLast30d,
    subsGained7d: report ? report.subsGained7d : derived.subsGained7d,
    avgEr7d: report?.avgEr7d ?? derived.avgEr7d,
    snapshotDate: report?.snapshotDate ?? derived.snapshotDate,
  };

  const snapshot = normaliseChannelSnapshot({
    userId,
    connectionId: connection.id,
    platform: connection.platform,
    channel,
    report: effectiveReport,
  });

  if ((snapshot.totalViews ?? 0) === 0 && normalisedVideos.length > 0) {
    snapshot.totalViews = normalisedVideos.reduce((sum, v) => sum + (v.views ?? 0), 0) as any;
  }
  if ((snapshot.totalVideos ?? 0) === 0 && normalisedVideos.length > 0) {
    snapshot.totalVideos = normalisedVideos.length;
  }

  await db.insert(analyticsSnapshots)
    .values(snapshot)
    .onConflictDoUpdate({
      target: [analyticsSnapshots.userId, analyticsSnapshots.platform, analyticsSnapshots.snapshotDate],
      set: { ...snapshot, createdAt: new Date() },
    });

  for (const video of normalisedVideos) {
    await db.insert(videoMetrics)
      .values(video)
      .onConflictDoUpdate({
        target: [videoMetrics.userId, videoMetrics.platform, videoMetrics.platformVideoId],
        set: {
          views: video.views,
          likes: video.likes,
          comments: video.comments,
          shares: video.shares,
          thumbnailUrl: video.thumbnailUrl,
          title: video.title,
          syncedAt: new Date(),
        },
      });
  }

  return normalisedVideos.length;
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const requestedPlatform = parsed.data.platform ?? "youtube";
  const { connectionId } = parsed.data;

  let connections: Array<typeof platformConnections.$inferSelect> = [];

  if (connectionId) {
    const one = await db.query.platformConnections.findFirst({
      where: and(eq(platformConnections.id, connectionId), eq(platformConnections.userId, session.userId)),
    });
    if (!one) return NextResponse.json({ error: "No connection found" }, { status: 404 });
    if (one.platform !== "youtube" && one.platform !== "instagram") {
      return NextResponse.json({ error: "Unsupported platform connection" }, { status: 412 });
    }
    connections = [one];
  } else {
    const all = await db.query.platformConnections.findMany({
      where: eq(platformConnections.userId, session.userId),
    });
    const targetPlatforms: SupportedPlatform[] = requestedPlatform === "combined"
      ? ["youtube", "instagram"]
      : [requestedPlatform];

    connections = all.filter((conn: { platform: string }) => targetPlatforms.includes(conn.platform as SupportedPlatform));
  }

  if (!connections.length) {
    return NextResponse.json({ error: "No connection found for selected platform" }, { status: 404 });
  }

  for (const connection of connections) {
    if (connection.platform === "youtube" && !hasYouTubeScopes(connection.scopes)) {
      return NextResponse.json(
        { error: "Connection missing YouTube scopes. Reconnect your account from Profile > Connect YouTube." },
        { status: 412 },
      );
    }
  }

  const runSyncInline = async () => {
    let synced = 0;
    let items = 0;

    for (const connection of connections) {
      await db.update(platformConnections)
        .set({ syncStatus: "syncing", syncError: null })
        .where(eq(platformConnections.id, connection.id));

      try {
        if (connection.platform === "youtube") {
          items += await runYouTubeSyncInline({ userId: session.userId, connection });
        } else if (connection.platform === "instagram") {
          await runInstagramSyncInline({ userId: session.userId, connection });
        }

        await db.update(platformConnections)
          .set({ syncStatus: "idle", syncError: null, lastSyncedAt: new Date() })
          .where(eq(platformConnections.id, connection.id));

        synced += 1;
      } catch (error) {
        await db.update(platformConnections)
          .set({ syncStatus: "error", syncError: String(error) })
          .where(eq(platformConnections.id, connection.id));

        return NextResponse.json({
          error: `Inline sync failed for ${connection.platform}`,
          details: String(error),
        }, { status: 502 });
      }
    }

    try {
      await redis.del(`analytics:snapshot:${session.userId}:youtube`);
      await redis.del(`analytics:snapshot:${session.userId}:instagram`);
      await redis.del(`analytics:snapshot:${session.userId}:combined`);
      await redis.del(`analytics:videos:${session.userId}:youtube:10:0:views:desc`);
    } catch (cacheError) {
      // eslint-disable-next-line no-console
      console.warn("[analytics-sync] cache invalidation failed", {
        userId: session.userId,
        error: cacheError instanceof Error ? cacheError.message : String(cacheError),
      });
    }

    return NextResponse.json({
      enqueued: false,
      ranInline: true,
      synced: synced === connections.length,
      syncedPlatforms: connections.map((c) => c.platform),
      items,
    });
  };

  if (process.env.WORKER_DISABLED === "true") {
    return runSyncInline();
  }

  try {
    const queue = getAnalyticsQueue();
    const jobs = await Promise.all(connections.map((connection) => queue.add("manual-sync", {
      userId: session.userId,
      connectionId: connection.id,
    })));

    return NextResponse.json({ jobIds: jobs.map((job) => job.id), enqueued: true, platforms: connections.map((c) => c.platform) });
  } catch {
    return runSyncInline();
  }
}
