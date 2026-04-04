import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listConnections } from "@creator-os/db/queries/connections";

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await listConnections(session.userId);
  return NextResponse.json({
    data: data.map((conn: any) => ({
      id: conn.id,
      platform: conn.platform,
      status: conn.syncStatus ?? "idle",
      lastSyncedAt: conn.lastSyncedAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") ?? "/profile";
  const connectUrl = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return NextResponse.json({ connectUrl });
}
