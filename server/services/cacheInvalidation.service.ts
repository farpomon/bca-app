/**
 * Cache Invalidation Service
 * 
 * Automatically invalidates prediction cache when assessments or components are updated.
 * This ensures that ML predictions stay fresh and accurate.
 */

import { predictionCache } from "../predictionCache";

/**
 * Invalidate cache when an assessment is created or updated
 * 
 * @param projectId - The project ID
 * @param componentCode - The component code that was assessed
 */
export async function invalidateCacheOnAssessmentChange(
  projectId: number,
  componentCode?: string
): Promise<void> {
  try {
    // Invalidate all predictions for this project since assessments affect multiple predictions
    predictionCache.invalidate(projectId);
    
    console.log(`[CacheInvalidation] Invalidated prediction cache for project ${projectId}`);
  } catch (error) {
    console.error(`[CacheInvalidation] Failed to invalidate cache for project ${projectId}:`, error);
    // Don't throw - cache invalidation failures shouldn't break the main operation
  }
}

/**
 * Invalidate cache when a component is updated
 * 
 * @param projectId - The project ID
 * @param componentCode - The component code that was updated
 */
export async function invalidateCacheOnComponentChange(
  projectId: number,
  componentCode: string
): Promise<void> {
  try {
    // Invalidate predictions for this specific component
    predictionCache.invalidate(projectId);
    
    console.log(`[CacheInvalidation] Invalidated prediction cache for project ${projectId}, component ${componentCode}`);
  } catch (error) {
    console.error(`[CacheInvalidation] Failed to invalidate cache for project ${projectId}, component ${componentCode}:`, error);
    // Don't throw - cache invalidation failures shouldn't break the main operation
  }
}

/**
 * Invalidate cache for multiple projects at once (bulk operations)
 * 
 * @param projectIds - Array of project IDs
 */
export async function invalidateCacheForProjects(projectIds: number[]): Promise<void> {
  try {
    projectIds.forEach(projectId => predictionCache.invalidate(projectId));
    
    console.log(`[CacheInvalidation] Invalidated prediction cache for ${projectIds.length} projects`);
  } catch (error) {
    console.error(`[CacheInvalidation] Failed to invalidate cache for multiple projects:`, error);
    // Don't throw - cache invalidation failures shouldn't break the main operation
  }
}
