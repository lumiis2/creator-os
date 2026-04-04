// Placeholder worker entrypoint
import { startAnalyticsQueue } from "./queues/analytics";
import { registerYouTubeWorker } from "./workers/youtube-sync";
import { scheduleDailySnapshot } from "./schedulers/daily-snapshot";

export async function main(): Promise<void> {
  const queue = startAnalyticsQueue();
  registerYouTubeWorker(queue);
  await scheduleDailySnapshot(queue);
  // eslint-disable-next-line no-console
  console.log("Worker booted: analytics queue and schedulers active");
}
