import { Worker, Job, Queue } from "bullmq";
import { AnalyticsSyncJobSchema, type AnalyticsSyncJob } from "../queues/analytics";
import { normaliseChannelSnapshot, normaliseVideoMetrics } from "@/lib/analytics/normalise";
import { getChannelStats, getVideoList, getAnalyticsReport } from "@/lib/analytics/youtube";
import { db, analyticsSnapshots, videoMetrics, platformConnections, eq } from "@creator-os/db";
import { env } from "../lib/env";
import { invalidateAnalyticsCache } from "../lib/cache";
import { fetchInstagramInsightsSummary } from "../lib/instagram";
import { normalizeInstagramToInternalMetric, normalizeYouTubeToInternalMetric } from "../lib/analytics-normalize";

const redisConfig = env.UPSTASH_REDIS_REST_URL
  ? { connection: { url: env.UPSTASH_REDIS_REST_URL } }
  : {
      connection: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT ? Number(env.REDIS_PORT) : undefined,
        username: env.REDIS_USERNAME,
        password: env.REDIS_PASSWORD,
        tls: env.REDIS_TLS === "true" ? {} : undefined,
      },
    };

export function registerYouTubeWorker(queue: Queue<AnalyticsSyncJob>) {
  // Worker consumes the same queue name
  const worker = new Worker<AnalyticsSyncJob>("analytics-sync", async (job: Job<AnalyticsSyncJob>) => {
    const parsed = AnalyticsSyncJobSchema.parse(job.data);
    await processPlatformSync(parsed);
  }, redisConfig);

  worker.on("failed", (job: Job<AnalyticsSyncJob> | undefined, err: Error) => {
    // eslint-disable-next-line no-console
    console.error(`Job ${job?.id} failed:`, err);
  });

  worker.on("completed", (job: Job<AnalyticsSyncJob>) => {
    // eslint-disable-next-line no-console
    console.log(`Job ${job.id} completed`);
  });

  return worker;
}

async function processPlatformSync(job: AnalyticsSyncJob) {
  const { userId, connectionId } = job;

  const connection = await db.query.platformConnections.findFirst({
    where: eq(platformConnections.id, connectionId),
  });

  if (!connection) throw new Error(`Connection ${connectionId} not found`);

  // Mark syncing
  await db.update(platformConnections)
    .set({ syncStatus: "syncing" })
    .where(eq(platformConnections.id, connectionId));

  try {
    if (connection.platform === "youtube") {
      await syncYouTubeConnection({
        userId,
        connection,
      });
    } else if (connection.platform === "instagram") {
      await syncInstagramConnection({
        userId,
        connection,
      });
    } else {
      throw new Error(`Unsupported platform for analytics sync: ${connection.platform}`);
    }

    await db.update(platformConnections)
      .set({ syncStatus: "idle", lastSyncedAt: new Date(), syncError: null })
      .where(eq(platformConnections.id, connectionId));

    await invalidateAnalyticsCache(userId);
  } catch (err) {
    await db.update(platformConnections)
      .set({ syncStatus: "error", syncError: String(err) })
      .where(eq(platformConnections.id, connectionId));
    throw err;
  }
}

async function syncYouTubeConnection(params: {
  userId: string;
  connection: typeof platformConnections.$inferSelect;
}) {
  const { userId, connection } = params;
  const accessToken = connection.accessTokenEnc;

  const [channel, videos, report] = await Promise.all([
    getChannelStats(accessToken),
    getVideoList(accessToken),
    getAnalyticsReport(accessToken, connection.platformUserId),
  ]);

  const normalisedVideos = normaliseVideoMetrics({
    userId,
    connectionId: connection.id,
    platform: connection.platform,
    videos,
  });

  const snapshot = normaliseChannelSnapshot({
    userId,
    connectionId: connection.id,
    platform: connection.platform,
    channel,
    report,
  });

  normalizeYouTubeToInternalMetric({
    snapshotDate: snapshot.snapshotDate,
    views7d: snapshot.views7d,
    subscribers: snapshot.subscribers,
    avgEr7d: snapshot.avgEr7d,
  });

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
}

async function syncInstagramConnection(params: {
  userId: string;
  connection: typeof platformConnections.$inferSelect;
}) {
  const { userId, connection } = params;
  const meta = (connection.meta ?? {}) as Record<string, unknown>;
  const igUserId = (meta.ig_user_id as string | undefined) ?? connection.platformUserId;

  const insights = await fetchInstagramInsightsSummary(igUserId, connection.accessTokenEnc);
  const snapshotDate = new Date(new Date().toISOString().slice(0, 10));

  const internalMetric = normalizeInstagramToInternalMetric({
    snapshotDate,
    impressions7d: insights.impressions7d,
    reach7d: insights.reach7d,
  });

  await db.insert(analyticsSnapshots)
    .values({
      userId,
      connectionId: connection.id,
      platform: "instagram",
      snapshotDate,
      subscribers: null,
      totalViews: insights.impressions30d,
      totalVideos: null,
      views7d: insights.impressions7d,
      views30d: insights.impressions30d,
      subsGained7d: null,
      avgEr7d: internalMetric.engagementRate,
      rawPayload: insights.raw as object,
    })
    .onConflictDoUpdate({
      target: [analyticsSnapshots.userId, analyticsSnapshots.platform, analyticsSnapshots.snapshotDate],
      set: {
        totalViews: insights.impressions30d,
        views7d: insights.impressions7d,
        views30d: insights.impressions30d,
        avgEr7d: internalMetric.engagementRate,
        rawPayload: insights.raw as object,
        createdAt: new Date(),
      },
    });
}
