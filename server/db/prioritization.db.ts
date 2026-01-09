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

export async function getAllBudgetCycles(): Promise<(CapitalBudgetCycle & { projectCount?: number })[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      cbc.*,
      COUNT(DISTINCT ba.id) as projectCount
    FROM capital_budget_cycles cbc
    LEFT JOIN budget_allocations ba ON ba.cycleId = cbc.id
    GROUP BY cbc.id
    ORDER BY cbc.startYear DESC
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


// ============================================================================
// ENVIRONMENTAL IMPACT SCORING
// ============================================================================

export async function getProjectEnvironmentalImpact(projectId: number): Promise<{
  energySavings: number;
  waterSavings: number;
  ghgReduction: number;
  environmentalScore: number;
} | null> {
  const db = await getDb();
  if (!db) return null;

  // Get green upgrades for the project
  const result = await db.execute(sql`
    SELECT 
      COALESCE(SUM(CAST(energySavingsKWh AS DECIMAL(15,2))), 0) as totalEnergySavings,
      COALESCE(SUM(CAST(waterSavingsGallons AS DECIMAL(15,2))), 0) as totalWaterSavings,
      COALESCE(SUM(CAST(co2ReductionMt AS DECIMAL(15,4))), 0) as totalGHGReduction
    FROM green_upgrades
    WHERE projectId = ${projectId} AND status IN ('planned', 'in_progress', 'completed')
  `);

  const rows = Array.isArray(result[0]) ? result[0] : [];
  if (rows.length === 0) return null;

  const data = rows[0];
  const energySavings = parseFloat(data.totalEnergySavings || '0');
  const waterSavings = parseFloat(data.totalWaterSavings || '0');
  const ghgReduction = parseFloat(data.totalGHGReduction || '0');

  // Calculate environmental score (0-100)
  // Based on GHG reduction: 100+ tonnes = 100 score, 0 tonnes = 0 score
  let environmentalScore = 0;
  if (ghgReduction >= 100) {
    environmentalScore = 100;
  } else if (ghgReduction >= 50) {
    environmentalScore = 70 + ((ghgReduction - 50) / 50) * 30;
  } else if (ghgReduction >= 10) {
    environmentalScore = 40 + ((ghgReduction - 10) / 40) * 30;
  } else if (ghgReduction > 0) {
    environmentalScore = (ghgReduction / 10) * 40;
  }

  return {
    energySavings,
    waterSavings,
    ghgReduction,
    environmentalScore: Math.round(environmentalScore),
  };
}

export async function getEnvironmentalCriteria(): Promise<PrioritizationCriteria | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.execute(sql`
    SELECT * FROM prioritization_criteria
    WHERE category = 'environmental' AND isActive = 1
    LIMIT 1
  `);

  const rows = Array.isArray(result[0]) ? result[0] : [];
  return rows.length > 0 ? rows[0] : null;
}

export async function ensureEnvironmentalCriteria(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if environmental criteria exists
  const existing = await getEnvironmentalCriteria();
  if (existing) return existing.id;

  // Create environmental impact criteria
  const result = await db.execute(sql`
    INSERT INTO prioritization_criteria (
      name, description, category, weight, scoringGuideline, isActive, displayOrder
    ) VALUES (
      'Environmental Impact',
      'Projects that improve energy efficiency, reduce water consumption, or lower greenhouse gas emissions. Based on LEED sustainability standards.',
      'environmental',
      15.00,
      '0-2: No environmental benefit\n3-4: Minor improvements (< 5% reduction)\n5-6: Moderate improvements (5-15% reduction)\n7-8: Significant improvements (15-30% reduction)\n9-10: Major improvements (> 30% reduction or renewable energy)',
      1,
      6
    )
  `);

  return result[0].insertId;
}

export async function calculateEnvironmentalScore(
  projectId: number,
  userId: number
): Promise<{ score: number; justification: string }> {
  const impact = await getProjectEnvironmentalImpact(projectId);
  
  if (!impact || impact.ghgReduction === 0) {
    return {
      score: 0,
      justification: 'No environmental impact data available for this project.',
    };
  }

  // Convert environmental score (0-100) to prioritization score (0-10)
  const score = Math.round(impact.environmentalScore / 10);
  
  const justification = `Environmental Impact Assessment:
- Energy Savings: ${impact.energySavings.toLocaleString()} kWh/year
- Water Savings: ${impact.waterSavings.toLocaleString()} gallons/year  
- GHG Reduction: ${impact.ghgReduction.toFixed(2)} tonnes CO₂e/year
- Environmental Score: ${impact.environmentalScore}/100`;

  return { score, justification };
}

export async function autoScoreProjectEnvironmental(
  projectId: number,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Ensure environmental criteria exists
  const criteriaId = await ensureEnvironmentalCriteria();
  
  // Calculate score
  const { score, justification } = await calculateEnvironmentalScore(projectId, userId);
  
  // Save the score
  await saveProjectScore({
    projectId,
    criteriaId,
    score: String(score),
    justification,
    scoredBy: userId,
  });
}

export async function getProjectsWithEnvironmentalImpact(): Promise<Array<{
  projectId: number;
  projectName: string;
  energySavings: number;
  waterSavings: number;
  ghgReduction: number;
  environmentalScore: number;
  totalCost: number;
  paybackPeriod: number | null;
}>> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      p.id as projectId,
      p.name as projectName,
      COALESCE(SUM(CAST(gu.energySavingsKWh AS DECIMAL(15,2))), 0) as energySavings,
      COALESCE(SUM(CAST(gu.waterSavingsGallons AS DECIMAL(15,2))), 0) as waterSavings,
      COALESCE(SUM(CAST(gu.co2ReductionMt AS DECIMAL(15,4))), 0) as ghgReduction,
      COALESCE(SUM(CAST(gu.cost AS DECIMAL(15,2))), 0) as totalCost,
      COALESCE(SUM(CAST(gu.estimatedAnnualSavings AS DECIMAL(15,2))), 0) as totalSavings
    FROM projects p
    LEFT JOIN green_upgrades gu ON p.id = gu.projectId AND gu.status IN ('planned', 'in_progress', 'completed')
    GROUP BY p.id, p.name
    HAVING ghgReduction > 0 OR energySavings > 0 OR waterSavings > 0
    ORDER BY ghgReduction DESC
  `);

  const rows = Array.isArray(result[0]) ? result[0] : [];
  
  return rows.map((row: any) => {
    const ghgReduction = parseFloat(row.ghgReduction || '0');
    const totalCost = parseFloat(row.totalCost || '0');
    const totalSavings = parseFloat(row.totalSavings || '0');
    
    // Calculate environmental score
    let environmentalScore = 0;
    if (ghgReduction >= 100) {
      environmentalScore = 100;
    } else if (ghgReduction >= 50) {
      environmentalScore = 70 + ((ghgReduction - 50) / 50) * 30;
    } else if (ghgReduction >= 10) {
      environmentalScore = 40 + ((ghgReduction - 10) / 40) * 30;
    } else if (ghgReduction > 0) {
      environmentalScore = (ghgReduction / 10) * 40;
    }

    return {
      projectId: row.projectId,
      projectName: row.projectName,
      energySavings: parseFloat(row.energySavings || '0'),
      waterSavings: parseFloat(row.waterSavings || '0'),
      ghgReduction,
      environmentalScore: Math.round(environmentalScore),
      totalCost,
      paybackPeriod: totalSavings > 0 ? totalCost / totalSavings : null,
    };
  });
}
