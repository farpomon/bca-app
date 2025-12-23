import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { assets, type InsertAsset } from "../drizzle/schema";

/**
 * Get all assets for a project
 */
export async function getProjectAssets(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(assets).where(eq(assets.projectId, projectId));
}

/**
 * Get a single asset by ID
 */
export async function getAssetById(assetId: number, projectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.projectId, projectId)))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Search for an asset by unique ID
 */
export async function searchAssetByUniqueId(uniqueId: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(assets)
    .where(eq(assets.uniqueId, uniqueId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Create a new asset
 */
export async function createAsset(data: InsertAsset) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Generate unique ID if not provided
  const { generateAssetUniqueId } = await import("./utils/uniqueId.js");
  const uniqueId = data.uniqueId || generateAssetUniqueId();
  
  const assetData = {
    ...data,
    uniqueId,
  };
  
  const result = await db.insert(assets).values(assetData);
  return result[0].insertId;
}

/**
 * Update an existing asset
 */
export async function updateAsset(
  assetId: number,
  projectId: number,
  data: Partial<InsertAsset>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(assets)
    .set(data)
    .where(and(eq(assets.id, assetId), eq(assets.projectId, projectId)));
}

/**
 * Delete an asset (and all its assessments - handled by cascade)
 */
export async function deleteAsset(assetId: number, projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(assets)
    .where(and(eq(assets.id, assetId), eq(assets.projectId, projectId)));
}

/**
 * Get or create default asset for a project
 * Used for migrating existing assessments
 */
export async function getOrCreateDefaultAsset(projectId: number, projectName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if project already has assets
  const existing = await getProjectAssets(projectId);
  if (existing.length > 0) {
    return existing[0];
  }
  
  // Create default asset
  const assetId = await createAsset({
    projectId,
    name: projectName || "Main Building",
    description: "Default asset created during migration",
    assetType: "Building",
    status: "active",
  });
  
  const newAsset = await getAssetById(assetId, projectId);
  if (!newAsset) throw new Error("Failed to create default asset");
  
  return newAsset;
}
