import { Queue } from "bullmq";

const redisConfig = process.env.UPSTASH_REDIS_REST_URL
  ? { connection: { url: process.env.UPSTASH_REDIS_REST_URL } }
  : {
      connection: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : undefined,
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_TLS === "true" ? {} : undefined,
      },
    };

let analyticsQueue: Queue | null = null;

export function getAnalyticsQueue(): Queue {
  if (!analyticsQueue) {
    analyticsQueue = new Queue("analytics-sync", redisConfig);
  }
  return analyticsQueue;
}
