import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listSnapshotsByPlatform, listSnapshotsForPlatforms } from "@creator-os/db/queries/analytics";
import { db, eq, platformConnections } from "@creator-os/db";

type DashboardPlatform = "youtube" | "instagram" | "combined";

function resolvePlatform(input: string | null): DashboardPlatform {
  if (input === "instagram" || input === "combined") return input;
  return "youtube";
}

export async function GET(req: Request) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const platform = resolvePlatform(url.searchParams.get("platform"));

  const connections = await db.query.platformConnections.findMany({ where: eq(platformConnections.userId, session.userId) });
  const youtubeConnection = connections.find((conn: { platform: string }) => conn.platform === "youtube");
  const hasYouTubeScopes = (youtubeConnection?.scopes ?? []).some(
    (scope: string) => scope === "https://www.googleapis.com/auth/youtube.readonly" || scope === "https://www.googleapis.com/auth/yt-analytics.readonly",
  );
  const hasInstagram = connections.some((conn: { platform: string }) => conn.platform === "instagram");

  if (platform === "youtube" && !hasYouTubeScopes) return NextResponse.json({ data: [] });
  if (platform === "instagram" && !hasInstagram) return NextResponse.json({ data: [] });
  if (platform === "combined" && !hasYouTubeScopes && !hasInstagram) return NextResponse.json({ data: [] });

  if (platform === "combined") {
    const snapshots = await listSnapshotsForPlatforms(session.userId, ["youtube", "instagram"], 120);

    const byDate = new Map<string, { youtubeViews7d: number; instagramViews7d: number }>();
    for (const snap of snapshots) {
      const date = snap.snapshotDate.toISOString().slice(0, 10);
      const current = byDate.get(date) ?? { youtubeViews7d: 0, instagramViews7d: 0 };
      if (snap.platform === "youtube") current.youtubeViews7d = snap.views7d ?? 0;
      if (snap.platform === "instagram") current.instagramViews7d = snap.views7d ?? 0;
      byDate.set(date, current);
    }

    const data = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, item]) => ({
        date,
        totalViews7d: item.youtubeViews7d + item.instagramViews7d,
        youtubeViews7d: item.youtubeViews7d,
        instagramViews7d: item.instagramViews7d,
      }));

    return NextResponse.json({ data });
  }

  const snapshots = await listSnapshotsByPlatform(session.userId, platform, 14);
  const data = snapshots
    .slice()
    .reverse()
    .map((snap: { snapshotDate: Date; views7d: number | null }) => ({
      date: snap.snapshotDate.toISOString().slice(0, 10),
      totalViews7d: snap.views7d ?? null,
      youtubeViews7d: platform === "youtube" ? (snap.views7d ?? null) : null,
      instagramViews7d: platform === "instagram" ? (snap.views7d ?? null) : null,
    }));

  return NextResponse.json({ data });
}
