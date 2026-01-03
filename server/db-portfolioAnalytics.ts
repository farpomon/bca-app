/**
 * Database functions for Portfolio-Wide Analytics
 * 
 * Provides comprehensive cross-portfolio analysis including:
 * - Portfolio overview metrics
 * - Condition distribution analysis
 * - Cost breakdown by category, priority, and building
 * - Building comparison metrics
 * - Geographic distribution
 * - Property type analysis
 * - Deficiency trends over time
 */

import { eq, and, sql, inArray, desc, asc, gte, lte } from "drizzle-orm";
import { getDb } from "./db";
import {
  projects,
  assets,
  assessments,
  deficiencies,
} from "../drizzle/schema";
import {
  calculateFCI,
  getFCIRating,
  getConditionScore,
  getConditionRating,
} from "./portfolioReportCalculations";

// ============================================================================
// Types
// ============================================================================

export interface PortfolioOverview {
  totalBuildings: number;
  totalAssets: number;
  totalAssessments: number;
  totalDeficiencies: number;
  totalCurrentReplacementValue: number;
  totalDeferredMaintenance: number;
  portfolioFCI: number;
  portfolioFCIRating: string;
  averageConditionScore: number;
  averageConditionRating: string;
  averageBuildingAge: number;
  immediateNeeds: number;
  shortTermNeeds: number;
  mediumTermNeeds: number;
  longTermNeeds: number;
  criticalDeficiencies: number;
  highPriorityDeficiencies: number;
}

export interface ConditionDistribution {
  condition: string;
  count: number;
  percentage: number;
  totalCost: number;
}

export interface CategoryCostBreakdown {
  categoryCode: string;
  categoryName: string;
  totalRepairCost: number;
  totalReplacementValue: number;
  assessmentCount: number;
  deficiencyCount: number;
  averageCondition: string;
  fci: number;
  percentage: number;
}

export interface BuildingComparison {
  projectId: number;
  projectName: string;
  address: string | null;
  city: string | null;
  province: string | null;
  propertyType: string | null;
  yearBuilt: number | null;
  buildingAge: number;
  assetCount: number;
  assessmentCount: number;
  deficiencyCount: number;
  currentReplacementValue: number;
  deferredMaintenanceCost: number;
  fci: number;
  fciRating: string;
  conditionScore: number;
  conditionRating: string;
  immediateNeeds: number;
  shortTermNeeds: number;
  priorityScore: number;
}

export interface GeographicDistribution {
  city: string;
  province: string;
  buildingCount: number;
  totalCRV: number;
  totalDeferredMaintenance: number;
  averageFCI: number;
  totalDeficiencies: number;
}

export interface PropertyTypeDistribution {
  propertyType: string;
  buildingCount: number;
  totalCRV: number;
  totalDeferredMaintenance: number;
  averageFCI: number;
  averageAge: number;
  totalDeficiencies: number;
}

export interface DeficiencyTrend {
  period: string;
  totalDeficiencies: number;
  immediateCount: number;
  shortTermCount: number;
  mediumTermCount: number;
  longTermCount: number;
  totalCost: number;
  resolvedCount: number;
}

export interface PriorityBreakdown {
  priority: string;
  count: number;
  totalCost: number;
  percentage: number;
  buildings: string[];
}

// ============================================================================
// UNIFORMAT II Category Mapping
// ============================================================================

const UNIFORMAT_CATEGORIES: Record<string, string> = {
  'A': 'Substructure',
  'B': 'Shell',
  'C': 'Interiors',
  'D': 'Services',
  'E': 'Equipment & Furnishings',
  'F': 'Special Construction',
  'G': 'Building Sitework',
  'Z': 'General',
};

function getCategoryFromCode(code: string | null): { code: string; name: string } {
  if (!code) return { code: 'Z', name: 'General' };
  const firstChar = code.charAt(0).toUpperCase();
  return {
    code: firstChar,
    name: UNIFORMAT_CATEGORIES[firstChar] || 'General'
  };
}

// ============================================================================
// Portfolio Overview
// ============================================================================

export async function getPortfolioOverview(
  userId: number,
  company: string | null,
  isAdmin: boolean
): Promise<PortfolioOverview> {
  const db = await getDb();
  if (!db) {
    return getEmptyOverview();
  }

  const currentYear = new Date().getFullYear();

  // Build base query conditions
  let projectConditions = isAdmin
    ? company ? sql`p.company = ${company}` : sql`1=1`
    : company
      ? sql`(p.userId = ${userId} OR p.company = ${company})`
      : sql`p.userId = ${userId}`;

  // Get project metrics
  const projectMetrics = await db.execute(sql`
    SELECT 
      COUNT(DISTINCT p.id) as totalBuildings,
      SUM(COALESCE(p.currentReplacementValue, 0)) as totalCRV,
      SUM(COALESCE(p.deferredMaintenanceCost, 0)) as totalDMC,
      AVG(CASE WHEN p.yearBuilt > 0 THEN ${currentYear} - p.yearBuilt ELSE NULL END) as avgAge
    FROM projects p
    WHERE ${projectConditions}
  `);

  const pm = (projectMetrics as any[])[0] || {};
  const totalCRV = parseFloat(pm.totalCRV || '0');
  const totalDMC = parseFloat(pm.totalDMC || '0');
  const portfolioFCI = totalCRV > 0 ? (totalDMC / totalCRV) * 100 : 0;

  // Get asset count
  const assetMetrics = await db.execute(sql`
    SELECT COUNT(DISTINCT a.id) as totalAssets
    FROM assets a
    INNER JOIN projects p ON a.projectId = p.id
    WHERE ${projectConditions}
  `);

  // Get assessment metrics
  const assessmentMetrics = await db.execute(sql`
    SELECT 
      COUNT(DISTINCT ass.id) as totalAssessments,
      AVG(CASE 
        WHEN ass.condition = 'good' THEN 85
        WHEN ass.condition = 'fair' THEN 65
        WHEN ass.condition = 'poor' THEN 35
        ELSE 50
      END) as avgConditionScore
    FROM assessments ass
    INNER JOIN projects p ON ass.projectId = p.id
    WHERE ${projectConditions}
  `);

  // Get deficiency metrics
  const deficiencyMetrics = await db.execute(sql`
    SELECT 
      COUNT(DISTINCT d.id) as totalDeficiencies,
      SUM(CASE WHEN d.priority = 'immediate' THEN COALESCE(d.estimatedCost, 0) ELSE 0 END) as immediateNeeds,
      SUM(CASE WHEN d.priority = 'short_term' THEN COALESCE(d.estimatedCost, 0) ELSE 0 END) as shortTermNeeds,
      SUM(CASE WHEN d.priority = 'medium_term' THEN COALESCE(d.estimatedCost, 0) ELSE 0 END) as mediumTermNeeds,
      SUM(CASE WHEN d.priority = 'long_term' THEN COALESCE(d.estimatedCost, 0) ELSE 0 END) as longTermNeeds,
      SUM(CASE WHEN d.priority = 'immediate' THEN 1 ELSE 0 END) as criticalCount,
      SUM(CASE WHEN d.priority = 'short_term' THEN 1 ELSE 0 END) as highPriorityCount
    FROM deficiencies d
    INNER JOIN projects p ON d.projectId = p.id
    WHERE ${projectConditions}
  `);

  const am = (assetMetrics as any[])[0] || {};
  const assm = (assessmentMetrics as any[])[0] || {};
  const dm = (deficiencyMetrics as any[])[0] || {};

  const avgConditionScore = parseFloat(assm.avgConditionScore || '50');

  return {
    totalBuildings: parseInt(pm.totalBuildings || '0'),
    totalAssets: parseInt(am.totalAssets || '0'),
    totalAssessments: parseInt(assm.totalAssessments || '0'),
    totalDeficiencies: parseInt(dm.totalDeficiencies || '0'),
    totalCurrentReplacementValue: totalCRV,
    totalDeferredMaintenance: totalDMC,
    portfolioFCI: Math.round(portfolioFCI * 100) / 100,
    portfolioFCIRating: getFCIRating(portfolioFCI),
    averageConditionScore: Math.round(avgConditionScore),
    averageConditionRating: getConditionRating(avgConditionScore),
    averageBuildingAge: Math.round(parseFloat(pm.avgAge || '0')),
    immediateNeeds: parseFloat(dm.immediateNeeds || '0'),
    shortTermNeeds: parseFloat(dm.shortTermNeeds || '0'),
    mediumTermNeeds: parseFloat(dm.mediumTermNeeds || '0'),
    longTermNeeds: parseFloat(dm.longTermNeeds || '0'),
    criticalDeficiencies: parseInt(dm.criticalCount || '0'),
    highPriorityDeficiencies: parseInt(dm.highPriorityCount || '0'),
  };
}

function getEmptyOverview(): PortfolioOverview {
  return {
    totalBuildings: 0,
    totalAssets: 0,
    totalAssessments: 0,
    totalDeficiencies: 0,
    totalCurrentReplacementValue: 0,
    totalDeferredMaintenance: 0,
    portfolioFCI: 0,
    portfolioFCIRating: 'N/A',
    averageConditionScore: 0,
    averageConditionRating: 'N/A',
    averageBuildingAge: 0,
    immediateNeeds: 0,
    shortTermNeeds: 0,
    mediumTermNeeds: 0,
    longTermNeeds: 0,
    criticalDeficiencies: 0,
    highPriorityDeficiencies: 0,
  };
}

// ============================================================================
// Condition Distribution
// ============================================================================

export async function getConditionDistribution(
  userId: number,
  company: string | null,
  isAdmin: boolean
): Promise<ConditionDistribution[]> {
  const db = await getDb();
  if (!db) return [];

  let projectConditions = isAdmin
    ? company ? sql`p.company = ${company}` : sql`1=1`
    : company
      ? sql`(p.userId = ${userId} OR p.company = ${company})`
      : sql`p.userId = ${userId}`;

  const result = await db.execute(sql`
    SELECT 
      COALESCE(ass.condition, 'not_assessed') as condition,
      COUNT(*) as count,
      SUM(COALESCE(ass.estimatedRepairCost, 0)) as totalCost
    FROM assessments ass
    INNER JOIN projects p ON ass.projectId = p.id
    WHERE ${projectConditions}
    GROUP BY COALESCE(ass.condition, 'not_assessed')
    ORDER BY count DESC
  `);

  const rows = result as any[];
  const total = rows.reduce((sum, r) => sum + parseInt(r.count || '0'), 0);

  return rows.map(row => ({
    condition: row.condition || 'not_assessed',
    count: parseInt(row.count || '0'),
    percentage: total > 0 ? Math.round((parseInt(row.count || '0') / total) * 100) : 0,
    totalCost: parseFloat(row.totalCost || '0'),
  }));
}

// ============================================================================
// Category Cost Breakdown
// ============================================================================

export async function getCategoryCostBreakdown(
  userId: number,
  company: string | null,
  isAdmin: boolean
): Promise<CategoryCostBreakdown[]> {
  const db = await getDb();
  if (!db) return [];

  let projectConditions = isAdmin
    ? company ? sql`p.company = ${company}` : sql`1=1`
    : company
      ? sql`(p.userId = ${userId} OR p.company = ${company})`
      : sql`p.userId = ${userId}`;

  const result = await db.execute(sql`
    SELECT 
      UPPER(SUBSTRING(COALESCE(ass.componentCode, 'Z'), 1, 1)) as categoryCode,
      COUNT(DISTINCT ass.id) as assessmentCount,
      SUM(COALESCE(ass.estimatedRepairCost, 0)) as totalRepairCost,
      SUM(COALESCE(ass.replacementValue, 0)) as totalReplacementValue,
      AVG(CASE 
        WHEN ass.condition = 'good' THEN 85
        WHEN ass.condition = 'fair' THEN 65
        WHEN ass.condition = 'poor' THEN 35
        ELSE 50
      END) as avgConditionScore
    FROM assessments ass
    INNER JOIN projects p ON ass.projectId = p.id
    WHERE ${projectConditions}
    GROUP BY UPPER(SUBSTRING(COALESCE(ass.componentCode, 'Z'), 1, 1))
    ORDER BY totalRepairCost DESC
  `);

  // Get deficiency counts per category
  const deficiencyResult = await db.execute(sql`
    SELECT 
      UPPER(SUBSTRING(COALESCE(d.componentCode, 'Z'), 1, 1)) as categoryCode,
      COUNT(*) as deficiencyCount
    FROM deficiencies d
    INNER JOIN projects p ON d.projectId = p.id
    WHERE ${projectConditions}
    GROUP BY UPPER(SUBSTRING(COALESCE(d.componentCode, 'Z'), 1, 1))
  `);

  const deficiencyMap = new Map(
    (deficiencyResult as any[]).map(r => [r.categoryCode, parseInt(r.deficiencyCount || '0')])
  );

  const rows = result as any[];
  const totalRepairCost = rows.reduce((sum, r) => sum + parseFloat(r.totalRepairCost || '0'), 0);

  return rows.map(row => {
    const repairCost = parseFloat(row.totalRepairCost || '0');
    const replacementValue = parseFloat(row.totalReplacementValue || '0');
    const fci = replacementValue > 0 ? (repairCost / replacementValue) * 100 : 0;
    const avgScore = parseFloat(row.avgConditionScore || '50');

    return {
      categoryCode: row.categoryCode || 'Z',
      categoryName: UNIFORMAT_CATEGORIES[row.categoryCode] || 'General',
      totalRepairCost: repairCost,
      totalReplacementValue: replacementValue,
      assessmentCount: parseInt(row.assessmentCount || '0'),
      deficiencyCount: deficiencyMap.get(row.categoryCode) || 0,
      averageCondition: getConditionRating(avgScore),
      fci: Math.round(fci * 100) / 100,
      percentage: totalRepairCost > 0 ? Math.round((repairCost / totalRepairCost) * 100) : 0,
    };
  });
}

// ============================================================================
// Building Comparison
// ============================================================================

export async function getBuildingComparison(
  userId: number,
  company: string | null,
  isAdmin: boolean,
  sortBy: string = 'fci',
  sortOrder: 'asc' | 'desc' = 'desc',
  limit: number = 50
): Promise<BuildingComparison[]> {
  const db = await getDb();
  if (!db) return [];

  const currentYear = new Date().getFullYear();

  let projectConditions = isAdmin
    ? company ? sql`p.company = ${company}` : sql`1=1`
    : company
      ? sql`(p.userId = ${userId} OR p.company = ${company})`
      : sql`p.userId = ${userId}`;

  // Get all projects with their metrics
  const projectsResult = await db.execute(sql`
    SELECT 
      p.id as projectId,
      p.name as projectName,
      p.address,
      p.city,
      p.province,
      p.propertyType,
      p.yearBuilt,
      COALESCE(p.currentReplacementValue, 0) as crv,
      COALESCE(p.deferredMaintenanceCost, 0) as dmc
    FROM projects p
    WHERE ${projectConditions}
  `);

  const projectRows = projectsResult as any[];
  const projectIds = projectRows.map(p => p.projectId);

  if (projectIds.length === 0) return [];

  // Get asset counts
  const assetCounts = await db.execute(sql`
    SELECT projectId, COUNT(*) as count
    FROM assets
    WHERE projectId IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})
    GROUP BY projectId
  `);
  const assetMap = new Map((assetCounts as any[]).map(r => [r.projectId, parseInt(r.count || '0')]));

  // Get assessment counts and condition scores
  const assessmentData = await db.execute(sql`
    SELECT 
      projectId, 
      COUNT(*) as count,
      AVG(CASE 
        WHEN condition = 'good' THEN 85
        WHEN condition = 'fair' THEN 65
        WHEN condition = 'poor' THEN 35
        ELSE 50
      END) as avgConditionScore
    FROM assessments
    WHERE projectId IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})
    GROUP BY projectId
  `);
  const assessmentMap = new Map((assessmentData as any[]).map(r => [
    r.projectId, 
    { count: parseInt(r.count || '0'), avgScore: parseFloat(r.avgConditionScore || '50') }
  ]));

  // Get deficiency data
  const deficiencyData = await db.execute(sql`
    SELECT 
      projectId,
      COUNT(*) as count,
      SUM(CASE WHEN priority = 'immediate' THEN COALESCE(estimatedCost, 0) ELSE 0 END) as immediateNeeds,
      SUM(CASE WHEN priority = 'short_term' THEN COALESCE(estimatedCost, 0) ELSE 0 END) as shortTermNeeds
    FROM deficiencies
    WHERE projectId IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})
    GROUP BY projectId
  `);
  const deficiencyMap = new Map((deficiencyData as any[]).map(r => [
    r.projectId,
    {
      count: parseInt(r.count || '0'),
      immediateNeeds: parseFloat(r.immediateNeeds || '0'),
      shortTermNeeds: parseFloat(r.shortTermNeeds || '0'),
    }
  ]));

  // Build comparison data
  const comparisons: BuildingComparison[] = projectRows.map(p => {
    const crv = parseFloat(p.crv || '0');
    const dmc = parseFloat(p.dmc || '0');
    const fci = crv > 0 ? (dmc / crv) * 100 : 0;
    const buildingAge = p.yearBuilt ? currentYear - p.yearBuilt : 0;
    const assessmentInfo = assessmentMap.get(p.projectId) || { count: 0, avgScore: 50 };
    const deficiencyInfo = deficiencyMap.get(p.projectId) || { count: 0, immediateNeeds: 0, shortTermNeeds: 0 };

    // Calculate priority score
    const totalNeeds = deficiencyInfo.immediateNeeds + deficiencyInfo.shortTermNeeds;
    const immediateRatio = totalNeeds > 0 ? deficiencyInfo.immediateNeeds / totalNeeds : 0;
    const priorityScore = Math.round(
      Math.min(fci / 30, 1) * 40 +
      immediateRatio * 25 +
      Math.min(buildingAge / 50, 1) * 20 +
      Math.min(deficiencyInfo.count / 20, 1) * 15
    );

    return {
      projectId: p.projectId,
      projectName: p.projectName,
      address: p.address,
      city: p.city,
      province: p.province,
      propertyType: p.propertyType,
      yearBuilt: p.yearBuilt,
      buildingAge,
      assetCount: assetMap.get(p.projectId) || 0,
      assessmentCount: assessmentInfo.count,
      deficiencyCount: deficiencyInfo.count,
      currentReplacementValue: crv,
      deferredMaintenanceCost: dmc,
      fci: Math.round(fci * 100) / 100,
      fciRating: getFCIRating(fci),
      conditionScore: Math.round(assessmentInfo.avgScore),
      conditionRating: getConditionRating(assessmentInfo.avgScore),
      immediateNeeds: deficiencyInfo.immediateNeeds,
      shortTermNeeds: deficiencyInfo.shortTermNeeds,
      priorityScore,
    };
  });

  // Sort
  comparisons.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'fci': comparison = a.fci - b.fci; break;
      case 'conditionScore': comparison = a.conditionScore - b.conditionScore; break;
      case 'deferredMaintenanceCost': comparison = a.deferredMaintenanceCost - b.deferredMaintenanceCost; break;
      case 'priorityScore': comparison = a.priorityScore - b.priorityScore; break;
      case 'name': comparison = a.projectName.localeCompare(b.projectName); break;
      case 'buildingAge': comparison = a.buildingAge - b.buildingAge; break;
      default: comparison = a.fci - b.fci;
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  return comparisons.slice(0, limit);
}

// ============================================================================
// Geographic Distribution
// ============================================================================

export async function getGeographicDistribution(
  userId: number,
  company: string | null,
  isAdmin: boolean
): Promise<GeographicDistribution[]> {
  const db = await getDb();
  if (!db) return [];

  let projectConditions = isAdmin
    ? company ? sql`p.company = ${company}` : sql`1=1`
    : company
      ? sql`(p.userId = ${userId} OR p.company = ${company})`
      : sql`p.userId = ${userId}`;

  const result = await db.execute(sql`
    SELECT 
      COALESCE(p.city, 'Unknown') as city,
      COALESCE(p.province, 'Unknown') as province,
      COUNT(DISTINCT p.id) as buildingCount,
      SUM(COALESCE(p.currentReplacementValue, 0)) as totalCRV,
      SUM(COALESCE(p.deferredMaintenanceCost, 0)) as totalDMC
    FROM projects p
    WHERE ${projectConditions}
    GROUP BY COALESCE(p.city, 'Unknown'), COALESCE(p.province, 'Unknown')
    ORDER BY buildingCount DESC
  `);

  const rows = result as any[];

  // Get deficiency counts per location
  const deficiencyResult = await db.execute(sql`
    SELECT 
      COALESCE(p.city, 'Unknown') as city,
      COALESCE(p.province, 'Unknown') as province,
      COUNT(d.id) as deficiencyCount
    FROM deficiencies d
    INNER JOIN projects p ON d.projectId = p.id
    WHERE ${projectConditions}
    GROUP BY COALESCE(p.city, 'Unknown'), COALESCE(p.province, 'Unknown')
  `);

  const deficiencyMap = new Map(
    (deficiencyResult as any[]).map(r => [`${r.city}-${r.province}`, parseInt(r.deficiencyCount || '0')])
  );

  return rows.map(row => {
    const totalCRV = parseFloat(row.totalCRV || '0');
    const totalDMC = parseFloat(row.totalDMC || '0');
    const avgFCI = totalCRV > 0 ? (totalDMC / totalCRV) * 100 : 0;

    return {
      city: row.city,
      province: row.province,
      buildingCount: parseInt(row.buildingCount || '0'),
      totalCRV,
      totalDeferredMaintenance: totalDMC,
      averageFCI: Math.round(avgFCI * 100) / 100,
      totalDeficiencies: deficiencyMap.get(`${row.city}-${row.province}`) || 0,
    };
  });
}

// ============================================================================
// Property Type Distribution
// ============================================================================

export async function getPropertyTypeDistribution(
  userId: number,
  company: string | null,
  isAdmin: boolean
): Promise<PropertyTypeDistribution[]> {
  const db = await getDb();
  if (!db) return [];

  const currentYear = new Date().getFullYear();

  let projectConditions = isAdmin
    ? company ? sql`p.company = ${company}` : sql`1=1`
    : company
      ? sql`(p.userId = ${userId} OR p.company = ${company})`
      : sql`p.userId = ${userId}`;

  const result = await db.execute(sql`
    SELECT 
      COALESCE(p.propertyType, 'Other') as propertyType,
      COUNT(DISTINCT p.id) as buildingCount,
      SUM(COALESCE(p.currentReplacementValue, 0)) as totalCRV,
      SUM(COALESCE(p.deferredMaintenanceCost, 0)) as totalDMC,
      AVG(CASE WHEN p.yearBuilt > 0 THEN ${currentYear} - p.yearBuilt ELSE NULL END) as avgAge
    FROM projects p
    WHERE ${projectConditions}
    GROUP BY COALESCE(p.propertyType, 'Other')
    ORDER BY buildingCount DESC
  `);

  const rows = result as any[];

  // Get deficiency counts per property type
  const deficiencyResult = await db.execute(sql`
    SELECT 
      COALESCE(p.propertyType, 'Other') as propertyType,
      COUNT(d.id) as deficiencyCount
    FROM deficiencies d
    INNER JOIN projects p ON d.projectId = p.id
    WHERE ${projectConditions}
    GROUP BY COALESCE(p.propertyType, 'Other')
  `);

  const deficiencyMap = new Map(
    (deficiencyResult as any[]).map(r => [r.propertyType, parseInt(r.deficiencyCount || '0')])
  );

  return rows.map(row => {
    const totalCRV = parseFloat(row.totalCRV || '0');
    const totalDMC = parseFloat(row.totalDMC || '0');
    const avgFCI = totalCRV > 0 ? (totalDMC / totalCRV) * 100 : 0;

    return {
      propertyType: row.propertyType,
      buildingCount: parseInt(row.buildingCount || '0'),
      totalCRV,
      totalDeferredMaintenance: totalDMC,
      averageFCI: Math.round(avgFCI * 100) / 100,
      averageAge: Math.round(parseFloat(row.avgAge || '0')),
      totalDeficiencies: deficiencyMap.get(row.propertyType) || 0,
    };
  });
}

// ============================================================================
// Priority Breakdown
// ============================================================================

export async function getPriorityBreakdown(
  userId: number,
  company: string | null,
  isAdmin: boolean
): Promise<PriorityBreakdown[]> {
  const db = await getDb();
  if (!db) return [];

  let projectConditions = isAdmin
    ? company ? sql`p.company = ${company}` : sql`1=1`
    : company
      ? sql`(p.userId = ${userId} OR p.company = ${company})`
      : sql`p.userId = ${userId}`;

  const result = await db.execute(sql`
    SELECT 
      COALESCE(d.priority, 'long_term') as priority,
      COUNT(*) as count,
      SUM(COALESCE(d.estimatedCost, 0)) as totalCost,
      GROUP_CONCAT(DISTINCT p.name SEPARATOR '|||') as buildings
    FROM deficiencies d
    INNER JOIN projects p ON d.projectId = p.id
    WHERE ${projectConditions}
    GROUP BY COALESCE(d.priority, 'long_term')
    ORDER BY FIELD(COALESCE(d.priority, 'long_term'), 'immediate', 'short_term', 'medium_term', 'long_term')
  `);

  const rows = result as any[];
  const totalCost = rows.reduce((sum, r) => sum + parseFloat(r.totalCost || '0'), 0);

  return rows.map(row => ({
    priority: row.priority,
    count: parseInt(row.count || '0'),
    totalCost: parseFloat(row.totalCost || '0'),
    percentage: totalCost > 0 ? Math.round((parseFloat(row.totalCost || '0') / totalCost) * 100) : 0,
    buildings: row.buildings ? row.buildings.split('|||').slice(0, 5) : [],
  }));
}

// ============================================================================
// Deficiency Trends (Monthly)
// ============================================================================

export async function getDeficiencyTrends(
  userId: number,
  company: string | null,
  isAdmin: boolean,
  months: number = 12
): Promise<DeficiencyTrend[]> {
  const db = await getDb();
  if (!db) return [];

  let projectConditions = isAdmin
    ? company ? sql`p.company = ${company}` : sql`1=1`
    : company
      ? sql`(p.userId = ${userId} OR p.company = ${company})`
      : sql`p.userId = ${userId}`;

  const result = await db.execute(sql`
    SELECT 
      DATE_FORMAT(d.createdAt, '%Y-%m') as period,
      COUNT(*) as totalDeficiencies,
      SUM(CASE WHEN d.priority = 'immediate' THEN 1 ELSE 0 END) as immediateCount,
      SUM(CASE WHEN d.priority = 'short_term' THEN 1 ELSE 0 END) as shortTermCount,
      SUM(CASE WHEN d.priority = 'medium_term' THEN 1 ELSE 0 END) as mediumTermCount,
      SUM(CASE WHEN d.priority = 'long_term' THEN 1 ELSE 0 END) as longTermCount,
      SUM(COALESCE(d.estimatedCost, 0)) as totalCost,
      SUM(CASE WHEN d.status = 'resolved' THEN 1 ELSE 0 END) as resolvedCount
    FROM deficiencies d
    INNER JOIN projects p ON d.projectId = p.id
    WHERE ${projectConditions}
      AND d.createdAt >= DATE_SUB(NOW(), INTERVAL ${months} MONTH)
    GROUP BY DATE_FORMAT(d.createdAt, '%Y-%m')
    ORDER BY period ASC
  `);

  return (result as any[]).map(row => ({
    period: row.period,
    totalDeficiencies: parseInt(row.totalDeficiencies || '0'),
    immediateCount: parseInt(row.immediateCount || '0'),
    shortTermCount: parseInt(row.shortTermCount || '0'),
    mediumTermCount: parseInt(row.mediumTermCount || '0'),
    longTermCount: parseInt(row.longTermCount || '0'),
    totalCost: parseFloat(row.totalCost || '0'),
    resolvedCount: parseInt(row.resolvedCount || '0'),
  }));
}

// ============================================================================
// Capital Planning Forecast
// ============================================================================

export interface CapitalPlanningForecast {
  year: number;
  immediateNeeds: number;
  shortTermNeeds: number;
  mediumTermNeeds: number;
  longTermNeeds: number;
  totalProjectedCost: number;
  cumulativeCost: number;
}

export async function getCapitalPlanningForecast(
  userId: number,
  company: string | null,
  isAdmin: boolean,
  years: number = 5
): Promise<CapitalPlanningForecast[]> {
  const overview = await getPortfolioOverview(userId, company, isAdmin);
  
  const { immediateNeeds, shortTermNeeds, mediumTermNeeds, longTermNeeds } = overview;
  const currentYear = new Date().getFullYear();
  
  const forecast: CapitalPlanningForecast[] = [];
  let cumulativeCost = 0;

  // Distribution pattern over years
  const distributions = [
    { immediate: 1.0, shortTerm: 0.2, mediumTerm: 0.0, longTerm: 0.0 },
    { immediate: 0.0, shortTerm: 0.4, mediumTerm: 0.1, longTerm: 0.0 },
    { immediate: 0.0, shortTerm: 0.4, mediumTerm: 0.3, longTerm: 0.0 },
    { immediate: 0.0, shortTerm: 0.0, mediumTerm: 0.3, longTerm: 0.2 },
    { immediate: 0.0, shortTerm: 0.0, mediumTerm: 0.3, longTerm: 0.3 },
  ];

  for (let i = 0; i < years; i++) {
    const dist = distributions[Math.min(i, distributions.length - 1)];
    const yearImmediate = immediateNeeds * dist.immediate;
    const yearShortTerm = shortTermNeeds * dist.shortTerm;
    const yearMediumTerm = mediumTermNeeds * dist.mediumTerm;
    const yearLongTerm = longTermNeeds * dist.longTerm;
    const yearTotal = yearImmediate + yearShortTerm + yearMediumTerm + yearLongTerm;
    cumulativeCost += yearTotal;

    forecast.push({
      year: currentYear + i,
      immediateNeeds: Math.round(yearImmediate),
      shortTermNeeds: Math.round(yearShortTerm),
      mediumTermNeeds: Math.round(yearMediumTerm),
      longTermNeeds: Math.round(yearLongTerm),
      totalProjectedCost: Math.round(yearTotal),
      cumulativeCost: Math.round(cumulativeCost),
    });
  }

  return forecast;
}
