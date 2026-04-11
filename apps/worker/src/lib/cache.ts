import { Redis } from "@upstash/redis";
import { env } from "./env";

let redis: Redis | null = null;

export function getRedisClient() {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (!redis) {
    redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

export async function invalidateAnalyticsCache(userId: string) {
  const client = getRedisClient();
  if (!client) return;

  await client.del(
    `analytics:snapshot:${userId}:youtube`,
    `analytics:snapshot:${userId}:instagram`,
    `analytics:snapshot:${userId}:combined`,
  );

  let cursor: number | string = 0;
  do {
    const [nextCursor, keys] = await client.scan(cursor, {
      match: `analytics:videos:${userId}:*`,
      count: 100,
    });
    cursor = nextCursor;
    if (keys.length) {
      await client.del(...keys);
    }
  } while (cursor !== 0 && cursor !== "0");
}
