import { getDb } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Database helper functions for optimization scenarios
 */

export interface OptimizationScenario {
  id?: number;
  projectId: number;
  userId: number;
  name: string;
  description?: string;
  budgetConstraint?: number;
  budgetType: "hard" | "soft";
  timeHorizon: number;
  discountRate: number;
  optimizationGoal: "minimize_cost" | "maximize_ci" | "maximize_roi" | "minimize_risk";
  totalCost?: number;
  totalBenefit?: number;
  netPresentValue?: number;
  returnOnInvestment?: number;
  paybackPeriod?: number;
  currentCI?: number;
  projectedCI?: number;
  ciImprovement?: number;
  currentFCI?: number;
  projectedFCI?: number;
  fciImprovement?: number;
  currentRiskScore?: number;
  projectedRiskScore?: number;
  riskReduction?: number;
  status: "draft" | "optimized" | "approved" | "implemented";
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ScenarioStrategy {
  id?: number;
  scenarioId: number;
  componentCode: string;
  strategy: "replace" | "rehabilitate" | "defer" | "do_nothing";
  actionYear: number;
  deferralYears?: number;
  strategyCost: number;
  presentValueCost?: number;
  lifeExtension?: number;
  conditionImprovement?: number;
  riskReduction?: number;
  failureCostAvoided?: number;
  maintenanceSavings?: number;
  priorityScore?: number;
  selected: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CashFlowProjection {
  id?: number;
  scenarioId: number;
  year: number;
  capitalExpenditure: number;
  maintenanceCost: number;
  operatingCost: number;
  totalCost: number;
  costAvoidance: number;
  efficiencyGains: number;
  totalBenefit: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
  projectedCI?: number;
  projectedFCI?: number;
  createdAt?: Date;
}

/**
 * Create a new optimization scenario
 */
export async function createOptimizationScenario(
  scenario: OptimizationScenario
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(sql`
    INSERT INTO optimization_scenarios (
      projectId, userId, name, description, budgetConstraint, budgetType,
      timeHorizon, discountRate, optimizationGoal, status
    ) VALUES (
      ${scenario.projectId},
      ${scenario.userId},
      ${scenario.name},
      ${scenario.description || null},
      ${scenario.budgetConstraint || null},
      ${scenario.budgetType},
      ${scenario.timeHorizon},
      ${scenario.discountRate},
      ${scenario.optimizationGoal},
      ${scenario.status}
    )
  `);

  return Number(result[0].insertId);
}

/**
 * Update optimization scenario with results
 */
export async function updateOptimizationScenario(
  scenarioId: number,
  updates: Partial<OptimizationScenario>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push("description = ?");
    values.push(updates.description);
  }
  if (updates.budgetConstraint !== undefined) {
    fields.push("budgetConstraint = ?");
    values.push(updates.budgetConstraint);
  }
  if (updates.totalCost !== undefined) {
    fields.push("totalCost = ?");
    values.push(updates.totalCost);
  }
  if (updates.totalBenefit !== undefined) {
    fields.push("totalBenefit = ?");
    values.push(updates.totalBenefit);
  }
  if (updates.netPresentValue !== undefined) {
    fields.push("netPresentValue = ?");
    values.push(updates.netPresentValue);
  }
  if (updates.returnOnInvestment !== undefined) {
    fields.push("returnOnInvestment = ?");
    values.push(updates.returnOnInvestment);
  }
  if (updates.paybackPeriod !== undefined) {
    fields.push("paybackPeriod = ?");
    values.push(updates.paybackPeriod);
  }
  if (updates.currentCI !== undefined) {
    fields.push("currentCI = ?");
    values.push(updates.currentCI);
  }
  if (updates.projectedCI !== undefined) {
    fields.push("projectedCI = ?");
    values.push(updates.projectedCI);
  }
  if (updates.ciImprovement !== undefined) {
    fields.push("ciImprovement = ?");
    values.push(updates.ciImprovement);
  }
  if (updates.currentFCI !== undefined) {
    fields.push("currentFCI = ?");
    values.push(updates.currentFCI);
  }
  if (updates.projectedFCI !== undefined) {
    fields.push("projectedFCI = ?");
    values.push(updates.projectedFCI);
  }
  if (updates.fciImprovement !== undefined) {
    fields.push("fciImprovement = ?");
    values.push(updates.fciImprovement);
  }
  if (updates.currentRiskScore !== undefined) {
    fields.push("currentRiskScore = ?");
    values.push(updates.currentRiskScore);
  }
  if (updates.projectedRiskScore !== undefined) {
    fields.push("projectedRiskScore = ?");
    values.push(updates.projectedRiskScore);
  }
  if (updates.riskReduction !== undefined) {
    fields.push("riskReduction = ?");
    values.push(updates.riskReduction);
  }
  if (updates.status !== undefined) {
    fields.push("status = ?");
    values.push(updates.status);
  }

  if (fields.length === 0) return;

  // Build dynamic UPDATE query using sql template
  const setParts: any[] = [];
  
  if (updates.name !== undefined) setParts.push(sql`name = ${updates.name}`);
  if (updates.description !== undefined) setParts.push(sql`description = ${updates.description}`);
  if (updates.budgetConstraint !== undefined) setParts.push(sql`budgetConstraint = ${updates.budgetConstraint}`);
  if (updates.totalCost !== undefined) setParts.push(sql`totalCost = ${updates.totalCost}`);
  if (updates.totalBenefit !== undefined) setParts.push(sql`totalBenefit = ${updates.totalBenefit}`);
  if (updates.netPresentValue !== undefined) setParts.push(sql`netPresentValue = ${updates.netPresentValue}`);
  if (updates.returnOnInvestment !== undefined) setParts.push(sql`returnOnInvestment = ${updates.returnOnInvestment}`);
  if (updates.paybackPeriod !== undefined) setParts.push(sql`paybackPeriod = ${updates.paybackPeriod}`);
  if (updates.currentCI !== undefined) setParts.push(sql`currentCI = ${updates.currentCI}`);
  if (updates.projectedCI !== undefined) setParts.push(sql`projectedCI = ${updates.projectedCI}`);
  if (updates.ciImprovement !== undefined) setParts.push(sql`ciImprovement = ${updates.ciImprovement}`);
  if (updates.currentFCI !== undefined) setParts.push(sql`currentFCI = ${updates.currentFCI}`);
  if (updates.projectedFCI !== undefined) setParts.push(sql`projectedFCI = ${updates.projectedFCI}`);
  if (updates.fciImprovement !== undefined) setParts.push(sql`fciImprovement = ${updates.fciImprovement}`);
  if (updates.currentRiskScore !== undefined) setParts.push(sql`currentRiskScore = ${updates.currentRiskScore}`);
  if (updates.projectedRiskScore !== undefined) setParts.push(sql`projectedRiskScore = ${updates.projectedRiskScore}`);
  if (updates.riskReduction !== undefined) setParts.push(sql`riskReduction = ${updates.riskReduction}`);
  if (updates.status !== undefined) setParts.push(sql`status = ${updates.status}`);

  await db.execute(sql`UPDATE optimization_scenarios SET ${sql.join(setParts, sql`, `)} WHERE id = ${scenarioId}`);
}

/**
 * Get optimization scenario by ID
 */
export async function getOptimizationScenario(
  scenarioId: number
): Promise<OptimizationScenario | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(sql`
    SELECT * FROM optimization_scenarios WHERE id = ${scenarioId}
  `);

  const rows = Array.isArray(result[0]) ? result[0] : [];
  if (!rows.length) return null;

  const row = rows[0] as any;
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    name: row.name,
    description: row.description,
    budgetConstraint: row.budgetConstraint ? parseFloat(row.budgetConstraint) : undefined,
    budgetType: row.budgetType,
    timeHorizon: row.timeHorizon,
    discountRate: parseFloat(row.discountRate),
    optimizationGoal: row.optimizationGoal,
    totalCost: row.totalCost ? parseFloat(row.totalCost) : undefined,
    totalBenefit: row.totalBenefit ? parseFloat(row.totalBenefit) : undefined,
    netPresentValue: row.netPresentValue ? parseFloat(row.netPresentValue) : undefined,
    returnOnInvestment: row.returnOnInvestment ? parseFloat(row.returnOnInvestment) : undefined,
    paybackPeriod: row.paybackPeriod ? parseFloat(row.paybackPeriod) : undefined,
    currentCI: row.currentCI ? parseFloat(row.currentCI) : undefined,
    projectedCI: row.projectedCI ? parseFloat(row.projectedCI) : undefined,
    ciImprovement: row.ciImprovement ? parseFloat(row.ciImprovement) : undefined,
    currentFCI: row.currentFCI ? parseFloat(row.currentFCI) : undefined,
    projectedFCI: row.projectedFCI ? parseFloat(row.projectedFCI) : undefined,
    fciImprovement: row.fciImprovement ? parseFloat(row.fciImprovement) : undefined,
    currentRiskScore: row.currentRiskScore ? parseFloat(row.currentRiskScore) : undefined,
    projectedRiskScore: row.projectedRiskScore ? parseFloat(row.projectedRiskScore) : undefined,
    riskReduction: row.riskReduction ? parseFloat(row.riskReduction) : undefined,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * List optimization scenarios for a project
 */
export async function listOptimizationScenarios(
  projectId: number
): Promise<OptimizationScenario[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(sql`
    SELECT * FROM optimization_scenarios WHERE projectId = ${projectId} ORDER BY createdAt DESC
  `);

  const rows = Array.isArray(result[0]) ? result[0] : [];
  return rows.map((row: any) => ({
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    name: row.name,
    description: row.description,
    budgetConstraint: row.budgetConstraint ? parseFloat(row.budgetConstraint) : undefined,
    budgetType: row.budgetType,
    timeHorizon: row.timeHorizon,
    discountRate: parseFloat(row.discountRate),
    optimizationGoal: row.optimizationGoal,
    totalCost: row.totalCost ? parseFloat(row.totalCost) : undefined,
    totalBenefit: row.totalBenefit ? parseFloat(row.totalBenefit) : undefined,
    netPresentValue: row.netPresentValue ? parseFloat(row.netPresentValue) : undefined,
    returnOnInvestment: row.returnOnInvestment ? parseFloat(row.returnOnInvestment) : undefined,
    paybackPeriod: row.paybackPeriod ? parseFloat(row.paybackPeriod) : undefined,
    currentCI: row.currentCI ? parseFloat(row.currentCI) : undefined,
    projectedCI: row.projectedCI ? parseFloat(row.projectedCI) : undefined,
    ciImprovement: row.ciImprovement ? parseFloat(row.ciImprovement) : undefined,
    currentFCI: row.currentFCI ? parseFloat(row.currentFCI) : undefined,
    projectedFCI: row.projectedFCI ? parseFloat(row.projectedFCI) : undefined,
    fciImprovement: row.fciImprovement ? parseFloat(row.fciImprovement) : undefined,
    currentRiskScore: row.currentRiskScore ? parseFloat(row.currentRiskScore) : undefined,
    projectedRiskScore: row.projectedRiskScore ? parseFloat(row.projectedRiskScore) : undefined,
    riskReduction: row.riskReduction ? parseFloat(row.riskReduction) : undefined,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

/**
 * Delete optimization scenario
 */
export async function deleteOptimizationScenario(scenarioId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete related data first
  await db.execute(sql`DELETE FROM scenario_strategies WHERE scenarioId = ${scenarioId}`);
  await db.execute(sql`DELETE FROM cash_flow_projections WHERE scenarioId = ${scenarioId}`);
  await db.execute(sql`DELETE FROM optimization_scenarios WHERE id = ${scenarioId}`);
}

/**
 * Save scenario strategies
 */
export async function saveScenarioStrategies(
  strategies: ScenarioStrategy[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const strategy of strategies) {
    await db.execute(sql`
      INSERT INTO scenario_strategies (
        scenarioId, componentCode, strategy, actionYear, deferralYears,
        strategyCost, presentValueCost, lifeExtension, conditionImprovement,
        riskReduction, failureCostAvoided, maintenanceSavings, priorityScore, selected
      ) VALUES (
        ${strategy.scenarioId},
        ${strategy.componentCode},
        ${strategy.strategy},
        ${strategy.actionYear},
        ${strategy.deferralYears || 0},
        ${strategy.strategyCost},
        ${strategy.presentValueCost || 0},
        ${strategy.lifeExtension || 0},
        ${strategy.conditionImprovement || 0},
        ${strategy.riskReduction || 0},
        ${strategy.failureCostAvoided || 0},
        ${strategy.maintenanceSavings || 0},
        ${strategy.priorityScore || 0},
        ${strategy.selected}
      )
    `);
  }
}

/**
 * Get scenario strategies
 */
export async function getScenarioStrategies(
  scenarioId: number
): Promise<ScenarioStrategy[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(sql`
    SELECT * FROM scenario_strategies WHERE scenarioId = ${scenarioId} ORDER BY priorityScore DESC
  `);

  const rows = Array.isArray(result[0]) ? result[0] : [];
  return rows.map((row: any) => ({
    id: row.id,
    scenarioId: row.scenarioId,
    componentCode: row.componentCode,
    strategy: row.strategy,
    actionYear: row.actionYear,
    deferralYears: row.deferralYears,
    strategyCost: parseFloat(row.strategyCost),
    presentValueCost: row.presentValueCost ? parseFloat(row.presentValueCost) : undefined,
    lifeExtension: row.lifeExtension,
    conditionImprovement: row.conditionImprovement,
    riskReduction: row.riskReduction ? parseFloat(row.riskReduction) : undefined,
    failureCostAvoided: row.failureCostAvoided ? parseFloat(row.failureCostAvoided) : undefined,
    maintenanceSavings: row.maintenanceSavings ? parseFloat(row.maintenanceSavings) : undefined,
    priorityScore: row.priorityScore ? parseFloat(row.priorityScore) : undefined,
    selected: row.selected,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

/**
 * Save cash flow projections
 */
export async function saveCashFlowProjections(
  projections: CashFlowProjection[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const projection of projections) {
    await db.execute(sql`
      INSERT INTO cash_flow_projections (
        scenarioId, year, capitalExpenditure, maintenanceCost, operatingCost,
        totalCost, costAvoidance, efficiencyGains, totalBenefit, netCashFlow,
        cumulativeCashFlow, projectedCI, projectedFCI
      ) VALUES (
        ${projection.scenarioId},
        ${projection.year},
        ${projection.capitalExpenditure},
        ${projection.maintenanceCost},
        ${projection.operatingCost},
        ${projection.totalCost},
        ${projection.costAvoidance},
        ${projection.efficiencyGains},
        ${projection.totalBenefit},
        ${projection.netCashFlow},
        ${projection.cumulativeCashFlow},
        ${projection.projectedCI || null},
        ${projection.projectedFCI || null}
      )
    `);
  }
}

/**
 * Get cash flow projections
 */
export async function getCashFlowProjections(
  scenarioId: number
): Promise<CashFlowProjection[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(sql`
    SELECT * FROM cash_flow_projections WHERE scenarioId = ${scenarioId} ORDER BY year ASC
  `);

  const rows = Array.isArray(result[0]) ? result[0] : [];
  return rows.map((row: any) => ({
    id: row.id,
    scenarioId: row.scenarioId,
    year: row.year,
    capitalExpenditure: parseFloat(row.capitalExpenditure),
    maintenanceCost: parseFloat(row.maintenanceCost),
    operatingCost: parseFloat(row.operatingCost),
    totalCost: parseFloat(row.totalCost),
    costAvoidance: parseFloat(row.costAvoidance),
    efficiencyGains: parseFloat(row.efficiencyGains),
    totalBenefit: parseFloat(row.totalBenefit),
    netCashFlow: parseFloat(row.netCashFlow),
    cumulativeCashFlow: parseFloat(row.cumulativeCashFlow),
    projectedCI: row.projectedCI ? parseFloat(row.projectedCI) : undefined,
    projectedFCI: row.projectedFCI ? parseFloat(row.projectedFCI) : undefined,
    createdAt: row.createdAt,
  }));
}
