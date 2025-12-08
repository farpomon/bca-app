import { getDb } from "../db";
import { assessments, buildingComponents } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Strategy types for component maintenance
 */
export type Strategy = "replace" | "rehabilitate" | "defer" | "do_nothing";

/**
 * Component strategy option with cost-benefit analysis
 */
export interface StrategyOption {
  componentCode: string;
  componentName: string;
  currentCondition: number;
  strategy: Strategy;
  actionYear: number;
  deferralYears?: number;
  strategyCost: number;
  presentValueCost: number;
  lifeExtension: number;
  conditionImprovement: number;
  riskReduction: number;
  failureCostAvoided: number;
  maintenanceSavings: number;
  priorityScore: number;
  costEffectiveness: number; // Benefit per dollar spent
}

/**
 * Optimization scenario configuration
 */
export interface OptimizationConfig {
  projectId: number;
  budgetConstraint?: number;
  budgetType: "hard" | "soft";
  timeHorizon: number; // years
  discountRate: number; // e.g., 0.03 for 3%
  optimizationGoal: "minimize_cost" | "maximize_ci" | "maximize_roi" | "minimize_risk";
}

/**
 * Optimization result with selected strategies
 */
export interface OptimizationResult {
  totalCost: number;
  totalBenefit: number;
  netPresentValue: number;
  returnOnInvestment: number;
  paybackPeriod: number;
  currentCI: number;
  projectedCI: number;
  ciImprovement: number;
  currentFCI: number;
  projectedFCI: number;
  fciImprovement: number;
  currentRiskScore: number;
  projectedRiskScore: number;
  riskReduction: number;
  selectedStrategies: StrategyOption[];
  deferredComponents: string[];
}

/**
 * Calculate replacement cost for a component
 */
function calculateReplacementCost(
  estimatedRepairCost: number,
  replacementValue: number,
  condition: number
): number {
  // If replacement value is provided, use it
  if (replacementValue > 0) {
    return replacementValue;
  }
  
  // Otherwise estimate based on repair cost and condition
  // Replacement typically costs 1.5-2x repair cost for poor condition items
  const multiplier = condition < 50 ? 2.0 : 1.5;
  return estimatedRepairCost * multiplier;
}

/**
 * Calculate rehabilitation cost (typically 40-60% of replacement)
 */
function calculateRehabilitationCost(replacementCost: number, condition: number): number {
  // Better condition = lower rehab cost percentage
  const rehabPercentage = condition > 60 ? 0.4 : condition > 40 ? 0.5 : 0.6;
  return replacementCost * rehabPercentage;
}

/**
 * Calculate life extension from strategy
 */
function calculateLifeExtension(
  strategy: Strategy,
  estimatedServiceLife: number,
  currentCondition: number
): number {
  switch (strategy) {
    case "replace":
      return estimatedServiceLife; // Full new life
    case "rehabilitate":
      return Math.floor(estimatedServiceLife * 0.6); // 60% of full life
    case "defer":
    case "do_nothing":
      return 0;
  }
}

/**
 * Calculate condition improvement from strategy
 */
function calculateConditionImprovement(strategy: Strategy, currentCondition: number): number {
  switch (strategy) {
    case "replace":
      return 100 - currentCondition; // Restore to 100%
    case "rehabilitate":
      return Math.min(40, 85 - currentCondition); // Improve to ~85% max
    case "defer":
    case "do_nothing":
      return 0;
  }
}

/**
 * Calculate risk reduction from strategy
 */
function calculateRiskReduction(
  strategy: Strategy,
  currentCondition: number,
  criticalityFactor: number = 1.0
): number {
  const baseRisk = (100 - currentCondition) * criticalityFactor;
  
  switch (strategy) {
    case "replace":
      return baseRisk * 0.95; // 95% risk reduction
    case "rehabilitate":
      return baseRisk * 0.7; // 70% risk reduction
    case "defer":
      return baseRisk * 0.1; // 10% temporary risk reduction
    case "do_nothing":
      return 0;
  }
}

/**
 * Calculate failure cost avoided by taking action
 */
function calculateFailureCostAvoided(
  replacementCost: number,
  currentCondition: number,
  strategy: Strategy
): number {
  if (strategy === "do_nothing") return 0;
  
  // Probability of failure increases as condition decreases
  const failureProbability = currentCondition < 30 ? 0.8 : currentCondition < 50 ? 0.4 : 0.1;
  
  // Failure cost includes replacement + emergency premium + downtime
  const failureCost = replacementCost * 1.5;
  
  return failureCost * failureProbability;
}

/**
 * Calculate maintenance savings from strategy
 */
function calculateMaintenanceSavings(
  replacementCost: number,
  strategy: Strategy,
  timeHorizon: number
): number {
  // Annual maintenance as % of replacement value
  const annualMaintenanceRate = 0.02; // 2% per year
  
  switch (strategy) {
    case "replace":
      // New components require less maintenance
      return replacementCost * annualMaintenanceRate * 0.5 * timeHorizon;
    case "rehabilitate":
      return replacementCost * annualMaintenanceRate * 0.3 * timeHorizon;
    case "defer":
    case "do_nothing":
      return 0;
  }
}

/**
 * Calculate present value using discount rate
 */
function calculatePresentValue(futureCost: number, years: number, discountRate: number): number {
  return futureCost / Math.pow(1 + discountRate, years);
}

/**
 * Generate strategy options for a component
 */
export async function generateStrategyOptions(
  projectId: number,
  componentCode: string,
  config: OptimizationConfig
): Promise<StrategyOption[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get component details and latest assessment
  const componentData = await db
    .select({
      code: buildingComponents.code,
      name: buildingComponents.name,
      expectedUsefulLife: assessments.expectedUsefulLife,
      condition: assessments.condition,
      estimatedRepairCost: assessments.estimatedRepairCost,
      replacementValue: assessments.replacementValue,
      actionYear: assessments.actionYear,
    })
    .from(buildingComponents)
    .leftJoin(
      assessments,
      and(
        eq(assessments.componentCode, buildingComponents.code),
        eq(assessments.projectId, projectId)
      )
    )
    .where(eq(buildingComponents.code, componentCode))
    .limit(1);

  if (!componentData.length || !componentData[0]) {
    throw new Error(`Component ${componentCode} not found`);
  }

  const component = componentData[0];
  const currentYear = new Date().getFullYear();
  // Parse condition from enum to percentage
  let condition = 50;
  if (component.condition === "good") condition = 90;
  else if (component.condition === "fair") condition = 65;
  else if (component.condition === "poor") condition = 30;
  else if (component.condition === "not_assessed") condition = 50;
  const repairCost = component.estimatedRepairCost || 10000;
  const replacementValue = component.replacementValue || 0;
  const esl = component.expectedUsefulLife || 25;
  const actionYear = component.actionYear || currentYear + 1;

  const replacementCost = calculateReplacementCost(repairCost, replacementValue, condition);
  const rehabCost = calculateRehabilitationCost(replacementCost, condition);

  const strategies: StrategyOption[] = [];

  // Strategy 1: Replace
  const replaceLifeExtension = calculateLifeExtension("replace", esl, condition);
  const replaceConditionImprovement = calculateConditionImprovement("replace", condition);
  const replaceRiskReduction = calculateRiskReduction("replace", condition);
  const replaceFailureCostAvoided = calculateFailureCostAvoided(
    replacementCost,
    condition,
    "replace"
  );
  const replaceMaintenanceSavings = calculateMaintenanceSavings(
    replacementCost,
    "replace",
    config.timeHorizon
  );
  const replaceBenefit =
    replaceFailureCostAvoided + replaceMaintenanceSavings + replaceConditionImprovement * 100;
  const replacePV = calculatePresentValue(
    replacementCost,
    actionYear - currentYear,
    config.discountRate
  );

  strategies.push({
    componentCode: component.code,
    componentName: component.name,
    currentCondition: condition,
    strategy: "replace",
    actionYear,
    strategyCost: replacementCost,
    presentValueCost: replacePV,
    lifeExtension: replaceLifeExtension,
    conditionImprovement: replaceConditionImprovement,
    riskReduction: replaceRiskReduction,
    failureCostAvoided: replaceFailureCostAvoided,
    maintenanceSavings: replaceMaintenanceSavings,
    priorityScore: replaceBenefit / replacementCost,
    costEffectiveness: replaceBenefit / replacementCost,
  });

  // Strategy 2: Rehabilitate
  const rehabLifeExtension = calculateLifeExtension("rehabilitate", esl, condition);
  const rehabConditionImprovement = calculateConditionImprovement("rehabilitate", condition);
  const rehabRiskReduction = calculateRiskReduction("rehabilitate", condition);
  const rehabFailureCostAvoided = calculateFailureCostAvoided(
    replacementCost,
    condition,
    "rehabilitate"
  );
  const rehabMaintenanceSavings = calculateMaintenanceSavings(
    replacementCost,
    "rehabilitate",
    config.timeHorizon
  );
  const rehabBenefit =
    rehabFailureCostAvoided + rehabMaintenanceSavings + rehabConditionImprovement * 100;
  const rehabPV = calculatePresentValue(rehabCost, actionYear - currentYear, config.discountRate);

  strategies.push({
    componentCode: component.code,
    componentName: component.name,
    currentCondition: condition,
    strategy: "rehabilitate",
    actionYear,
    strategyCost: rehabCost,
    presentValueCost: rehabPV,
    lifeExtension: rehabLifeExtension,
    conditionImprovement: rehabConditionImprovement,
    riskReduction: rehabRiskReduction,
    failureCostAvoided: rehabFailureCostAvoided,
    maintenanceSavings: rehabMaintenanceSavings,
    priorityScore: rehabBenefit / rehabCost,
    costEffectiveness: rehabBenefit / rehabCost,
  });

  // Strategy 3: Defer (delay action by 3-5 years)
  const deferYears = 3;
  const deferredActionYear = actionYear + deferYears;
  const deferCost = replacementCost * 0.1; // Minimal maintenance to defer
  const deferPV = calculatePresentValue(deferCost, deferredActionYear - currentYear, config.discountRate);

  strategies.push({
    componentCode: component.code,
    componentName: component.name,
    currentCondition: condition,
    strategy: "defer",
    actionYear: deferredActionYear,
    deferralYears: deferYears,
    strategyCost: deferCost,
    presentValueCost: deferPV,
    lifeExtension: 0,
    conditionImprovement: 0,
    riskReduction: calculateRiskReduction("defer", condition),
    failureCostAvoided: 0,
    maintenanceSavings: 0,
    priorityScore: 0.1,
    costEffectiveness: 0.1,
  });

  // Strategy 4: Do Nothing
  strategies.push({
    componentCode: component.code,
    componentName: component.name,
    currentCondition: condition,
    strategy: "do_nothing",
    actionYear: currentYear,
    strategyCost: 0,
    presentValueCost: 0,
    lifeExtension: 0,
    conditionImprovement: 0,
    riskReduction: 0,
    failureCostAvoided: 0,
    maintenanceSavings: 0,
    priorityScore: 0,
    costEffectiveness: 0,
  });

  return strategies;
}

/**
 * Compare strategies for a single component
 */
export async function compareStrategies(
  projectId: number,
  componentCode: string,
  config: OptimizationConfig
): Promise<{
  component: string;
  strategies: StrategyOption[];
  recommended: StrategyOption;
}> {
  const strategies = await generateStrategyOptions(projectId, componentCode, config);

  // Determine recommended strategy based on optimization goal
  let recommended: StrategyOption;

  switch (config.optimizationGoal) {
    case "minimize_cost":
      recommended = strategies.reduce((min, s) =>
        s.presentValueCost < min.presentValueCost ? s : min
      );
      break;
    case "maximize_ci":
      recommended = strategies.reduce((max, s) =>
        s.conditionImprovement > max.conditionImprovement ? s : max
      );
      break;
    case "maximize_roi":
      recommended = strategies.reduce((max, s) => (s.costEffectiveness > max.costEffectiveness ? s : max));
      break;
    case "minimize_risk":
      recommended = strategies.reduce((max, s) => (s.riskReduction > max.riskReduction ? s : max));
      break;
    default:
      recommended = strategies[0]!;
  }

  return {
    component: componentCode,
    strategies,
    recommended,
  };
}

/**
 * Calculate NPV for a set of strategies
 */
function calculateNPV(strategies: StrategyOption[], discountRate: number): number {
  const totalCost = strategies.reduce((sum, s) => sum + s.presentValueCost, 0);
  const totalBenefit = strategies.reduce(
    (sum, s) => sum + s.failureCostAvoided + s.maintenanceSavings,
    0
  );
  return totalBenefit - totalCost;
}

/**
 * Calculate ROI for a set of strategies
 */
function calculateROI(strategies: StrategyOption[]): number {
  const totalCost = strategies.reduce((sum, s) => sum + s.strategyCost, 0);
  const totalBenefit = strategies.reduce(
    (sum, s) => sum + s.failureCostAvoided + s.maintenanceSavings,
    0
  );
  if (totalCost === 0) return 0;
  return ((totalBenefit - totalCost) / totalCost) * 100;
}

/**
 * Calculate payback period
 */
function calculatePaybackPeriod(strategies: StrategyOption[], timeHorizon: number): number {
  const totalCost = strategies.reduce((sum, s) => sum + s.strategyCost, 0);
  const annualBenefit = strategies.reduce(
    (sum, s) => sum + (s.failureCostAvoided + s.maintenanceSavings) / timeHorizon,
    0
  );
  if (annualBenefit === 0) return 999;
  return totalCost / annualBenefit;
}

/**
 * Optimize portfolio under budget constraint
 */
export async function optimizePortfolio(
  projectId: number,
  config: OptimizationConfig
): Promise<OptimizationResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all components with assessments for this project
  const components = await db
    .select({
      code: buildingComponents.code,
      name: buildingComponents.name,
      condition: assessments.condition,
      estimatedRepairCost: assessments.estimatedRepairCost,
      replacementValue: assessments.replacementValue,
    })
    .from(buildingComponents)
    .innerJoin(
      assessments,
      and(
        eq(assessments.componentCode, buildingComponents.code),
        eq(assessments.projectId, projectId)
      )
    );

  if (!components.length) {
    throw new Error("No assessed components found for project");
  }

  // Generate strategy options for all components
  const allStrategyOptions: StrategyOption[][] = [];
  for (const component of components) {
    const options = await generateStrategyOptions(projectId, component.code, config);
    allStrategyOptions.push(options);
  }

  // Select optimal strategy for each component based on goal
  const selectedStrategies: StrategyOption[] = [];
  const deferredComponents: string[] = [];

  for (const options of allStrategyOptions) {
    let selected: StrategyOption;

    switch (config.optimizationGoal) {
      case "maximize_roi":
        // Sort by cost-effectiveness and select best
        selected = options.sort((a, b) => b.costEffectiveness - a.costEffectiveness)[0]!;
        break;
      case "maximize_ci":
        selected = options.sort((a, b) => b.conditionImprovement - a.conditionImprovement)[0]!;
        break;
      case "minimize_risk":
        selected = options.sort((a, b) => b.riskReduction - a.riskReduction)[0]!;
        break;
      case "minimize_cost":
        selected = options.sort((a, b) => a.presentValueCost - b.presentValueCost)[0]!;
        break;
      default:
        selected = options[0]!;
    }

    selectedStrategies.push(selected);
    if (selected.strategy === "defer" || selected.strategy === "do_nothing") {
      deferredComponents.push(selected.componentCode);
    }
  }

  // Apply budget constraint if specified
  if (config.budgetConstraint && config.budgetType === "hard") {
    // Sort by priority score (benefit per dollar)
    selectedStrategies.sort((a, b) => b.priorityScore - a.priorityScore);

    let cumulativeCost = 0;
    const budgetConstrainedStrategies: StrategyOption[] = [];

    for (const strategy of selectedStrategies) {
      if (cumulativeCost + strategy.strategyCost <= config.budgetConstraint) {
        budgetConstrainedStrategies.push(strategy);
        cumulativeCost += strategy.strategyCost;
      } else {
        // Replace with defer or do_nothing
        const deferOption = allStrategyOptions
          .find((opts) => opts[0]?.componentCode === strategy.componentCode)
          ?.find((opt) => opt.strategy === "defer");
        if (deferOption) {
          budgetConstrainedStrategies.push(deferOption);
          deferredComponents.push(deferOption.componentCode);
        }
      }
    }

    selectedStrategies.length = 0;
    selectedStrategies.push(...budgetConstrainedStrategies);
  }

  // Calculate current and projected metrics
  const currentCI =
    components.reduce((sum, c) => {
      let cond = 50;
      if (c.condition === "good") cond = 90;
      else if (c.condition === "fair") cond = 65;
      else if (c.condition === "poor") cond = 30;
      return sum + cond;
    }, 0) /
    components.length;

  const projectedCI =
    selectedStrategies.reduce((sum, s) => sum + (s.currentCondition + s.conditionImprovement), 0) /
    selectedStrategies.length;

  const totalReplacementValue = components.reduce(
    (sum, c) => sum + (c.replacementValue || 10000),
    0
  );
  const totalRepairCost = components.reduce(
    (sum, c) => sum + (c.estimatedRepairCost || 0),
    0
  );

  const currentFCI = totalReplacementValue > 0 ? (totalRepairCost / totalReplacementValue) * 100 : 0;

  const projectedRepairCost = selectedStrategies.reduce(
    (sum, s) => sum + (s.strategy === "do_nothing" ? s.strategyCost : 0),
    0
  );
  const projectedFCI =
    totalReplacementValue > 0 ? (projectedRepairCost / totalReplacementValue) * 100 : 0;

  const currentRiskScore = components.reduce(
    (sum, c) => {
      let cond = 50;
      if (c.condition === "good") cond = 90;
      else if (c.condition === "fair") cond = 65;
      else if (c.condition === "poor") cond = 30;
      return sum + (100 - cond);
    },
    0
  );
  const projectedRiskScore = currentRiskScore - selectedStrategies.reduce((sum, s) => sum + s.riskReduction, 0);

  const totalCost = selectedStrategies.reduce((sum, s) => sum + s.strategyCost, 0);
  const totalBenefit = selectedStrategies.reduce(
    (sum, s) => sum + s.failureCostAvoided + s.maintenanceSavings,
    0
  );

  return {
    totalCost,
    totalBenefit,
    netPresentValue: calculateNPV(selectedStrategies, config.discountRate),
    returnOnInvestment: calculateROI(selectedStrategies),
    paybackPeriod: calculatePaybackPeriod(selectedStrategies, config.timeHorizon),
    currentCI,
    projectedCI,
    ciImprovement: projectedCI - currentCI,
    currentFCI,
    projectedFCI,
    fciImprovement: currentFCI - projectedFCI,
    currentRiskScore,
    projectedRiskScore,
    riskReduction: currentRiskScore - projectedRiskScore,
    selectedStrategies,
    deferredComponents,
  };
}
