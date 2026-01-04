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
import { getProjectAssets } from "./db-assets";

export interface FCIResult {
  fci: number;
  deferredMaintenanceCost: number;
  currentReplacementValue: number;
  rating: string;
  calculationMethod: string;
  calculatedAt: string | Date; // ISO string or Date object
}

/**
 * Calculate deferred maintenance cost from deficiencies and assessments
 * 
 * Note: The actual database schema uses:
 * - assessments.conditionRating (enum: '1','2','3','4','5') instead of condition
 * - assessments.estimatedRepairCost for repair costs
 * - deficiencies.estimatedCost for deficiency costs
 * 
 * Condition ratings: 1=Excellent, 2=Good, 3=Fair, 4=Poor, 5=Critical
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
  
  // Get all assessments for the project (now joins through assets table)
  const assessments = await db.getAssessmentsByProject(projectId);
  
  // Add repair costs for components in poor/critical condition (rating 4 or 5)
  // Also include all assessments with repair costs as they represent deferred maintenance
  let assessmentRepairCost = 0;
  for (const assessment of assessments) {
    const rating = assessment.conditionRating;
    // Include repair costs for poor (4) and critical (5) conditions
    // Or any assessment that has a repair cost (indicates needed work)
    if (assessment.estimatedRepairCost) {
      const cost = parseFloat(String(assessment.estimatedRepairCost));
      if (rating === '4' || rating === '5') {
        // Full cost for poor/critical
        assessmentRepairCost += cost;
      } else if (rating === '3') {
        // 50% of cost for fair condition (preventive)
        assessmentRepairCost += cost * 0.5;
      }
      // Good/Excellent conditions (1, 2) don't contribute to deferred maintenance
    }
  }
  
  return deficiencyCost + assessmentRepairCost;
}

/**
 * Calculate current replacement value from assets
 * 
 * Uses the replacementValue field from assets table which stores the
 * actual replacement value for each asset.
 */
export async function calculateReplacementValue(projectId: number): Promise<number> {
  // Get assets for the project to get their replacement values
  const projectAssets = await getProjectAssets(projectId);
  
  let totalValue = 0;
  for (const asset of projectAssets) {
    if (asset.replacementValue) {
      totalValue += parseFloat(String(asset.replacementValue));
    }
  }
  
  // If no replacement values are set on assets, fall back to estimating from assessments
  if (totalValue === 0) {
    const assessments = await db.getAssessmentsByProject(projectId);
    for (const assessment of assessments) {
      if (assessment.estimatedRepairCost) {
        // Estimate replacement as 3x repair cost as a rough approximation
        totalValue += parseFloat(String(assessment.estimatedRepairCost)) * 3;
      }
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
