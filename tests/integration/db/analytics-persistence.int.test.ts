import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeYouTubeApiPayload, makeYouTubeConnection } from "../../factories/analytics";

const state = vi.hoisted(() => ({
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
  updates: [] as Array<Record<string, unknown>>,
  snapshots: [] as Array<Record<string, unknown>>,
  videos: [] as Array<Record<string, unknown>>,
  youtube: {
    getChannelStats: vi.fn(),
    getVideoList: vi.fn(),
    getAnalyticsReport: vi.fn(),
    refreshGoogleAccessToken: vi.fn(),
  },
}));

vi.mock("@creator-os/db", () => {
  const analyticsSnapshots = { __table: "analyticsSnapshots", userId: "userId", platform: "platform", snapshotDate: "snapshotDate" };
  const videoMetrics = { __table: "videoMetrics", userId: "userId", platform: "platform", platformVideoId: "platformVideoId" };
  const platformConnections = { __table: "platformConnections", id: "id", userId: "userId", platform: "platform" };

  const db = {
    query: {
      platformConnections: {
        findFirst: vi.fn(async () => state.connection),
        findMany: vi.fn(async () => [state.connection]),
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
          state.snapshots.push(payload);
        }

        if (table.__table === "videoMetrics") {
          state.videos.push(payload);
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
  requireAuth: vi.fn(async () => ({ userId: state.connection.userId, plan: "starter", email: "test@creator.local" })),
}));

vi.mock("@/lib/queue", () => ({
  getAnalyticsQueue: vi.fn(() => ({ add: vi.fn(async () => ({ id: "q1" })) })),
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

vi.mock("@/services/meta/fetchAnalytics", () => ({
  fetchInstagramInsights: vi.fn(),
}));

describe("db consistency: analytics sync persistence", () => {
  beforeEach(() => {
    state.connection = makeYouTubeConnection() as any;
    state.updates = [];
    state.snapshots = [];
    state.videos = [];
    state.youtube.getChannelStats.mockReset();
    state.youtube.getVideoList.mockReset();
    state.youtube.getAnalyticsReport.mockReset();
    state.youtube.refreshGoogleAccessToken.mockReset();
    process.env.WORKER_DISABLED = "true";
  });

  it("writes snapshot + videos and ends with idle sync state", async () => {
    const payload = makeYouTubeApiPayload();
    state.youtube.getChannelStats.mockResolvedValue(payload.channel as any);
    state.youtube.getVideoList.mockResolvedValue(payload.videos as any);
    state.youtube.getAnalyticsReport.mockResolvedValue(payload.report as any);

    const route = await import("../../../apps/web/src/app/api/analytics/sync/route");

    const res = await route.POST(new Request("http://localhost/api/analytics/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ platform: "youtube" }),
    }) as any);

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ranInline: true, synced: true });

    expect(state.snapshots).toHaveLength(1);
    expect(state.videos).toHaveLength(2);

    expect(state.updates[0]).toMatchObject({ syncStatus: "syncing", syncError: null });
    expect(state.updates[state.updates.length - 1]).toMatchObject({
      syncStatus: "idle",
      syncError: null,
    });
  });

  it("marks connection as error and returns 502 on sync failure", async () => {
    state.youtube.getChannelStats.mockRejectedValue(new Error("network down"));
    state.youtube.getVideoList.mockResolvedValue([] as any);
    state.youtube.getAnalyticsReport.mockResolvedValue({
      viewsLast7d: 0,
      viewsLast30d: 0,
      subsGained7d: 0,
      avgEr7d: null,
      snapshotDate: "2026-04-22",
    } as any);

    const route = await import("../../../apps/web/src/app/api/analytics/sync/route");

    const res = await route.POST(new Request("http://localhost/api/analytics/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ platform: "youtube" }),
    }) as any);

    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toContain("Inline sync failed");

    expect(state.snapshots).toHaveLength(0);
    expect(state.videos).toHaveLength(0);

    expect(state.updates[0]).toMatchObject({ syncStatus: "syncing", syncError: null });
    expect(state.updates[state.updates.length - 1]).toMatchObject({
      syncStatus: "error",
    });
  });
});
