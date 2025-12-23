import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./db";
import { buildingCodes } from "../drizzle/schema";

export type BuildingCode = typeof buildingCodes.$inferSelect;
export type InsertBuildingCode = typeof buildingCodes.$inferInsert;

/**
 * Get all active building codes
 */
export async function getActiveBuildingCodes() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(buildingCodes)
    .where(eq(buildingCodes.isActive, 1))
    .orderBy(desc(buildingCodes.year), buildingCodes.jurisdiction);
}

/**
 * Get latest building code for a jurisdiction
 */
export async function getLatestBuildingCode(jurisdiction: string) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(buildingCodes)
    .where(
      and(
        eq(buildingCodes.jurisdiction, jurisdiction),
        eq(buildingCodes.isLatest, 1),
        eq(buildingCodes.isActive, 1)
      )
    )
    .limit(1);

  return results[0] || null;
}

/**
 * Upsert building code (insert or update if exists)
 */
export async function upsertBuildingCode(code: InsertBuildingCode) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const values: InsertBuildingCode = {
    code: code.code,
    title: code.title,
    edition: code.edition || null,
    jurisdiction: code.jurisdiction || null,
    year: code.year || null,
    documentUrl: code.documentUrl || null,
    documentKey: code.documentKey || null,
    pageCount: code.pageCount || null,
    isActive: code.isActive ?? 1,
    effectiveDate: code.effectiveDate || null,
    status: code.status || 'active',
    isLatest: code.isLatest ?? 0,
    lastVerified: new Date().toISOString(),
  };

  await db
    .insert(buildingCodes)
    .values(values)
    .onDuplicateKeyUpdate({
      set: {
        title: values.title,
        edition: values.edition,
        jurisdiction: values.jurisdiction,
        year: values.year,
        documentUrl: values.documentUrl,
        effectiveDate: values.effectiveDate,
        status: values.status,
        isLatest: values.isLatest,
        lastVerified: values.lastVerified,
        updatedAt: new Date().toISOString(),
      },
    });
}

/**
 * Mark a building code as latest for its jurisdiction
 */
export async function markAsLatest(codeId: number, jurisdiction: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // First, unmark all codes in this jurisdiction
  await db
    .update(buildingCodes)
    .set({ isLatest: 0 })
    .where(eq(buildingCodes.jurisdiction, jurisdiction));

  // Then mark the specified code as latest
  await db
    .update(buildingCodes)
    .set({ isLatest: 1 })
    .where(eq(buildingCodes.id, codeId));
}

/**
 * Get building code by ID
 */
export async function getBuildingCodeById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(buildingCodes)
    .where(eq(buildingCodes.id, id))
    .limit(1);

  return results[0] || null;
}
