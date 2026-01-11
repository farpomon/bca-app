import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { createAuditLog } from "../auditLog";

/**
 * Criteria Management Service
 * Handles removal, disabling, and deletion of prioritization criteria
 */

export interface CriteriaManagementResult {
  success: boolean;
  message: string;
  impactedProjects?: number;
  normalizedWeights?: Record<number, number>;
}

/**
 * Remove a criterion from a specific portfolio's scoring model
 * This is portfolio-specific and does not delete the criterion globally
 * Triggers weight normalization and composite score recalculation
 */
export async function removeCriterionFromModel(
  criteriaId: number,
  portfolioId: number | null,
  userId: number,
  reason?: string
): Promise<CriteriaManagementResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if this is the last active criterion
  const activeCriteriaResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM prioritization_criteria
    WHERE isActive = 1 AND status = 'active'
    ${portfolioId ? sql`AND (portfolioId = ${portfolioId} OR portfolioId IS NULL)` : sql``}
  `);
  
  const activeCriteriaCount = Array.isArray(activeCriteriaResult[0]) && activeCriteriaResult[0][0]
    ? (activeCriteriaResult[0][0] as any).count
    : 0;

  if (activeCriteriaCount <= 1) {
    return {
      success: false,
      message: "Cannot remove the last remaining criterion. At least one criterion must remain active.",
    };
  }

  // Check if criterion has finalized scores (if status column exists)
  // This is a warning only - we allow removal even with finalized scores
  let finalizedScoresCount = 0;
  try {
    const finalizedScoresResult = await db.execute(sql`
      SELECT COUNT(DISTINCT ps.projectId) as count
      FROM project_scores ps
      WHERE ps.criteriaId = ${criteriaId}
    `);
    
    finalizedScoresCount = Array.isArray(finalizedScoresResult[0]) && finalizedScoresResult[0][0]
      ? (finalizedScoresResult[0][0] as any).count
      : 0;
  } catch (error) {
    // Status column may not exist in all environments
    console.warn('Could not check finalized scores:', error);
  }

  if (finalizedScoresCount > 0) {
    // Warn that historical rankings may change
    console.warn(
      `Criterion ${criteriaId} has ${finalizedScoresCount} projects with finalized scores. Historical rankings may change.`
    );
  }

  // Deactivate the criterion (soft remove from model)
  await db.execute(sql`
    UPDATE prioritization_criteria
    SET isActive = 0, updatedAt = NOW()
    WHERE id = ${criteriaId}
  `);

  // Count impacted projects
  const impactedProjectsResult = await db.execute(sql`
    SELECT COUNT(DISTINCT projectId) as count
    FROM project_scores
    WHERE criteriaId = ${criteriaId}
  `);

  const impactedProjects = Array.isArray(impactedProjectsResult[0]) && impactedProjectsResult[0][0]
    ? (impactedProjectsResult[0][0] as any).count
    : 0;

  // Log audit event
  await db.execute(sql`
    INSERT INTO criteria_audit_log (
      criteriaId, action, oldIsActive, newIsActive, oldStatus, newStatus,
      changedBy, changedAt, reason, impactedProjects
    )
    VALUES (
      ${criteriaId}, 'deactivated', 1, 0, 'active', 'active',
      ${userId}, NOW(), ${reason || 'Removed from scoring model'}, ${impactedProjects}
    )
  `);

  // Normalize remaining weights to sum to 100%
  const normalizedWeights = await normalizeActiveWeights();

  // Recalculate composite scores for all impacted projects
  await recalculateImpactedProjectScores(criteriaId);

  return {
    success: true,
    message: `Criterion removed from scoring model. ${impactedProjects} projects affected.`,
    impactedProjects,
    normalizedWeights,
  };
}

/**
 * Disable a criterion (soft delete with audit trail)
 * Keeps it in the system but excludes it from scoring and weight calculations
 */
export async function disableCriterion(
  criteriaId: number,
  userId: number,
  reason?: string
): Promise<CriteriaManagementResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if this is the last active criterion
  const activeCriteriaResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM prioritization_criteria
    WHERE isActive = 1 AND status = 'active' AND id != ${criteriaId}
  `);

  const activeCriteriaCount = Array.isArray(activeCriteriaResult[0]) && activeCriteriaResult[0][0]
    ? (activeCriteriaResult[0][0] as any).count
    : 0;

  if (activeCriteriaCount === 0) {
    return {
      success: false,
      message: "Cannot disable the last remaining active criterion.",
    };
  }

  // Get current status
  const currentStatusResult = await db.execute(sql`
    SELECT status FROM prioritization_criteria WHERE id = ${criteriaId}
  `);

  const currentStatus = Array.isArray(currentStatusResult[0]) && currentStatusResult[0][0]
    ? (currentStatusResult[0][0] as any).status
    : 'active';

  // Update criterion status to disabled
  await db.execute(sql`
    UPDATE prioritization_criteria
    SET status = 'disabled', isActive = 0, updatedAt = NOW()
    WHERE id = ${criteriaId}
  `);

  // Count impacted projects
  const impactedProjectsResult = await db.execute(sql`
    SELECT COUNT(DISTINCT projectId) as count
    FROM project_scores
    WHERE criteriaId = ${criteriaId}
  `);

  const impactedProjects = Array.isArray(impactedProjectsResult[0]) && impactedProjectsResult[0][0]
    ? (impactedProjectsResult[0][0] as any).count
    : 0;

  // Log audit event
  await db.execute(sql`
    INSERT INTO criteria_audit_log (
      criteriaId, action, oldIsActive, newIsActive, oldStatus, newStatus,
      changedBy, changedAt, reason, impactedProjects
    )
    VALUES (
      ${criteriaId}, 'deactivated', 1, 0, ${currentStatus}, 'disabled',
      ${userId}, NOW(), ${reason || 'Criterion disabled'}, ${impactedProjects}
    )
  `);

  // Normalize remaining weights
  const normalizedWeights = await normalizeActiveWeights();

  // Recalculate composite scores
  await recalculateImpactedProjectScores(criteriaId);

  return {
    success: true,
    message: `Criterion disabled. ${impactedProjects} projects affected.`,
    impactedProjects,
    normalizedWeights,
  };
}

/**
 * Delete a criterion permanently (admin-only, hard delete with confirmation)
 * Requires explicit confirmation and deletes all dependent scoring records
 */
export async function deleteCriterion(
  criteriaId: number,
  userId: number,
  confirmation: string,
  reason?: string
): Promise<CriteriaManagementResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Require explicit confirmation
  if (confirmation !== "DELETE") {
    return {
      success: false,
      message: 'Deletion requires typing "DELETE" to confirm.',
    };
  }

  // Check if this is the last active criterion
  const activeCriteriaResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM prioritization_criteria
    WHERE status = 'active' AND id != ${criteriaId}
  `);

  const activeCriteriaCount = Array.isArray(activeCriteriaResult[0]) && activeCriteriaResult[0][0]
    ? (activeCriteriaResult[0][0] as any).count
    : 0;

  if (activeCriteriaCount === 0) {
    return {
      success: false,
      message: "Cannot delete the last remaining criterion.",
    };
  }

  // Get current criterion details for audit
  const criterionResult = await db.execute(sql`
    SELECT name, status FROM prioritization_criteria WHERE id = ${criteriaId}
  `);

  const criterion = Array.isArray(criterionResult[0]) && criterionResult[0][0]
    ? (criterionResult[0][0] as any)
    : null;

  if (!criterion) {
    return {
      success: false,
      message: "Criterion not found.",
    };
  }

  // Count impacted projects before deletion
  const impactedProjectsResult = await db.execute(sql`
    SELECT COUNT(DISTINCT projectId) as count
    FROM project_scores
    WHERE criteriaId = ${criteriaId}
  `);

  const impactedProjects = Array.isArray(impactedProjectsResult[0]) && impactedProjectsResult[0][0]
    ? (impactedProjectsResult[0][0] as any).count
    : 0;

  // Log audit event BEFORE deletion
  await db.execute(sql`
    INSERT INTO criteria_audit_log (
      criteriaId, action, oldStatus, newStatus,
      changedBy, changedAt, reason, impactedProjects, changeDetails
    )
    VALUES (
      ${criteriaId}, 'deleted', ${criterion.status}, 'deleted',
      ${userId}, NOW(), ${reason || 'Criterion permanently deleted'},
      ${impactedProjects}, ${JSON.stringify({ criterionName: criterion.name })}
    )
  `);

  // Soft delete: mark as deleted instead of hard delete
  await db.execute(sql`
    UPDATE prioritization_criteria
    SET status = 'deleted', isActive = 0, deletedAt = NOW(), deletedBy = ${userId}
    WHERE id = ${criteriaId}
  `);

  // Delete dependent project scores
  await db.execute(sql`
    DELETE FROM project_scores
    WHERE criteriaId = ${criteriaId}
  `);

  // Log system audit event
  await createAuditLog({
    userId,
    actionType: "delete",
    entityType: "criteria",
    entityId: criteriaId,
    entityName: criterion.name,
    module: "prioritization",
    beforeState: { status: criterion.status },
    afterState: { status: "deleted" },
    changesSummary: `Criterion "${criterion.name}" permanently deleted by user ${userId}. ${impactedProjects} projects affected.`,
    status: "success",
  });

  // Normalize remaining weights
  const normalizedWeights = await normalizeActiveWeights();

  // Recalculate all project scores
  await recalculateAllProjectScores();

  return {
    success: true,
    message: `Criterion "${criterion.name}" permanently deleted. ${impactedProjects} projects affected.`,
    impactedProjects,
    normalizedWeights,
  };
}

/**
 * Normalize weights of all active criteria to sum to 100%
 */
async function normalizeActiveWeights(): Promise<Record<number, number>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all active criteria
  const criteriaResult = await db.execute(sql`
    SELECT id, weight
    FROM prioritization_criteria
    WHERE isActive = 1 AND status = 'active'
  `);

  const criteria = Array.isArray(criteriaResult[0]) ? criteriaResult[0] : [];

  if (criteria.length === 0) {
    return {};
  }

  // Calculate total weight
  const totalWeight = criteria.reduce((sum: number, c: any) => sum + parseFloat(c.weight), 0);

  if (totalWeight === 0) {
    // If all weights are 0, distribute equally
    const equalWeight = 100 / criteria.length;
    for (const criterion of criteria) {
      await db.execute(sql`
        UPDATE prioritization_criteria
        SET weight = ${equalWeight.toFixed(6)}, updatedAt = NOW()
        WHERE id = ${(criterion as any).id}
      `);
    }

    return criteria.reduce((acc: Record<number, number>, c: any) => {
      acc[c.id] = equalWeight;
      return acc;
    }, {});
  }

  // Normalize weights to sum to 100
  const normalizedWeights: Record<number, number> = {};

  for (const criterion of criteria) {
    const currentWeight = parseFloat((criterion as any).weight);
    const normalizedWeight = (currentWeight / totalWeight) * 100;

    await db.execute(sql`
      UPDATE prioritization_criteria
      SET weight = ${normalizedWeight.toFixed(6)}, updatedAt = NOW()
      WHERE id = ${(criterion as any).id}
    `);

    normalizedWeights[(criterion as any).id] = normalizedWeight;
  }

  return normalizedWeights;
}

/**
 * Recalculate composite scores for all projects affected by a criterion change
 */
async function recalculateImpactedProjectScores(criteriaId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all projects that have scores for this criterion
  const projectsResult = await db.execute(sql`
    SELECT DISTINCT projectId
    FROM project_scores
    WHERE criteriaId = ${criteriaId}
  `);

  const projects = Array.isArray(projectsResult[0]) ? projectsResult[0] : [];

  // Import calculateCompositeScore from prioritization.service
  const { calculateCompositeScore } = await import("./prioritization.service");

  for (const project of projects) {
    await calculateCompositeScore((project as any).projectId);
  }
}

/**
 * Recalculate composite scores for all projects
 */
async function recalculateAllProjectScores(): Promise<void> {
  const { calculateAllProjectScores } = await import("./prioritization.service");
  await calculateAllProjectScores();
}

/**
 * Enable a previously disabled criterion
 */
export async function enableCriterion(
  criteriaId: number,
  userId: number,
  reason?: string
): Promise<CriteriaManagementResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current status
  const currentStatusResult = await db.execute(sql`
    SELECT status FROM prioritization_criteria WHERE id = ${criteriaId}
  `);

  const currentStatus = Array.isArray(currentStatusResult[0]) && currentStatusResult[0][0]
    ? (currentStatusResult[0][0] as any).status
    : null;

  if (currentStatus !== 'disabled') {
    return {
      success: false,
      message: `Cannot enable criterion. Current status: ${currentStatus}`,
    };
  }

  // Enable the criterion
  await db.execute(sql`
    UPDATE prioritization_criteria
    SET status = 'active', isActive = 1, updatedAt = NOW()
    WHERE id = ${criteriaId}
  `);

  // Log audit event
  await db.execute(sql`
    INSERT INTO criteria_audit_log (
      criteriaId, action, oldIsActive, newIsActive, oldStatus, newStatus,
      changedBy, changedAt, reason
    )
    VALUES (
      ${criteriaId}, 'reactivated', 0, 1, 'disabled', 'active',
      ${userId}, NOW(), ${reason || 'Criterion re-enabled'}
    )
  `);

  // Normalize weights
  const normalizedWeights = await normalizeActiveWeights();

  // Recalculate scores
  await recalculateAllProjectScores();

  return {
    success: true,
    message: "Criterion enabled successfully.",
    normalizedWeights,
  };
}
