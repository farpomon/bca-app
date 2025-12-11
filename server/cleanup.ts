import { eq, and, lt } from "drizzle-orm";
import { projects } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Permanently delete projects that have been in "deleted" status for more than 90 days
 * This should be run periodically (e.g., daily via cron job)
 */
export async function cleanupOldDeletedProjects() {
  const db = await getDb();
  if (!db) {
    console.warn("[Cleanup] Database not available");
    return { success: false, deletedCount: 0 };
  }

  try {
    // Calculate the cutoff date (90 days ago)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Find projects that are deleted and older than 90 days
    const projectsToDelete = await db
      .select()
      .from(projects)
      .where(and(eq(projects.status, "deleted"), lt(projects.deletedAt, ninetyDaysAgo)));

    if (projectsToDelete.length === 0) {
      console.log("[Cleanup] No projects to clean up");
      return { success: true, deletedCount: 0 };
    }

    // Permanently delete these projects
    for (const project of projectsToDelete) {
      await db.delete(projects).where(eq(projects.id, project.id));
      console.log(`[Cleanup] Permanently deleted project ${project.id}: ${project.name}`);
    }

    console.log(`[Cleanup] Successfully deleted ${projectsToDelete.length} old projects`);
    return { success: true, deletedCount: projectsToDelete.length };
  } catch (error) {
    console.error("[Cleanup] Error cleaning up old projects:", error);
    return { success: false, deletedCount: 0, error };
  }
}

/**
 * Get count of projects that will be cleaned up in the next run
 */
export async function getProjectsToCleanupCount() {
  const db = await getDb();
  if (!db) return 0;

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const projectsToDelete = await db
    .select()
    .from(projects)
    .where(and(eq(projects.status, "deleted"), lt(projects.deletedAt, ninetyDaysAgo)));

  return projectsToDelete.length;
}
