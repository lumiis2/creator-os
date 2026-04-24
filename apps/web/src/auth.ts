import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, users, eq } from "@creator-os/db";
import { authCallbacks } from "@/lib/auth-callbacks";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
          config_id: "1289996063063337",
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
  callbacks: authCallbacks,
  pages: {
    signIn: "/login",
    error: "/login",
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
