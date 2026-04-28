import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, db, eq, platformConnections } from "@creator-os/db";

interface MetaTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

interface MetaPagesResponse {
  data?: Array<{
    id: string;
    name?: string;
    access_token?: string;
  }>;
}

interface PageInstagramAccountResponse {
  instagram_business_account?: {
    id: string;
  };
}

function redirectToProfile(base: string, params: Record<string, string>): NextResponse {
  const url = new URL("/profile", base);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

function parseAndVerifyState(state: string | null): { userId: string } | null {
  if (!state) return null;

  try {
    const decoded = Buffer.from(state, "base64url").toString("utf-8");
    const [userId, tsRaw, signature] = decoded.split(".");
    if (!userId || !tsRaw || !signature) return null;

    const ts = Number(tsRaw);
    if (!Number.isFinite(ts)) return null;

    const ageMs = Date.now() - ts;
    if (ageMs > 15 * 60 * 1000) return null;

    const payload = `${userId}.${ts}`;
    const secret = process.env.AUTH_SECRET ?? "dev-secret";
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    if (expected !== signature) return null;

    return { userId };
  } catch {
    return null;
  }
}

async function exchangeCodeForShortLivedToken(params: {
  code: string;
  redirectUri: string;
  appId: string;
  appSecret: string;
}): Promise<MetaTokenResponse> {
  const url = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  url.searchParams.set("client_id", params.appId);
  url.searchParams.set("client_secret", params.appSecret);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("code", params.code);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !(body as MetaTokenResponse).access_token) {
    throw new Error((body as any)?.error?.message ?? "Failed to exchange OAuth code");
  }

  return body as MetaTokenResponse;
}

async function exchangeForLongLivedToken(params: {
  appId: string;
  appSecret: string;
  shortToken: string;
}): Promise<MetaTokenResponse> {
  const url = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", params.appId);
  url.searchParams.set("client_secret", params.appSecret);
  url.searchParams.set("fb_exchange_token", params.shortToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !(body as MetaTokenResponse).access_token) {
    throw new Error((body as any)?.error?.message ?? "Failed to exchange for long-lived token");
  }

  return body as MetaTokenResponse;
}

async function getUserPages(userToken: string): Promise<NonNullable<MetaPagesResponse["data"]>> {
  const url = new URL("https://graph.facebook.com/v19.0/me/accounts");
  url.searchParams.set("access_token", userToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as any)?.error?.message ?? "Failed to fetch Facebook Pages");
  }

  return ((body as MetaPagesResponse).data ?? []) as NonNullable<MetaPagesResponse["data"]>;
}

async function getInstagramBusinessAccount(pageId: string, token: string): Promise<string | null> {
  const url = new URL(`https://graph.facebook.com/v19.0/${pageId}`);
  url.searchParams.set("fields", "instagram_business_account");
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return null;

  return (body as PageInstagramAccountResponse).instagram_business_account?.id ?? null;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const callbackBase = process.env.NEXTAUTH_URL ?? req.nextUrl.origin;
  const redirectUri = `${callbackBase}/api/connect/meta/callback`;

  const appId = process.env.FACEBOOK_CLIENT_ID;
  const appSecret = process.env.FACEBOOK_CLIENT_SECRET;

  const parsedState = parseAndVerifyState(state);

  if (!appId || !appSecret) {
    return redirectToProfile(callbackBase, { meta: "error", reason: "missing_app_credentials" });
  }

  if (!parsedState) {
    return redirectToProfile(callbackBase, { meta: "error", reason: "invalid_state" });
  }

  if (!code) {
    return redirectToProfile(callbackBase, { meta: "error", reason: "missing_code" });
  }

  try {
    const shortToken = await exchangeCodeForShortLivedToken({
      code,
      redirectUri,
      appId,
      appSecret,
    });

    const longToken = await exchangeForLongLivedToken({
      appId,
      appSecret,
      shortToken: shortToken.access_token,
    });

    const userToken = longToken.access_token;
    const expiresAt = longToken.expires_in
      ? new Date(Date.now() + longToken.expires_in * 1000)
      : null;

    const pages = await getUserPages(userToken);
    if (!pages.length) {
      return redirectToProfile(callbackBase, { meta: "error", reason: "no_pages" });
    }

    const firstPage = pages[0];
    const pageToken = firstPage.access_token;

    if (!pageToken) {
      return redirectToProfile(callbackBase, { meta: "error", reason: "missing_page_token" });
    }

    const facebookMeta = {
      pages: pages.map((p) => ({ page_id: p.id, page_name: p.name ?? null })),
      primary_page_id: firstPage.id,
    };

    const existingFacebook = await db.query.platformConnections.findFirst({
      where: and(
        eq(platformConnections.userId, parsedState.userId),
        eq(platformConnections.platform, "facebook"),
      ),
    });

    if (existingFacebook) {
      await db.update(platformConnections)
        .set({
          platformUserId: firstPage.id,
          displayName: firstPage.name ?? existingFacebook.displayName,
          accessTokenEnc: pageToken,
          tokenType: longToken.token_type ?? shortToken.token_type ?? null,
          tokenExpiresAt: expiresAt,
          meta: facebookMeta,
          syncStatus: "idle",
          syncError: null,
        })
        .where(eq(platformConnections.id, existingFacebook.id));
    } else {
      await db.insert(platformConnections).values({
        userId: parsedState.userId,
        platform: "facebook",
        platformUserId: firstPage.id,
        displayName: firstPage.name ?? "Facebook Page",
        accessTokenEnc: pageToken,
        tokenType: longToken.token_type ?? shortToken.token_type ?? null,
        tokenExpiresAt: expiresAt,
        meta: facebookMeta,
        syncStatus: "idle",
      });
    }

    let connectedInstagram = false;
    let igUserId: string | null = null;
    let igPageId: string | null = null;

    for (const page of pages) {
      if (!page.access_token) continue;
      const candidateIgId = await getInstagramBusinessAccount(page.id, page.access_token);
      if (candidateIgId) {
        connectedInstagram = true;
        igUserId = candidateIgId;
        igPageId = page.id;
        break;
      }
    }

    if (!connectedInstagram || !igUserId || !igPageId) {
      return redirectToProfile(callbackBase, { meta: "facebook_only" });
    }

    const instagramMeta = {
      page_id: igPageId,
      ig_user_id: igUserId,
    };

    const existingInstagram = await db.query.platformConnections.findFirst({
      where: and(
        eq(platformConnections.userId, parsedState.userId),
        eq(platformConnections.platform, "instagram"),
      ),
    });

    if (existingInstagram) {
      await db.update(platformConnections)
        .set({
          platformUserId: igUserId,
          displayName: "Instagram Business",
          accessTokenEnc: pageToken,
          tokenType: longToken.token_type ?? shortToken.token_type ?? null,
          tokenExpiresAt: expiresAt,
          meta: instagramMeta,
          syncStatus: "idle",
          syncError: null,
        })
        .where(eq(platformConnections.id, existingInstagram.id));
    } else {
      await db.insert(platformConnections).values({
        userId: parsedState.userId,
        platform: "instagram",
        platformUserId: igUserId,
        displayName: "Instagram Business",
        accessTokenEnc: pageToken,
        tokenType: longToken.token_type ?? shortToken.token_type ?? null,
        tokenExpiresAt: expiresAt,
        meta: instagramMeta,
        syncStatus: "idle",
      });
    }

    return NextResponse.redirect(new URL("/profile?meta=connected", callbackBase));
  } catch (error) {
    return redirectToProfile(callbackBase, {
      meta: "error",
      reason: error instanceof Error ? error.message.slice(0, 80) : "unknown",
    });
  }
}
