import { Worker, Job, Queue } from "bullmq";
import { YouTubeSyncJobSchema, type YouTubeSyncJob } from "../queues/analytics";
import { normaliseChannelSnapshot, normaliseVideoMetrics } from "@/lib/analytics/normalise";
import { getChannelStats, getVideoList, getAnalyticsReport } from "@/lib/analytics/youtube";
import { db, analyticsSnapshots, videoMetrics, platformConnections, eq } from "@creator-os/db";
import { env } from "../lib/env";
import { invalidateAnalyticsCache } from "../lib/cache";

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

export function registerYouTubeWorker(queue: Queue<YouTubeSyncJob>) {
  // Worker consumes the same queue name
  const worker = new Worker<YouTubeSyncJob>("analytics-sync", async (job: Job<YouTubeSyncJob>) => {
    const parsed = YouTubeSyncJobSchema.parse(job.data);
    await processYouTubeSync(parsed);
  }, redisConfig);

  worker.on("failed", (job: Job<YouTubeSyncJob> | undefined, err: Error) => {
    // eslint-disable-next-line no-console
    console.error(`Job ${job?.id} failed:`, err);
  });

  worker.on("completed", (job: Job<YouTubeSyncJob>) => {
    // eslint-disable-next-line no-console
    console.log(`Job ${job.id} completed`);
  });

  return worker;
}

async function processYouTubeSync(job: YouTubeSyncJob) {
  const { userId, connectionId } = job;

  const connection = await db.query.platformConnections.findFirst({
    where: eq(platformConnections.id, connectionId),
  });

  if (!connection) throw new Error(`Connection ${connectionId} not found`);

  const accessToken = connection.accessTokenEnc;

  // Mark syncing
  await db.update(platformConnections)
    .set({ syncStatus: "syncing" })
    .where(eq(platformConnections.id, connectionId));

  try {
    const [channel, videos, report] = await Promise.all([
      getChannelStats(accessToken),
      getVideoList(accessToken),
      getAnalyticsReport(accessToken, connection.platformUserId),
    ]);

    const normalisedVideos = normaliseVideoMetrics({
      userId,
      connectionId,
      platform: connection.platform,
      videos,
    });

    const snapshot = normaliseChannelSnapshot({
      userId,
      connectionId,
      platform: connection.platform,
      channel,
      report,
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
