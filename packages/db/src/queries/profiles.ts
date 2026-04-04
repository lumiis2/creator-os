import { db } from "../index";
import { creatorProfiles } from "../schema/profiles";
import { eq } from "drizzle-orm";

export async function getCreatorProfile(userId: string) {
  return db.query.creatorProfiles.findFirst({
    where: eq(creatorProfiles.userId, userId),
  });
}

export async function upsertCreatorProfile(userId: string, data: Partial<typeof creatorProfiles.$inferInsert>) {
  const existing = await getCreatorProfile(userId);
  if (existing) {
    const [updated] = await db.update(creatorProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(creatorProfiles.userId, userId))
      .returning();
    return updated;
  }
  const [created] = await db.insert(creatorProfiles)
    .values({ userId, ...data })
    .returning();
  return created;
}
