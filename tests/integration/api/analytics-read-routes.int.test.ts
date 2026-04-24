import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  authorized: true,
  cache: null as any,
  setCalls: [] as Array<{ key: string; value: any; ex?: number }>,
  platformConnections: [
    {
      id: "conn-yt",
      platform: "youtube",
      scopes: [
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/yt-analytics.readonly",
      ],
    },
    { id: "conn-ig", platform: "instagram", scopes: null },
  ] as any[],
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => (state.authorized ? {
    userId: "00000000-0000-4000-8000-000000000001",
    email: "a@b.com",
    plan: "starter",
  } : null)),
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(async () => state.cache),
    set: vi.fn(async (key: string, value: any, opts?: { ex?: number }) => {
      state.setCalls.push({ key, value, ex: opts?.ex });
      return "OK";
    }),
    del: vi.fn(async () => 1),
    incr: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
  },
}));

vi.mock("@creator-os/db", () => ({
  db: {
    query: {
      platformConnections: {
        findMany: vi.fn(async () => state.platformConnections),
      },
    },
  },
  platformConnections: { userId: "userId" },
  eq: vi.fn((_field: unknown, value: any) => value),
}));

vi.mock("@creator-os/db/queries/analytics", () => ({
  getLatestSnapshotByPlatform: vi.fn(async (_userId: string, platform: string) => {
    if (platform === "youtube") {
      return {
        platform: "youtube",
        subscribers: 100,
        totalViews: 1000,
        views7d: 300,
        views30d: 900,
        subsGained7d: 10,
        avgEr7d: 5,
        snapshotDate: new Date("2026-04-22"),
        createdAt: new Date("2026-04-22T00:00:00.000Z"),
      };
    }
    if (platform === "instagram") {
      return {
        platform: "instagram",
        subscribers: 0,
        totalViews: 700,
        views7d: 200,
        views30d: 700,
        subsGained7d: 0,
        avgEr7d: 3,
        snapshotDate: new Date("2026-04-22"),
        createdAt: new Date("2026-04-22T00:00:00.000Z"),
      };
    }
    return null;
  }),
  getPreviousSnapshotByPlatform: vi.fn(async (_userId: string, platform: string) => {
    if (platform === "youtube") return { views7d: 200 };
    if (platform === "instagram") return { views7d: 100 };
    return null;
  }),
  listSnapshotsByPlatform: vi.fn(async () => [
    { snapshotDate: new Date("2026-04-20"), views7d: 100 },
    { snapshotDate: new Date("2026-04-21"), views7d: 120 },
  ]),
  listSnapshotsForPlatforms: vi.fn(async () => [
    { snapshotDate: new Date("2026-04-20"), platform: "youtube", views7d: 100 },
    { snapshotDate: new Date("2026-04-20"), platform: "instagram", views7d: 70 },
    { snapshotDate: new Date("2026-04-21"), platform: "youtube", views7d: 130 },
    { snapshotDate: new Date("2026-04-21"), platform: "instagram", views7d: 80 },
  ]),
  listVideos: vi.fn(async () => [
    { id: "v1", title: "A", views: 100, likes: 10, comments: 1, publishedAt: null },
    { id: "v2", title: "B", views: 90, likes: 9, comments: 2, publishedAt: null },
  ]),
}));

describe("analytics read endpoints", () => {
  beforeEach(() => {
    state.authorized = true;
    state.cache = null;
    state.setCalls = [];
    state.platformConnections = [
      {
        id: "conn-yt",
        platform: "youtube",
        scopes: [
          "https://www.googleapis.com/auth/youtube.readonly",
          "https://www.googleapis.com/auth/yt-analytics.readonly",
        ],
      },
      { id: "conn-ig", platform: "instagram", scopes: null },
    ];
  });

  it("snapshot endpoint returns cached payload on cache hit", async () => {
    state.cache = { data: { platform: "youtube", views7d: 999 }, synced: true, syncedAt: "x" };

    const route = await import("../../../apps/web/src/app/api/analytics/snapshot/route");
    const res = await route.GET(new Request("http://localhost/api/analytics/snapshot?platform=youtube"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(state.cache);
  });

  it("snapshot endpoint computes combined platform correctly on cache miss", async () => {
    state.cache = null;

    const route = await import("../../../apps/web/src/app/api/analytics/snapshot/route");
    const res = await route.GET(new Request("http://localhost/api/analytics/snapshot?platform=combined"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toMatchObject({
      platform: "combined",
      subscribers: 100,
      totalViews: 1700,
      views7d: 500,
      subsGained7d: 10,
    });
    expect(body.data.views7dChange).toBeCloseTo(((500 - 300) / 300) * 100, 4);
    expect(state.setCalls.some((c) => c.key.includes("analytics:snapshot:"))).toBe(true);
  });

  it("trends endpoint returns combined per-date totals", async () => {
    const route = await import("../../../apps/web/src/app/api/analytics/trends/route");
    const res = await route.GET(new Request("http://localhost/api/analytics/trends?platform=combined"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([
      { date: "2026-04-20", totalViews7d: 170, youtubeViews7d: 100, instagramViews7d: 70 },
      { date: "2026-04-21", totalViews7d: 210, youtubeViews7d: 130, instagramViews7d: 80 },
    ]);
  });

  it("videos endpoint serves cache hit and cache miss with pagination", async () => {
    const route = await import("../../../apps/web/src/app/api/analytics/videos/route");

    state.cache = { data: [{ id: "cached-1" }], pagination: { limit: 10, offset: 0, count: 1 } };
    const cachedRes = await route.GET({ nextUrl: new URL("http://localhost/api/analytics/videos?limit=10&offset=0&sort=views&direction=desc&platform=youtube") } as any);
    const cachedBody = await cachedRes.json();
    expect(cachedRes.status).toBe(200);
    expect(cachedBody.data[0].id).toBe("cached-1");

    state.cache = null;
    const missRes = await route.GET({ nextUrl: new URL("http://localhost/api/analytics/videos?limit=2&offset=0&sort=views&direction=desc&platform=youtube") } as any);
    const missBody = await missRes.json();
    expect(missRes.status).toBe(200);
    expect(missBody.pagination).toMatchObject({ limit: 2, offset: 0, count: 2 });
    expect(missBody.data[0]).toMatchObject({ id: "v1", views: 100 });
  });

  it("returns 401 for unauthorized analytics reads", async () => {
    state.authorized = false;
    const snapshotRoute = await import("../../../apps/web/src/app/api/analytics/snapshot/route");
    const trendsRoute = await import("../../../apps/web/src/app/api/analytics/trends/route");
    const videosRoute = await import("../../../apps/web/src/app/api/analytics/videos/route");

    const s = await snapshotRoute.GET(new Request("http://localhost/api/analytics/snapshot"));
    const t = await trendsRoute.GET(new Request("http://localhost/api/analytics/trends"));
    const v = await videosRoute.GET({ nextUrl: new URL("http://localhost/api/analytics/videos") } as any);

    expect(s.status).toBe(401);
    expect(t.status).toBe(401);
    expect(v.status).toBe(401);
  });
});
