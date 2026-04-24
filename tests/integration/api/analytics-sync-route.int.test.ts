import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeYouTubeApiPayload, makeYouTubeConnection } from "../../factories/analytics";

const state = vi.hoisted(() => ({
  connections: [{
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
  }] as Array<any>,
  queueShouldThrow: false,
  queueAdds: [] as Array<Record<string, unknown>>,
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
        findFirst: vi.fn(async () => state.connections[0] ?? null),
        findMany: vi.fn(async () => state.connections),
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
        if (table.__table === "analyticsSnapshots") state.snapshots.push(payload);
        if (table.__table === "videoMetrics") state.videos.push(payload);
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
    email: "t@creator.local",
    plan: "starter",
  })),
}));

vi.mock("@/lib/queue", () => ({
  getAnalyticsQueue: vi.fn(() => ({
    add: vi.fn(async (_name: string, payload: Record<string, unknown>) => {
      if (state.queueShouldThrow) {
        throw new Error("queue down");
      }
      state.queueAdds.push(payload);
      return { id: `job-${state.queueAdds.length}` };
    }),
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

vi.mock("@/services/meta/fetchAnalytics", () => ({
  fetchInstagramInsights: vi.fn(),
}));

describe("/api/analytics/sync route", () => {
  beforeEach(() => {
    state.connections = [makeYouTubeConnection() as any];
    state.queueShouldThrow = false;
    state.queueAdds = [];
    state.updates = [];
    state.snapshots = [];
    state.videos = [];
    state.youtube.getChannelStats.mockReset();
    state.youtube.getVideoList.mockReset();
    state.youtube.getAnalyticsReport.mockReset();
    state.youtube.refreshGoogleAccessToken.mockReset();
    process.env.WORKER_DISABLED = "false";
  });

  it("returns enqueued response when queue succeeds", async () => {
    const route = await import("../../../apps/web/src/app/api/analytics/sync/route");

    const res = await route.POST(new Request("http://localhost/api/analytics/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ platform: "youtube" }),
    }) as any);

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ enqueued: true, platforms: ["youtube"] });
    expect(state.queueAdds).toHaveLength(1);

    expect(state.youtube.getChannelStats).not.toHaveBeenCalled();
    expect(state.snapshots).toHaveLength(0);
    expect(state.videos).toHaveLength(0);
  });

  it("falls back to inline sync when queue enqueue fails", async () => {
    state.queueShouldThrow = true;

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
    expect(body).toMatchObject({ enqueued: false, ranInline: true, synced: true });
    expect(state.snapshots).toHaveLength(1);
    expect(state.videos).toHaveLength(2);
  });

  it("returns 412 when YouTube scopes are missing", async () => {
    state.connections = [makeYouTubeConnection({ scopes: ["openid", "email"] }) as any];

    const route = await import("../../../apps/web/src/app/api/analytics/sync/route");

    const res = await route.POST(new Request("http://localhost/api/analytics/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ platform: "youtube" }),
    }) as any);

    const body = await res.json();

    expect(res.status).toBe(412);
    expect(body.error).toContain("missing YouTube scopes");
    expect(state.queueAdds).toHaveLength(0);
  });
});
