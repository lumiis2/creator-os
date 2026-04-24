import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeYouTubeApiPayload, makeYouTubeConnection } from "../../factories/analytics";

const runWorkerTests = process.env.ENABLE_WORKER_TESTS === "true";
const workerDescribe = runWorkerTests ? describe : describe.skip;

const state = vi.hoisted(() => ({
  processor: null as null | ((job: any) => Promise<void>),
  handlers: {} as Record<string, (job: any, err?: Error) => void>,
  updates: [] as Array<Record<string, unknown>>,
  snapshotUpserts: [] as Array<Record<string, unknown>>,
  videoUpserts: [] as Array<Record<string, unknown>>,
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
  invalidateAnalyticsCache: vi.fn(),
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
      set: vi.fn((payload: Record<string, unknown>) => {
        state.updates.push(payload);
        return { where: vi.fn(async () => undefined) };
      }),
    })),
    insert: vi.fn((table: { __table: string }) => ({
      values: vi.fn((payload: Record<string, unknown>) => {
        if (table.__table === "analyticsSnapshots") {
          state.snapshotUpserts.push(payload);
        }
        if (table.__table === "videoMetrics") {
          state.videoUpserts.push(payload);
        }

        return {
          onConflictDoUpdate: vi.fn(async () => undefined),
        };
      }),
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
  invalidateAnalyticsCache: state.invalidateAnalyticsCache,
}));

vi.mock("../../../apps/worker/src/lib/instagram", () => ({
  fetchInstagramInsightsSummary: vi.fn(),
}));

workerDescribe("worker processPlatformSync", () => {
  beforeEach(() => {
    state.updates = [];
    state.snapshotUpserts = [];
    state.videoUpserts = [];
    state.handlers = {};
    state.processor = null;
    state.connection = makeYouTubeConnection() as any;
    state.youtube.getChannelStats.mockReset();
    state.youtube.getVideoList.mockReset();
    state.youtube.getAnalyticsReport.mockReset();
    state.invalidateAnalyticsCache.mockReset();
  });

  it("processes YouTube job successfully and persists snapshot/videos", async () => {
    const payload = makeYouTubeApiPayload();

    state.youtube.getChannelStats.mockResolvedValue(payload.channel as any);
    state.youtube.getVideoList.mockResolvedValue(payload.videos as any);
    state.youtube.getAnalyticsReport.mockResolvedValue(payload.report as any);

    const { registerYouTubeWorker } = await import("../../../apps/worker/src/workers/youtube-sync");
    registerYouTubeWorker({} as any);

    expect(state.processor).toBeTypeOf("function");

    await state.processor?.({
      id: "job-yt-1",
      data: { userId: state.connection.userId, connectionId: state.connection.id },
    });

    expect(state.snapshotUpserts).toHaveLength(1);
    expect(state.videoUpserts).toHaveLength(2);

    expect(state.updates[0]).toMatchObject({ syncStatus: "syncing" });
    expect(state.updates[state.updates.length - 1]).toMatchObject({
      syncStatus: "idle",
      syncError: null,
    });

    expect(state.invalidateAnalyticsCache).toHaveBeenCalledWith(state.connection.userId);
  });

  it("marks connection as error when provider call fails", async () => {
    const payload = makeYouTubeApiPayload();

    state.youtube.getChannelStats.mockResolvedValue(payload.channel as any);
    state.youtube.getVideoList.mockResolvedValue(payload.videos as any);
    state.youtube.getAnalyticsReport.mockRejectedValue(new Error("youtube analytics failed"));

    const { registerYouTubeWorker } = await import("../../../apps/worker/src/workers/youtube-sync");
    registerYouTubeWorker({} as any);

    await expect(
      state.processor?.({
        id: "job-yt-2",
        data: { userId: state.connection.userId, connectionId: state.connection.id },
      }),
    ).rejects.toThrow("youtube analytics failed");

    expect(state.updates[0]).toMatchObject({ syncStatus: "syncing" });
    expect(state.updates[state.updates.length - 1]).toMatchObject({
      syncStatus: "error",
    });

    expect(state.invalidateAnalyticsCache).not.toHaveBeenCalled();
    expect(state.snapshotUpserts).toHaveLength(0);
    expect(state.videoUpserts).toHaveLength(0);
  });

  it("supports retry lifecycle by succeeding after a failed attempt", async () => {
    const payload = makeYouTubeApiPayload();

    state.youtube.getChannelStats
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValue(payload.channel as any);
    state.youtube.getVideoList.mockResolvedValue(payload.videos as any);
    state.youtube.getAnalyticsReport.mockResolvedValue(payload.report as any);

    const { registerYouTubeWorker } = await import("../../../apps/worker/src/workers/youtube-sync");
    registerYouTubeWorker({} as any);

    await expect(
      state.processor?.({
        id: "job-yt-retry-1",
        data: { userId: state.connection.userId, connectionId: state.connection.id },
      }),
    ).rejects.toThrow("transient");

    await state.processor?.({
      id: "job-yt-retry-2",
      data: { userId: state.connection.userId, connectionId: state.connection.id },
    });

    const statusTimeline = state.updates
      .map((u) => u.syncStatus)
      .filter(Boolean);

    expect(statusTimeline).toContain("error");
    expect(statusTimeline[statusTimeline.length - 1]).toBe("idle");
    expect(state.snapshotUpserts).toHaveLength(1);
    expect(state.videoUpserts).toHaveLength(2);
  });
});
