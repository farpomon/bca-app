import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * Data Cleanup Utilities
 * Functions to identify and remove orphaned data to improve database performance
 */

export interface OrphanedDataReport {
  orphanedProjectScores: number;
  orphanedBudgetAllocations: number;
  orphanedScoringAuditLogs: number;
  totalOrphaned: number;
  affectedProjectIds: number[];
}

/**
 * Identify orphaned scoring data from deleted projects
 * Returns a report of orphaned records without deleting them
 */
export async function identifyOrphanedScoringData(): Promise<OrphanedDataReport> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find orphaned project_scores (scores for projects that don't exist or are deleted)
  const orphanedScoresResult = await db.execute(sql`
    SELECT COUNT(*) as count, GROUP_CONCAT(DISTINCT ps.projectId) as projectIds
    FROM project_scores ps
    LEFT JOIN projects p ON ps.projectId = p.id
    WHERE p.id IS NULL OR p.deletedAt IS NOT NULL
  `);
  
  const orphanedScoresRow: any = Array.isArray(orphanedScoresResult[0]) && orphanedScoresResult[0].length > 0 
    ? orphanedScoresResult[0][0] 
    : { count: 0, projectIds: null };

  // Find orphaned budget_allocations
  const orphanedAllocationsResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM budget_allocations ba
    LEFT JOIN projects p ON ba.projectId = p.id
    WHERE p.id IS NULL OR p.deletedAt IS NOT NULL
  `);
  
  const orphanedAllocationsRow: any = Array.isArray(orphanedAllocationsResult[0]) && orphanedAllocationsResult[0].length > 0
    ? orphanedAllocationsResult[0][0]
    : { count: 0 };

  // Find orphaned scoring_audit_log entries
  const orphanedAuditLogsResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM scoring_audit_log sal
    LEFT JOIN projects p ON sal.projectId = p.id
    WHERE p.id IS NULL OR p.deletedAt IS NOT NULL
  `);
  
  const orphanedAuditLogsRow: any = Array.isArray(orphanedAuditLogsResult[0]) && orphanedAuditLogsResult[0].length > 0
    ? orphanedAuditLogsResult[0][0]
    : { count: 0 };

  const orphanedProjectScores = Number(orphanedScoresRow.count) || 0;
  const orphanedBudgetAllocations = Number(orphanedAllocationsRow.count) || 0;
  const orphanedScoringAuditLogs = Number(orphanedAuditLogsRow.count) || 0;

  const affectedProjectIds = orphanedScoresRow.projectIds 
    ? orphanedScoresRow.projectIds.split(',').map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id))
    : [];

  return {
    orphanedProjectScores,
    orphanedBudgetAllocations,
    orphanedScoringAuditLogs,
    totalOrphaned: orphanedProjectScores + orphanedBudgetAllocations + orphanedScoringAuditLogs,
    affectedProjectIds,
  };
}

/**
 * Remove orphaned scoring data from deleted projects
 * Returns the number of records deleted for each table
 */
export async function cleanupOrphanedScoringData(): Promise<OrphanedDataReport> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get report before deletion
  const reportBefore = await identifyOrphanedScoringData();

  if (reportBefore.totalOrphaned === 0) {
    return reportBefore;
  }

  // Delete orphaned project_scores
  const deletedScoresResult = await db.execute(sql`
    DELETE ps FROM project_scores ps
    LEFT JOIN projects p ON ps.projectId = p.id
    WHERE p.id IS NULL OR p.deletedAt IS NOT NULL
  `);

  // Delete orphaned budget_allocations
  const deletedAllocationsResult = await db.execute(sql`
    DELETE ba FROM budget_allocations ba
    LEFT JOIN projects p ON ba.projectId = p.id
    WHERE p.id IS NULL OR p.deletedAt IS NOT NULL
  `);

  // Delete orphaned scoring_audit_log entries
  const deletedAuditLogsResult = await db.execute(sql`
    DELETE sal FROM scoring_audit_log sal
    LEFT JOIN projects p ON sal.projectId = p.id
    WHERE p.id IS NULL OR p.deletedAt IS NOT NULL
  `);

  return {
    orphanedProjectScores: (deletedScoresResult[0] as any).affectedRows || 0,
    orphanedBudgetAllocations: (deletedAllocationsResult[0] as any).affectedRows || 0,
    orphanedScoringAuditLogs: (deletedAuditLogsResult[0] as any).affectedRows || 0,
    totalOrphaned: 
      ((deletedScoresResult[0] as any).affectedRows || 0) +
      ((deletedAllocationsResult[0] as any).affectedRows || 0) +
      ((deletedAuditLogsResult[0] as any).affectedRows || 0),
    affectedProjectIds: reportBefore.affectedProjectIds,
  };
}

/**
 * Identify orphaned data from inactive criteria
 * Returns a report of scoring data referencing inactive/deleted criteria
 */
export async function identifyOrphanedCriteriaData(): Promise<{
  orphanedProjectScores: number;
  orphanedScoringAuditLogs: number;
  totalOrphaned: number;
  affectedCriteriaIds: number[];
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find project_scores referencing inactive criteria
  const orphanedScoresResult = await db.execute(sql`
    SELECT COUNT(*) as count, GROUP_CONCAT(DISTINCT ps.criteriaId) as criteriaIds
    FROM project_scores ps
    LEFT JOIN prioritization_criteria pc ON ps.criteriaId = pc.id
    WHERE pc.id IS NULL OR pc.isActive = 0
  `);
  
  const orphanedScoresRow: any = Array.isArray(orphanedScoresResult[0]) && orphanedScoresResult[0].length > 0
    ? orphanedScoresResult[0][0]
    : { count: 0, criteriaIds: null };

  // Find scoring_audit_log entries referencing inactive criteria
  const orphanedAuditLogsResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM scoring_audit_log sal
    LEFT JOIN prioritization_criteria pc ON sal.criteriaId = pc.id
    WHERE pc.id IS NULL OR pc.isActive = 0
  `);
  
  const orphanedAuditLogsRow: any = Array.isArray(orphanedAuditLogsResult[0]) && orphanedAuditLogsResult[0].length > 0
    ? orphanedAuditLogsResult[0][0]
    : { count: 0 };

  const orphanedProjectScores = Number(orphanedScoresRow.count) || 0;
  const orphanedScoringAuditLogs = Number(orphanedAuditLogsRow.count) || 0;

  const affectedCriteriaIds = orphanedScoresRow.criteriaIds
    ? orphanedScoresRow.criteriaIds.split(',').map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id))
    : [];

  return {
    orphanedProjectScores,
    orphanedScoringAuditLogs,
    totalOrphaned: orphanedProjectScores + orphanedScoringAuditLogs,
    affectedCriteriaIds,
  };
}

/**
 * Clean up orphaned data from inactive criteria
 * NOTE: This is a destructive operation - use with caution
 * Consider archiving this data instead of deleting if historical records are needed
 */
export async function cleanupOrphanedCriteriaData(): Promise<{
  orphanedProjectScores: number;
  orphanedScoringAuditLogs: number;
  totalOrphaned: number;
  affectedCriteriaIds: number[];
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get report before deletion
  const reportBefore = await identifyOrphanedCriteriaData();

  if (reportBefore.totalOrphaned === 0) {
    return reportBefore;
  }

  // Delete project_scores referencing inactive criteria
  const deletedScoresResult = await db.execute(sql`
    DELETE ps FROM project_scores ps
    LEFT JOIN prioritization_criteria pc ON ps.criteriaId = pc.id
    WHERE pc.id IS NULL OR pc.isActive = 0
  `);

  // Delete scoring_audit_log entries referencing inactive criteria
  const deletedAuditLogsResult = await db.execute(sql`
    DELETE sal FROM scoring_audit_log sal
    LEFT JOIN prioritization_criteria pc ON sal.criteriaId = pc.id
    WHERE pc.id IS NULL OR pc.isActive = 0
  `);

  return {
    orphanedProjectScores: (deletedScoresResult[0] as any).affectedRows || 0,
    orphanedScoringAuditLogs: (deletedAuditLogsResult[0] as any).affectedRows || 0,
    totalOrphaned:
      ((deletedScoresResult[0] as any).affectedRows || 0) +
      ((deletedAuditLogsResult[0] as any).affectedRows || 0),
    affectedCriteriaIds: reportBefore.affectedCriteriaIds,
  };
}
