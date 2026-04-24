import { afterEach, beforeEach, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/creatoros_test";
  process.env.DATABASE_URL_UNPOOLED ??= "postgres://postgres:postgres@localhost:5432/creatoros_test";
  process.env.REDIS_HOST ??= "127.0.0.1";
  process.env.REDIS_PORT ??= "6379";
  if (typeof process.env.ENABLE_WORKER_TESTS === "undefined") {
    process.env.ENABLE_WORKER_TESTS = "false";
  }
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
  if (typeof process.env.ENABLE_WORKER_TESTS === "undefined") {
    process.env.ENABLE_WORKER_TESTS = "false";
  }
});
