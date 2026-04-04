import NextAuth, { type NextAuthConfig, type Session, type User as NextAuthUser } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, users, creatorProfiles, platformConnections, eq, and } from "@creator-os/db";
import type { JWT } from "next-auth/jwt";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    Credentials({
      authorize: async (credentials: Record<string, unknown> | undefined) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
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
      if (user) {
        nextToken.sub = (user as NextAuthUser).id ?? nextToken.sub;
        nextToken.plan = (user as NextAuthUser).plan ?? "starter";
      } else if (!nextToken.plan && nextToken.email) {
        const existing = await db.query.users.findFirst({ where: eq(users.email, nextToken.email) });
        if (existing) {
          nextToken.sub = existing.id;
          nextToken.plan = existing.plan;
        }
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
      profile?: { email?: string | null; name?: string | null; sub?: string | null } | null;
      user?: { id?: string; email?: string | null } | null;
    }) => {
      if (account?.provider === "google" && profile?.email) {
        const existing = await db.query.users.findFirst({ where: eq(users.email, profile.email) });
        let ensuredUserId = existing?.id;

        if (!existing) {
          const [user] = await db.insert(users).values({
            email: profile.email,
            hashedPassword: null,
            plan: "starter",
          }).returning();
          await db.insert(creatorProfiles).values({ userId: user.id, onboardingDone: false });
          ensuredUserId = user.id;
        }

        if (ensuredUserId && account.access_token) {
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
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
