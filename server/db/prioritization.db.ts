import { getDb } from "../db";
import { sql } from "drizzle-orm";
import type {
  PrioritizationCriteria,
  InsertPrioritizationCriteria,
  ProjectScore,
  InsertProjectScore,
  CapitalBudgetCycle,
  InsertCapitalBudgetCycle,
  BudgetAllocation,
  InsertBudgetAllocation,
} from "../../drizzle/schema";

/**
 * Database helper functions for Multi-Criteria Prioritization
 */

// ============================================================================
// CRITERIA MANAGEMENT
// ============================================================================

export async function getAllCriteria(): Promise<PrioritizationCriteria[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT * FROM prioritization_criteria
    WHERE isActive = 1
    ORDER BY displayOrder, name
  `);

  return Array.isArray(result[0]) ? result[0] : [];
}

export async function getCriteriaById(id: number): Promise<PrioritizationCriteria | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.execute(sql`
    SELECT * FROM prioritization_criteria
    WHERE id = ${id}
  `);

  const rows = Array.isArray(result[0]) ? result[0] : [];
  return rows.length > 0 ? rows[0] : null;
}

export async function createCriteria(
  criteria: InsertPrioritizationCriteria
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(sql`
    INSERT INTO prioritization_criteria (
      name, description, category, weight, scoringGuideline, isActive, displayOrder
    ) VALUES (
      ${criteria.name},
      ${criteria.description || null},
      ${criteria.category},
      ${criteria.weight || 10.00},
      ${criteria.scoringGuideline || null},
      ${criteria.isActive !== undefined ? criteria.isActive : 1},
      ${criteria.displayOrder || 0}
    )
  `);

  return result[0].insertId;
}

export async function updateCriteria(
  id: number,
  updates: Partial<PrioritizationCriteria>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const setParts: any[] = [];

  if (updates.name !== undefined) setParts.push(sql`name = ${updates.name}`);
  if (updates.description !== undefined) setParts.push(sql`description = ${updates.description}`);
  if (updates.category !== undefined) setParts.push(sql`category = ${updates.category}`);
  if (updates.weight !== undefined) setParts.push(sql`weight = ${updates.weight}`);
  if (updates.scoringGuideline !== undefined) setParts.push(sql`scoringGuideline = ${updates.scoringGuideline}`);
  if (updates.isActive !== undefined) setParts.push(sql`isActive = ${updates.isActive}`);
  if (updates.displayOrder !== undefined) setParts.push(sql`displayOrder = ${updates.displayOrder}`);

  if (setParts.length === 0) return;

  setParts.push(sql`updatedAt = NOW()`);

  await db.execute(sql`UPDATE prioritization_criteria SET ${sql.join(setParts, sql`, `)} WHERE id = ${id}`);
}

export async function deleteCriteria(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Soft delete by setting isActive = 0
  await db.execute(sql`
    UPDATE prioritization_criteria
    SET isActive = 0, updatedAt = NOW()
    WHERE id = ${id}
  `);
}

// ============================================================================
// PROJECT SCORING
// ============================================================================

export async function getProjectScores(projectId: number): Promise<ProjectScore[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT ps.*, pc.name as criteriaName, pc.weight, pc.category
    FROM project_scores ps
    JOIN prioritization_criteria pc ON ps.criteriaId = pc.id
    WHERE ps.projectId = ${projectId}
    ORDER BY pc.displayOrder
  `);

  return Array.isArray(result[0]) ? result[0] : [];
}

export async function saveProjectScore(score: InsertProjectScore): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(sql`
    INSERT INTO project_scores (
      projectId, criteriaId, score, justification, scoredBy
    ) VALUES (
      ${score.projectId},
      ${score.criteriaId},
      ${score.score},
      ${score.justification || null},
      ${score.scoredBy}
    )
    ON DUPLICATE KEY UPDATE
      score = VALUES(score),
      justification = VALUES(justification),
      scoredBy = VALUES(scoredBy),
      updatedAt = NOW()
  `);

  return Number(result[0].insertId) || 0;
}

export async function saveMultipleProjectScores(
  projectId: number,
  scores: Array<{ criteriaId: number; score: number; justification?: string }>,
  scoredBy: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const score of scores) {
    await saveProjectScore({
      projectId,
      criteriaId: score.criteriaId,
      score: String(score.score),
      justification: score.justification,
      scoredBy,
    });
  }
}

export async function deleteProjectScore(projectId: number, criteriaId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.execute(sql`
    DELETE FROM project_scores
    WHERE projectId = ${projectId} AND criteriaId = ${criteriaId}
  `);
}

// ============================================================================
// CAPITAL BUDGET CYCLES
// ============================================================================

export async function getAllBudgetCycles(): Promise<CapitalBudgetCycle[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT * FROM capital_budget_cycles
    ORDER BY startYear DESC
  `);

  return Array.isArray(result[0]) ? result[0] : [];
}

export async function getBudgetCycleById(id: number): Promise<CapitalBudgetCycle | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.execute(sql`
    SELECT * FROM capital_budget_cycles
    WHERE id = ${id}
  `);

  const rows = Array.isArray(result[0]) ? result[0] : [];
  return rows.length > 0 ? rows[0] : null;
}

export async function createBudgetCycle(cycle: InsertCapitalBudgetCycle): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(sql`
    INSERT INTO capital_budget_cycles (
      name, description, startYear, endYear, totalBudget, status, createdBy
    ) VALUES (
      ${cycle.name},
      ${cycle.description || null},
      ${cycle.startYear},
      ${cycle.endYear},
      ${cycle.totalBudget || null},
      ${cycle.status || "planning"},
      ${cycle.createdBy}
    )
  `);

  return result[0].insertId;
}

export async function updateBudgetCycle(
  id: number,
  updates: Partial<CapitalBudgetCycle>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const setParts: any[] = [];

  if (updates.name !== undefined) setParts.push(sql`name = ${updates.name}`);
  if (updates.description !== undefined) setParts.push(sql`description = ${updates.description}`);
  if (updates.startYear !== undefined) setParts.push(sql`startYear = ${updates.startYear}`);
  if (updates.endYear !== undefined) setParts.push(sql`endYear = ${updates.endYear}`);
  if (updates.totalBudget !== undefined) setParts.push(sql`totalBudget = ${updates.totalBudget}`);
  if (updates.status !== undefined) setParts.push(sql`status = ${updates.status}`);

  if (setParts.length === 0) return;

  setParts.push(sql`updatedAt = NOW()`);

  await db.execute(sql`UPDATE capital_budget_cycles SET ${sql.join(setParts, sql`, `)} WHERE id = ${id}`);
}

export async function deleteBudgetCycle(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete all allocations first
  await db.execute(sql`
    DELETE FROM budget_allocations WHERE cycleId = ${id}
  `);

  // Delete the cycle
  await db.execute(sql`
    DELETE FROM capital_budget_cycles WHERE id = ${id}
  `);
}

// ============================================================================
// BUDGET ALLOCATIONS
// ============================================================================

export async function getAllocationsForCycle(cycleId: number): Promise<BudgetAllocation[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT ba.*, p.name as projectName, p.deferredMaintenanceCost
    FROM budget_allocations ba
    JOIN projects p ON ba.projectId = p.id
    WHERE ba.cycleId = ${cycleId}
    ORDER BY ba.year, ba.priority
  `);

  return Array.isArray(result[0]) ? result[0] : [];
}

export async function createBudgetAllocation(
  allocation: InsertBudgetAllocation
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(sql`
    INSERT INTO budget_allocations (
      cycleId, projectId, year, allocatedAmount, priority, status, justification, strategicAlignment
    ) VALUES (
      ${allocation.cycleId},
      ${allocation.projectId},
      ${allocation.year},
      ${allocation.allocatedAmount},
      ${allocation.priority},
      ${allocation.status || "proposed"},
      ${allocation.justification || null},
      ${allocation.strategicAlignment || null}
    )
  `);

  return result[0].insertId;
}

export async function updateBudgetAllocation(
  id: number,
  updates: Partial<BudgetAllocation>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const setParts: any[] = [];

  if (updates.year !== undefined) setParts.push(sql`year = ${updates.year}`);
  if (updates.allocatedAmount !== undefined) setParts.push(sql`allocatedAmount = ${updates.allocatedAmount}`);
  if (updates.priority !== undefined) setParts.push(sql`priority = ${updates.priority}`);
  if (updates.status !== undefined) setParts.push(sql`status = ${updates.status}`);
  if (updates.justification !== undefined) setParts.push(sql`justification = ${updates.justification}`);
  if (updates.strategicAlignment !== undefined) setParts.push(sql`strategicAlignment = ${updates.strategicAlignment}`);

  if (setParts.length === 0) return;

  setParts.push(sql`updatedAt = NOW()`);

  await db.execute(sql`UPDATE budget_allocations SET ${sql.join(setParts, sql`, `)} WHERE id = ${id}`);
}

export async function deleteBudgetAllocation(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.execute(sql`
    DELETE FROM budget_allocations WHERE id = ${id}
  `);
}

export async function getBudgetSummaryByYear(cycleId: number): Promise<
  Array<{
    year: number;
    totalAllocated: number;
    projectCount: number;
  }>
> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      year,
      SUM(allocatedAmount) as totalAllocated,
      COUNT(*) as projectCount
    FROM budget_allocations
    WHERE cycleId = ${cycleId}
    GROUP BY year
    ORDER BY year
  `);

  const rows = Array.isArray(result[0]) ? result[0] : [];
  return rows.map((row: any) => ({
    year: row.year,
    totalAllocated: parseFloat(row.totalAllocated || 0),
    projectCount: row.projectCount,
  }));
}
