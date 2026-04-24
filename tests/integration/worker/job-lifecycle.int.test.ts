import { describe, expect, it, vi } from "vitest";
import { makeYouTubeApiPayload, makeYouTubeConnection } from "../../factories/analytics";

const runWorkerTests = process.env.ENABLE_WORKER_TESTS === "true";
const workerDescribe = runWorkerTests ? describe : describe.skip;

const state = vi.hoisted(() => ({
  processor: null as null | ((job: any) => Promise<void>),
  handlers: {} as Record<string, (job: any, err?: Error) => void>,
  connection: {
    id: "conn-youtube-1",
    userId: "00000000-0000-4000-8000-000000000001",
    platform: "youtube",
    platformUserId: "channel-1",
    displayName: "Test Channel",
    accessTokenEnc: "token-yt",
    refreshTokenEnc: "refresh-yt",
    tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    scopes: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
    ],
    syncStatus: "idle",
    syncError: null,
    meta: null,
  },
  youtube: {
    getChannelStats: vi.fn(),
    getVideoList: vi.fn(),
    getAnalyticsReport: vi.fn(),
  },
}));

vi.mock("bullmq", () => {
  class Worker {
    constructor(_name: string, processor: (job: any) => Promise<void>) {
      state.processor = processor;
    }

    on(event: string, handler: (job: any, err?: Error) => void) {
      state.handlers[event] = handler;
      return this;
    }
  }

  class Queue {}
  class Job {}

  return { Worker, Queue, Job };
});

vi.mock("@creator-os/db", () => {
  const analyticsSnapshots = { __table: "analyticsSnapshots" };
  const videoMetrics = { __table: "videoMetrics" };
  const platformConnections = { __table: "platformConnections", id: "id" };

  const db = {
    query: {
      platformConnections: {
        findFirst: vi.fn(async () => state.connection),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(async () => undefined),
      })),
    })),
  };

  return {
    db,
    analyticsSnapshots,
    videoMetrics,
    platformConnections,
    eq: vi.fn((_a: unknown, b: unknown) => b),
  };
});

vi.mock("@/lib/analytics/youtube", () => ({
  getChannelStats: state.youtube.getChannelStats,
  getVideoList: state.youtube.getVideoList,
  getAnalyticsReport: state.youtube.getAnalyticsReport,
}));

vi.mock("../../../apps/worker/src/lib/cache", () => ({
  invalidateAnalyticsCache: vi.fn(async () => undefined),
}));

vi.mock("../../../apps/worker/src/lib/instagram", () => ({
  fetchInstagramInsightsSummary: vi.fn(),
}));

workerDescribe("worker job lifecycle", () => {
  it("registers failed/completed handlers and logs lifecycle events", async () => {
    const payload = makeYouTubeApiPayload();

    state.youtube.getChannelStats.mockResolvedValue(payload.channel as any);
    state.youtube.getVideoList.mockResolvedValue(payload.videos as any);
    state.youtube.getAnalyticsReport.mockResolvedValue(payload.report as any);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const { registerYouTubeWorker } = await import("../../../apps/worker/src/workers/youtube-sync");
    registerYouTubeWorker({} as any);

    expect(state.handlers.failed).toBeTypeOf("function");
    expect(state.handlers.completed).toBeTypeOf("function");

    await state.processor?.({
      id: "job-complete-1",
      data: { userId: state.connection.userId, connectionId: state.connection.id },
    });

    state.handlers.completed?.({ id: "job-complete-1" });
    state.handlers.failed?.({ id: "job-failed-1" }, new Error("boom"));

    expect(logSpy).toHaveBeenCalledWith("Job job-complete-1 completed");
    expect(errorSpy).toHaveBeenCalledWith("Job job-failed-1 failed:", expect.any(Error));
  });
});
