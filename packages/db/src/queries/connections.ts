import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { platformConnections } from "../schema/connections";

export async function listConnections(userId: string) {
  return db.query.platformConnections.findMany({
    where: eq(platformConnections.userId, userId),
  });
}

export async function deleteConnection(userId: string, id: string) {
  const [deleted] = await db.delete(platformConnections)
    .where(and(eq(platformConnections.userId, userId), eq(platformConnections.id, id)))
    .returning();
  return deleted;
}
