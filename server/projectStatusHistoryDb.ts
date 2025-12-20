import { eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import { projectStatusHistory, InsertProjectStatusHistory } from "../drizzle/schema";

/**
 * Log a project status change to the history table
 */
export async function logStatusChange(data: InsertProjectStatusHistory) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot log status change: database not available");
    return null;
  }

  try {
    const result = await db.insert(projectStatusHistory).values(data);
    return result;
  } catch (error) {
    console.error("[Database] Failed to log status change:", error);
    throw error;
  }
}

/**
 * Get status change history for a specific project
 */
export async function getProjectStatusHistory(projectId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get status history: database not available");
    return [];
  }

  try {
    const history = await db
      .select()
      .from(projectStatusHistory)
      .where(eq(projectStatusHistory.projectId, projectId))
      .orderBy(desc(projectStatusHistory.changedAt));
    
    return history;
  } catch (error) {
    console.error("[Database] Failed to get status history:", error);
    throw error;
  }
}

/**
 * Get all status changes by a specific user
 */
export async function getUserStatusChanges(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user status changes: database not available");
    return [];
  }

  try {
    const history = await db
      .select()
      .from(projectStatusHistory)
      .where(eq(projectStatusHistory.userId, userId))
      .orderBy(desc(projectStatusHistory.changedAt));
    
    return history;
  } catch (error) {
    console.error("[Database] Failed to get user status changes:", error);
    throw error;
  }
}
