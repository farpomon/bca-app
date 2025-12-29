import { eq, desc, and, gte, lte, SQL } from "drizzle-orm";
import { economicIndicators } from "../drizzle/schema";
import { getDb } from "./db";

export type EconomicIndicator = typeof economicIndicators.$inferSelect;
export type InsertEconomicIndicator = typeof economicIndicators.$inferInsert;

/**
 * Get all economic indicators with optional filtering
 */
export async function getAllEconomicIndicators(filters?: {
  region?: string;
  startDate?: string;
  endDate?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: SQL[] = [];
  if (filters?.region) {
    conditions.push(eq(economicIndicators.region, filters.region));
  }
  if (filters?.startDate) {
    conditions.push(gte(economicIndicators.indicatorDate, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(economicIndicators.indicatorDate, filters.endDate));
  }

  if (conditions.length > 0) {
    return await db
      .select()
      .from(economicIndicators)
      .where(and(...conditions))
      .orderBy(desc(economicIndicators.indicatorDate));
  }

  return await db
    .select()
    .from(economicIndicators)
    .orderBy(desc(economicIndicators.indicatorDate));
}

/**
 * Get the most recent economic indicator for a region
 */
export async function getLatestEconomicIndicator(region: string = 'Canada') {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(economicIndicators)
    .where(eq(economicIndicators.region, region))
    .orderBy(desc(economicIndicators.indicatorDate))
    .limit(1);

  return results[0] || null;
}

/**
 * Get economic indicator by ID
 */
export async function getEconomicIndicatorById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(economicIndicators)
    .where(eq(economicIndicators.id, id))
    .limit(1);

  return results[0] || null;
}

/**
 * Create a new economic indicator
 */
export async function createEconomicIndicator(data: InsertEconomicIndicator) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(economicIndicators).values(data);
  // MySQL returns insertId as a bigint, access it from the result array
  const insertId = (result as unknown as [{ insertId: number }])[0]?.insertId;
  return insertId;
}

/**
 * Update an existing economic indicator
 */
export async function updateEconomicIndicator(id: number, data: Partial<InsertEconomicIndicator>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(economicIndicators)
    .set(data)
    .where(eq(economicIndicators.id, id));

  return true;
}

/**
 * Delete an economic indicator
 */
export async function deleteEconomicIndicator(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(economicIndicators).where(eq(economicIndicators.id, id));
  return true;
}

/**
 * Get economic indicators for a specific date range and region
 */
export async function getEconomicIndicatorsForPeriod(
  startDate: string,
  endDate: string,
  region: string = 'Canada'
) {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select()
    .from(economicIndicators)
    .where(
      and(
        eq(economicIndicators.region, region),
        gte(economicIndicators.indicatorDate, startDate),
        lte(economicIndicators.indicatorDate, endDate)
      )
    )
    .orderBy(economicIndicators.indicatorDate);

  return results;
}

/**
 * Get unique regions from economic indicators
 */
export async function getEconomicIndicatorRegions() {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .selectDistinct({ region: economicIndicators.region })
    .from(economicIndicators);

  return results.map(r => r.region);
}
