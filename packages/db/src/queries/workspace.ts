import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../index";
import { workspaceItems, NewWorkspaceItem } from "../schema/workspace";

export async function listWorkspaceItems(userId: string, stage?: string) {
  return db.query.workspaceItems.findMany({
    where: and(
      eq(workspaceItems.userId, userId),
      isNull(workspaceItems.deletedAt),
      stage ? eq(workspaceItems.stage, stage) : undefined,
    ),
    orderBy: asc(workspaceItems.createdAt),
  });
}

export async function createWorkspaceItem(item: NewWorkspaceItem) {
  const [created] = await db.insert(workspaceItems).values(item).returning();
  return created;
}

export async function updateWorkspaceItem(id: string, userId: string, data: Partial<typeof workspaceItems.$inferInsert>) {
  const [updated] = await db.update(workspaceItems)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(workspaceItems.id, id), eq(workspaceItems.userId, userId)))
    .returning();
  return updated;
}

export async function softDeleteWorkspaceItem(id: string, userId: string) {
  const [deleted] = await db.update(workspaceItems)
    .set({ deletedAt: new Date() })
    .where(and(eq(workspaceItems.id, id), eq(workspaceItems.userId, userId)))
    .returning();
  return deleted;
}
