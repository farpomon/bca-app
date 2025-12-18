import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db";
import { chatSessions, chatMessages, chatContextCache, InsertChatSession, InsertChatMessage, InsertChatContextCache } from "../../drizzle/schema";

/**
 * Create a new chat session
 */
export async function createChatSession(data: InsertChatSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(chatSessions).values(data);
  return Number(result.insertId);
}

/**
 * Get chat session by ID
 */
export async function getChatSessionById(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [session] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  return session;
}

/**
 * Get all chat sessions for a user filtered by type and context
 */
export async function getUserChatSessions(
  userId: number,
  sessionType?: 'project' | 'asset' | 'company',
  contextId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(chatSessions.userId, userId)];
  
  if (sessionType) {
    conditions.push(eq(chatSessions.sessionType, sessionType));
  }
  
  if (contextId !== undefined) {
    conditions.push(eq(chatSessions.contextId, contextId));
  }

  return db
    .select()
    .from(chatSessions)
    .where(and(...conditions))
    .orderBy(desc(chatSessions.lastMessageAt));
}

/**
 * Update session last message timestamp
 */
export async function updateSessionLastMessage(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(chatSessions)
    .set({ lastMessageAt: new Date().toISOString() })
    .where(eq(chatSessions.id, sessionId));
}

/**
 * Add a message to a chat session
 */
export async function addChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(chatMessages).values(data);
  
  // Update session's lastMessageAt
  await updateSessionLastMessage(data.sessionId);
  
  return Number(result.insertId);
}

/**
 * Get all messages for a session
 */
export async function getSessionMessages(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.createdAt);
}

/**
 * Cache context data for a session
 */
export async function cacheContextData(data: InsertChatContextCache) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(chatContextCache).values(data);
}

/**
 * Get cached context data
 */
export async function getCachedContext(sessionId: number, contextType: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [cache] = await db
    .select()
    .from(chatContextCache)
    .where(
      and(
        eq(chatContextCache.sessionId, sessionId),
        eq(chatContextCache.contextType, contextType)
      )
    )
    .orderBy(desc(chatContextCache.createdAt))
    .limit(1);

  // Check if cache is expired
  if (cache?.expiresAt) {
    const expiresAt = new Date(cache.expiresAt);
    if (expiresAt < new Date()) {
      return null; // Cache expired
    }
  }

  return cache;
}

/**
 * Delete a chat session and all its messages
 */
export async function deleteChatSession(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Foreign key cascade will delete messages and cache
  await db.delete(chatSessions).where(eq(chatSessions.id, sessionId));
}
