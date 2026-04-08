import NextAuth, { type NextAuthConfig, type Session, type User as NextAuthUser } from "next-auth";
import Google from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, users, creatorProfiles, platformConnections, eq, and } from "@creator-os/db";
import type { JWT } from "next-auth/jwt";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function fallbackDisplayNameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "Creator";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || "Creator";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isDbUnavailableError(error: unknown): boolean {
  const primary = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  const cause = error && typeof error === "object" && "cause" in error
    ? String((error as { cause?: unknown }).cause)
    : "";

  const combined = `${primary} ${cause}`;
  return /(ECONNREFUSED|ETIMEDOUT|connect|connection|timeout|failed query|pool|postgres|database|db)/i.test(combined);
}

function logAuthError(message: string, error: unknown, context?: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.error("[auth]", message, {
    ...(context ?? {}),
    error: error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : String(error),
  });
}

function debugOAuthTokenLog(provider: string | undefined, accessToken: string | undefined) {
  if (process.env.DEBUG_OAUTH_TOKENS !== "true") return;
  if (!provider || !accessToken) return;
  // eslint-disable-next-line no-console
  console.log("[auth][debug] oauth access token", {
    provider,
    accessToken,
  });
}

function debugOAuthPayloadLog(input: {
  provider?: string;
  account?: unknown;
  profile?: unknown;
  user?: unknown;
}) {
  if (process.env.DEBUG_OAUTH_PAYLOADS !== "true") return;
  // eslint-disable-next-line no-console
  console.log("[auth][debug] oauth raw payload", input);
}

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  logger: {
    error(error: Error) {
      // eslint-disable-next-line no-console
      console.error("[next-auth]", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    },
    warn(code: string) {
      // eslint-disable-next-line no-console
      console.warn("[next-auth]", code);
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "public_profile",
        },
      },
    }),
    Credentials({
      authorize: async (credentials: Record<string, unknown> | undefined) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const email = normalizeEmail(parsed.data.email);
        const { password } = parsed.data;
        const user = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (!user || !user.hashedPassword) return null;
        const valid = await bcrypt.compare(password, user.hashedPassword);
        if (!valid) return null;
        return { id: user.id, email: user.email, plan: user.plan };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }: { token: JWT; user?: NextAuthUser | null }) => {
      const nextToken = token;
      try {
        if (user) {
          nextToken.sub = (user as NextAuthUser).id ?? nextToken.sub;
          nextToken.plan = (user as NextAuthUser).plan ?? "starter";
        } else if (!nextToken.plan && nextToken.email) {
          const existing = await db.query.users.findFirst({ where: eq(users.email, normalizeEmail(nextToken.email)) });
          if (existing) {
            nextToken.sub = existing.id;
            nextToken.plan = existing.plan;
          }
        }
      } catch (error) {
        logAuthError("JWT callback failed while enriching token", error, {
          email: nextToken.email,
        });
      }
      return nextToken;
    },
    session: async ({ session, token }: { session: Session; token: JWT }) => {
      const nextSession = session;
      if (token?.sub) {
        nextSession.user = {
          ...nextSession.user,
          id: token.sub,
          plan: (token as JWT).plan ?? "starter",
        };
      }
      return nextSession;
    },
    signIn: async ({
      account,
      profile,
      user,
    }: {
      account?: {
        provider?: string;
        access_token?: string;
        refresh_token?: string;
        expires_at?: number;
        scope?: string;
        providerAccountId?: string;
      } | null;
      profile?: { email?: string | null; name?: string | null; sub?: string | null; id?: string | null } | null;
      user?: { id?: string; email?: string | null } | null;
    }) => {
      debugOAuthTokenLog(account?.provider, account?.access_token);
      debugOAuthPayloadLog({
        provider: account?.provider,
        account,
        profile,
        user,
      });

      const isSupportedOAuthProvider = account?.provider === "google" || account?.provider === "facebook";

      const oauthEmailRaw = profile?.email ?? user?.email ?? null;
      const oauthProviderId = account?.providerAccountId ?? profile?.sub ?? profile?.id ?? null;
      const derivedFacebookEmail = account?.provider === "facebook" && oauthProviderId
        ? `fb_${oauthProviderId}@facebook.local`
        : null;

      if (isSupportedOAuthProvider && (oauthEmailRaw || derivedFacebookEmail)) {
        const email = normalizeEmail(oauthEmailRaw ?? derivedFacebookEmail ?? "");
        let ensuredUserId: string | undefined;
        try {
          const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
          ensuredUserId = existing?.id;

          if (!existing) {
            const [createdUser] = await db.insert(users).values({
              email,
              hashedPassword: null,
              plan: "starter",
            }).returning();
            await db.insert(creatorProfiles).values({ userId: createdUser.id, onboardingDone: false });
            ensuredUserId = createdUser.id;
          }
        } catch (error) {
          const existing = await db.query.users.findFirst({ where: eq(users.email, email) }).catch(() => null);
          if (existing?.id) {
            ensuredUserId = existing.id;
            logAuthError("Recovered OAuth provisioning after race/error", error, {
              email,
              provider: account?.provider,
              recovered: true,
            });
          } else {
            logAuthError("Failed to provision OAuth user", error, {
              email,
              provider: account?.provider,
            });
            if (isDbUnavailableError(error)) {
              return "/login?error=database_unavailable";
            }
            return "/login?error=account_setup_failed";
          }
        }

        if (ensuredUserId) {
          try {
            const creatorProfile = await db.query.creatorProfiles.findFirst({
              where: eq(creatorProfiles.userId, ensuredUserId),
            });

            const fallbackDisplayName = fallbackDisplayNameFromEmail(email);
            const callbackDisplayName = profile?.name?.trim() || (user as { name?: string | null } | null)?.name?.trim() || null;
            const displayNameCandidate = callbackDisplayName || fallbackDisplayName;
            if (!creatorProfile) {
              await db.insert(creatorProfiles).values({
                userId: ensuredUserId,
                displayName: displayNameCandidate,
                onboardingDone: false,
              }).onConflictDoNothing();
            } else if (
              !creatorProfile.displayName
              || !creatorProfile.displayName.trim()
              || (
                callbackDisplayName !== null
                && creatorProfile.displayName.trim().toLowerCase() !== callbackDisplayName.toLowerCase()
              )
              || (callbackDisplayName !== null && creatorProfile.displayName.trim() === fallbackDisplayName)
            ) {
              await db.update(creatorProfiles)
                .set({ displayName: displayNameCandidate, updatedAt: new Date() })
                .where(eq(creatorProfiles.userId, ensuredUserId));
            }
          } catch (error) {
            logAuthError("Failed to backfill creator profile during OAuth sign-in", error, {
              userId: ensuredUserId,
              email,
              provider: account?.provider,
            });
          }
        }

        if (account?.provider === "google") {
          const hasYouTubeScope = !!account.scope && (
            account.scope.includes("https://www.googleapis.com/auth/youtube.readonly") ||
            account.scope.includes("https://www.googleapis.com/auth/yt-analytics.readonly")
          );

          if (ensuredUserId && account.access_token && hasYouTubeScope) {
            try {
              const refreshToken = account.refresh_token ?? null;
              const expiresAt = account.expires_at ? new Date(account.expires_at * 1000) : null;
              const scopes = account.scope ? account.scope.split(" ").filter(Boolean) : null;

              const current = await db.query.platformConnections.findFirst({
                where: and(
                  eq(platformConnections.userId, ensuredUserId),
                  eq(platformConnections.platform, "youtube"),
                ),
              });

              if (current) {
                await db.update(platformConnections)
                  .set({
                    platformUserId: account.providerAccountId ?? profile.sub ?? current.platformUserId,
                    displayName: profile.name ?? current.displayName,
                    accessTokenEnc: account.access_token,
                    refreshTokenEnc: refreshToken ?? current.refreshTokenEnc,
                    tokenExpiresAt: expiresAt,
                    scopes,
                    syncStatus: "idle",
                    syncError: null,
                  })
                  .where(eq(platformConnections.id, current.id));
              } else {
                await db.insert(platformConnections).values({
                  userId: ensuredUserId,
                  platform: "youtube",
                  platformUserId: account.providerAccountId ?? profile.sub ?? profile.email,
                  displayName: profile.name ?? profile.email,
                  accessTokenEnc: account.access_token,
                  refreshTokenEnc: refreshToken,
                  tokenExpiresAt: expiresAt,
                  scopes,
                  syncStatus: "idle",
                });
              }
            } catch (error) {
              logAuthError("Failed to persist YouTube connection during Google sign-in", error, {
                userId: ensuredUserId,
                email,
              });
            }
          }
        }

        if (ensuredUserId && user) {
          (user as { id?: string; email?: string | null }).id = ensuredUserId;
          (user as { id?: string; email?: string | null }).email = email;
        }
      }

      if (account?.provider === "credentials" && user?.id) {
        try {
          const creatorProfile = await db.query.creatorProfiles.findFirst({
            where: eq(creatorProfiles.userId, user.id),
          });

          if (!creatorProfile) {
            await db.insert(creatorProfiles).values({
              userId: user.id,
              displayName: user.email ? fallbackDisplayNameFromEmail(user.email) : "Creator",
              onboardingDone: false,
            }).onConflictDoNothing();
          } else if (!creatorProfile.displayName || !creatorProfile.displayName.trim()) {
            await db.update(creatorProfiles)
              .set({
                displayName: user.email ? fallbackDisplayNameFromEmail(user.email) : "Creator",
                updatedAt: new Date(),
              })
              .where(eq(creatorProfiles.userId, user.id));
          }
        } catch (error) {
          logAuthError("Failed to backfill creator profile during credentials sign-in", error, {
            userId: user.id,
            email: user.email,
          });
        }
      }

      if (user?.id) {
        (user as any).id = user.id;
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
