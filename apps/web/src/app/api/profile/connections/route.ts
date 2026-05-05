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
      displayName: conn.displayName ?? null,
      status: conn.syncStatus ?? "idle",
      lastSyncedAt: conn.lastSyncedAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") ?? "/profile";
  const scope = "openid email profile https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly";
  const connectUrl = `/api/auth/signin?provider=google&callbackUrl=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;

  // Debug: surface config and generated URL during YouTube connect flow
  // eslint-disable-next-line no-console
  console.warn("[connect-youtube] connect url", {
    callbackUrl,
    connectUrl,
    env: {
      hasGoogleClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
      hasGoogleClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
      hasAuthSecret: Boolean(process.env.AUTH_SECRET),
      hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
      nextAuthUrl: process.env.NEXTAUTH_URL ?? null,
    },
  });

  return NextResponse.json({ connectUrl });
}
