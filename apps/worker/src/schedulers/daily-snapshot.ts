import { Queue } from "bullmq";
import cron from "node-cron";
import type { YouTubeSyncJob } from "../queues/analytics";
import { db, platformConnections, eq } from "@creator-os/db";

const CRON_EXPR = "0 6 * * *"; // 06:00 UTC daily

export async function scheduleDailySnapshot(queue: Queue<YouTubeSyncJob>) {
  cron.schedule(CRON_EXPR, async () => {
    const connections = await db.query.platformConnections.findMany({
      where: eq(platformConnections.syncStatus, "idle"),
    });

    for (const conn of connections) {
      await queue.add("daily-sync", {
        userId: conn.userId,
        connectionId: conn.id,
      });
    }
  }, { timezone: "UTC" });
}
