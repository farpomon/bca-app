import { eq, and, sql } from "drizzle-orm";
import { getDb } from "./db";
import { assessments, buildingComponents } from "../drizzle/schema";

// UNIFORMAT Level 1 groups for financial planning
const UNIFORMAT_GROUPS = {
  A: "Substructure",
  B: "Shell",
  C: "Interiors",
  D: "Services (MEP)",
  E: "Equipment & Furnishings",
  F: "Special Construction",
  G: "Site",
};

export interface FinancialPlanningData {
  groups: Array<{
    code: string;
    name: string;
    periods: number[]; // Costs for each 5-year period
    total: number;
  }>;
  periods: Array<{
    label: string;
    start: number;
    end: number;
  }>;
  grandTotal: number;
}

export interface ConditionMatrixData {
  systems: Array<{
    code: string;
    name: string;
    condition: "good" | "fair" | "poor" | "not_assessed";
    componentCount: number;
    estimatedCost: number;
  }>;
}

/**
 * Get financial planning data grouped by UNIFORMAT Level 1 over 5-year periods
 */
export async function getFinancialPlanningData(projectId: number): Promise<FinancialPlanningData> {
  const db = await getDb();
  if (!db) {
    return { groups: [], periods: [], grandTotal: 0 };
  }

  const currentYear = new Date().getFullYear();
  const periods = [
    { label: `${currentYear}-${currentYear + 4}`, start: currentYear, end: currentYear + 4 },
    { label: `${currentYear + 5}-${currentYear + 9}`, start: currentYear + 5, end: currentYear + 9 },
    { label: `${currentYear + 10}-${currentYear + 14}`, start: currentYear + 10, end: currentYear + 14 },
    { label: `${currentYear + 15}+`, start: currentYear + 15, end: 9999 },
  ];

  // Get all assessments with action years and costs
  const projectAssessments = await db
    .select({
      componentCode: assessments.componentCode,
      actionYear: assessments.actionYear,
      estimatedRepairCost: assessments.estimatedRepairCost,
    })
    .from(assessments)
    .where(eq(assessments.projectId, projectId));

  // Group by UNIFORMAT Level 1 (first letter of component code)
  const groups = Object.entries(UNIFORMAT_GROUPS).map(([code, name]) => {
    const groupAssessments = projectAssessments.filter(
      (a) => a.componentCode && a.componentCode.startsWith(code)
    );

    const periodCosts = periods.map((period) => {
      return groupAssessments
        .filter(
          (a) =>
            a.actionYear &&
            a.actionYear >= period.start &&
            a.actionYear <= period.end
        )
        .reduce((sum, a) => sum + (a.estimatedRepairCost || 0), 0);
    });

    const total = periodCosts.reduce((sum, cost) => sum + cost, 0);

    return {
      code,
      name,
      periods: periodCosts,
      total,
    };
  }).filter((group) => group.total > 0); // Only include groups with costs

  const grandTotal = groups.reduce((sum, group) => sum + group.total, 0);

  return {
    groups,
    periods,
    grandTotal,
  };
}

/**
 * Get condition matrix data showing condition summary by major building systems
 */
export async function getConditionMatrixData(projectId: number): Promise<ConditionMatrixData> {
  const db = await getDb();
  if (!db) {
    return { systems: [] };
  }

  // Get all assessments for the project
  const projectAssessments = await db
    .select()
    .from(assessments)
    .where(eq(assessments.projectId, projectId));

  // Group by UNIFORMAT Level 1
  const systems = Object.entries(UNIFORMAT_GROUPS).map(([code, name]) => {
    const systemAssessments = projectAssessments.filter((a) =>
      a.componentCode && a.componentCode.startsWith(code)
    );

    if (systemAssessments.length === 0) {
      return null;
    }

    // Calculate average condition (weighted by count)
    const conditionCounts = {
      good: systemAssessments.filter((a) => a.condition === "good").length,
      fair: systemAssessments.filter((a) => a.condition === "fair").length,
      poor: systemAssessments.filter((a) => a.condition === "poor").length,
      not_assessed: systemAssessments.filter((a) => a.condition === "not_assessed").length,
    };

    // Determine overall condition (worst condition wins)
    let overallCondition: "good" | "fair" | "poor" | "not_assessed" = "good";
    if (conditionCounts.poor > 0) {
      overallCondition = "poor";
    } else if (conditionCounts.fair > 0) {
      overallCondition = "fair";
    } else if (conditionCounts.not_assessed === systemAssessments.length) {
      overallCondition = "not_assessed";
    }

    const totalCost = systemAssessments.reduce(
      (sum, a) => sum + (a.estimatedRepairCost || 0),
      0
    );

    return {
      code,
      name,
      condition: overallCondition,
      componentCount: systemAssessments.length,
      estimatedCost: totalCost,
    };
  }).filter((system) => system !== null) as ConditionMatrixData["systems"];

  return { systems };
}

/**
 * Get annual cost breakdown for chart visualization
 */
export async function getAnnualCostBreakdown(projectId: number, years: number = 20) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const currentYear = new Date().getFullYear();
  
  const projectAssessments = await db
    .select({
      actionYear: assessments.actionYear,
      estimatedRepairCost: assessments.estimatedRepairCost,
    })
    .from(assessments)
    .where(eq(assessments.projectId, projectId));

  return Array.from({ length: years }, (_, i) => {
    const year = currentYear + i;
    const cost = projectAssessments
      .filter((a) => a.actionYear === year)
      .reduce((sum, a) => sum + (a.estimatedRepairCost || 0), 0);

    return {
      year: year.toString(),
      cost,
    };
  }).filter((d) => d.cost > 0);
}
