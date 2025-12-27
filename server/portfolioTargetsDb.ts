import { eq, desc, and, gte, lte, or, isNull } from "drizzle-orm";
import { portfolioTargets } from "../drizzle/schema";
import { getDb } from "./db";

export type PortfolioTarget = typeof portfolioTargets.$inferSelect;
export type InsertPortfolioTarget = typeof portfolioTargets.$inferInsert;

/**
 * Get all portfolio targets with optional filtering
 */
export async function getAllPortfolioTargets(filters?: {
  companyId?: number;
  targetYear?: number;
  targetType?: string;
  status?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(portfolioTargets);

  const conditions = [];
  if (filters?.companyId !== undefined) {
    conditions.push(eq(portfolioTargets.companyId, filters.companyId));
  }
  if (filters?.targetYear) {
    conditions.push(eq(portfolioTargets.targetYear, filters.targetYear));
  }
  if (filters?.targetType) {
    conditions.push(eq(portfolioTargets.targetType, filters.targetType as any));
  }
  if (filters?.status) {
    conditions.push(eq(portfolioTargets.status, filters.status as any));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const results = await query.orderBy(desc(portfolioTargets.targetYear));
  return results;
}

/**
 * Get active portfolio targets
 */
export async function getActivePortfolioTargets(companyId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(portfolioTargets.status, 'on_track' as any)];
  if (companyId !== undefined) {
    conditions.push(eq(portfolioTargets.companyId, companyId));
  }

  const results = await db
    .select()
    .from(portfolioTargets)
    .where(and(...conditions))
    .orderBy(portfolioTargets.targetYear);

  return results;
}

/**
 * Get portfolio target by ID
 */
export async function getPortfolioTargetById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(portfolioTargets)
    .where(eq(portfolioTargets.id, id))
    .limit(1);

  return results[0] || null;
}

/**
 * Create a new portfolio target
 */
export async function createPortfolioTarget(data: InsertPortfolioTarget) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(portfolioTargets).values(data);
  return result.insertId;
}

/**
 * Update an existing portfolio target
 */
export async function updatePortfolioTarget(id: number, data: Partial<InsertPortfolioTarget>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(portfolioTargets)
    .set(data)
    .where(eq(portfolioTargets.id, id));

  return true;
}

/**
 * Delete a portfolio target
 */
export async function deletePortfolioTarget(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(portfolioTargets).where(eq(portfolioTargets.id, id));
  return true;
}

/**
 * Get portfolio targets for a specific year range
 */
export async function getPortfolioTargetsForYearRange(
  startYear: number,
  endYear: number,
  companyId?: number
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    gte(portfolioTargets.targetYear, startYear),
    lte(portfolioTargets.targetYear, endYear)
  ];

  if (companyId !== undefined) {
    conditions.push(eq(portfolioTargets.companyId, companyId));
  }

  const results = await db
    .select()
    .from(portfolioTargets)
    .where(and(...conditions))
    .orderBy(portfolioTargets.targetYear);

  return results;
}

/**
 * Update progress percentage for a portfolio target
 */
export async function updatePortfolioTargetProgress(
  id: number,
  currentValue: number,
  progressPercentage: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(portfolioTargets)
    .set({
      currentValue: currentValue.toString(),
      progressPercentage: progressPercentage.toString(),
      updatedAt: new Date().toISOString()
    })
    .where(eq(portfolioTargets.id, id));

  return true;
}

/**
 * Get FCI targets (most common use case)
 */
export async function getFCITargets(companyId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(portfolioTargets.targetType, 'fci' as any)];
  if (companyId !== undefined) {
    conditions.push(eq(portfolioTargets.companyId, companyId));
  }

  const results = await db
    .select()
    .from(portfolioTargets)
    .where(and(...conditions))
    .orderBy(portfolioTargets.targetYear);

  return results;
}
