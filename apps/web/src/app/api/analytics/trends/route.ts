import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listSnapshots } from "@creator-os/db/queries/analytics";

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
