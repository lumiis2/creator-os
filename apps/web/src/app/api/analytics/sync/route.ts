import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { getAnalyticsQueue } from "@/lib/queue";
import { getAnalyticsReport, getChannelStats, getVideoList, refreshGoogleAccessToken } from "@/lib/analytics/youtube";
import { buildAnalyticsReportFromVideos, normaliseChannelSnapshot, normaliseVideoMetrics } from "@/lib/analytics/normalise";
import { redis } from "@/lib/redis";
import { analyticsSnapshots, db, platformConnections, and, eq, videoMetrics } from "@creator-os/db";

const BodySchema = z.object({
  connectionId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { connectionId } = parsed.data;

  let connection = null;
  if (connectionId) {
    connection = await db.query.platformConnections.findFirst({
      where: and(eq(platformConnections.id, connectionId), eq(platformConnections.userId, session.userId)),
    });
  } else {
    connection = await db.query.platformConnections.findFirst({
      where: eq(platformConnections.userId, session.userId),
    });
  }

  if (!connection) {
    return NextResponse.json({ error: "No connection found" }, { status: 404 });
  }

  const runSyncInline = async () => {
    await db.update(platformConnections)
      .set({ syncStatus: "syncing", syncError: null })
      .where(eq(platformConnections.id, connection.id));

    try {
      let accessToken = connection.accessTokenEnc;

      const expiresSoon = connection.tokenExpiresAt
        ? connection.tokenExpiresAt.getTime() - Date.now() < 60_000
        : false;

      if (expiresSoon && connection.refreshTokenEnc) {
        const refreshed = await refreshGoogleAccessToken(connection.refreshTokenEnc);
        accessToken = refreshed.accessToken;

        await db.update(platformConnections)
          .set({
            accessTokenEnc: refreshed.accessToken,
            tokenExpiresAt: refreshed.expiresAt,
          })
          .where(eq(platformConnections.id, connection.id));
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
        userId: session.userId,
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
        userId: session.userId,
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

      await db.update(platformConnections)
        .set({ syncStatus: "idle", syncError: null, lastSyncedAt: new Date() })
        .where(eq(platformConnections.id, connection.id));

      await redis.del(`analytics:snapshot:${session.userId}`);
      await redis.del(`analytics:videos:${session.userId}:10:0:views:desc`);

      return NextResponse.json({
        enqueued: false,
        ranInline: true,
        synced: true,
        items: normalisedVideos.length,
      });
    } catch (error) {
      await db.update(platformConnections)
        .set({ syncStatus: "error", syncError: String(error) })
        .where(eq(platformConnections.id, connection.id));

      return NextResponse.json({
        error: "Inline sync failed",
        details: String(error),
      }, { status: 502 });
    }
  };

  if (process.env.WORKER_DISABLED === "true") {
    return runSyncInline();
  }

  try {
    const queue = getAnalyticsQueue();
    const job = await queue.add("manual-sync", {
      userId: session.userId,
      connectionId: connection.id,
    });

    return NextResponse.json({ jobId: job.id, enqueued: true });
  } catch {
    return runSyncInline();
  }
}
