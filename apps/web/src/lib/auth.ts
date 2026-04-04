import { auth } from "@/auth";
import { creatorProfiles, db, eq, users } from "@creator-os/db";

export interface AuthContext {
  userId: string;
  email?: string | null;
  plan?: string;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function requireAuth(): Promise<AuthContext | null> {
  const session = await auth();

  if (session?.user?.id && isUuid(session.user.id)) {
    const existingById = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
    if (existingById) {
      return {
        userId: existingById.id,
        email: existingById.email,
        plan: existingById.plan,
      };
    }
  }

  if (session?.user?.email) {
    const existing = await db.query.users.findFirst({ where: eq(users.email, session.user.email) });
    if (existing) {
      return {
        userId: existing.id,
        email: existing.email,
        plan: existing.plan,
      };
    }
  }

  if (process.env.AUTH_DISABLED === "true") {
    const email = process.env.DEV_USER_EMAIL ?? "dev@creatoros.local";
    let user = await db.query.users.findFirst({ where: eq(users.email, email) });

    if (!user) {
      const [created] = await db.insert(users).values({
        email,
        hashedPassword: null,
        plan: "starter",
      }).returning();

      await db.insert(creatorProfiles).values({
        userId: created.id,
        onboardingDone: false,
      }).onConflictDoNothing();

      user = created;
    }

    return {
      userId: user.id,
      email: user.email,
      plan: user.plan,
    };
  }

  return null;
}
