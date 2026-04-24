import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeYouTubeApiPayload, makeYouTubeConnection } from "../../factories/analytics";

const runWorkerTests = process.env.ENABLE_WORKER_TESTS === "true";
const workerDescribe = runWorkerTests ? describe : describe.skip;

const state = vi.hoisted(() => ({
  mode: "inline" as "inline" | "worker",
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
  processor: null as null | ((job: any) => Promise<void>),
  snapshotWrites: {
    inline: [] as Array<Record<string, unknown>>,
    worker: [] as Array<Record<string, unknown>>,
  },
  videoWrites: {
    inline: [] as Array<Record<string, unknown>>,
    worker: [] as Array<Record<string, unknown>>,
  },
  updates: {
    inline: [] as Array<Record<string, unknown>>,
    worker: [] as Array<Record<string, unknown>>,
  },
  youtube: {
    getChannelStats: vi.fn(),
    getVideoList: vi.fn(),
    getAnalyticsReport: vi.fn(),
    refreshGoogleAccessToken: vi.fn(),
  },
}));

vi.mock("bullmq", () => {
  class Worker {
    constructor(_name: string, processor: (job: any) => Promise<void>) {
      state.processor = processor;
    }

    on() {
      return this;
    }
  }

  class Queue {}
  class Job {}

  return { Worker, Queue, Job };
});

vi.mock("@creator-os/db", () => {
  const analyticsSnapshots = { __table: "analyticsSnapshots", userId: "userId", platform: "platform", snapshotDate: "snapshotDate" };
  const videoMetrics = { __table: "videoMetrics", userId: "userId", platform: "platform", platformVideoId: "platformVideoId" };
  const platformConnections = { __table: "platformConnections", id: "id", userId: "userId", platform: "platform" };

  const db = {
    query: {
      platformConnections: {
        findMany: vi.fn(async () => [state.connection]),
        findFirst: vi.fn(async () => state.connection),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn((payload: Record<string, unknown>) => {
        state.updates[state.mode].push(payload);
        return { where: vi.fn(async () => undefined) };
      }),
    })),
    insert: vi.fn((table: { __table: string }) => ({
      values: vi.fn((payload: Record<string, unknown>) => {
        if (table.__table === "analyticsSnapshots") {
          state.snapshotWrites[state.mode].push(payload);
        }

        if (table.__table === "videoMetrics") {
          state.videoWrites[state.mode].push(payload);
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
    and: vi.fn(),
    eq: vi.fn((_a: unknown, b: unknown) => b),
  };
});

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => ({
    userId: "00000000-0000-4000-8000-000000000001",
    email: "test@creator.local",
    plan: "starter",
  })),
}));

vi.mock("@/lib/queue", () => ({
  getAnalyticsQueue: vi.fn(() => ({
    add: vi.fn(async () => ({ id: "job-1" })),
  })),
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    del: vi.fn(async () => 1),
    get: vi.fn(async () => null),
    set: vi.fn(async () => "OK"),
    incr: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
  },
}));

vi.mock("@/lib/analytics/youtube", () => ({
  getChannelStats: state.youtube.getChannelStats,
  getVideoList: state.youtube.getVideoList,
  getAnalyticsReport: state.youtube.getAnalyticsReport,
  refreshGoogleAccessToken: state.youtube.refreshGoogleAccessToken,
}));

vi.mock("../../../apps/worker/src/lib/cache", () => ({
  invalidateAnalyticsCache: vi.fn(async () => undefined),
}));

vi.mock("../../../apps/worker/src/lib/instagram", () => ({
  fetchInstagramInsightsSummary: vi.fn(),
}));

workerDescribe("analytics sync parity: inline route vs worker processor", () => {
  beforeEach(() => {
    state.connection = makeYouTubeConnection() as any;
    state.processor = null;
    state.snapshotWrites.inline = [];
    state.snapshotWrites.worker = [];
    state.videoWrites.inline = [];
    state.videoWrites.worker = [];
    state.updates.inline = [];
    state.updates.worker = [];
    state.youtube.getChannelStats.mockReset();
    state.youtube.getVideoList.mockReset();
    state.youtube.getAnalyticsReport.mockReset();
    state.youtube.refreshGoogleAccessToken.mockReset();
  });

  it("persists equivalent normalized snapshot and video metrics", async () => {
    const payload = makeYouTubeApiPayload();

    state.youtube.getChannelStats.mockResolvedValue(payload.channel as any);
    state.youtube.getVideoList.mockResolvedValue(payload.videos as any);
    state.youtube.getAnalyticsReport.mockResolvedValue(payload.report as any);

    process.env.WORKER_DISABLED = "true";

    state.mode = "inline";
    const inlineRoute = await import("../../../apps/web/src/app/api/analytics/sync/route");
    const inlineResponse = await inlineRoute.POST(new Request("http://localhost/api/analytics/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ platform: "youtube" }),
    }) as any);

    expect(inlineResponse.status).toBe(200);

    state.mode = "worker";
    const workerModule = await import("../../../apps/worker/src/workers/youtube-sync");
    workerModule.registerYouTubeWorker({} as any);

    await state.processor?.({
      id: "job-inline-parity-1",
      data: {
        userId: state.connection.userId,
        connectionId: state.connection.id,
      },
    });

    expect(state.snapshotWrites.inline).toHaveLength(1);
    expect(state.snapshotWrites.worker).toHaveLength(1);
    expect(state.videoWrites.inline).toHaveLength(2);
    expect(state.videoWrites.worker).toHaveLength(2);

    const inlineSnapshot = state.snapshotWrites.inline[0];
    const workerSnapshot = state.snapshotWrites.worker[0];

    expect(inlineSnapshot).toMatchObject({
      userId: workerSnapshot.userId,
      connectionId: workerSnapshot.connectionId,
      platform: workerSnapshot.platform,
      views7d: workerSnapshot.views7d,
      views30d: workerSnapshot.views30d,
      subscribers: workerSnapshot.subscribers,
      totalViews: workerSnapshot.totalViews,
      subsGained7d: workerSnapshot.subsGained7d,
    });

    const inlineVideos = state.videoWrites.inline
      .map((v) => ({ id: v.platformVideoId, views: v.views, likes: v.likes, comments: v.comments }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));

    const workerVideos = state.videoWrites.worker
      .map((v) => ({ id: v.platformVideoId, views: v.views, likes: v.likes, comments: v.comments }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));

    expect(inlineVideos).toEqual(workerVideos);

    expect(state.updates.inline[0]).toMatchObject({ syncStatus: "syncing" });
    expect(state.updates.worker[0]).toMatchObject({ syncStatus: "syncing" });

    expect(state.updates.inline[state.updates.inline.length - 1]).toMatchObject({ syncStatus: "idle" });
    expect(state.updates.worker[state.updates.worker.length - 1]).toMatchObject({ syncStatus: "idle" });
  });
});
