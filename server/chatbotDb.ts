import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import { chatbotSessions, chatbotFeedback, InsertChatbotSession, InsertChatbotFeedback } from "../drizzle/schema";

/**
 * Message type for chat history
 */
export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
};

/**
 * Page context type for contextual help
 */
export type PageContext = {
  projectId?: number;
  assetId?: number;
  assessmentId?: number;
  pageName?: string;
  additionalContext?: Record<string, unknown>;
};

/**
 * Get or create an active chat session for a user
 */
export async function getOrCreateSession(
  userId: number,
  currentPage?: string,
  pageContext?: PageContext
): Promise<{ id: number; messages: ChatMessage[] }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Try to find an existing active session
  const existingSessions = await db
    .select()
    .from(chatbotSessions)
    .where(and(eq(chatbotSessions.userId, userId), eq(chatbotSessions.isActive, 1)))
    .orderBy(desc(chatbotSessions.updatedAt))
    .limit(1);

  if (existingSessions.length > 0) {
    const session = existingSessions[0];
    let messages: ChatMessage[] = [];
    try {
      messages = JSON.parse(session.messages || "[]");
    } catch {
      messages = [];
    }

    // Update page context if provided
    if (currentPage || pageContext) {
      await db
        .update(chatbotSessions)
        .set({
          currentPage: currentPage || session.currentPage,
          pageContext: pageContext ? JSON.stringify(pageContext) : session.pageContext,
        })
        .where(eq(chatbotSessions.id, session.id));
    }

    return { id: session.id, messages };
  }

  // Create a new session
  const result = await db.insert(chatbotSessions).values({
    userId,
    title: "New Conversation",
    currentPage: currentPage || null,
    pageContext: pageContext ? JSON.stringify(pageContext) : null,
    messages: "[]",
    isActive: 1,
  });

  return { id: Number(result[0].insertId), messages: [] };
}

/**
 * Get a specific session by ID
 */
export async function getSessionById(
  sessionId: number,
  userId: number
): Promise<{ id: number; messages: ChatMessage[]; currentPage?: string; pageContext?: PageContext } | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sessions = await db
    .select()
    .from(chatbotSessions)
    .where(and(eq(chatbotSessions.id, sessionId), eq(chatbotSessions.userId, userId)))
    .limit(1);

  if (sessions.length === 0) return null;

  const session = sessions[0];
  let messages: ChatMessage[] = [];
  let pageContext: PageContext | undefined;

  try {
    messages = JSON.parse(session.messages || "[]");
  } catch {
    messages = [];
  }

  try {
    pageContext = session.pageContext ? JSON.parse(session.pageContext) : undefined;
  } catch {
    pageContext = undefined;
  }

  return {
    id: session.id,
    messages,
    currentPage: session.currentPage || undefined,
    pageContext,
  };
}

/**
 * Update session with new messages
 */
export async function updateSessionMessages(
  sessionId: number,
  userId: number,
  messages: ChatMessage[],
  title?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Partial<InsertChatbotSession> = {
    messages: JSON.stringify(messages),
  };

  // Auto-generate title from first user message if not set
  if (title) {
    updateData.title = title;
  } else if (messages.length > 0) {
    const firstUserMessage = messages.find((m) => m.role === "user");
    if (firstUserMessage) {
      updateData.title = firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "");
    }
  }

  await db
    .update(chatbotSessions)
    .set(updateData)
    .where(and(eq(chatbotSessions.id, sessionId), eq(chatbotSessions.userId, userId)));
}

/**
 * Update session page context
 */
export async function updateSessionContext(
  sessionId: number,
  userId: number,
  currentPage: string,
  pageContext?: PageContext
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(chatbotSessions)
    .set({
      currentPage,
      pageContext: pageContext ? JSON.stringify(pageContext) : null,
    })
    .where(and(eq(chatbotSessions.id, sessionId), eq(chatbotSessions.userId, userId)));
}

/**
 * Get all sessions for a user (for history view)
 */
export async function getUserSessions(
  userId: number,
  limit: number = 20
): Promise<Array<{ id: number; title: string | null; createdAt: string; updatedAt: string; messageCount: number }>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sessions = await db
    .select()
    .from(chatbotSessions)
    .where(eq(chatbotSessions.userId, userId))
    .orderBy(desc(chatbotSessions.updatedAt))
    .limit(limit);

  return sessions.map((s) => {
    let messageCount = 0;
    try {
      const messages = JSON.parse(s.messages || "[]");
      messageCount = messages.length;
    } catch {
      messageCount = 0;
    }

    return {
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      messageCount,
    };
  });
}

/**
 * Archive a session (soft delete)
 */
export async function archiveSession(sessionId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(chatbotSessions)
    .set({ isActive: 0 })
    .where(and(eq(chatbotSessions.id, sessionId), eq(chatbotSessions.userId, userId)));
}

/**
 * Delete a session permanently
 */
export async function deleteSession(sessionId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete feedback first
  await db.delete(chatbotFeedback).where(eq(chatbotFeedback.sessionId, sessionId));

  // Delete session
  await db
    .delete(chatbotSessions)
    .where(and(eq(chatbotSessions.id, sessionId), eq(chatbotSessions.userId, userId)));
}

/**
 * Submit feedback for a message
 */
export async function submitFeedback(
  sessionId: number,
  messageIndex: number,
  userId: number,
  feedback: "positive" | "negative",
  userMessage: string,
  assistantMessage: string,
  comment?: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if feedback already exists for this message
  const existingFeedback = await db
    .select()
    .from(chatbotFeedback)
    .where(
      and(
        eq(chatbotFeedback.sessionId, sessionId),
        eq(chatbotFeedback.messageIndex, messageIndex),
        eq(chatbotFeedback.userId, userId)
      )
    )
    .limit(1);

  if (existingFeedback.length > 0) {
    // Update existing feedback
    await db
      .update(chatbotFeedback)
      .set({ feedback, comment })
      .where(eq(chatbotFeedback.id, existingFeedback[0].id));
    return existingFeedback[0].id;
  }

  // Create new feedback
  const result = await db.insert(chatbotFeedback).values({
    sessionId,
    messageIndex,
    userId,
    feedback,
    userMessage,
    assistantMessage,
    comment,
  });

  return Number(result[0].insertId);
}

/**
 * Get feedback for a session
 */
export async function getSessionFeedback(
  sessionId: number
): Promise<Array<{ messageIndex: number; feedback: "positive" | "negative" }>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const feedback = await db
    .select({
      messageIndex: chatbotFeedback.messageIndex,
      feedback: chatbotFeedback.feedback,
    })
    .from(chatbotFeedback)
    .where(eq(chatbotFeedback.sessionId, sessionId));

  return feedback;
}

/**
 * Get feedback statistics (for admin)
 */
export async function getFeedbackStats(): Promise<{
  totalFeedback: number;
  positiveCount: number;
  negativeCount: number;
  positiveRate: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allFeedback = await db.select().from(chatbotFeedback);

  const totalFeedback = allFeedback.length;
  const positiveCount = allFeedback.filter((f) => f.feedback === "positive").length;
  const negativeCount = allFeedback.filter((f) => f.feedback === "negative").length;
  const positiveRate = totalFeedback > 0 ? (positiveCount / totalFeedback) * 100 : 0;

  return {
    totalFeedback,
    positiveCount,
    negativeCount,
    positiveRate: Math.round(positiveRate * 10) / 10,
  };
}
