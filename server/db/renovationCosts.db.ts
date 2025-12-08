import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db";
import {
  renovationCosts,
  type InsertRenovationCost,
} from "../../drizzle/schema";

/**
 * Create a new renovation cost entry
 */
export async function createRenovationCost(data: InsertRenovationCost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(renovationCosts).values(data);
  return result[0].insertId;
}

/**
 * Get renovation costs by project ID
 */
export async function getRenovationCostsByProjectId(projectId: number, costType?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(renovationCosts.projectId, projectId)];
  
  if (costType) {
    conditions.push(eq(renovationCosts.costType, costType as any));
  }

  const result = await db
    .select()
    .from(renovationCosts)
    .where(and(...conditions))
    .orderBy(desc(renovationCosts.dateRecorded));
  return result;
}

/**
 * Update renovation cost
 */
export async function updateRenovationCost(
  id: number,
  data: Partial<InsertRenovationCost>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(renovationCosts).set(data).where(eq(renovationCosts.id, id));
}

/**
 * Delete renovation cost
 */
export async function deleteRenovationCost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(renovationCosts).where(eq(renovationCosts.id, id));
}
