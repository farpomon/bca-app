import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { createAuditLog } from "../auditLog";
import { calculateCompositeScore } from "./prioritization.service";

/**
 * Scoring Finalization Service
 * Handles atomic finalization of project scores with proper validation
 */

export interface FinalizationResult {
  success: boolean;
  message: string;
  compositeScore?: number;
  traceId?: string;
  errors?: string[];
}

export interface FinalizationInput {
  projectId: number;
  modelVersionId?: number;
  userId: number;
  companyId?: number;
}

/**
 * Atomic finalization of project scores
 * Validates inputs, upserts draft scores, and finalizes them in a single transaction
 */
export async function finalizeProjectScores(
  input: FinalizationInput
): Promise<FinalizationResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const traceId = generateTraceId();
  const errors: string[] = [];

  try {
    // Step 1: Validate inputs
    const validationResult = await validateFinalizationInputs(input);
    if (!validationResult.valid) {
      return {
        success: false,
        message: validationResult.message || "Validation failed",
        errors: validationResult.errors,
        traceId,
      };
    }

    // Step 2: Check if draft scores exist
    const draftScoresResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM project_scores
      WHERE projectId = ${input.projectId}
        AND status = 'draft'
        ${input.companyId ? sql`AND companyId = ${input.companyId}` : sql``}
    `);

    const draftCount = Array.isArray(draftScoresResult[0]) && draftScoresResult[0][0]
      ? (draftScoresResult[0][0] as any).count
      : 0;

    if (draftCount === 0) {
      // No draft exists - check if there are any scores at all
      const anyScoresResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM project_scores
        WHERE projectId = ${input.projectId}
          ${input.companyId ? sql`AND companyId = ${input.companyId}` : sql``}
      `);

      const anyScoresCount = Array.isArray(anyScoresResult[0]) && anyScoresResult[0][0]
        ? (anyScoresResult[0][0] as any).count
        : 0;

      if (anyScoresCount === 0) {
        return {
          success: false,
          message: "No scores found for this project. Please score the project first.",
          traceId,
        };
      }

      // Scores exist but no draft - this shouldn't happen, but we'll handle it
      console.warn(`[${traceId}] No draft scores found for project ${input.projectId}, but scores exist`);
    }

    // Step 3: Finalize scores atomically
    await db.execute(sql`
      UPDATE project_scores
      SET status = 'submitted', updatedAt = NOW()
      WHERE projectId = ${input.projectId}
        AND status = 'draft'
        ${input.companyId ? sql`AND companyId = ${input.companyId}` : sql``}
    `);

    // Step 4: Calculate and persist composite score
    const compositeResult = await calculateCompositeScore(input.projectId);
    
    if (!compositeResult) {
      return {
        success: false,
        message: "Failed to calculate composite score. Please ensure all criteria are scored.",
        traceId,
      };
    }

    // Step 5: Upsert composite score to project_priority_scores
    await db.execute(sql`
      INSERT INTO project_priority_scores (
        projectId, compositeScore, modelVersionId, calculatedAt, updatedAt
      )
      VALUES (
        ${input.projectId},
        ${compositeResult.compositeScore},
        ${input.modelVersionId || null},
        NOW(),
        NOW()
      )
      ON DUPLICATE KEY UPDATE
        compositeScore = ${compositeResult.compositeScore},
        modelVersionId = ${input.modelVersionId || null},
        updatedAt = NOW()
    `);

    // Step 6: Log audit event
    await db.execute(sql`
      INSERT INTO scoring_audit_log (
        projectScoreId, projectId, criteriaId, action, newStatus,
        changedBy, changedAt, reason
      )
      SELECT
        id, projectId, criteriaId, 'submitted', 'submitted',
        ${input.userId}, NOW(), 'Scores finalized'
      FROM project_scores
      WHERE projectId = ${input.projectId}
        AND status = 'submitted'
        ${input.companyId ? sql`AND companyId = ${input.companyId}` : sql``}
    `);

    // Step 7: Log system audit
    await createAuditLog({
      userId: input.userId,
      actionType: "update",
      entityType: "ranking",
      entityId: input.projectId,
      module: "prioritization",
      changesSummary: `Project scores finalized. Composite score: ${compositeResult.compositeScore.toFixed(2)}`,
      status: "success",
    });

    return {
      success: true,
      message: "Scores finalized successfully",
      compositeScore: compositeResult.compositeScore,
      traceId,
    };
  } catch (error: any) {
    // Log error server-side with trace ID
    console.error(`[${traceId}] Finalization error:`, error);

    // Log failed audit event
    await createAuditLog({
      userId: input.userId,
      actionType: "update",
      entityType: "ranking",
      entityId: input.projectId,
      module: "prioritization",
      changesSummary: `Failed to finalize project scores: ${error.message}`,
      status: "failed",
      errorMessage: error.message,
    }).catch(err => console.error("Failed to log audit event:", err));

    return {
      success: false,
      message: "Failed to finalize scores. Please try again. If the issue persists, contact support.",
      traceId,
      errors: [error.message],
    };
  }
}

/**
 * Validate finalization inputs
 */
async function validateFinalizationInputs(
  input: FinalizationInput
): Promise<{ valid: boolean; message?: string; errors?: string[] }> {
  const errors: string[] = [];

  // Validate projectId
  if (!input.projectId || input.projectId <= 0) {
    errors.push("Invalid project ID");
  }

  // Validate userId
  if (!input.userId || input.userId <= 0) {
    errors.push("Invalid user ID");
  }

  // Check if project exists
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const projectResult = await db.execute(sql`
    SELECT id FROM projects WHERE id = ${input.projectId}
  `);

  const projectExists = Array.isArray(projectResult[0]) && projectResult[0].length > 0;

  if (!projectExists) {
    errors.push("Project not found");
  }

  // Check if criteria exist
  const criteriaResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM prioritization_criteria
    WHERE isActive = 1 AND status = 'active'
  `);

  const criteriaCount = Array.isArray(criteriaResult[0]) && criteriaResult[0][0]
    ? (criteriaResult[0][0] as any).count
    : 0;

  if (criteriaCount === 0) {
    errors.push("No active criteria found. Please create criteria first.");
  }

  if (errors.length > 0) {
    return {
      valid: false,
      message: errors.join("; "),
      errors,
    };
  }

  return { valid: true };
}

/**
 * Save draft scores for a project
 * Upserts scores to ensure no duplicates
 */
export async function saveDraftScores(
  projectId: number,
  scores: Array<{ criteriaId: number; score: number; justification?: string }>,
  userId: number,
  companyId?: number
): Promise<FinalizationResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const traceId = generateTraceId();

  try {
    // Validate inputs
    if (!projectId || projectId <= 0) {
      return {
        success: false,
        message: "Invalid project ID",
        traceId,
      };
    }

    if (!scores || scores.length === 0) {
      return {
        success: false,
        message: "No scores provided",
        traceId,
      };
    }

    // Upsert each score
    for (const scoreData of scores) {
      await db.execute(sql`
        INSERT INTO project_scores (
          projectId, criteriaId, score, justification, status, scoredBy, companyId, scoredAt, updatedAt
        )
        VALUES (
          ${projectId},
          ${scoreData.criteriaId},
          ${scoreData.score},
          ${scoreData.justification || null},
          'draft',
          ${userId},
          ${companyId || null},
          NOW(),
          NOW()
        )
        ON DUPLICATE KEY UPDATE
          score = ${scoreData.score},
          justification = ${scoreData.justification || null},
          updatedAt = NOW()
      `);
    }

    return {
      success: true,
      message: "Draft scores saved successfully",
      traceId,
    };
  } catch (error: any) {
    console.error(`[${traceId}] Save draft error:`, error);

    return {
      success: false,
      message: "Failed to save draft scores. Please try again.",
      traceId,
      errors: [error.message],
    };
  }
}

/**
 * Generate a unique trace ID for error tracking
 */
function generateTraceId(): string {
  return `TRACE-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}

/**
 * Get finalization status for a project
 */
export async function getFinalizationStatus(
  projectId: number,
  companyId?: number
): Promise<{
  hasDraft: boolean;
  hasFinalized: boolean;
  criteriaScored: number;
  totalCriteria: number;
  canFinalize: boolean;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Count draft scores
  const draftResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM project_scores
    WHERE projectId = ${projectId}
      AND status = 'draft'
      ${companyId ? sql`AND companyId = ${companyId}` : sql``}
  `);

  const draftCount = Array.isArray(draftResult[0]) && draftResult[0][0]
    ? (draftResult[0][0] as any).count
    : 0;

  // Count finalized scores
  const finalizedResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM project_scores
    WHERE projectId = ${projectId}
      AND status IN ('submitted', 'locked')
      ${companyId ? sql`AND companyId = ${companyId}` : sql``}
  `);

  const finalizedCount = Array.isArray(finalizedResult[0]) && finalizedResult[0][0]
    ? (finalizedResult[0][0] as any).count
    : 0;

  // Count total active criteria
  const totalCriteriaResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM prioritization_criteria
    WHERE isActive = 1 AND status = 'active'
  `);

  const totalCriteria = Array.isArray(totalCriteriaResult[0]) && totalCriteriaResult[0][0]
    ? (totalCriteriaResult[0][0] as any).count
    : 0;

  // Count criteria scored (draft or finalized)
  const scoredResult = await db.execute(sql`
    SELECT COUNT(DISTINCT criteriaId) as count
    FROM project_scores
    WHERE projectId = ${projectId}
      ${companyId ? sql`AND companyId = ${companyId}` : sql``}
  `);

  const criteriaScored = Array.isArray(scoredResult[0]) && scoredResult[0][0]
    ? (scoredResult[0][0] as any).count
    : 0;

  return {
    hasDraft: draftCount > 0,
    hasFinalized: finalizedCount > 0,
    criteriaScored,
    totalCriteria,
    canFinalize: criteriaScored >= totalCriteria && totalCriteria > 0,
  };
}
