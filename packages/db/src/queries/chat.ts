import { and, desc, eq } from "drizzle-orm";
import { db } from "../index";
import { chatMessages, chatSessions, NewChatMessage, NewChatSession } from "../schema/chat";

export async function getRecentMessages(sessionId: string, limit = 20) {
  return db.query.chatMessages.findMany({
    where: eq(chatMessages.sessionId, sessionId),
    orderBy: desc(chatMessages.createdAt),
    limit,
  }).then((rows: any[]) => rows.reverse());
}

export async function getSession(sessionId: string, userId: string) {
  return db.query.chatSessions.findFirst({
    where: and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)),
  });
}

export async function createSession(data: NewChatSession) {
  const [session] = await db.insert(chatSessions).values(data).returning();
  return session;
}

export async function getOrCreateSession(userId: string, sessionId?: string) {
  if (sessionId) {
    const existing = await getSession(sessionId, userId);
    if (existing) return existing;
  }
  return createSession({ userId, title: null });
}

export async function persistMessage(message: NewChatMessage) {
  const [saved] = await db.insert(chatMessages).values(message).returning();
  return saved;
}

export async function listSessions(userId: string, limit = 20) {
  return db.query.chatSessions.findMany({
    where: eq(chatSessions.userId, userId),
    orderBy: desc(chatSessions.createdAt),
    limit,
  });
}
