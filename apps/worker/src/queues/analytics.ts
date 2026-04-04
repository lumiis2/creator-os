import { Queue } from "bullmq";
import { z } from "zod";
import { env } from "../lib/env";

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

export const YouTubeSyncJobSchema = z.object({
  userId: z.string().uuid(),
  connectionId: z.string().uuid(),
});

export type YouTubeSyncJob = z.infer<typeof YouTubeSyncJobSchema>;

export function startAnalyticsQueue() {
  const queue = new Queue<YouTubeSyncJob>("analytics-sync", redisConfig);
  return queue;
}
