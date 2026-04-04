import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listSnapshots } from "@creator-os/db/queries/analytics";
import { db, eq, platformConnections } from "@creator-os/db";

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connection = await db.query.platformConnections.findFirst({
    where: eq(platformConnections.userId, session.userId),
  });
  const hasYouTubeScopes = (connection?.scopes ?? []).some(
    (scope: string) => scope === "https://www.googleapis.com/auth/youtube.readonly" || scope === "https://www.googleapis.com/auth/yt-analytics.readonly",
  );
  if (!connection || !hasYouTubeScopes) return NextResponse.json({ data: [] });

  const snapshots = await listSnapshots(session.userId, 14);
  const data = snapshots
    .slice()
    .reverse()
    .map((snap: { snapshotDate: Date; views7d: number | null; subscribers: number | null }) => ({
      date: snap.snapshotDate.toISOString().slice(0, 10),
      views7d: snap.views7d ?? null,
      subscribers: snap.subscribers ?? null,
    }));

  return NextResponse.json({ data });
}
