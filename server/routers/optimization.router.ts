import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createOptimizationScenario,
  updateOptimizationScenario,
  getOptimizationScenario,
  listOptimizationScenarios,
  deleteOptimizationScenario,
  saveScenarioStrategies,
  getScenarioStrategies,
  saveCashFlowProjections,
  getCashFlowProjections,
} from "../db/optimization.db";
import {
  optimizePortfolio,
  compareStrategies,
  generateStrategyOptions,
  type OptimizationConfig,
} from "../services/optimization.service";
import * as lpOptimizer from "../services/lpOptimizer.service";

/**
 * Optimization router for scenario modeling and strategy comparison
 */
export const optimizationRouter = router({
  /**
   * Create a new optimization scenario
   */
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        budgetConstraint: z.number().optional(),
        budgetType: z.enum(["hard", "soft"]).default("hard"),
        timeHorizon: z.number().min(1).max(50),
        discountRate: z.number().min(0).max(0.2).default(0.03),
        optimizationGoal: z
          .enum(["minimize_cost", "maximize_ci", "maximize_roi", "minimize_risk"])
          .default("maximize_roi"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const scenarioId = await createOptimizationScenario({
        ...input,
        userId: ctx.user.id,
        status: "draft",
      });

      return { scenarioId };
    }),

  /**
   * Run optimization for a scenario
   */
  run: protectedProcedure
    .input(
      z.object({
        scenarioId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const scenario = await getOptimizationScenario(input.scenarioId);
      if (!scenario) {
        throw new Error("Scenario not found");
      }

      // Verify user owns the scenario's project
      // (In production, add project ownership check here)

      const config: OptimizationConfig = {
        projectId: scenario.projectId,
        budgetConstraint: scenario.budgetConstraint,
        budgetType: scenario.budgetType,
        timeHorizon: scenario.timeHorizon,
        discountRate: scenario.discountRate,
        optimizationGoal: scenario.optimizationGoal,
      };

      // Run portfolio optimization
      const result = await optimizePortfolio(scenario.projectId, config);

      // Update scenario with results
      await updateOptimizationScenario(input.scenarioId, {
        totalCost: result.totalCost,
        totalBenefit: result.totalBenefit,
        netPresentValue: result.netPresentValue,
        returnOnInvestment: result.returnOnInvestment,
        paybackPeriod: result.paybackPeriod,
        currentCI: result.currentCI,
        projectedCI: result.projectedCI,
        ciImprovement: result.ciImprovement,
        currentFCI: result.currentFCI,
        projectedFCI: result.projectedFCI,
        fciImprovement: result.fciImprovement,
        currentRiskScore: result.currentRiskScore,
        projectedRiskScore: result.projectedRiskScore,
        riskReduction: result.riskReduction,
        status: "optimized",
      });

      // Save selected strategies
      await saveScenarioStrategies(
        result.selectedStrategies.map((s) => ({
          scenarioId: input.scenarioId,
          componentCode: s.componentCode,
          strategy: s.strategy,
          actionYear: s.actionYear,
          deferralYears: s.deferralYears,
          strategyCost: s.strategyCost,
          presentValueCost: s.presentValueCost,
          lifeExtension: s.lifeExtension,
          conditionImprovement: s.conditionImprovement,
          riskReduction: s.riskReduction,
          failureCostAvoided: s.failureCostAvoided,
          maintenanceSavings: s.maintenanceSavings,
          priorityScore: s.priorityScore,
          selected: 1,
        }))
      );

      // Generate cash flow projections
      const currentYear = new Date().getFullYear();
      const projections = [];
      let cumulativeCashFlow = 0;

      for (let i = 0; i <= scenario.timeHorizon; i++) {
        const year = currentYear + i;

        // Calculate costs for this year
        const strategiesThisYear = result.selectedStrategies.filter(
          (s) => s.actionYear === year
        );
        const capitalExpenditure = strategiesThisYear.reduce(
          (sum, s) => sum + s.strategyCost,
          0
        );
        const maintenanceCost = result.totalCost * 0.02; // 2% annual maintenance
        const operatingCost = 0;
        const totalCost = capitalExpenditure + maintenanceCost + operatingCost;

        // Calculate benefits for this year
        const costAvoidance = strategiesThisYear.reduce(
          (sum, s) => sum + s.failureCostAvoided,
          0
        );
        const efficiencyGains = strategiesThisYear.reduce(
          (sum, s) => sum + s.maintenanceSavings / scenario.timeHorizon,
          0
        );
        const totalBenefit = costAvoidance + efficiencyGains;

        const netCashFlow = totalBenefit - totalCost;
        cumulativeCashFlow += netCashFlow;

        // Calculate projected CI/FCI for this year
        const yearsElapsed = i;
        const progressRatio = scenario.timeHorizon > 0 ? yearsElapsed / scenario.timeHorizon : 0;
        const projectedCI =
          result.currentCI + result.ciImprovement * progressRatio;
        const projectedFCI =
          result.currentFCI - result.fciImprovement * progressRatio;

        projections.push({
          scenarioId: input.scenarioId,
          year,
          capitalExpenditure,
          maintenanceCost,
          operatingCost,
          totalCost,
          costAvoidance,
          efficiencyGains,
          totalBenefit,
          netCashFlow,
          cumulativeCashFlow,
          projectedCI,
          projectedFCI,
        });
      }

      await saveCashFlowProjections(projections);

      return {
        ...result,
        deferredComponents: result.deferredComponents,
      };
    }),

  /**
   * Get optimization scenario by ID
   */
  get: protectedProcedure
    .input(
      z.object({
        scenarioId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const scenario = await getOptimizationScenario(input.scenarioId);
      if (!scenario) {
        throw new Error("Scenario not found");
      }

      const strategies = await getScenarioStrategies(input.scenarioId);
      const cashFlows = await getCashFlowProjections(input.scenarioId);

      return {
        scenario,
        strategies,
        cashFlows,
      };
    }),

  /**
   * List optimization scenarios for a project
   */
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await listOptimizationScenarios(input.projectId);
    }),

  /**
   * Delete optimization scenario
   */
  delete: protectedProcedure
    .input(
      z.object({
        scenarioId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await deleteOptimizationScenario(input.scenarioId);
      return { success: true };
    }),

  /**
   * Compare strategies for a single component
   */
  compareStrategies: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        componentCode: z.string(),
        budgetConstraint: z.number().optional(),
        budgetType: z.enum(["hard", "soft"]).default("hard"),
        timeHorizon: z.number().min(1).max(50).default(10),
        discountRate: z.number().min(0).max(0.2).default(0.03),
        optimizationGoal: z
          .enum(["minimize_cost", "maximize_ci", "maximize_roi", "minimize_risk"])
          .default("maximize_roi"),
      })
    )
    .query(async ({ input }) => {
      const config: OptimizationConfig = {
        projectId: input.projectId,
        budgetConstraint: input.budgetConstraint,
        budgetType: input.budgetType,
        timeHorizon: input.timeHorizon,
        discountRate: input.discountRate,
        optimizationGoal: input.optimizationGoal,
      };

      return await compareStrategies(input.projectId, input.componentCode, config);
    }),

  /**
   * Get strategy options for a component
   */
  getStrategyOptions: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        componentCode: z.string(),
        budgetConstraint: z.number().optional(),
        budgetType: z.enum(["hard", "soft"]).default("hard"),
        timeHorizon: z.number().min(1).max(50).default(10),
        discountRate: z.number().min(0).max(0.2).default(0.03),
        optimizationGoal: z
          .enum(["minimize_cost", "maximize_ci", "maximize_roi", "minimize_risk"])
          .default("maximize_roi"),
      })
    )
    .query(async ({ input }) => {
      const config: OptimizationConfig = {
        projectId: input.projectId,
        budgetConstraint: input.budgetConstraint,
        budgetType: input.budgetType,
        timeHorizon: input.timeHorizon,
        discountRate: input.discountRate,
        optimizationGoal: input.optimizationGoal,
      };

      return await generateStrategyOptions(input.projectId, input.componentCode, config);
    }),

  /**
   * Update scenario status
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        scenarioId: z.number(),
        status: z.enum(["draft", "optimized", "approved", "implemented"]),
      })
    )
    .mutation(async ({ input }) => {
      await updateOptimizationScenario(input.scenarioId, {
        status: input.status,
      });
      return { success: true };
    }),

  /**
   * Get current portfolio metrics
   */
  getPortfolioMetrics: protectedProcedure.query(async () => {
    return await lpOptimizer.getPortfolioMetrics();
  }),

  /**
   * Optimize portfolio using Linear Programming
   */
  optimizePortfolioLP: protectedProcedure
    .input(
      z.object({
        maxBudget: z.number().positive(),
        minProjects: z.number().int().min(0).optional(),
        maxProjects: z.number().int().positive().optional(),
        requiredProjectIds: z.array(z.number()).optional(),
        excludedProjectIds: z.array(z.number()).optional(),
        minCIImprovement: z.number().min(0).optional(),
        maxRiskTolerance: z.number().min(0).max(10).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await lpOptimizer.optimizePortfolio(input);
    }),

  /**
   * Analyze budget sensitivity
   */
  analyzeSensitivity: protectedProcedure
    .input(
      z.object({
        baseBudget: z.number().positive(),
        rangePercent: z.number().min(0).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      return await lpOptimizer.analyzeSensitivity(input.baseBudget, input.rangePercent);
    }),

  /**
   * Calculate Pareto frontier
   */
  getParetoFrontier: protectedProcedure.query(async () => {
    return await lpOptimizer.calculateParetoFrontier();
  }),

  /**
   * Get cost-effectiveness ranking
   */
  getCostEffectivenessRanking: protectedProcedure.query(async () => {
    return await lpOptimizer.getCostEffectivenessRanking();
  }),
});
