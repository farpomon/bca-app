/**
 * FCI (Facility Condition Index) Calculation Service
 * 
 * FCI = Deferred Maintenance Cost / Current Replacement Value
 * 
 * FCI Scale: 0-1 (lower is better)
 * - 0-0.05: Good (less than 5% deferred maintenance)
 * - 0.05-0.10: Fair (5-10% deferred maintenance)
 * - 0.10-0.30: Poor (10-30% deferred maintenance)
 * - 0.30+: Critical (more than 30% deferred maintenance)
 */

import * as db from "./db";

export interface FCIResult {
  fci: number;
  deferredMaintenanceCost: number;
  currentReplacementValue: number;
  rating: string;
  calculationMethod: string;
  calculatedAt: string | Date; // ISO string or Date object
}

/**
 * Calculate deferred maintenance cost from deficiencies and poor condition components
 */
export async function calculateDeferredMaintenanceCost(projectId: number): Promise<number> {
  // Get all deficiencies for the project
  const deficiencies = await db.getDeficienciesByProject(projectId);
  
  // Sum up all deficiency costs
  let deficiencyCost = 0;
  for (const deficiency of deficiencies) {
    if (deficiency.estimatedCost) {
      deficiencyCost += parseFloat(String(deficiency.estimatedCost));
    }
  }
  
  // Get all assessments with poor/critical condition
  const assessments = await db.getAssessmentsByProject(projectId);
  
  // Add repair costs for components in poor condition
  let poorConditionCost = 0;
  for (const assessment of assessments) {
    if (assessment.condition === "poor" && assessment.estimatedRepairCost) {
      poorConditionCost += parseFloat(String(assessment.estimatedRepairCost));
    }
  }
  
  return deficiencyCost + poorConditionCost;
}

/**
 * Calculate current replacement value from component costs
 */
export async function calculateReplacementValue(projectId: number): Promise<number> {
  const assessments = await db.getAssessmentsByProject(projectId);
  
  let totalValue = 0;
  for (const assessment of assessments) {
    // Use estimated repair cost as proxy for replacement value (multiply by factor)
    if (assessment.estimatedRepairCost) {
      totalValue += parseFloat(String(assessment.estimatedRepairCost)) * 3; // Estimate replacement as 3x repair
    } else if (assessment.estimatedRepairCost) {
      // If no replacement cost, estimate as 2x repair cost
      totalValue += parseFloat(String(assessment.estimatedRepairCost)) * 2;
    }
  }
  
  return totalValue;
}

/**
 * Calculate FCI for a project
 */
export async function calculateFCI(projectId: number): Promise<FCIResult> {
  const deferredMaintenanceCost = await calculateDeferredMaintenanceCost(projectId);
  const currentReplacementValue = await calculateReplacementValue(projectId);
  
  // Avoid division by zero
  const fci = currentReplacementValue > 0 
    ? deferredMaintenanceCost / currentReplacementValue 
    : 0;
  
  return {
    fci: Math.round(fci * 10000) / 10000, // Round to 4 decimals
    deferredMaintenanceCost,
    currentReplacementValue,
    rating: getFCIRating(fci),
    calculationMethod: "deferred_maintenance_ratio",
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Get FCI rating label based on numeric value
 */
export function getFCIRating(fci: number): string {
  if (fci <= 0.05) return "Good";
  if (fci <= 0.10) return "Fair";
  if (fci <= 0.30) return "Poor";
  return "Critical";
}

/**
 * Get FCI color for UI display
 */
export function getFCIColor(fci: number): string {
  if (fci <= 0.05) return "green";
  if (fci <= 0.10) return "yellow";
  if (fci <= 0.30) return "orange";
  return "red";
}

/**
 * Calculate portfolio-level FCI (aggregate across multiple projects)
 */
export async function calculatePortfolioFCI(projectIds: number[]): Promise<FCIResult> {
  let totalDeferredMaintenance = 0;
  let totalReplacementValue = 0;
  
  for (const projectId of projectIds) {
    const result = await calculateFCI(projectId);
    totalDeferredMaintenance += result.deferredMaintenanceCost;
    totalReplacementValue += result.currentReplacementValue;
  }
  
  const fci = totalReplacementValue > 0 
    ? totalDeferredMaintenance / totalReplacementValue 
    : 0;
  
  return {
    fci: Math.round(fci * 10000) / 10000,
    deferredMaintenanceCost: totalDeferredMaintenance,
    currentReplacementValue: totalReplacementValue,
    rating: getFCIRating(fci),
    calculationMethod: "portfolio_aggregate",
    calculatedAt: new Date().toISOString(),
  };
}
