import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchInstagramInsights } from "../../apps/web/src/services/meta/fetchAnalytics";
import { getAnalyticsReport } from "../../apps/web/src/lib/analytics/youtube";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("external integration mappings", () => {
  it("maps Meta Instagram insights into stable internal shape", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { name: "views", total_value: { value: 1200 } },
          { name: "content_views", total_value: { value: 1200 } },
          { name: "reach", total_value: { value: 700 } },
          { name: "profile_views", total_value: { value: 55 } },
        ],
      }),
    } as any);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { name: "views", total_value: { value: 5000 } },
          { name: "content_views", total_value: { value: 5000 } },
          { name: "reach", total_value: { value: 3000 } },
          { name: "profile_views", total_value: { value: 220 } },
        ],
      }),
    } as any);

    const result = await fetchInstagramInsights("ig-user-1", "token");

    expect(result).toMatchObject({
      igUserId: "ig-user-1",
      values: {
        impressions_7d: 1200,
        impressions_30d: 5000,
        reach_7d: 700,
        reach_30d: 3000,
        profile_views_7d: 55,
        profile_views_30d: 220,
        impressions: 1200,
      },
    });

    expect(result.raw).toHaveProperty("last7d");
    expect(result.raw).toHaveProperty("last30d");
  });

  it("maps YouTube analytics API rows to aggregated report shape", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        columnHeaders: [
          { name: "day" },
          { name: "views" },
          { name: "subscribersGained" },
          { name: "likes" },
          { name: "comments" },
          { name: "shares" },
        ],
        rows: [
          ["2026-04-20", 100, 4, 9, 2, 1],
          ["2026-04-21", 120, 5, 10, 3, 2],
        ],
      }),
    } as any);

    const report = await getAnalyticsReport("token", "channel");

    expect(report).toMatchObject({
      viewsLast7d: 220,
      viewsLast30d: 220,
      subsGained7d: 9,
      avgEr7d: null,
    });
    expect(report.snapshotDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
