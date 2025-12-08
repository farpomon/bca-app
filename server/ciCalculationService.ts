/**
 * CI (Condition Index) Calculation Service
 * 
 * Provides weighted aggregation algorithms for calculating Condition Index
 * at component, system, building, and portfolio levels.
 * 
 * CI Scale: 0-100 (higher is better)
 * - 90-100: Excellent
 * - 75-89: Good
 * - 50-74: Fair
 * - 25-49: Poor
 * - 0-24: Critical
 */

import * as db from "./db";

export interface ComponentCI {
  componentCode: string;
  componentName: string;
  ci: number;
  weight: number; // Replacement value or area
  assessmentDate: Date;
}

export interface SystemCI {
  systemName: string; // e.g., "B - Shell", "D - Services"
  ci: number;
  componentCount: number;
  totalWeight: number;
}

export interface CalculationResult {
  ci: number;
  components: ComponentCI[];
  calculationMethod: string;
  calculatedAt: Date;
}

/**
 * Convert condition percentage string to numeric CI value
 * Examples: "100-75%", "75-50%", "50-25%", "25-0%"
 */
export function conditionPercentageToCI(conditionPercentage: string | null): number {
  if (!conditionPercentage) return 50; // Default to fair if not specified
  
  // Extract the first number from the range (e.g., "75-50%" → 75)
  const match = conditionPercentage.match(/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  return 50; // Default fallback
}

/**
 * Calculate CI for a single component based on its condition assessment
 */
export async function calculateComponentCI(
  projectId: number,
  componentCode: string
): Promise<number> {
  const assessments = await db.getAssessmentsByComponent(projectId, componentCode);
  
  if (assessments.length === 0) {
    return 50; // Default to fair if no assessments
  }
  
  // Use the most recent assessment
  const latest = assessments[0];
  return conditionPercentageToCI(latest.conditionPercentage);
}

/**
 * Calculate weighted average CI for a system (e.g., all components in "B - Shell")
 * Weight by replacement value (estimatedReplacementCost)
 */
export async function calculateSystemCI(
  projectId: number,
  systemCode: string // e.g., "B", "C", "D"
): Promise<SystemCI> {
  const assessments = await db.getAssessmentsByProject(projectId);
  
  // Filter assessments for this system (components starting with systemCode)
  const systemAssessments = assessments.filter(a => 
    a.componentCode.startsWith(systemCode)
  );
  
  if (systemAssessments.length === 0) {
    return {
      systemName: systemCode,
      ci: 50,
      componentCount: 0,
      totalWeight: 0,
    };
  }
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const assessment of systemAssessments) {
    const ci = conditionPercentageToCI(assessment.conditionPercentage);
    const weight = parseFloat(String(assessment.estimatedRepairCost || "1"));
    
    weightedSum += ci * weight;
    totalWeight += weight;
  }
  
  const systemCI = totalWeight > 0 ? weightedSum / totalWeight : 50;
  
  return {
    systemName: systemCode,
    ci: Math.round(systemCI * 100) / 100, // Round to 2 decimals
    componentCount: systemAssessments.length,
    totalWeight,
  };
}

/**
 * Calculate building-level CI (weighted average of all systems)
 */
export async function calculateBuildingCI(projectId: number): Promise<CalculationResult> {
  const assessments = await db.getAssessmentsByProject(projectId);
  
  if (assessments.length === 0) {
    return {
      ci: 50,
      components: [],
      calculationMethod: "default",
      calculatedAt: new Date(),
    };
  }
  
  const components: ComponentCI[] = [];
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const assessment of assessments) {
    const ci = conditionPercentageToCI(assessment.conditionPercentage);
    const weight = parseFloat(String(assessment.estimatedRepairCost || "1"));
    
    components.push({
      componentCode: assessment.componentCode,
      componentName: assessment.componentCode, // Could fetch name from buildingComponents
      ci,
      weight,
      assessmentDate: assessment.assessedAt || new Date(),
    });
    
    weightedSum += ci * weight;
    totalWeight += weight;
  }
  
  const buildingCI = totalWeight > 0 ? weightedSum / totalWeight : 50;
  
  return {
    ci: Math.round(buildingCI * 100) / 100,
    components,
    calculationMethod: "weighted_avg_by_replacement_cost",
    calculatedAt: new Date(),
  };
}

/**
 * Calculate portfolio-level CI (weighted average across multiple projects)
 */
export async function calculatePortfolioCI(projectIds: number[]): Promise<number> {
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const projectId of projectIds) {
    const result = await calculateBuildingCI(projectId);
    const weight = result.components.reduce((sum, c) => sum + c.weight, 0);
    
    weightedSum += result.ci * weight;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 50;
}

/**
 * Get CI rating label based on numeric value
 */
export function getCIRating(ci: number): string {
  if (ci >= 90) return "Excellent";
  if (ci >= 75) return "Good";
  if (ci >= 50) return "Fair";
  if (ci >= 25) return "Poor";
  return "Critical";
}

/**
 * Get CI color for UI display
 */
export function getCIColor(ci: number): string {
  if (ci >= 90) return "green";
  if (ci >= 75) return "blue";
  if (ci >= 50) return "yellow";
  if (ci >= 25) return "orange";
  return "red";
}
