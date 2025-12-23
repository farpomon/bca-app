import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { conversations } from "../drizzle/schema";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function getConversation(
  userId: number,
  contextType: "project" | "asset",
  contextId: number
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get conversation: database not available");
    return null;
  }

  const result = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, userId),
        eq(conversations.contextType, contextType),
        eq(conversations.contextId, contextId)
      )
    )
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const conversation = result[0];
  return {
    ...conversation,
    messages: JSON.parse(conversation.messages) as Message[],
  };
}

export async function saveConversation(
  userId: number,
  contextType: "project" | "asset",
  contextId: number,
  messages: Message[]
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save conversation: database not available");
    return null;
  }

  const messagesJson = JSON.stringify(messages);

  // Check if conversation exists
  const existing = await getConversation(userId, contextType, contextId);

  if (existing) {
    // Update existing conversation
    await db
      .update(conversations)
      .set({
        messages: messagesJson,
      })
      .where(eq(conversations.id, existing.id));

    return existing.id;
  } else {
    // Create new conversation
    const result = await db.insert(conversations).values({
      userId,
      contextType,
      contextId,
      messages: messagesJson,
    });

    return result[0].insertId;
  }
}

export async function clearConversation(
  userId: number,
  contextType: "project" | "asset",
  contextId: number
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot clear conversation: database not available");
    return;
  }

  await db
    .delete(conversations)
    .where(
      and(
        eq(conversations.userId, userId),
        eq(conversations.contextType, contextType),
        eq(conversations.contextId, contextId)
      )
    );
}
