import { describe, expect, it } from "vitest";
import { normaliseChannelSnapshot, normaliseVideoMetrics } from "./normalise";

describe("analytics normalise", () => {
  it("normalises channel snapshot payload", () => {
    const snap = normaliseChannelSnapshot({
      userId: "u1",
      connectionId: "c1",
      platform: "youtube",
      channel: {
        id: "ch1",
        statistics: { subscriberCount: "100", viewCount: "1000", videoCount: "10" },
      },
      report: {
        viewsLast7d: 120,
        viewsLast30d: 500,
        subsGained7d: 4,
        avgEr7d: 5.5,
        snapshotDate: "2026-04-02",
      },
    });

    expect(snap.subscribers).toBe(100);
    expect(snap.views7d).toBe(120);
    expect(snap.snapshotDate).toBeInstanceOf(Date);
  });

  it("normalises video metrics list", () => {
    const rows = normaliseVideoMetrics({
      userId: "u1",
      connectionId: "c1",
      platform: "youtube",
      videos: [
        {
          id: "v1",
          snippet: { title: "Title", publishedAt: "2026-04-01T00:00:00.000Z" },
          statistics: { viewCount: "100", likeCount: "10", commentCount: "5" },
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].views).toBe(100);
    expect(rows[0].engagementRate).toBeTypeOf("number");
  });
});
