/**
 * Facility Summary Service
 * 
 * Aggregates operational and financial metrics for facility summary dashboard
 */

import { getDb } from "../db";
import { sql } from "drizzle-orm";

export interface FacilitySummaryData {
  // General condition metrics
  condition: {
    ci: number; // Condition Index (0-100)
    fci: number; // Facility Condition Index (0-1)
    conditionRating: string; // "Excellent", "Good", "Fair", "Poor", "Critical"
    trend: "improving" | "stable" | "declining";
    healthScore: number; // Composite health score (0-100)
  };
  
  // Financial metrics
  financial: {
    identifiedCosts: number; // Total identified deficiencies/deferred maintenance
    plannedCosts: number; // Total planned renovation costs
    executedCosts: number; // Total completed/executed costs
    totalCosts: number; // Sum of all costs
    budgetUtilization: number; // Percentage of planned vs executed
  };
  
  // Lifecycle information
  lifecycle: {
    age: number; // Years since construction
    designLife: number; // Expected design life in years
    remainingYears: number; // Years remaining until end of design life
    endOfLifeDate: string | null; // ISO date string
    lifecycleStage: "new" | "mid_life" | "aging" | "end_of_life";
  };
  
  // Administrative details
  administrative: {
    holdingDepartment: string | null;
    propertyManager: string | null;
    managerEmail: string | null;
    managerPhone: string | null;
    facilityType: string | null;
    occupancyStatus: string | null;
    criticalityLevel: string | null;
  };
  
  // Quick stats
  stats: {
    totalComponents: number;
    componentsByCondition: {
      excellent: number;
      good: number;
      fair: number;
      poor: number;
      critical: number;
    };
    deficienciesByPriority: {
      immediate: number;
      high: number;
      medium: number;
      low: number;
    };
    lastAssessmentDate: string | null;
    totalAssessments: number;
  };
  
  // Action items
  actionItems: {
    upcomingMaintenance: number;
    overdueItems: number;
    criticalDeficiencies: number;
    budgetAlerts: number;
  };
}

/**
 * Calculate condition rating from CI score
 */
function getConditionRating(ci: number): string {
  if (ci >= 90) return "Excellent";
  if (ci >= 75) return "Good";
  if (ci >= 60) return "Fair";
  if (ci >= 40) return "Poor";
  return "Critical";
}

/**
 * Calculate lifecycle stage
 */
function getLifecycleStage(age: number, designLife: number): FacilitySummaryData["lifecycle"]["lifecycleStage"] {
  const lifePercent = (age / designLife) * 100;
  
  if (lifePercent < 25) return "new";
  if (lifePercent < 60) return "mid_life";
  if (lifePercent < 85) return "aging";
  return "end_of_life";
}

/**
 * Calculate facility health score (composite metric)
 * Factors: CI (40%), FCI (30%), Age (20%), Deficiency Count (10%)
 */
function calculateHealthScore(
  ci: number,
  fci: number,
  agePercent: number,
  deficiencyRatio: number
): number {
  // CI contribution (0-100, higher is better) - 40%
  const ciScore = ci * 0.4;
  
  // FCI contribution (0-1, lower is better, invert for score) - 30%
  const fciScore = (1 - Math.min(1, fci)) * 100 * 0.3;
  
  // Age contribution (0-100%, lower is better, invert for score) - 20%
  const ageScore = (1 - Math.min(1, agePercent / 100)) * 100 * 0.2;
  
  // Deficiency contribution (ratio of critical/high deficiencies, lower is better) - 10%
  const deficiencyScore = (1 - Math.min(1, deficiencyRatio)) * 100 * 0.1;
  
  const healthScore = ciScore + fciScore + ageScore + deficiencyScore;
  
  return Math.round(Math.min(100, Math.max(0, healthScore)));
}

/**
 * Determine condition trend based on historical CI/FCI data
 */
async function calculateConditionTrend(projectId: number): Promise<"improving" | "stable" | "declining"> {
  const db = await getDb();
  if (!db) return "stable";
  
  try {
    // Get last 3 CI/FCI snapshots
    const snapshots = await db.execute(sql`
      SELECT ci, fci, snapshotDate
      FROM ci_fci_snapshots
      WHERE projectId = ${projectId}
      AND level = 'building'
      ORDER BY snapshotDate DESC
      LIMIT 3
    `);
    
    const rows = Array.isArray(snapshots[0]) ? snapshots[0] : [];
    
    if (rows.length < 2) return "stable";
    
    // Calculate CI trend
    const ciValues = rows.map((r: any) => parseFloat(r.ci || "0"));
    const ciTrend = ciValues[0] - ciValues[ciValues.length - 1];
    
    // Calculate FCI trend (lower is better, so invert)
    const fciValues = rows.map((r: any) => parseFloat(r.fci || "0"));
    const fciTrend = fciValues[fciValues.length - 1] - fciValues[0];
    
    // Combined trend
    const combinedTrend = ciTrend + (fciTrend * 100); // Scale FCI to match CI range
    
    if (combinedTrend > 2) return "improving";
    if (combinedTrend < -2) return "declining";
    return "stable";
  } catch (error) {
    console.error("[FacilitySummary] Error calculating trend:", error);
    return "stable";
  }
}

/**
 * Get facility summary data
 */
export async function getFacilitySummary(projectId: number): Promise<FacilitySummaryData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get project data
  const projectResult = await db.execute(sql`
    SELECT 
      ci, fci, deferredMaintenanceCost, currentReplacementValue,
      yearBuilt, designLife, endOfLifeDate,
      holdingDepartment, propertyManager, managerEmail, managerPhone,
      facilityType, occupancyStatus, criticalityLevel
    FROM projects
    WHERE id = ${projectId}
    LIMIT 1
  `);
  
  const project = Array.isArray(projectResult[0]) && projectResult[0].length > 0 ? projectResult[0][0] : null;
  
  if (!project) {
    throw new Error("Project not found");
  }
  
  const ci = parseFloat(project.ci || "0");
  const fci = parseFloat(project.fci || "0");
  const yearBuilt = project.yearBuilt || new Date().getFullYear();
  const designLife = project.designLife || 50; // Default 50 years
  const currentYear = new Date().getFullYear();
  const age = currentYear - yearBuilt;
  const remainingYears = Math.max(0, designLife - age);
  
  // Calculate end of life date if not set
  let endOfLifeDate = project.endOfLifeDate;
  if (!endOfLifeDate && yearBuilt) {
    const eolYear = yearBuilt + designLife;
    endOfLifeDate = new Date(eolYear, 0, 1).toISOString();
  }
  
  // Get financial metrics
  const financialResult = await db.execute(sql`
    SELECT 
      costType,
      SUM(amount) as totalAmount
    FROM renovation_costs
    WHERE projectId = ${projectId}
    GROUP BY costType
  `);
  
  const financialRows = Array.isArray(financialResult[0]) ? financialResult[0] : [];
  const identifiedCosts = parseFloat(project.deferredMaintenanceCost || "0");
  const plannedCosts = financialRows.find((r: any) => r.costType === "planned")?.totalAmount || 0;
  const executedCosts = financialRows.find((r: any) => r.costType === "executed")?.totalAmount || 0;
  const totalCosts = identifiedCosts + parseFloat(plannedCosts) + parseFloat(executedCosts);
  const budgetUtilization = plannedCosts > 0 ? (parseFloat(executedCosts) / parseFloat(plannedCosts)) * 100 : 0;
  
  // Get component statistics
  const componentStatsResult = await db.execute(sql`
    SELECT 
      COUNT(*) as totalComponents,
      SUM(CASE WHEN conditionRating = 'Excellent' THEN 1 ELSE 0 END) as excellent,
      SUM(CASE WHEN conditionRating = 'Good' THEN 1 ELSE 0 END) as good,
      SUM(CASE WHEN conditionRating = 'Fair' THEN 1 ELSE 0 END) as fair,
      SUM(CASE WHEN conditionRating = 'Poor' THEN 1 ELSE 0 END) as poor,
      SUM(CASE WHEN conditionRating = 'Critical' THEN 1 ELSE 0 END) as critical
    FROM assessments
    WHERE projectId = ${projectId}
  `);
  
  const componentStats = Array.isArray(componentStatsResult[0]) && componentStatsResult[0].length > 0 
    ? componentStatsResult[0][0] 
    : null;
  
  // Get deficiency statistics
  const deficiencyStatsResult = await db.execute(sql`
    SELECT 
      SUM(CASE WHEN priority = 'immediate' THEN 1 ELSE 0 END) as immediate,
      SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high,
      SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium,
      SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low
    FROM deficiencies
    WHERE assessmentId IN (SELECT id FROM assessments WHERE projectId = ${projectId})
  `);
  
  const deficiencyStats = Array.isArray(deficiencyStatsResult[0]) && deficiencyStatsResult[0].length > 0
    ? deficiencyStatsResult[0][0]
    : null;
  
  // Get assessment activity
  const assessmentActivityResult = await db.execute(sql`
    SELECT 
      MAX(assessmentDate) as lastAssessmentDate,
      COUNT(*) as totalAssessments
    FROM assessments
    WHERE projectId = ${projectId}
  `);
  
  const assessmentActivity = Array.isArray(assessmentActivityResult[0]) && assessmentActivityResult[0].length > 0
    ? assessmentActivityResult[0][0]
    : null;
  
  // Calculate action items
  const criticalDeficiencies = Number(deficiencyStats?.immediate || 0) + Number(deficiencyStats?.high || 0);
  const upcomingMaintenance = 0; // TODO: Implement maintenance schedule tracking
  const overdueItems = 0; // TODO: Implement overdue tracking
  const budgetAlerts = fci > 0.1 ? 1 : 0; // Alert if FCI > 10%
  
  // Calculate condition trend
  const trend = await calculateConditionTrend(projectId);
  
  // Calculate health score
  const agePercent = (age / designLife) * 100;
  const totalComponents = Number(componentStats?.totalComponents || 0);
  const criticalComponents = Number(componentStats?.critical || 0) + Number(componentStats?.poor || 0);
  const deficiencyRatio = totalComponents > 0 ? criticalComponents / totalComponents : 0;
  const healthScore = calculateHealthScore(ci, fci, agePercent, deficiencyRatio);
  
  return {
    condition: {
      ci,
      fci,
      conditionRating: getConditionRating(ci),
      trend,
      healthScore,
    },
    financial: {
      identifiedCosts,
      plannedCosts: parseFloat(plannedCosts),
      executedCosts: parseFloat(executedCosts),
      totalCosts,
      budgetUtilization: Math.round(budgetUtilization),
    },
    lifecycle: {
      age,
      designLife,
      remainingYears,
      endOfLifeDate: endOfLifeDate ? new Date(endOfLifeDate).toISOString() : null,
      lifecycleStage: getLifecycleStage(age, designLife),
    },
    administrative: {
      holdingDepartment: project.holdingDepartment || null,
      propertyManager: project.propertyManager || null,
      managerEmail: project.managerEmail || null,
      managerPhone: project.managerPhone || null,
      facilityType: project.facilityType || null,
      occupancyStatus: project.occupancyStatus || null,
      criticalityLevel: project.criticalityLevel || null,
    },
    stats: {
      totalComponents: Number(componentStats?.totalComponents || 0),
      componentsByCondition: {
        excellent: Number(componentStats?.excellent || 0),
        good: Number(componentStats?.good || 0),
        fair: Number(componentStats?.fair || 0),
        poor: Number(componentStats?.poor || 0),
        critical: Number(componentStats?.critical || 0),
      },
      deficienciesByPriority: {
        immediate: Number(deficiencyStats?.immediate || 0),
        high: Number(deficiencyStats?.high || 0),
        medium: Number(deficiencyStats?.medium || 0),
        low: Number(deficiencyStats?.low || 0),
      },
      lastAssessmentDate: assessmentActivity?.lastAssessmentDate 
        ? new Date(assessmentActivity.lastAssessmentDate).toISOString()
        : null,
      totalAssessments: Number(assessmentActivity?.totalAssessments || 0),
    },
    actionItems: {
      upcomingMaintenance,
      overdueItems,
      criticalDeficiencies,
      budgetAlerts,
    },
  };
}
