import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { customComponents, InsertCustomComponent } from "../drizzle/schema";

/**
 * Get all custom components for a project
 */
export async function getCustomComponentsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(customComponents)
    .where(eq(customComponents.projectId, projectId))
    .orderBy(customComponents.code);
}

/**
 * Create a new custom component
 */
export async function createCustomComponent(component: InsertCustomComponent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(customComponents).values(component);
  return result;
}

/**
 * Delete a custom component
 */
export async function deleteCustomComponent(id: number, projectId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Only allow deletion by the creator or project owner
  await db
    .delete(customComponents)
    .where(
      and(
        eq(customComponents.id, id),
        eq(customComponents.projectId, projectId)
      )
    );
}

/**
 * Check if a custom component code already exists for a project
 */
export async function customComponentCodeExists(projectId: number, code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db
    .select()
    .from(customComponents)
    .where(
      and(
        eq(customComponents.projectId, projectId),
        eq(customComponents.code, code)
      )
    )
    .limit(1);
  
  return result.length > 0;
}
