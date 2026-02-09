import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * Helper function to extract rows from drizzle execute result.
 * Drizzle's db.execute returns [rows, fields] for mysql2, so we need to extract the rows.
 */
function extractRows<T = any>(result: unknown): T[] {
  if (Array.isArray(result) && Array.isArray(result[0])) {
    // Result is [rows, fields], return rows
    return result[0] as T[];
  }
  // Result is already rows array
  return result as T[];
}

export interface PortfolioKPIs {
  portfolioFCI: number;
  portfolioCI: number;
  totalReplacementValue: number;
  totalRepairCosts: number;
  maintenanceBacklog: number;
  deferredMaintenance: number;
  budgetUtilization: number;
  completedProjects: number;
  activeProjects: number;
  criticalDeficiencies: number;
  facilityCount: number;
  componentCount: number;
  assessmentCount: number;
}

export interface FilterOptions {
  buildingClass?: string[];
  systemType?: string[];
  facilityType?: string[];
  department?: string[];
  priorityLevel?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export async function calculatePortfolioKPIs(
  userId: number,
  filters?: FilterOptions
): Promise<PortfolioKPIs> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Build WHERE clauses based on filters
  const whereConditions: string[] = ["p.userId = " + userId];
  
  if (filters?.buildingClass?.length) {
    const classes = filters.buildingClass.map(c => `'${c}'`).join(",");
    whereConditions.push(`p.buildingClass IN (${classes})`);
  }
  
  if (filters?.facilityType?.length) {
    const types = filters.facilityType.map(t => `'${t}'`).join(",");
    whereConditions.push(`p.facilityType IN (${types})`);
  }
  
  if (filters?.department?.length) {
    const depts = filters.department.map(d => `'${d}'`).join(",");
    whereConditions.push(`p.holdingDepartment IN (${depts})`);
  }
  
  if (filters?.dateFrom) {
    whereConditions.push(`p.createdAt >= '${filters.dateFrom.toISOString()}'`);
  }
  
  if (filters?.dateTo) {
    whereConditions.push(`p.createdAt <= '${filters.dateTo.toISOString()}'`);
  }

  const whereClause = whereConditions.join(" AND ");

  // Calculate portfolio-wide metrics
  const portfolioMetrics = await db.execute(sql.raw(`
    SELECT
      SUM(p.currentReplacementValue) as totalReplacementValue,
      SUM(p.deferredMaintenanceCost) as totalRepairCosts,
      COUNT(DISTINCT p.id) as facilityCount,
      SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) as completedProjects,
      SUM(CASE WHEN p.status IN ('in_progress', 'draft') THEN 1 ELSE 0 END) as activeProjects
    FROM projects p
    WHERE ${whereClause}
  `));

  const metricsRows = extractRows(portfolioMetrics);
  const metrics = metricsRows[0] as any || {};
  const totalReplacementValue = parseFloat(metrics.totalReplacementValue || "0");
  const totalRepairCosts = parseFloat(metrics.totalRepairCosts || "0");
  
  // Calculate FCI and CI
  const portfolioFCI = totalReplacementValue > 0 
    ? (totalRepairCosts / totalReplacementValue) * 100 
    : 0;
  const portfolioCI = 100 - portfolioFCI;

  // Get component and assessment counts - assessments link to projects through assets
  // Count unique components assessed (using componentId)
  const componentData = await db.execute(sql.raw(`
    SELECT COUNT(DISTINCT a.componentId) as componentCount
    FROM assessments a
    INNER JOIN assets ast ON a.assetId = ast.id
    INNER JOIN projects p ON ast.projectId = p.id
    WHERE ${whereClause}
  `));

  const assessmentData = await db.execute(sql.raw(`
    SELECT COUNT(*) as assessmentCount
    FROM assessments a
    INNER JOIN assets ast ON a.assetId = ast.id
    INNER JOIN projects p ON ast.projectId = p.id
    WHERE ${whereClause}
  `));

  // Get critical deficiencies count
  const deficiencyData = await db.execute(sql.raw(`
    SELECT COUNT(*) as criticalDeficiencies
    FROM deficiencies d
    INNER JOIN projects p ON d.projectId = p.id
    WHERE ${whereClause} AND d.priority IN ('immediate', 'high')
  `));

  // Calculate maintenance backlog (sum of all identified but not completed maintenance)
  const maintenanceData = await db.execute(sql.raw(`
    SELECT 
      SUM(CASE WHEN me.status IN ('identified', 'planned') THEN me.estimatedCost ELSE 0 END) as maintenanceBacklog,
      SUM(CASE WHEN me.status = 'deferred' THEN me.estimatedCost ELSE 0 END) as deferredMaintenance
    FROM maintenance_entries me
    INNER JOIN projects p ON me.projectId = p.id
    WHERE ${whereClause}
  `));

  const maintenanceRows = extractRows(maintenanceData);
  const maintenance = maintenanceRows[0] as any || {};
  const maintenanceBacklog = parseFloat(maintenance?.maintenanceBacklog || "0");
  const deferredMaintenance = parseFloat(maintenance?.deferredMaintenance || "0");

  // Calculate budget utilization (completed vs planned costs)
  const budgetData = await db.execute(sql.raw(`
    SELECT 
      SUM(CASE WHEN me.status = 'completed' THEN me.actualCost ELSE 0 END) as completedCosts,
      SUM(CASE WHEN me.status IN ('planned', 'approved', 'in_progress') THEN me.estimatedCost ELSE 0 END) as plannedCosts
    FROM maintenance_entries me
    INNER JOIN projects p ON me.projectId = p.id
    WHERE ${whereClause}
  `));

  const budgetRows = extractRows(budgetData);
  const budget = budgetRows[0] as any || {};
  const completedCosts = parseFloat(budget?.completedCosts || "0");
  const plannedCosts = parseFloat(budget?.plannedCosts || "0");
  const budgetUtilization = plannedCosts > 0 ? (completedCosts / plannedCosts) * 100 : 0;

  return {
    portfolioFCI: Math.round(portfolioFCI * 100) / 100,
    portfolioCI: Math.round(portfolioCI * 100) / 100,
    totalReplacementValue: Math.round(totalReplacementValue),
    totalRepairCosts: Math.round(totalRepairCosts),
    maintenanceBacklog: Math.round(maintenanceBacklog),
    deferredMaintenance: Math.round(deferredMaintenance),
    budgetUtilization: Math.round(budgetUtilization * 100) / 100,
    completedProjects: parseInt(metrics.completedProjects || "0"),
    activeProjects: parseInt(metrics.activeProjects || "0"),
    criticalDeficiencies: parseInt((extractRows(deficiencyData)[0] as any)?.criticalDeficiencies || "0"),
    facilityCount: parseInt(metrics.facilityCount || "0"),
    componentCount: parseInt((extractRows(componentData)[0] as any)?.componentCount || "0"),
    assessmentCount: parseInt((extractRows(assessmentData)[0] as any)?.assessmentCount || "0"),
  };
}

export interface TrendData {
  period: string;
  totalCosts: number;
  maintenanceCosts: number;
  capitalCosts: number;
  fci: number;
  ci: number;
}

export async function calculateTrends(
  userId: number,
  periodType: "month" | "quarter" | "year",
  periods: number = 12
): Promise<TrendData[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const dateFormat = periodType === "month" ? "%Y-%m" : "%Y";
  const periodExpr = periodType === "quarter" 
    ? "CONCAT(YEAR(me.dateCompleted), '-Q', QUARTER(me.dateCompleted))" 
    : `DATE_FORMAT(me.dateCompleted, '${dateFormat}')`;

  const result = await db.execute(sql.raw(`
    SELECT 
      ${periodExpr} as period,
      SUM(me.actualCost) as totalCosts,
      SUM(CASE WHEN me.actionType IN ('repair', 'rehabilitate', 'preventive') THEN me.actualCost ELSE 0 END) as maintenanceCosts,
      SUM(CASE WHEN me.actionType IN ('replace', 'upgrade') THEN me.actualCost ELSE 0 END) as capitalCosts
    FROM maintenance_entries me
    INNER JOIN projects p ON me.projectId = p.id
    WHERE p.userId = ${userId} 
      AND me.status = 'completed'
      AND me.dateCompleted IS NOT NULL
      AND me.dateCompleted >= DATE_SUB(NOW(), INTERVAL ${periods} ${periodType.toUpperCase()})
    GROUP BY period
    ORDER BY period ASC
  `));

  // Get FCI/CI trends from KPI snapshots
  const kpiTrends = await db.execute(sql.raw(`
    SELECT 
      DATE_FORMAT(snapshotDate, '${dateFormat}') as period,
      AVG(portfolioFCI) as fci,
      AVG(portfolioCI) as ci
    FROM kpi_snapshots
    WHERE snapshotDate >= DATE_SUB(NOW(), INTERVAL ${periods} ${periodType.toUpperCase()})
    GROUP BY period
    ORDER BY period ASC
  `));

  const kpiMap = new Map(
    extractRows(kpiTrends).map(row => [
      row.period,
      { fci: parseFloat(row.fci || "0"), ci: parseFloat(row.ci || "0") }
    ])
  );

  return extractRows(result).map(row => ({
    period: row.period,
    totalCosts: parseFloat(row.totalCosts || "0"),
    maintenanceCosts: parseFloat(row.maintenanceCosts || "0"),
    capitalCosts: parseFloat(row.capitalCosts || "0"),
    fci: kpiMap.get(row.period)?.fci || 0,
    ci: kpiMap.get(row.period)?.ci || 0,
  }));
}

export interface FacilityComparison {
  projectId: number;
  projectName: string;
  fci: number;
  ci: number;
  replacementValue: number;
  repairCosts: number;
  maintenanceBacklog: number;
  criticalDeficiencies: number;
  portfolioAvgFCI: number;
  portfolioAvgCI: number;
  variance: number; // Difference from portfolio average
}

export async function getFacilityComparisons(
  userId: number,
  filters?: FilterOptions
): Promise<FacilityComparison[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // First get portfolio averages
  const portfolioKPIs = await calculatePortfolioKPIs(userId, filters);

  // Build WHERE clause
  const whereConditions: string[] = ["p.userId = " + userId];
  if (filters?.buildingClass?.length) {
    const classes = filters.buildingClass.map(c => `'${c}'`).join(",");
    whereConditions.push(`p.buildingClass IN (${classes})`);
  }
  const whereClause = whereConditions.join(" AND ");

  // Get facility-level data
  const facilities = await db.execute(sql.raw(`
    SELECT 
      p.id as projectId,
      p.name as projectName,
      p.currentReplacementValue as replacementValue,
      p.deferredMaintenanceCost as repairCosts,
      CASE 
        WHEN p.currentReplacementValue > 0 THEN (p.deferredMaintenanceCost / p.currentReplacementValue) * 100
        ELSE 0
      END as fci,
      CASE 
        WHEN p.currentReplacementValue > 0 THEN 100 - ((p.deferredMaintenanceCost / p.currentReplacementValue) * 100)
        ELSE 100
      END as ci,
      COALESCE(
        (SELECT SUM(me.estimatedCost)
         FROM maintenance_entries me
         WHERE me.projectId = p.id AND me.status IN ('identified', 'planned')),
        0
      ) as maintenanceBacklog,
      COALESCE(
        (SELECT COUNT(*)
         FROM deficiencies d
         WHERE d.projectId = p.id AND d.priority IN ('immediate', 'high')),
        0
      ) as criticalDeficiencies
    FROM projects p
    WHERE ${whereClause}
    ORDER BY fci DESC
  `));

  return extractRows(facilities).map(facility => ({
    projectId: facility.projectId,
    projectName: facility.projectName,
    fci: parseFloat(facility.fci || "0"),
    ci: parseFloat(facility.ci || "0"),
    replacementValue: parseFloat(facility.replacementValue || "0"),
    repairCosts: parseFloat(facility.repairCosts || "0"),
    maintenanceBacklog: parseFloat(facility.maintenanceBacklog || "0"),
    criticalDeficiencies: parseInt(facility.criticalDeficiencies || "0"),
    portfolioAvgFCI: portfolioKPIs.portfolioFCI,
    portfolioAvgCI: portfolioKPIs.portfolioCI,
    variance: parseFloat(facility.fci || "0") - portfolioKPIs.portfolioFCI,
  }));
}
