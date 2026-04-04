import { Redis } from "@upstash/redis";
import IORedis from "ioredis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;
const redisUsername = process.env.REDIS_USERNAME;
const redisPassword = process.env.REDIS_PASSWORD;
const redisTls = process.env.REDIS_TLS === "true";

function isConfigured(value: string | undefined): value is string {
  if (!value) return false;
  const lowered = value.toLowerCase();
  return !(
    lowered.includes("your-upstash")
    || lowered.includes("your_upstash")
    || lowered.includes("your_groq")
    || lowered.includes("your_anthropic")
    || lowered.includes("replace-with")
  );
}

export interface RedisClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options?: { ex?: number }): Promise<unknown>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  del(...keys: string[]): Promise<number>;
}

const upstashClient = isConfigured(url) && isConfigured(token) ? new Redis({ url, token }) : null;

const ioredisClient = !upstashClient && redisHost
  ? new IORedis({
      host: redisHost,
      port: redisPort,
      username: redisUsername || undefined,
      password: redisPassword || undefined,
      tls: redisTls ? {} : undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    })
  : null;

export const redis: RedisClient = upstashClient
  ? {
      get: <T>(key: string) => upstashClient.get<T>(key),
    set: (key: string, value: unknown, options?: { ex?: number }) =>
      options?.ex ? upstashClient.set(key, value, { ex: options.ex }) : upstashClient.set(key, value),
      incr: (key: string) => upstashClient.incr(key),
      expire: (key: string, seconds: number) => upstashClient.expire(key, seconds),
      del: (...keys: string[]) => upstashClient.del(...keys),
    }
  : ioredisClient
    ? {
        get: async <T>(key: string) => {
          if (ioredisClient.status === "wait") await ioredisClient.connect();
          const raw = await ioredisClient.get(key);
          if (raw === null) return null;
          try {
            return JSON.parse(raw) as T;
          } catch {
            return raw as T;
          }
        },
        set: async (key: string, value: unknown, options?: { ex?: number }) => {
          if (ioredisClient.status === "wait") await ioredisClient.connect();
          const serialised = typeof value === "string" ? value : JSON.stringify(value);
          if (options?.ex) {
            return ioredisClient.set(key, serialised, "EX", options.ex);
          }
          return ioredisClient.set(key, serialised);
        },
        incr: async (key: string) => {
          if (ioredisClient.status === "wait") await ioredisClient.connect();
          return ioredisClient.incr(key);
        },
        expire: async (key: string, seconds: number) => {
          if (ioredisClient.status === "wait") await ioredisClient.connect();
          return ioredisClient.expire(key, seconds);
        },
        del: async (...keys: string[]) => {
          if (ioredisClient.status === "wait") await ioredisClient.connect();
          if (!keys.length) return 0;
          return ioredisClient.del(...keys);
        },
      }
    : (() => {
        throw new Error(
          "Redis is not configured. Set either UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN or REDIS_HOST.",
        );
      })();
