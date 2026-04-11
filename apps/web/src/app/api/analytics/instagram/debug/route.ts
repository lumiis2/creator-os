import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getLatestSnapshotByPlatform } from "@creator-os/db/queries/analytics";

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const latest = await getLatestSnapshotByPlatform(session.userId, "instagram");
  if (!latest) {
    return NextResponse.json({
      hasSnapshot: false,
      message: "No Instagram snapshot found yet.",
    });
  }

  return NextResponse.json({
    hasSnapshot: true,
    mapped: {
      snapshotDate: latest.snapshotDate,
      views7d: latest.views7d,
      views30d: latest.views30d,
      totalViews: latest.totalViews,
      subscribers: latest.subscribers,
      avgEr7d: latest.avgEr7d,
      createdAt: latest.createdAt,
      platform: latest.platform,
    },
    rawPayload: latest.rawPayload,
  });
}
