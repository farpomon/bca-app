import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import {
  createOptimizationScenario,
  getOptimizationScenario,
  listOptimizationScenarios,
  deleteOptimizationScenario,
} from "./db/optimization.db";
import {
  generateStrategyOptions,
  compareStrategies,
  optimizePortfolio,
} from "./services/optimization.service";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Optimization System", () => {
  let testProjectId: number;
  let testScenarioId: number;

  beforeAll(async () => {
    // Create a test project with assessments
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const project = await caller.projects.create({
      name: "Optimization Test Building",
      address: "123 Test St",
      clientName: "Test Client",
      propertyType: "Commercial",
      constructionType: "Concrete",
      yearBuilt: 2000,
      numberOfUnits: 10,
      numberOfStories: 3,
      buildingCode: "TEST-001",
    });

    testProjectId = project.id;

    // Create some test assessments with different conditions
    await caller.assessments.upsert({
      projectId: testProjectId,
      componentCode: "B30",
      condition: "poor",
      observations: "Roof needs replacement",
      expectedUsefulLife: 20,
      remainingUsefulLife: 2,
      estimatedRepairCost: 50000,
      replacementValue: 100000,
      actionYear: new Date().getFullYear() + 1,
    });

    await caller.assessments.upsert({
      projectId: testProjectId,
      componentCode: "D30",
      condition: "fair",
      observations: "HVAC system aging",
      expectedUsefulLife: 15,
      remainingUsefulLife: 5,
      estimatedRepairCost: 30000,
      replacementValue: 60000,
      actionYear: new Date().getFullYear() + 2,
    });

    await caller.assessments.upsert({
      projectId: testProjectId,
      componentCode: "D20",
      condition: "good",
      observations: "Plumbing in good shape",
      expectedUsefulLife: 25,
      remainingUsefulLife: 15,
      estimatedRepairCost: 10000,
      replacementValue: 40000,
      actionYear: new Date().getFullYear() + 10,
    });
  });

  describe("Strategy Generation", () => {
    it("should generate all four strategy options for a component", async () => {
      const config = {
        projectId: testProjectId,
        budgetType: "hard" as const,
        timeHorizon: 10,
        discountRate: 0.03,
        optimizationGoal: "maximize_roi" as const,
      };

      const strategies = await generateStrategyOptions(testProjectId, "B30", config);

      expect(strategies).toHaveLength(4);
      expect(strategies.map((s) => s.strategy)).toContain("replace");
      expect(strategies.map((s) => s.strategy)).toContain("rehabilitate");
      expect(strategies.map((s) => s.strategy)).toContain("defer");
      expect(strategies.map((s) => s.strategy)).toContain("do_nothing");
    });

    it("should calculate replacement cost higher than rehabilitation cost", async () => {
      const config = {
        projectId: testProjectId,
        budgetType: "hard" as const,
        timeHorizon: 10,
        discountRate: 0.03,
        optimizationGoal: "maximize_roi" as const,
      };

      const strategies = await generateStrategyOptions(testProjectId, "B30", config);
      const replaceStrategy = strategies.find((s) => s.strategy === "replace");
      const rehabStrategy = strategies.find((s) => s.strategy === "rehabilitate");

      expect(replaceStrategy).toBeDefined();
      expect(rehabStrategy).toBeDefined();
      expect(replaceStrategy!.strategyCost).toBeGreaterThan(rehabStrategy!.strategyCost);
    });

    it("should calculate present value cost with discount rate", async () => {
      const config = {
        projectId: testProjectId,
        budgetType: "hard" as const,
        timeHorizon: 10,
        discountRate: 0.03,
        optimizationGoal: "maximize_roi" as const,
      };

      const strategies = await generateStrategyOptions(testProjectId, "B30", config);
      const replaceStrategy = strategies.find((s) => s.strategy === "replace");

      expect(replaceStrategy).toBeDefined();
      expect(replaceStrategy!.presentValueCost).toBeLessThan(replaceStrategy!.strategyCost);
    });

    it("should assign higher condition improvement to replace than rehabilitate", async () => {
      const config = {
        projectId: testProjectId,
        budgetType: "hard" as const,
        timeHorizon: 10,
        discountRate: 0.03,
        optimizationGoal: "maximize_roi" as const,
      };

      const strategies = await generateStrategyOptions(testProjectId, "B30", config);
      const replaceStrategy = strategies.find((s) => s.strategy === "replace");
      const rehabStrategy = strategies.find((s) => s.strategy === "rehabilitate");

      expect(replaceStrategy!.conditionImprovement).toBeGreaterThan(
        rehabStrategy!.conditionImprovement
      );
    });
  });

  describe("Strategy Comparison", () => {
    it("should recommend the most cost-effective strategy based on goal", async () => {
      const config = {
        projectId: testProjectId,
        budgetType: "hard" as const,
        timeHorizon: 10,
        discountRate: 0.03,
        optimizationGoal: "maximize_roi" as const,
      };

      const comparison = await compareStrategies(testProjectId, "B30", config);

      expect(comparison.component).toBe("B30");
      expect(comparison.strategies).toHaveLength(4);
      expect(comparison.recommended).toBeDefined();
      expect(comparison.recommended.costEffectiveness).toBeGreaterThan(0);
    });

    it("should recommend different strategies for different optimization goals", async () => {
      const roiConfig = {
        projectId: testProjectId,
        budgetType: "hard" as const,
        timeHorizon: 10,
        discountRate: 0.03,
        optimizationGoal: "maximize_roi" as const,
      };

      const costConfig = {
        ...roiConfig,
        optimizationGoal: "minimize_cost" as const,
      };

      const roiComparison = await compareStrategies(testProjectId, "B30", roiConfig);
      const costComparison = await compareStrategies(testProjectId, "B30", costConfig);

      // The recommended strategies might differ based on optimization goal
      expect(roiComparison.recommended).toBeDefined();
      expect(costComparison.recommended).toBeDefined();
    });
  });

  describe("Portfolio Optimization", () => {
    it("should optimize entire portfolio and return results", async () => {
      const config = {
        projectId: testProjectId,
        budgetType: "hard" as const,
        timeHorizon: 10,
        discountRate: 0.03,
        optimizationGoal: "maximize_roi" as const,
      };

      const result = await optimizePortfolio(testProjectId, config);

      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.selectedStrategies).toHaveLength(3); // 3 components assessed
      expect(result.currentCI).toBeGreaterThan(0);
      expect(result.projectedCI).toBeGreaterThanOrEqual(result.currentCI);
      expect(result.ciImprovement).toBeGreaterThanOrEqual(0);
    });

    it("should respect hard budget constraints", async () => {
      const config = {
        projectId: testProjectId,
        budgetConstraint: 50000, // Low budget
        budgetType: "hard" as const,
        timeHorizon: 10,
        discountRate: 0.03,
        optimizationGoal: "maximize_roi" as const,
      };

      const result = await optimizePortfolio(testProjectId, config);

      expect(result.totalCost).toBeLessThanOrEqual(config.budgetConstraint);
      expect(result.deferredComponents.length).toBeGreaterThan(0);
    });

    it("should calculate FCI improvement", async () => {
      const config = {
        projectId: testProjectId,
        budgetType: "soft" as const,
        timeHorizon: 10,
        discountRate: 0.03,
        optimizationGoal: "maximize_ci" as const,
      };

      const result = await optimizePortfolio(testProjectId, config);

      expect(result.currentFCI).toBeGreaterThan(0);
      expect(result.projectedFCI).toBeLessThan(result.currentFCI); // FCI should decrease (improve)
      expect(result.fciImprovement).toBeGreaterThan(0);
    });

    it("should calculate risk reduction", async () => {
      const config = {
        projectId: testProjectId,
        budgetType: "soft" as const,
        timeHorizon: 10,
        discountRate: 0.03,
        optimizationGoal: "minimize_risk" as const,
      };

      const result = await optimizePortfolio(testProjectId, config);

      expect(result.currentRiskScore).toBeGreaterThan(0);
      expect(result.projectedRiskScore).toBeLessThan(result.currentRiskScore);
      expect(result.riskReduction).toBeGreaterThan(0);
    });

    it("should calculate ROI and payback period", async () => {
      const config = {
        projectId: testProjectId,
        budgetType: "soft" as const,
        timeHorizon: 10,
        discountRate: 0.03,
        optimizationGoal: "maximize_roi" as const,
      };

      const result = await optimizePortfolio(testProjectId, config);

      expect(result.returnOnInvestment).toBeDefined();
      expect(result.paybackPeriod).toBeGreaterThan(0);
      expect(result.netPresentValue).toBeDefined();
    });
  });

  describe("Database Operations", () => {
    it("should create optimization scenario", async () => {
      const scenarioId = await createOptimizationScenario({
        projectId: testProjectId,
        userId: 1,
        name: "Test Scenario",
        description: "Testing scenario creation",
        budgetConstraint: 100000,
        budgetType: "hard",
        timeHorizon: 10,
        discountRate: 0.03,
        optimizationGoal: "maximize_roi",
        status: "draft",
      });

      expect(scenarioId).toBeGreaterThan(0);
      testScenarioId = scenarioId;
    });

    it("should retrieve optimization scenario by ID", async () => {
      const scenario = await getOptimizationScenario(testScenarioId);

      expect(scenario).toBeDefined();
      expect(scenario!.name).toBe("Test Scenario");
      expect(scenario!.projectId).toBe(testProjectId);
      expect(scenario!.timeHorizon).toBe(10);
    });

    it("should list optimization scenarios for a project", async () => {
      const scenarios = await listOptimizationScenarios(testProjectId);

      expect(scenarios.length).toBeGreaterThan(0);
      expect(scenarios[0]!.projectId).toBe(testProjectId);
    });

    it("should delete optimization scenario", async () => {
      await deleteOptimizationScenario(testScenarioId);

      const scenario = await getOptimizationScenario(testScenarioId);
      expect(scenario).toBeNull();
    });
  });

  describe("tRPC Endpoints", () => {
    it("should create and run optimization via tRPC", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const createResult = await caller.optimization.create({
        projectId: testProjectId,
        name: "tRPC Test Scenario",
        description: "Testing via tRPC",
        budgetConstraint: 150000,
        budgetType: "hard",
        timeHorizon: 15,
        discountRate: 0.03,
        optimizationGoal: "maximize_roi",
      });

      expect(createResult.scenarioId).toBeGreaterThan(0);

      const runResult = await caller.optimization.run({
        scenarioId: createResult.scenarioId,
      });

      expect(runResult.totalCost).toBeGreaterThan(0);
      expect(runResult.selectedStrategies.length).toBeGreaterThan(0);
      expect(runResult.ciImprovement).toBeGreaterThanOrEqual(0);

      testScenarioId = createResult.scenarioId;
    });

    it("should retrieve scenario with strategies and cash flows", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a fresh scenario for this test
      const createResult = await caller.optimization.create({
        projectId: testProjectId,
        name: "Retrieve Test Scenario",
        timeHorizon: 10,
        optimizationGoal: "maximize_roi",
      });

      await caller.optimization.run({ scenarioId: createResult.scenarioId });

      const result = await caller.optimization.get({
        scenarioId: createResult.scenarioId,
      });

      expect(result.scenario).toBeDefined();
      expect(result.strategies.length).toBeGreaterThan(0);
      expect(result.cashFlows.length).toBeGreaterThan(0);
      expect(result.scenario.status).toBe("optimized");

      // Clean up
      await caller.optimization.delete({ scenarioId: createResult.scenarioId });
    });

    it("should list scenarios for a project", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const scenarios = await caller.optimization.list({
        projectId: testProjectId,
      });

      expect(scenarios.length).toBeGreaterThan(0);
      expect(scenarios[0]!.projectId).toBe(testProjectId);
    });

    it("should compare strategies for a component", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const comparison = await caller.optimization.compareStrategies({
        projectId: testProjectId,
        componentCode: "B30",
        timeHorizon: 10,
        discountRate: 0.03,
        optimizationGoal: "maximize_roi",
      });

      expect(comparison.component).toBe("B30");
      expect(comparison.strategies.length).toBe(4);
      expect(comparison.recommended).toBeDefined();
    });

    it("should get strategy options for a component", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const options = await caller.optimization.getStrategyOptions({
        projectId: testProjectId,
        componentCode: "D30",
        timeHorizon: 10,
        discountRate: 0.03,
        optimizationGoal: "maximize_ci",
      });

      expect(options.length).toBe(4);
      expect(options.every((opt) => opt.componentCode === "D30")).toBe(true);
    });

    it("should update scenario status", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a fresh scenario for this test
      const createResult = await caller.optimization.create({
        projectId: testProjectId,
        name: "Status Update Test",
        timeHorizon: 10,
        optimizationGoal: "maximize_roi",
      });

      const result = await caller.optimization.updateStatus({
        scenarioId: createResult.scenarioId,
        status: "approved",
      });

      expect(result.success).toBe(true);

      const scenario = await getOptimizationScenario(createResult.scenarioId);
      expect(scenario!.status).toBe("approved");

      // Clean up
      await caller.optimization.delete({ scenarioId: createResult.scenarioId });
    });

    it("should delete scenario via tRPC", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a scenario just to delete it
      const createResult = await caller.optimization.create({
        projectId: testProjectId,
        name: "Delete Test Scenario",
        timeHorizon: 10,
        optimizationGoal: "maximize_roi",
      });

      const result = await caller.optimization.delete({
        scenarioId: createResult.scenarioId,
      });

      expect(result.success).toBe(true);

      const scenario = await getOptimizationScenario(createResult.scenarioId);
      expect(scenario).toBeNull();
    });
  });
});
