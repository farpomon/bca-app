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
