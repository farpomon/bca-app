/**
 * Recalculation Service
 * 
 * Centralized service for automatic recalculation of:
 * - FCI (Facility Condition Index)
 * - CI (Condition Index)
 * - Total repair costs
 * - Replacement values
 * - Priority scores
 * - Portfolio summaries
 */

import * as db from "../db";
import { calculateFCI } from "../fciCalculationService";
import { calculateBuildingCI } from "../ciCalculationService";

export interface RecalculationResult {
  success: boolean;
  projectId: number;
  ci?: number;
  fci?: number;
  deferredMaintenanceCost?: number;
  currentReplacementValue?: number;
  totalRepairCost?: number;
  error?: string;
  calculatedAt: string;
}

/**
 * Recalculate all metrics for a project
 * Called after assessment, deficiency, or asset changes
 */
export async function recalculateProjectMetrics(
  projectId: number,
  userId: number
): Promise<RecalculationResult> {
  const calculatedAt = new Date().toISOString();
  
  try {
    // Calculate CI and FCI
    const ciResult = await calculateBuildingCI(projectId);
    const fciResult = await calculateFCI(projectId);
    
    // Calculate total repair cost from all deficiencies
    const totalRepairCost = await calculateTotalRepairCost(projectId);
    
    // Update project with new values
    await db.updateProject(projectId, userId, {
      ci: ciResult.ci.toString(),
      fci: fciResult.fci.toString(),
      deferredMaintenanceCost: fciResult.deferredMaintenanceCost.toString(),
      currentReplacementValue: fciResult.currentReplacementValue.toString(),
      lastCalculatedAt: calculatedAt,
    });
    
    // Save snapshot for historical tracking
    await db.saveCiFciSnapshot({
      projectId,
      level: "building",
      entityId: projectId.toString(),
      ci: ciResult.ci.toString(),
      fci: fciResult.fci.toString(),
      deferredMaintenanceCost: fciResult.deferredMaintenanceCost.toString(),
      currentReplacementValue: fciResult.currentReplacementValue.toString(),
      calculationMethod: ciResult.calculationMethod,
    });
    
    return {
      success: true,
      projectId,
      ci: ciResult.ci,
      fci: fciResult.fci,
      deferredMaintenanceCost: fciResult.deferredMaintenanceCost,
      currentReplacementValue: fciResult.currentReplacementValue,
      totalRepairCost,
      calculatedAt,
    };
  } catch (error) {
    console.error(`[Recalculation] Failed for project ${projectId}:`, error);
    return {
      success: false,
      projectId,
      error: error instanceof Error ? error.message : "Unknown error",
      calculatedAt,
    };
  }
}

/**
 * Calculate total repair cost from all deficiencies in a project
 */
export async function calculateTotalRepairCost(projectId: number): Promise<number> {
  const deficiencies = await db.getDeficienciesByProject(projectId);
  
  let totalCost = 0;
  for (const deficiency of deficiencies) {
    if (deficiency.estimatedCost) {
      totalCost += parseFloat(String(deficiency.estimatedCost));
    }
  }
  
  return totalCost;
}

/**
 * Recalculate asset-level metrics
 */
export async function recalculateAssetMetrics(
  assetId: number,
  projectId: number
): Promise<{ totalRepairCost: number; avgCondition: string }> {
  // Get all assessments for this asset
  const assessments = await db.getAssetAssessments(assetId);
  
  let totalRepairCost = 0;
  let conditionSum = 0;
  let conditionCount = 0;
  
  const conditionValues: Record<string, number> = {
    'good': 1,
    'fair': 2,
    'poor': 3,
    'not_assessed': 0,
  };
  
  for (const assessment of assessments) {
    if (assessment.estimatedRepairCost) {
      totalRepairCost += parseFloat(String(assessment.estimatedRepairCost));
    }
    if (assessment.condition && assessment.condition !== 'not_assessed') {
      conditionSum += conditionValues[assessment.condition] || 0;
      conditionCount++;
    }
  }
  
  // Calculate average condition
  let avgCondition = 'not_assessed';
  if (conditionCount > 0) {
    const avgValue = conditionSum / conditionCount;
    if (avgValue <= 1.5) avgCondition = 'good';
    else if (avgValue <= 2.5) avgCondition = 'fair';
    else avgCondition = 'poor';
  }
  
  return { totalRepairCost, avgCondition };
}

/**
 * Recalculate portfolio-level metrics for a company
 */
export async function recalculatePortfolioMetrics(
  companyId: number,
  userId: number
): Promise<{
  totalProjects: number;
  avgFci: number;
  totalDeferredMaintenance: number;
  totalReplacementValue: number;
}> {
  // Get all projects for the company
  const projects = await db.getUserProjects(userId, false, undefined, true, companyId, false);
  
  let totalFci = 0;
  let totalDeferredMaintenance = 0;
  let totalReplacementValue = 0;
  let projectsWithFci = 0;
  
  for (const project of projects) {
    if (project.fci) {
      totalFci += parseFloat(String(project.fci));
      projectsWithFci++;
    }
    if (project.deferredMaintenanceCost) {
      totalDeferredMaintenance += parseFloat(String(project.deferredMaintenanceCost));
    }
    if (project.currentReplacementValue) {
      totalReplacementValue += parseFloat(String(project.currentReplacementValue));
    }
  }
  
  return {
    totalProjects: projects.length,
    avgFci: projectsWithFci > 0 ? totalFci / projectsWithFci : 0,
    totalDeferredMaintenance,
    totalReplacementValue,
  };
}

/**
 * Recalculate priority score for a deficiency based on severity, age, and cost
 */
export function calculatePriorityScore(deficiency: {
  severity: string;
  priority: string;
  estimatedCost?: number | string | null;
  createdAt?: Date | string;
}): number {
  const severityWeights: Record<string, number> = {
    'critical': 100,
    'high': 75,
    'medium': 50,
    'low': 25,
  };
  
  const priorityWeights: Record<string, number> = {
    'immediate': 100,
    'short_term': 75,
    'medium_term': 50,
    'long_term': 25,
  };
  
  // Base score from severity and priority
  let score = (severityWeights[deficiency.severity] || 50) * 0.4 +
              (priorityWeights[deficiency.priority] || 50) * 0.4;
  
  // Add cost factor (higher cost = higher priority)
  if (deficiency.estimatedCost) {
    const cost = parseFloat(String(deficiency.estimatedCost));
    if (cost > 100000) score += 20;
    else if (cost > 50000) score += 15;
    else if (cost > 10000) score += 10;
    else if (cost > 1000) score += 5;
  }
  
  // Add age factor (older deficiencies get higher priority)
  if (deficiency.createdAt) {
    const ageInDays = Math.floor(
      (Date.now() - new Date(deficiency.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (ageInDays > 365) score += 10;
    else if (ageInDays > 180) score += 7;
    else if (ageInDays > 90) score += 5;
    else if (ageInDays > 30) score += 2;
  }
  
  return Math.min(100, Math.round(score));
}

/**
 * Batch recalculate all projects (for admin use)
 */
export async function batchRecalculateAllProjects(
  userId: number,
  projectIds?: number[]
): Promise<{ success: number; failed: number; results: RecalculationResult[] }> {
  const results: RecalculationResult[] = [];
  let success = 0;
  let failed = 0;
  
  // If no specific projects provided, get all projects
  let idsToProcess = projectIds;
  if (!idsToProcess) {
    const allProjects = await db.getUserProjects(userId, false, undefined, true, undefined, true);
    idsToProcess = allProjects.map(p => p.id);
  }
  
  for (const projectId of idsToProcess) {
    const result = await recalculateProjectMetrics(projectId, userId);
    results.push(result);
    if (result.success) {
      success++;
    } else {
      failed++;
    }
  }
  
  return { success, failed, results };
}
