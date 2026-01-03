/**
 * Utility functions for generating unique identifiers for projects and assets
 */

/**
 * Generate a unique ID for a project
 * Format: PROJ-YYYYMMDD-XXXX
 * Example: PROJ-20250122-A3F9
 */
export function generateProjectUniqueId(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `PROJ-${year}${month}${day}-${random}`;
}

/**
 * Generate a unique ID for an asset
 * Format: ASSET-YYYYMMDD-XXXX
 * Example: ASSET-20250122-B7K2
 */
export function generateAssetUniqueId(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `ASSET-${year}${month}${day}-${random}`;
}

/**
 * Validate if a string matches the project unique ID format
 */
export function isValidProjectUniqueId(id: string): boolean {
  return /^PROJ-\d{8}-[A-Z0-9]{4}$/.test(id);
}

/**
 * Validate if a string matches the asset unique ID format
 */
export function isValidAssetUniqueId(id: string): boolean {
  return /^ASSET-\d{8}-[A-Z0-9]{4}$/.test(id);
}

/**
 * Check if a project unique ID already exists in the database
 * Returns true if the ID is already taken, false if available
 */
export async function isProjectUniqueIdTaken(uniqueId: string): Promise<boolean> {
  const { getDb } = await import('../db');
  const { projects } = await import('../../drizzle/schema');
  const { eq } = await import('drizzle-orm');
  
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select({ id: projects.id })
    .from(projects)
    .where(eq(projects.uniqueId, uniqueId))
    .limit(1);
  
  return result.length > 0;
}

/**
 * Check if an asset unique ID already exists in the database
 * Returns true if the ID is already taken, false if available
 */
export async function isAssetUniqueIdTaken(uniqueId: string): Promise<boolean> {
  const { getDb } = await import('../db');
  const { assets } = await import('../../drizzle/schema');
  const { eq } = await import('drizzle-orm');
  
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select({ id: assets.id })
    .from(assets)
    .where(eq(assets.uniqueId, uniqueId))
    .limit(1);
  
  return result.length > 0;
}

/**
 * Generate a guaranteed unique project ID by checking database
 * Retries up to 5 times if collision occurs (extremely unlikely)
 */
export async function generateUniqueProjectId(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    const uniqueId = generateProjectUniqueId();
    const isTaken = await isProjectUniqueIdTaken(uniqueId);
    
    if (!isTaken) {
      return uniqueId;
    }
    
    attempts++;
  }
  
  throw new Error('Failed to generate unique project ID after multiple attempts');
}

/**
 * Generate a guaranteed unique asset ID by checking database
 * Retries up to 5 times if collision occurs (extremely unlikely)
 */
export async function generateUniqueAssetId(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    const uniqueId = generateAssetUniqueId();
    const isTaken = await isAssetUniqueIdTaken(uniqueId);
    
    if (!isTaken) {
      return uniqueId;
    }
    
    attempts++;
  }
  
  throw new Error('Failed to generate unique asset ID after multiple attempts');
}
