import { getDb } from "../db";
import { eq, and, sql, inArray } from "drizzle-orm";
import type {
  CapitalBudgetCycle,
  BudgetAllocation,
} from "../../drizzle/schema";

/**
 * Database helper functions for Capital Planning
 */

// ============================================================================
// CYCLE MANAGEMENT
// ============================================================================

export async function getAllCycles(): Promise<CapitalBudgetCycle[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT * FROM capital_budget_cycles
    ORDER BY startYear DESC, createdAt DESC
  `);

  return Array.isArray(result[0]) ? result[0] : [];
}

export async function getCycleById(id: number): Promise<CapitalBudgetCycle | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.execute(sql`
    SELECT * FROM capital_budget_cycles
    WHERE id = ${id}
  `);

  const rows = Array.isArray(result[0]) ? result[0] : [];
  return rows.length > 0 ? rows[0] : null;
}

export async function deleteCycleWithDependencies(cycleId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Start transaction
  await db.execute(sql`START TRANSACTION`);

  try {
    // Delete cash flow projections
    await db.execute(sql`
      DELETE FROM cash_flow_projections WHERE scenarioId IN (
        SELECT id FROM scenario_strategies WHERE cycleId = ${cycleId}
      )
    `);

    // Delete scenario strategies
    await db.execute(sql`
      DELETE FROM scenario_strategies WHERE cycleId = ${cycleId}
    `);

    // Delete budget allocations
    await db.execute(sql`
      DELETE FROM budget_allocations WHERE cycleId = ${cycleId}
    `);

    // Delete analytics cache (if exists)
    await db.execute(sql`
      DELETE FROM cycle_analytics_cache WHERE cycleId = ${cycleId}
    `);

    // Delete the cycle itself
    await db.execute(sql`
      DELETE FROM capital_budget_cycles WHERE id = ${cycleId}
    `);

    await db.execute(sql`COMMIT`);
  } catch (error) {
    await db.execute(sql`ROLLBACK`);
    throw error;
  }
}

export async function archiveCycle(cycleId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.execute(sql`
    UPDATE capital_budget_cycles
    SET status = 'completed', updatedAt = NOW()
    WHERE id = ${cycleId}
  `);
}

export async function setActiveCycle(cycleId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Start transaction
  await db.execute(sql`START TRANSACTION`);

  try {
    // Deactivate all cycles
    await db.execute(sql`
      UPDATE capital_budget_cycles
      SET status = 'approved'
      WHERE status = 'active'
    `);

    // Activate the selected cycle
    await db.execute(sql`
      UPDATE capital_budget_cycles
      SET status = 'active', updatedAt = NOW()
      WHERE id = ${cycleId}
    `);

    await db.execute(sql`COMMIT`);
  } catch (error) {
    await db.execute(sql`ROLLBACK`);
    throw error;
  }
}

export async function getAllocationsForCycle(cycleId: number): Promise<BudgetAllocation[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT ba.*, p.name as projectName, p.description as projectDescription
    FROM budget_allocations ba
    LEFT JOIN projects p ON ba.projectId = p.id
    WHERE ba.cycleId = ${cycleId}
    ORDER BY ba.year, ba.priority
  `);

  return Array.isArray(result[0]) ? result[0] : [];
}

// ============================================================================
// ASSESSMENT INTEGRATION & ANALYTICS
// ============================================================================

interface BacklogFilters {
  facilityId?: number;
  assetCategory?: string;
  severityLevel?: "critical" | "high" | "medium" | "low";
}

export async function calculateBacklogSummary(
  cycleId: number,
  filters?: BacklogFilters
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let whereClause = sql`WHERE d.status != 'resolved'`;

  if (filters?.facilityId) {
    whereClause = sql`${whereClause} AND a.projectId = ${filters.facilityId}`;
  }

  if (filters?.assetCategory) {
    whereClause = sql`${whereClause} AND bc.category = ${filters.assetCategory}`;
  }

  if (filters?.severityLevel) {
    whereClause = sql`${whereClause} AND d.severity = ${filters.severityLevel}`;
  }

  const result = await db.execute(sql`
    SELECT
      COUNT(DISTINCT d.id) as totalDeficiencies,
      SUM(COALESCE(d.estimatedCost, 0)) as totalBacklog,
      SUM(CASE WHEN d.severity = 'critical' THEN COALESCE(d.estimatedCost, 0) ELSE 0 END) as criticalBacklog,
      SUM(CASE WHEN d.severity = 'high' THEN COALESCE(d.estimatedCost, 0) ELSE 0 END) as highBacklog,
      SUM(CASE WHEN d.severity = 'medium' THEN COALESCE(d.estimatedCost, 0) ELSE 0 END) as mediumBacklog,
      SUM(CASE WHEN d.severity = 'low' THEN COALESCE(d.estimatedCost, 0) ELSE 0 END) as lowBacklog
    FROM deficiencies d
    LEFT JOIN assessments ass ON d.assessmentId = ass.id
    LEFT JOIN assets a ON ass.assetId = a.id
    LEFT JOIN building_components bc ON ass.componentId = bc.id
    ${whereClause}
  `);

  const rows = Array.isArray(result[0]) ? result[0] : [];
  return rows.length > 0 ? rows[0] : null;
}

export async function calculateBacklogReductionTrend(cycleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get cycle years
  const cycle = await getCycleById(cycleId);
  if (!cycle) throw new Error("Cycle not found");

  const years: number[] = [];
  for (let year = cycle.startYear; year <= cycle.endYear; year++) {
    years.push(year);
  }

  // Calculate backlog reduction for each year
  const trendData = await Promise.all(
    years.map(async (year) => {
      const result = await db.execute(sql`
        SELECT
          ${year} as year,
          COALESCE(SUM(ba.allocatedAmount), 0) as fundedAmount,
          COUNT(DISTINCT pd.deficiencyId) as deficienciesAddressed,
          COALESCE(SUM(d.estimatedCost), 0) as backlogReduced
        FROM budget_allocations ba
        LEFT JOIN project_deficiencies pd ON ba.projectId = pd.projectId
        LEFT JOIN deficiencies d ON pd.deficiencyId = d.id
        WHERE ba.cycleId = ${cycleId}
          AND ba.year = ${year}
          AND ba.status IN ('approved', 'funded', 'completed')
      `);

      const rows = Array.isArray(result[0]) ? result[0] : [];
      return rows.length > 0 ? rows[0] : { year, fundedAmount: 0, deficienciesAddressed: 0, backlogReduced: 0 };
    })
  );

  // Calculate cumulative reduction
  let cumulativeReduction = 0;
  const trendWithCumulative = trendData.map((data: any) => {
    cumulativeReduction += parseFloat(data.backlogReduced || 0);
    return {
      ...data,
      cumulativeReduction,
    };
  });

  return trendWithCumulative;
}

export async function calculateRiskAnalysis(cycleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Calculate risk before funding
  const beforeResult = await db.execute(sql`
    SELECT
      COUNT(DISTINCT ra.id) as totalRisks,
      AVG(ra.riskScore) as avgRiskScore,
      SUM(CASE WHEN ra.riskLevel = 'critical' THEN 1 ELSE 0 END) as criticalRisks,
      SUM(CASE WHEN ra.riskLevel = 'high' THEN 1 ELSE 0 END) as highRisks,
      SUM(CASE WHEN ra.riskLevel = 'medium' THEN 1 ELSE 0 END) as mediumRisks,
      SUM(CASE WHEN ra.riskLevel = 'low' THEN 1 ELSE 0 END) as lowRisks
    FROM risk_assessments ra
    LEFT JOIN assessments ass ON ra.assessmentId = ass.id
    LEFT JOIN assets a ON ass.assetId = a.id
    WHERE ra.status = 'approved'
  `);

  // Calculate risk after funding (considering funded projects)
  const afterResult = await db.execute(sql`
    SELECT
      COUNT(DISTINCT ra.id) as totalRisks,
      AVG(CASE
        WHEN pd.projectId IS NOT NULL AND ba.status IN ('funded', 'completed') THEN ra.riskScore * 0.3
        ELSE ra.riskScore
      END) as avgRiskScore,
      SUM(CASE
        WHEN (pd.projectId IS NULL OR ba.status NOT IN ('funded', 'completed')) AND ra.riskLevel = 'critical' THEN 1
        ELSE 0
      END) as criticalRisks,
      SUM(CASE
        WHEN (pd.projectId IS NULL OR ba.status NOT IN ('funded', 'completed')) AND ra.riskLevel = 'high' THEN 1
        ELSE 0
      END) as highRisks
    FROM risk_assessments ra
    LEFT JOIN assessments ass ON ra.assessmentId = ass.id
    LEFT JOIN deficiencies d ON d.assessmentId = ass.id
    LEFT JOIN project_deficiencies pd ON pd.deficiencyId = d.id
    LEFT JOIN budget_allocations ba ON ba.projectId = pd.projectId AND ba.cycleId = ${cycleId}
    WHERE ra.status = 'approved'
  `);

  const beforeRows = Array.isArray(beforeResult[0]) ? beforeResult[0] : [];
  const afterRows = Array.isArray(afterResult[0]) ? afterResult[0] : [];

  const before = beforeRows.length > 0 ? beforeRows[0] : null;
  const after = afterRows.length > 0 ? afterRows[0] : null;

  return {
    before,
    after,
    riskReduction: before && after ? parseFloat(before.avgRiskScore) - parseFloat(after.avgRiskScore) : 0,
  };
}

export async function calculateUnfundedCriticalRisks(cycleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(sql`
    SELECT
      d.id as deficiencyId,
      d.title,
      d.description,
      d.severity,
      d.estimatedCost,
      a.name as assetName,
      p.name as facilityName,
      bc.name as componentType,
      ra.riskScore,
      ra.riskLevel,
      ra.pof,
      ra.cof,
      CASE
        WHEN d.lifeSafetyImpact = 1 THEN 'Life Safety'
        WHEN bc.category = 'B2010' THEN 'Envelope Failure'
        WHEN d.complianceIssue = 1 THEN 'Regulatory'
        ELSE 'Operational'
      END as riskDriver
    FROM deficiencies d
    LEFT JOIN assessments ass ON d.assessmentId = ass.id
    LEFT JOIN assets a ON ass.assetId = a.id
    LEFT JOIN projects p ON a.projectId = p.id
    LEFT JOIN building_components bc ON ass.componentId = bc.id
    LEFT JOIN risk_assessments ra ON ra.assessmentId = ass.id
    LEFT JOIN project_deficiencies pd ON pd.deficiencyId = d.id
    LEFT JOIN budget_allocations ba ON ba.projectId = pd.projectId AND ba.cycleId = ${cycleId}
    WHERE d.status != 'resolved'
      AND (
        d.severity = 'critical'
        OR ra.riskLevel IN ('critical', 'high')
        OR d.lifeSafetyImpact = 1
      )
      AND (pd.projectId IS NULL OR ba.status NOT IN ('funded', 'completed'))
    ORDER BY ra.riskScore DESC, d.estimatedCost DESC
    LIMIT 50
  `);

  const rows = Array.isArray(result[0]) ? result[0] : [];

  // Calculate summary
  const totalCount = rows.length;
  const totalValue = rows.reduce((sum: number, row: any) => sum + parseFloat(row.estimatedCost || 0), 0);

  // Group by risk driver
  const driverCounts: Record<string, number> = {};
  rows.forEach((row: any) => {
    const driver = row.riskDriver || "Other";
    driverCounts[driver] = (driverCounts[driver] || 0) + 1;
  });

  return {
    summary: {
      totalCount,
      totalValue,
      topDrivers: Object.entries(driverCounts)
        .map(([driver, count]) => ({ driver, count }))
        .sort((a, b) => b.count - a.count),
    },
    items: rows,
  };
}

// ============================================================================
// PROJECT-DEFICIENCY MAPPING
// ============================================================================

export async function linkProjectToDeficiencies(
  projectId: number,
  deficiencyIds: number[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Insert mappings
  for (const deficiencyId of deficiencyIds) {
    await db.execute(sql`
      INSERT INTO project_deficiencies (projectId, deficiencyId, createdAt)
      VALUES (${projectId}, ${deficiencyId}, NOW())
      ON DUPLICATE KEY UPDATE updatedAt = NOW()
    `);
  }
}

export async function unlinkProjectFromDeficiencies(
  projectId: number,
  deficiencyIds: number[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.execute(sql`
    DELETE FROM project_deficiencies
    WHERE projectId = ${projectId}
      AND deficiencyId IN (${sql.join(deficiencyIds.map(id => sql`${id}`), sql`, `)})
  `);
}

export async function getProjectDeficiencies(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT
      d.*,
      a.name as assetName,
      bc.name as componentName,
      ass.condition as currentCondition
    FROM project_deficiencies pd
    LEFT JOIN deficiencies d ON pd.deficiencyId = d.id
    LEFT JOIN assessments ass ON d.assessmentId = ass.id
    LEFT JOIN assets a ON ass.assetId = a.id
    LEFT JOIN building_components bc ON ass.componentId = bc.id
    WHERE pd.projectId = ${projectId}
    ORDER BY d.severity DESC, d.estimatedCost DESC
  `);

  return Array.isArray(result[0]) ? result[0] : [];
}

// ============================================================================
// ANALYTICS CACHE & REFRESH
// ============================================================================

export async function getCycleAnalytics(cycleId: number) {
  // For now, calculate on-demand
  // In production, this would check cache first
  const backlog = await calculateBacklogSummary(cycleId);
  const trend = await calculateBacklogReductionTrend(cycleId);
  const risk = await calculateRiskAnalysis(cycleId);
  const unfundedRisks = await calculateUnfundedCriticalRisks(cycleId);

  return {
    backlog,
    trend,
    risk,
    unfundedRisks,
    lastUpdated: new Date().toISOString(),
  };
}

export async function invalidateCycleAnalytics(cycleId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Clear analytics cache
  await db.execute(sql`
    DELETE FROM cycle_analytics_cache WHERE cycleId = ${cycleId}
  `);
}
