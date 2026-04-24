export function makeYouTubeConnection(overrides: Partial<Record<string, unknown>> = {}) {
  return {
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
    ...overrides,
  } as const;
}

export function makeInstagramConnection(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "conn-instagram-1",
    userId: "00000000-0000-4000-8000-000000000001",
    platform: "instagram",
    platformUserId: "ig-user-1",
    displayName: "IG Business",
    accessTokenEnc: "token-ig",
    refreshTokenEnc: null,
    tokenExpiresAt: null,
    scopes: null,
    syncStatus: "idle",
    syncError: null,
    meta: { ig_user_id: "ig-user-1" },
    ...overrides,
  } as const;
}

export function makeYouTubeApiPayload() {
  return {
    channel: {
      id: "channel-1",
      snippet: { title: "Creator Channel" },
      statistics: {
        subscriberCount: "1200",
        viewCount: "55000",
        videoCount: "42",
      },
    },
    videos: [
      {
        id: "video-1",
        snippet: {
          title: "Video 1",
          publishedAt: "2026-04-20T00:00:00.000Z",
          thumbnails: { high: { url: "https://img/1.jpg" } },
        },
        statistics: { viewCount: "1000", likeCount: "80", commentCount: "10" },
        contentDetails: { duration: "PT5M" },
      },
      {
        id: "video-2",
        snippet: {
          title: "Video 2",
          publishedAt: "2026-04-19T00:00:00.000Z",
          thumbnails: { high: { url: "https://img/2.jpg" } },
        },
        statistics: { viewCount: "600", likeCount: "40", commentCount: "6" },
        contentDetails: { duration: "PT3M" },
      },
    ],
    report: {
      viewsLast7d: 1600,
      viewsLast30d: 9000,
      subsGained7d: 25,
      avgEr7d: 7.5,
      snapshotDate: "2026-04-22",
    },
  };
}
