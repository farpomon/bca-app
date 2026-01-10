import { getDb } from "../db";
import { sql } from "drizzle-orm";
import type {
  CriteriaModelVersion,
  InsertCriteriaModelVersion,
  ScoringAuditLog,
  InsertScoringAuditLog,
} from "../../drizzle/schema";

/**
 * Enhanced Database Helpers for Multi-Criteria Prioritization
 * Adds model versioning and audit logging capabilities
 */

// ============================================================================
// CRITERIA MODEL VERSIONING
// ============================================================================

/**
 * Get the active criteria model version
 */
export async function getActiveModelVersion(): Promise<CriteriaModelVersion | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.execute(sql`
    SELECT * FROM criteria_model_versions
    WHERE isActive = 1
    ORDER BY createdAt DESC
    LIMIT 1
  `);

  const rows = Array.isArray(result[0]) ? result[0] : [];
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Get all model versions (for history/comparison)
 */
export async function getAllModelVersions(): Promise<CriteriaModelVersion[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT * FROM criteria_model_versions
    ORDER BY createdAt DESC
  `);

  return Array.isArray(result[0]) ? result[0] : [];
}

/**
 * Create a new criteria model version
 * Automatically deactivates the previous active version
 */
export async function createModelVersion(
  version: InsertCriteriaModelVersion
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Deactivate all existing versions
  await db.execute(sql`
    UPDATE criteria_model_versions
    SET isActive = 0
    WHERE isActive = 1
  `);

  // Create new version
  const result = await db.execute(sql`
    INSERT INTO criteria_model_versions (
      name, description, isActive, createdBy
    ) VALUES (
      ${version.name},
      ${version.description || null},
      1,
      ${version.createdBy}
    )
  `);

  const versionId = result[0].insertId;

  // Update all active criteria to reference this version
  await db.execute(sql`
    UPDATE prioritization_criteria
    SET modelVersionId = ${versionId}
    WHERE isActive = 1
  `);

  return versionId;
}

/**
 * Get criteria for a specific model version
 */
export async function getCriteriaByModelVersion(versionId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT * FROM prioritization_criteria
    WHERE modelVersionId = ${versionId}
    ORDER BY displayOrder, name
  `);

  return Array.isArray(result[0]) ? result[0] : [];
}

// ============================================================================
// SCORING AUDIT LOG
// ============================================================================

/**
 * Log a scoring change to the audit trail
 */
export async function logScoringChange(
  auditEntry: InsertScoringAuditLog
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(sql`
    INSERT INTO scoring_audit_log (
      projectScoreId, projectId, criteriaId, action,
      oldScore, newScore, oldJustification, newJustification,
      oldStatus, newStatus, changedBy, reason
    ) VALUES (
      ${auditEntry.projectScoreId},
      ${auditEntry.projectId},
      ${auditEntry.criteriaId},
      ${auditEntry.action},
      ${auditEntry.oldScore || null},
      ${auditEntry.newScore || null},
      ${auditEntry.oldJustification || null},
      ${auditEntry.newJustification || null},
      ${auditEntry.oldStatus || null},
      ${auditEntry.newStatus || null},
      ${auditEntry.changedBy},
      ${auditEntry.reason || null}
    )
  `);

  return result[0].insertId;
}

/**
 * Get audit history for a project
 */
export async function getProjectAuditHistory(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      sal.*,
      pc.name as criteriaName,
      u.name as changedByName
    FROM scoring_audit_log sal
    JOIN prioritization_criteria pc ON sal.criteriaId = pc.id
    LEFT JOIN users u ON sal.changedBy = u.id
    WHERE sal.projectId = ${projectId}
    ORDER BY sal.changedAt DESC
  `);

  return Array.isArray(result[0]) ? result[0] : [];
}

/**
 * Get audit history for a specific criterion across all projects
 */
export async function getCriterionAuditHistory(criteriaId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      sal.*,
      p.name as projectName,
      u.name as changedByName
    FROM scoring_audit_log sal
    JOIN projects p ON sal.projectId = p.id
    LEFT JOIN users u ON sal.changedBy = u.id
    WHERE sal.criteriaId = ${criteriaId}
    ORDER BY sal.changedAt DESC
  `);

  return Array.isArray(result[0]) ? result[0] : [];
}

/**
 * Get recent audit activity (for dashboard)
 */
export async function getRecentAuditActivity(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      sal.*,
      p.name as projectName,
      pc.name as criteriaName,
      u.name as changedByName
    FROM scoring_audit_log sal
    JOIN projects p ON sal.projectId = p.id
    JOIN prioritization_criteria pc ON sal.criteriaId = pc.id
    LEFT JOIN users u ON sal.changedBy = u.id
    ORDER BY sal.changedAt DESC
    LIMIT ${limit}
  `);

  return Array.isArray(result[0]) ? result[0] : [];
}

// ============================================================================
// ENHANCED PROJECT SCORING WITH STATUS
// ============================================================================

/**
 * Get project scores with status information
 */
export async function getProjectScoresWithStatus(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      ps.*,
      pc.name as criteriaName,
      pc.category,
      pc.weight,
      pc.scoringGuideline,
      u.name as scoredByName
    FROM project_scores ps
    JOIN prioritization_criteria pc ON ps.criteriaId = pc.id
    LEFT JOIN users u ON ps.scoredBy = u.id
    WHERE ps.projectId = ${projectId}
    ORDER BY pc.displayOrder, pc.name
  `);

  return Array.isArray(result[0]) ? result[0] : [];
}

/**
 * Update project score status (draft -> submitted -> locked)
 */
export async function updateProjectScoreStatus(
  projectId: number,
  criteriaId: number,
  newStatus: 'draft' | 'submitted' | 'locked',
  userId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current score for audit log
  const currentResult = await db.execute(sql`
    SELECT * FROM project_scores
    WHERE projectId = ${projectId} AND criteriaId = ${criteriaId}
  `);
  const current = Array.isArray(currentResult[0]) && currentResult[0].length > 0 
    ? currentResult[0][0] 
    : null;

  if (!current) {
    throw new Error("Project score not found");
  }

  // Update status
  await db.execute(sql`
    UPDATE project_scores
    SET status = ${newStatus}, updatedAt = NOW()
    WHERE projectId = ${projectId} AND criteriaId = ${criteriaId}
  `);

  // Log the change
  await logScoringChange({
    projectScoreId: current.id,
    projectId,
    criteriaId,
    action: newStatus === 'submitted' ? 'submitted' : newStatus === 'locked' ? 'locked' : 'updated',
    oldStatus: current.status,
    newStatus,
    changedBy: userId,
  });
}

/**
 * Submit all draft scores for a project (bulk status update)
 */
export async function submitAllProjectScores(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all draft scores
  const draftsResult = await db.execute(sql`
    SELECT * FROM project_scores
    WHERE projectId = ${projectId} AND status = 'draft'
  `);
  const drafts = Array.isArray(draftsResult[0]) ? draftsResult[0] : [];

  // Update all to submitted
  await db.execute(sql`
    UPDATE project_scores
    SET status = 'submitted', updatedAt = NOW()
    WHERE projectId = ${projectId} AND status = 'draft'
  `);

  // Log each change
  for (const draft of drafts) {
    await logScoringChange({
      projectScoreId: draft.id,
      projectId,
      criteriaId: draft.criteriaId,
      action: 'submitted',
      oldStatus: 'draft',
      newStatus: 'submitted',
      changedBy: userId,
    });
  }

  return drafts.length;
}

/**
 * Get scoring progress for a project
 */
export async function getProjectScoringProgress(projectId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.execute(sql`
    SELECT 
      COUNT(*) as totalCriteria,
      SUM(CASE WHEN ps.score IS NOT NULL THEN 1 ELSE 0 END) as scoredCriteria,
      SUM(CASE WHEN ps.status = 'draft' THEN 1 ELSE 0 END) as draftCount,
      SUM(CASE WHEN ps.status = 'submitted' THEN 1 ELSE 0 END) as submittedCount,
      SUM(CASE WHEN ps.status = 'locked' THEN 1 ELSE 0 END) as lockedCount
    FROM prioritization_criteria pc
    LEFT JOIN project_scores ps ON pc.id = ps.criteriaId AND ps.projectId = ${projectId}
    WHERE pc.isActive = 1
  `);

  const row = Array.isArray(result[0]) && result[0].length > 0 ? result[0][0] : null;
  if (!row) return null;

  return {
    totalCriteria: row.totalCriteria || 0,
    scoredCriteria: row.scoredCriteria || 0,
    unscoredCriteria: (row.totalCriteria || 0) - (row.scoredCriteria || 0),
    draftCount: row.draftCount || 0,
    submittedCount: row.submittedCount || 0,
    lockedCount: row.lockedCount || 0,
  };
}
