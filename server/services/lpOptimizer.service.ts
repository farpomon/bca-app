import solver from "javascript-lp-solver";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * Linear Programming Portfolio Optimization Service
 * 
 * Maximizes weighted portfolio condition index within budget constraints
 * using linear programming to determine optimal project selection.
 */

export interface ProjectData {
  projectId: number;
  projectName: string;
  currentCI: number;
  currentFCI: number;
  replacementValue: number;
  deferredMaintenanceCost: number;
  priorityScore: number;
  estimatedCost: number;
  expectedCIImprovement: number;
  expectedFCIImprovement: number;
  riskScore: number;
}

export interface OptimizationConstraints {
  maxBudget: number;
  minProjects?: number;
  maxProjects?: number;
  requiredProjectIds?: number[];
  excludedProjectIds?: number[];
  minCIImprovement?: number;
  maxRiskTolerance?: number;
}

export interface OptimizationResult {
  selectedProjects: Array<{
    projectId: number;
    projectName: string;
    cost: number;
    ciImprovement: number;
    fciImprovement: number;
    priorityScore: number;
    costEffectiveness: number;
  }>;
  totalCost: number;
  totalCIImprovement: number;
  totalFCIImprovement: number;
  portfolioMetrics: {
    beforeCI: number;
    afterCI: number;
    beforeFCI: number;
    afterFCI: number;
    ciImprovementPercent: number;
    fciImprovementPercent: number;
  };
  budgetUtilization: number;
  averageCostEffectiveness: number;
}

export interface SensitivityAnalysis {
  budgetLevels: number[];
  results: Array<{
    budget: number;
    projectCount: number;
    totalCost: number;
    ciImprovement: number;
    fciImprovement: number;
    marginalBenefit: number;
    roi: number;
  }>;
  optimalBudget: number;
  inflectionPoint: number;
}

export interface ParetoPoint {
  cost: number;
  ciImprovement: number;
  fciImprovement: number;
  projectCount: number;
  projects: number[];
}

/**
 * Get current portfolio metrics
 */
export async function getPortfolioMetrics(): Promise<{
  totalProjects: number;
  totalReplacementValue: number;
  totalDeferredMaintenance: number;
  weightedCI: number;
  weightedFCI: number;
  averagePriorityScore: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(sql`
    SELECT 
      COUNT(*) as totalProjects,
      SUM(currentReplacementValue) as totalReplacementValue,
      SUM(deferredMaintenanceCost) as totalDeferredMaintenance,
      SUM(ci * currentReplacementValue) / NULLIF(SUM(currentReplacementValue), 0) as weightedCI,
      SUM(fci * currentReplacementValue) / NULLIF(SUM(currentReplacementValue), 0) as weightedFCI
    FROM projects
    WHERE currentReplacementValue > 0
  `);

  const row = Array.isArray(result[0]) && result[0].length > 0 ? result[0][0] : null;

  // Get average priority score
  const priorityResult = await db.execute(sql`
    SELECT AVG(compositeScore) as avgPriority
    FROM project_priority_scores
  `);
  const priorityRow = Array.isArray(priorityResult[0]) && priorityResult[0].length > 0 ? priorityResult[0][0] : null;

  return {
    totalProjects: row ? Number(row.totalProjects) : 0,
    totalReplacementValue: row ? parseFloat(String(row.totalReplacementValue || 0)) : 0,
    totalDeferredMaintenance: row ? parseFloat(String(row.totalDeferredMaintenance || 0)) : 0,
    weightedCI: row ? parseFloat(String(row.weightedCI || 0)) : 0,
    weightedFCI: row ? parseFloat(String(row.weightedFCI || 0)) : 0,
    averagePriorityScore: priorityRow ? parseFloat(String(priorityRow.avgPriority || 0)) : 0,
  };
}

/**
 * Get project data for optimization
 */
export async function getProjectsForOptimization(): Promise<ProjectData[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(sql`
    SELECT 
      p.id as projectId,
      p.name as projectName,
      p.ci as currentCI,
      p.fci as currentFCI,
      p.currentReplacementValue as replacementValue,
      p.deferredMaintenanceCost,
      COALESCE(pps.compositeScore, 0) as priorityScore
    FROM projects p
    LEFT JOIN project_priority_scores pps ON p.id = pps.projectId
    WHERE p.currentReplacementValue > 0
      AND p.deferredMaintenanceCost > 0
  `);

  const rows = Array.isArray(result[0]) ? result[0] : [];

  return rows.map((row: any) => {
    const currentCI = parseFloat(String(row.currentCI || 0));
    const currentFCI = parseFloat(String(row.currentFCI || 0));
    const deferredCost = parseFloat(String(row.deferredMaintenanceCost || 0));
    const replacementValue = parseFloat(String(row.replacementValue || 1));

    // Estimate CI improvement if all deferred maintenance is addressed
    // Assume addressing deferred maintenance brings CI to 85-95 range
    const targetCI = 90;
    const expectedCIImprovement = Math.max(0, targetCI - currentCI);

    // Estimate FCI improvement
    const expectedFCIImprovement = Math.max(0, currentFCI - (deferredCost * 0.2) / replacementValue * 100);

    // Estimate cost (use deferred maintenance as proxy)
    const estimatedCost = deferredCost;

    // Simple risk score based on condition
    const riskScore = currentCI < 50 ? 10 : currentCI < 70 ? 7 : 5;

    return {
      projectId: Number(row.projectId),
      projectName: String(row.projectName),
      currentCI,
      currentFCI,
      replacementValue,
      deferredMaintenanceCost: deferredCost,
      priorityScore: parseFloat(String(row.priorityScore || 0)),
      estimatedCost,
      expectedCIImprovement,
      expectedFCIImprovement,
      riskScore,
    };
  });
}

/**
 * Optimize portfolio using Linear Programming
 * 
 * Formulation:
 * - Decision variables: x_i ∈ {0,1} for each project i
 * - Objective: maximize Σ(w_i * ci_improvement_i * x_i)
 * - Constraints:
 *   - Budget: Σ(cost_i * x_i) <= maxBudget
 *   - Min/max projects: minProjects <= Σ(x_i) <= maxProjects
 *   - Required projects: x_i = 1 for i in requiredProjectIds
 *   - Excluded projects: x_i = 0 for i in excludedProjectIds
 */
export async function optimizePortfolio(
  constraints: OptimizationConstraints
): Promise<OptimizationResult> {
  const projects = await getProjectsForOptimization();
  
  if (projects.length === 0) {
    throw new Error("No projects available for optimization");
  }

  // Build LP model
  const model: any = {
    optimize: "ciImprovement",
    opType: "max",
    constraints: {
      budget: { max: constraints.maxBudget },
    },
    variables: {},
    ints: {}, // Binary integer variables
  };

  // Add decision variables for each project
  projects.forEach((project) => {
    const varName = `project_${project.projectId}`;
    
    // Weight CI improvement by replacement value (larger facilities matter more)
    const weightedCIImprovement = project.expectedCIImprovement * (project.replacementValue / 1000000);
    
    model.variables[varName] = {
      ciImprovement: weightedCIImprovement,
      budget: project.estimatedCost,
      projectCount: 1,
    };

    // Binary variable (0 or 1)
    model.ints[varName] = 1;
  });

  // Add project count constraints
  if (constraints.minProjects !== undefined || constraints.maxProjects !== undefined) {
    model.constraints.projectCount = {};
    if (constraints.minProjects !== undefined) {
      model.constraints.projectCount.min = constraints.minProjects;
    }
    if (constraints.maxProjects !== undefined) {
      model.constraints.projectCount.max = constraints.maxProjects;
    }
  }

  // Solve LP model
  const solution = solver.Solve(model);

  if (!solution || !solution.feasible) {
    throw new Error("No feasible solution found. Try relaxing constraints or increasing budget.");
  }

  // Extract selected projects
  const selectedProjects: OptimizationResult["selectedProjects"] = [];
  let totalCost = 0;
  let totalCIImprovement = 0;
  let totalFCIImprovement = 0;
  let totalWeightedCI = 0;
  let totalReplacementValue = 0;

  projects.forEach((project) => {
    const varName = `project_${project.projectId}`;
    const isSelected = solution[varName] === 1;

    // Calculate portfolio metrics for all projects
    totalWeightedCI += project.currentCI * project.replacementValue;
    totalReplacementValue += project.replacementValue;

    if (isSelected) {
      const costEffectiveness = project.expectedCIImprovement > 0
        ? project.estimatedCost / project.expectedCIImprovement
        : Infinity;

      selectedProjects.push({
        projectId: project.projectId,
        projectName: project.projectName,
        cost: project.estimatedCost,
        ciImprovement: project.expectedCIImprovement,
        fciImprovement: project.expectedFCIImprovement,
        priorityScore: project.priorityScore,
        costEffectiveness,
      });

      totalCost += project.estimatedCost;
      totalCIImprovement += project.expectedCIImprovement * project.replacementValue;
      totalFCIImprovement += project.expectedFCIImprovement * project.replacementValue;
    }
  });

  // Calculate portfolio-level metrics
  const beforeCI = totalReplacementValue > 0 ? totalWeightedCI / totalReplacementValue : 0;
  const afterCI = beforeCI + (totalReplacementValue > 0 ? totalCIImprovement / totalReplacementValue : 0);

  // Get current portfolio FCI
  const portfolioMetrics = await getPortfolioMetrics();
  const beforeFCI = portfolioMetrics.weightedFCI;
  const afterFCI = beforeFCI - (totalReplacementValue > 0 ? totalFCIImprovement / totalReplacementValue : 0);

  const budgetUtilization = constraints.maxBudget > 0 ? (totalCost / constraints.maxBudget) * 100 : 0;
  const averageCostEffectiveness = totalCIImprovement > 0 ? totalCost / totalCIImprovement : 0;

  return {
    selectedProjects,
    totalCost,
    totalCIImprovement: totalReplacementValue > 0 ? totalCIImprovement / totalReplacementValue : 0,
    totalFCIImprovement: totalReplacementValue > 0 ? totalFCIImprovement / totalReplacementValue : 0,
    portfolioMetrics: {
      beforeCI,
      afterCI,
      beforeFCI,
      afterFCI,
      ciImprovementPercent: beforeCI > 0 ? ((afterCI - beforeCI) / beforeCI) * 100 : 0,
      fciImprovementPercent: beforeFCI > 0 ? ((beforeFCI - afterFCI) / beforeFCI) * 100 : 0,
    },
    budgetUtilization,
    averageCostEffectiveness,
  };
}

/**
 * Perform sensitivity analysis across budget range
 */
export async function analyzeSensitivity(
  baseBudget: number,
  rangePercent: number = 50
): Promise<SensitivityAnalysis> {
  const minBudget = baseBudget * (1 - rangePercent / 100);
  const maxBudget = baseBudget * (1 + rangePercent / 100);
  const steps = 10;
  const budgetStep = (maxBudget - minBudget) / steps;

  const results: SensitivityAnalysis["results"] = [];
  let previousCIImprovement = 0;

  for (let i = 0; i <= steps; i++) {
    const budget = minBudget + i * budgetStep;

    try {
      const result = await optimizePortfolio({ maxBudget: budget });

      const marginalBenefit = result.totalCIImprovement - previousCIImprovement;
      const roi = budget > 0 ? (result.totalCIImprovement / budget) * 100 : 0;

      results.push({
        budget,
        projectCount: result.selectedProjects.length,
        totalCost: result.totalCost,
        ciImprovement: result.totalCIImprovement,
        fciImprovement: result.totalFCIImprovement,
        marginalBenefit,
        roi,
      });

      previousCIImprovement = result.totalCIImprovement;
    } catch (error) {
      // Skip infeasible budgets
      continue;
    }
  }

  // Find optimal budget (highest ROI)
  const optimalBudget = results.reduce((best, current) =>
    current.roi > best.roi ? current : best
  , results[0])?.budget || baseBudget;

  // Find inflection point (diminishing returns)
  let inflectionPoint = baseBudget;
  for (let i = 1; i < results.length; i++) {
    if (results[i].marginalBenefit < results[i - 1].marginalBenefit * 0.5) {
      inflectionPoint = results[i].budget;
      break;
    }
  }

  return {
    budgetLevels: results.map((r) => r.budget),
    results,
    optimalBudget,
    inflectionPoint,
  };
}

/**
 * Calculate Pareto frontier (cost vs CI improvement trade-off)
 */
export async function calculateParetoFrontier(): Promise<ParetoPoint[]> {
  const projects = await getProjectsForOptimization();
  
  if (projects.length === 0) {
    return [];
  }

  // Sort projects by cost-effectiveness (CI improvement per dollar)
  const sortedProjects = projects
    .map((p) => ({
      ...p,
      costEffectiveness: p.estimatedCost > 0 ? p.expectedCIImprovement / p.estimatedCost : 0,
    }))
    .sort((a, b) => b.costEffectiveness - a.costEffectiveness);

  const paretoPoints: ParetoPoint[] = [];
  let cumulativeCost = 0;
  let cumulativeCIImprovement = 0;
  let cumulativeFCIImprovement = 0;
  const selectedProjectIds: number[] = [];

  // Generate Pareto frontier by incrementally adding projects
  for (const project of sortedProjects) {
    cumulativeCost += project.estimatedCost;
    cumulativeCIImprovement += project.expectedCIImprovement;
    cumulativeFCIImprovement += project.expectedFCIImprovement;
    selectedProjectIds.push(project.projectId);

    paretoPoints.push({
      cost: cumulativeCost,
      ciImprovement: cumulativeCIImprovement,
      fciImprovement: cumulativeFCIImprovement,
      projectCount: selectedProjectIds.length,
      projects: [...selectedProjectIds],
    });
  }

  return paretoPoints;
}

/**
 * Calculate cost-effectiveness ranking
 */
export async function getCostEffectivenessRanking(): Promise<Array<{
  projectId: number;
  projectName: string;
  cost: number;
  ciImprovement: number;
  fciImprovement: number;
  priorityScore: number;
  costPerCIPoint: number;
  costPerFCIPoint: number;
  rank: number;
}>> {
  const projects = await getProjectsForOptimization();

  const ranked = projects
    .map((p) => ({
      projectId: p.projectId,
      projectName: p.projectName,
      cost: p.estimatedCost,
      ciImprovement: p.expectedCIImprovement,
      fciImprovement: p.expectedFCIImprovement,
      priorityScore: p.priorityScore,
      costPerCIPoint: p.expectedCIImprovement > 0 ? p.estimatedCost / p.expectedCIImprovement : Infinity,
      costPerFCIPoint: p.expectedFCIImprovement > 0 ? p.estimatedCost / p.expectedFCIImprovement : Infinity,
      rank: 0,
    }))
    .sort((a, b) => a.costPerCIPoint - b.costPerCIPoint);

  // Assign ranks
  ranked.forEach((item, index) => {
    item.rank = index + 1;
  });

  return ranked;
}
