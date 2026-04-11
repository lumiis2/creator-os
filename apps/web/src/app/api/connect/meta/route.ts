import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

function buildState(userId: string): string {
  const ts = Date.now();
  const payload = `${userId}.${ts}`;
  const secret = process.env.AUTH_SECRET ?? "dev-secret";
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appId = process.env.FACEBOOK_CLIENT_ID;
  const callbackBase = process.env.NEXTAUTH_URL ?? req.nextUrl.origin;
  const redirectUri = `${callbackBase}/api/connect/meta/callback`;
  const state = buildState(session.userId);

  if (!appId) {
    return NextResponse.json({ error: "FACEBOOK_CLIENT_ID is missing" }, { status: 500 });
  }

  const oauthUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  oauthUrl.searchParams.set("client_id", appId);
  oauthUrl.searchParams.set("redirect_uri", redirectUri);
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("config_id", "1289996063063337");
  oauthUrl.searchParams.set("state", state);

  return NextResponse.redirect(oauthUrl.toString());
}
