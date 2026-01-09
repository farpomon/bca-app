import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * Multi-Criteria Prioritization Service
 * Calculates weighted composite scores for project prioritization
 */

export interface CriteriaScore {
  criteriaId: number;
  criteriaName: string;
  score: number;
  weight: number;
  weightedScore: number;
  justification?: string;
}

export interface CompositeScore {
  projectId: number;
  compositeScore: number;
  criteriaScores: CriteriaScore[];
  totalWeight: number;
  rank?: number;
}

export interface RankedProject {
  projectId: number;
  projectName: string;
  compositeScore: number;
  rank: number;
  urgencyScore?: number;
  missionCriticalityScore?: number;
  safetyScore?: number;
  complianceScore?: number;
  energySavingsScore?: number;
  totalCost?: number;
  costEffectivenessScore?: number; // composite score / cost
}

/**
 * Calculate composite priority score for a project
 * Weighted sum of all criteria scores
 */
export async function calculateCompositeScore(
  projectId: number
): Promise<CompositeScore | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all active criteria with weights
  const criteriaResult = await db.execute(sql`
    SELECT id, name, weight
    FROM prioritization_criteria
    WHERE isActive = 1
    ORDER BY displayOrder
  `);

  const criteria = Array.isArray(criteriaResult[0]) ? criteriaResult[0] : [];
  if (criteria.length === 0) {
    return null;
  }

  // Get project scores for all criteria
  const scoresResult = await db.execute(sql`
    SELECT ps.criteriaId, ps.score, ps.justification, pc.name as criteriaName, pc.weight
    FROM project_scores ps
    JOIN prioritization_criteria pc ON ps.criteriaId = pc.id
    WHERE ps.projectId = ${projectId} AND pc.isActive = 1
  `);

  const scores = Array.isArray(scoresResult[0]) ? scoresResult[0] : [];

  // Calculate total weight (should be 100, but normalize just in case)
  const totalWeight = criteria.reduce((sum: number, c: any) => sum + parseFloat(c.weight), 0);

  // Build criteria scores with weighted values
  const criteriaScores: CriteriaScore[] = [];
  let compositeScore = 0;

  for (const criterion of criteria) {
    const projectScore = scores.find((s: any) => s.criteriaId === criterion.id);
    const score = projectScore ? parseFloat(projectScore.score) : 0;
    const weight = parseFloat(criterion.weight);
    const weightedScore = weight * score; // weight × score

    criteriaScores.push({
      criteriaId: criterion.id,
      criteriaName: criterion.name,
      score,
      weight,
      weightedScore,
      justification: projectScore?.justification,
    });

    compositeScore += weightedScore;
  }

  // Divide by 100 to get final composite score
  // Formula: sum(weight × score) / 100
  compositeScore = compositeScore / 100;

  return {
    projectId,
    compositeScore,
    criteriaScores,
    totalWeight,
  };
}

/**
 * Calculate and cache composite scores for all projects
 * Returns ranked list of projects
 * 
 * This function ensures data consistency by:
 * 1. Only calculating scores for projects that have been scored
 * 2. Using the same composite score calculation logic for all projects
 * 3. Caching results in project_priority_scores table
 * 4. Assigning ranks based on composite scores
 */
export async function calculateAllProjectScores(): Promise<RankedProject[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all projects with at least one score
  // This ensures we only rank projects that have been evaluated
  const projectsResult = await db.execute(sql`
    SELECT DISTINCT p.id, p.name, p.deferredMaintenanceCost
    FROM projects p
    JOIN project_scores ps ON p.id = ps.projectId
    WHERE ps.score IS NOT NULL
    ORDER BY p.name
  `);

  const projects = Array.isArray(projectsResult[0]) ? projectsResult[0] : [];

  const rankedProjects: RankedProject[] = [];

  for (const project of projects) {
    const compositeResult = await calculateCompositeScore(project.id);
    if (!compositeResult) continue;

    // Extract individual criteria scores for quick access
    const urgencyScore = compositeResult.criteriaScores.find(
      (c) => c.criteriaName === "Urgency"
    )?.score;
    const missionCriticalityScore = compositeResult.criteriaScores.find(
      (c) => c.criteriaName === "Mission Criticality"
    )?.score;
    const safetyScore = compositeResult.criteriaScores.find(
      (c) => c.criteriaName === "Safety"
    )?.score;
    const complianceScore = compositeResult.criteriaScores.find(
      (c) => c.criteriaName === "Code Compliance"
    )?.score;
    const energySavingsScore = compositeResult.criteriaScores.find(
      (c) => c.criteriaName === "Energy Savings"
    )?.score;

    const totalCost = project.deferredMaintenanceCost
      ? parseFloat(project.deferredMaintenanceCost)
      : undefined;

    const costEffectivenessScore =
      totalCost && totalCost > 0 ? compositeResult.compositeScore / (totalCost / 1000) : undefined;

    rankedProjects.push({
      projectId: project.id,
      projectName: project.name,
      compositeScore: compositeResult.compositeScore,
      rank: 0, // Will be assigned after sorting
      urgencyScore,
      missionCriticalityScore,
      safetyScore,
      complianceScore,
      energySavingsScore,
      totalCost,
      costEffectivenessScore,
    });
  }

  // Sort by composite score (descending)
  rankedProjects.sort((a, b) => b.compositeScore - a.compositeScore);

  // Assign ranks
  rankedProjects.forEach((project, index) => {
    project.rank = index + 1;
  });

  // Cache the results in project_priority_scores table
  for (const project of rankedProjects) {
    await db.execute(sql`
      INSERT INTO project_priority_scores (
        projectId, compositeScore, \`rank\`, urgencyScore, missionCriticalityScore,
        safetyScore, complianceScore, energySavingsScore, calculatedAt
      ) VALUES (
        ${project.projectId},
        ${project.compositeScore},
        ${project.rank},
        ${project.urgencyScore || null},
        ${project.missionCriticalityScore || null},
        ${project.safetyScore || null},
        ${project.complianceScore || null},
        ${project.energySavingsScore || null},
        NOW()
      )
      ON DUPLICATE KEY UPDATE
        compositeScore = VALUES(compositeScore),
        \`rank\` = VALUES(\`rank\`),
        urgencyScore = VALUES(urgencyScore),
        missionCriticalityScore = VALUES(missionCriticalityScore),
        safetyScore = VALUES(safetyScore),
        complianceScore = VALUES(complianceScore),
        energySavingsScore = VALUES(energySavingsScore),
        calculatedAt = NOW()
    `);
  }

  return rankedProjects;
}

/**
 * Normalize criteria weights to sum to 100%
 */
export async function normalizeCriteriaWeights(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all active criteria
  const result = await db.execute(sql`
    SELECT id, weight
    FROM prioritization_criteria
    WHERE isActive = 1
  `);

  const criteria = Array.isArray(result[0]) ? result[0] : [];
  if (criteria.length === 0) return;

  // Calculate total weight
  const totalWeight = criteria.reduce((sum: number, c: any) => sum + parseFloat(c.weight), 0);

  if (totalWeight === 0) return;

  // Update each criterion with normalized weight
  for (const criterion of criteria) {
    const normalizedWeight = (parseFloat(criterion.weight) / totalWeight) * 100;
    await db.execute(sql`
      UPDATE prioritization_criteria
      SET weight = ${normalizedWeight}
      WHERE id = ${criterion.id}
    `);
  }
}

/**
 * Get ranked projects with optional filtering
 * 
 * This function retrieves cached rankings from project_priority_scores table
 * to ensure consistent data across all queries. The cache is updated by
 * calculateAllProjectScores() mutation.
 */
export async function getRankedProjects(options?: {
  minScore?: number;
  maxScore?: number;
  limit?: number;
}): Promise<RankedProject[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Query from cached scores table for consistency
  let query = sql`
    SELECT 
      pps.projectId,
      p.name as projectName,
      pps.compositeScore,
      pps.\`rank\`,
      pps.urgencyScore,
      pps.missionCriticalityScore,
      pps.safetyScore,
      pps.complianceScore,
      pps.energySavingsScore,
      p.deferredMaintenanceCost as totalCost
    FROM project_priority_scores pps
    JOIN projects p ON pps.projectId = p.id
    WHERE pps.compositeScore IS NOT NULL
  `;

  if (options?.minScore !== undefined) {
    query = sql`${query} AND pps.compositeScore >= ${options.minScore}`;
  }

  if (options?.maxScore !== undefined) {
    query = sql`${query} AND pps.compositeScore <= ${options.maxScore}`;
  }

  query = sql`${query} ORDER BY pps.\`rank\` ASC`;

  if (options?.limit) {
    query = sql`${query} LIMIT ${options.limit}`;
  }

  const result = await db.execute(query);
  const rows = Array.isArray(result[0]) ? result[0] : [];

  return rows.map((row: any) => ({
    projectId: row.projectId,
    projectName: row.projectName,
    compositeScore: parseFloat(row.compositeScore),
    rank: row.rank,
    urgencyScore: row.urgencyScore ? parseFloat(row.urgencyScore) : undefined,
    missionCriticalityScore: row.missionCriticalityScore
      ? parseFloat(row.missionCriticalityScore)
      : undefined,
    safetyScore: row.safetyScore ? parseFloat(row.safetyScore) : undefined,
    complianceScore: row.complianceScore ? parseFloat(row.complianceScore) : undefined,
    energySavingsScore: row.energySavingsScore ? parseFloat(row.energySavingsScore) : undefined,
    totalCost: row.totalCost ? parseFloat(row.totalCost) : undefined,
    costEffectivenessScore:
      row.totalCost && parseFloat(row.totalCost) > 0
        ? parseFloat(row.compositeScore) / (parseFloat(row.totalCost) / 1000)
        : undefined,
  }));
}

/**
 * Compare different weighting scenarios
 */
export async function compareWeightingScenarios(
  projectId: number,
  scenarios: Array<{ name: string; weights: Record<string, number> }>
): Promise<Array<{ scenarioName: string; compositeScore: number; criteriaScores: CriteriaScore[] }>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get project scores
  const scoresResult = await db.execute(sql`
    SELECT ps.criteriaId, ps.score, ps.justification, pc.name as criteriaName
    FROM project_scores ps
    JOIN prioritization_criteria pc ON ps.criteriaId = pc.id
    WHERE ps.projectId = ${projectId} AND pc.isActive = 1
  `);

  const scores = Array.isArray(scoresResult[0]) ? scoresResult[0] : [];

  const results = [];

  for (const scenario of scenarios) {
    const criteriaScores: CriteriaScore[] = [];
    let compositeScore = 0;

    for (const [criteriaName, weight] of Object.entries(scenario.weights)) {
      const projectScore = scores.find((s: any) => s.criteriaName === criteriaName);
      const score = projectScore ? parseFloat(projectScore.score) : 0;
      const weightedScore = weight * score; // weight × score

      criteriaScores.push({
        criteriaId: projectScore?.criteriaId || 0,
        criteriaName,
        score,
        weight,
        weightedScore,
        justification: projectScore?.justification,
      });

      compositeScore += weightedScore;
    }

    // Divide by 100 to get final composite score
    // Formula: sum(weight × score) / 100
    compositeScore = compositeScore / 100;

    results.push({
      scenarioName: scenario.name,
      compositeScore,
      criteriaScores,
    });
  }

  return results;
}
