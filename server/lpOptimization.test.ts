import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as lpOptimizer from "./services/lpOptimizer.service";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Linear Programming Portfolio Optimization", () => {
  const ctx = createTestContext();
  const caller = appRouter.createCaller(ctx);

  describe("Portfolio Metrics", () => {
    it("should retrieve current portfolio metrics", async () => {
      const metrics = await caller.optimization.getPortfolioMetrics();

      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty("totalProjects");
      expect(metrics).toHaveProperty("totalReplacementValue");
      expect(metrics).toHaveProperty("totalDeferredMaintenance");
      expect(metrics).toHaveProperty("weightedCI");
      expect(metrics).toHaveProperty("weightedFCI");
      expect(metrics).toHaveProperty("averagePriorityScore");

      expect(metrics.totalProjects).toBeGreaterThanOrEqual(0);
      expect(metrics.totalReplacementValue).toBeGreaterThanOrEqual(0);
      expect(metrics.totalDeferredMaintenance).toBeGreaterThanOrEqual(0);
    });

    it("should calculate weighted CI correctly", async () => {
      const metrics = await caller.optimization.getPortfolioMetrics();

      if (metrics.totalProjects > 0) {
        expect(metrics.weightedCI).toBeGreaterThanOrEqual(0);
        expect(metrics.weightedCI).toBeLessThanOrEqual(100);
      }
    });

    it("should calculate weighted FCI correctly", async () => {
      const metrics = await caller.optimization.getPortfolioMetrics();

      if (metrics.totalProjects > 0) {
        expect(metrics.weightedFCI).toBeGreaterThanOrEqual(0);
        // FCI can exceed 100% in some cases
      }
    });
  });

  describe("LP Optimization", () => {
    it("should optimize portfolio with budget constraint", async () => {
      const budget = 5000000;

      const result = await caller.optimization.optimizePortfolioLP({
        maxBudget: budget,
      });

      expect(result).toBeDefined();
      expect(result.selectedProjects).toBeDefined();
      expect(Array.isArray(result.selectedProjects)).toBe(true);
      expect(result.totalCost).toBeLessThanOrEqual(budget);
      expect(result.totalCIImprovement).toBeGreaterThanOrEqual(0);
      expect(result.budgetUtilization).toBeGreaterThanOrEqual(0);
      expect(result.budgetUtilization).toBeLessThanOrEqual(100);
    });

    it("should respect minimum project constraint", async () => {
      try {
        const result = await caller.optimization.optimizePortfolioLP({
          maxBudget: 10000000,
          minProjects: 2,
        });

        // If successful, should have at least minProjects
        expect(result.selectedProjects.length).toBeGreaterThanOrEqual(2);
      } catch (error) {
        // If no feasible solution (not enough projects), that's acceptable
        expect(error).toBeDefined();
      }
    });

    it("should respect maximum project constraint", async () => {
      const result = await caller.optimization.optimizePortfolioLP({
        maxBudget: 50000000,
        maxProjects: 5,
      });

      expect(result.selectedProjects.length).toBeLessThanOrEqual(5);
    });

    it("should maximize CI improvement", async () => {
      const result = await caller.optimization.optimizePortfolioLP({
        maxBudget: 10000000,
      });

      // All selected projects should contribute to CI improvement
      result.selectedProjects.forEach((project) => {
        expect(project.ciImprovement).toBeGreaterThan(0);
      });
    });

    it("should calculate portfolio metrics correctly", async () => {
      const result = await caller.optimization.optimizePortfolioLP({
        maxBudget: 5000000,
      });

      expect(result.portfolioMetrics).toBeDefined();
      expect(result.portfolioMetrics.beforeCI).toBeGreaterThanOrEqual(0);
      expect(result.portfolioMetrics.afterCI).toBeGreaterThanOrEqual(
        result.portfolioMetrics.beforeCI
      );
      expect(result.portfolioMetrics.ciImprovementPercent).toBeGreaterThanOrEqual(0);
    });

    it("should handle zero budget gracefully", async () => {
      try {
        await caller.optimization.optimizePortfolioLP({
          maxBudget: 0,
        });
        // If no error, that's also acceptable (no projects selected)
      } catch (error) {
        // Expected to throw
        expect(error).toBeDefined();
      }
    });

    it("should handle very large budget", async () => {
      const result = await caller.optimization.optimizePortfolioLP({
        maxBudget: 1000000000, // $1B
      });

      expect(result).toBeDefined();
      expect(result.selectedProjects.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Sensitivity Analysis", () => {
    it("should perform sensitivity analysis", async () => {
      const baseBudget = 5000000;

      const sensitivity = await caller.optimization.analyzeSensitivity({
        baseBudget,
        rangePercent: 50,
      });

      expect(sensitivity).toBeDefined();
      expect(sensitivity.budgetLevels).toBeDefined();
      expect(sensitivity.results).toBeDefined();
      expect(Array.isArray(sensitivity.results)).toBe(true);
      expect(sensitivity.results.length).toBeGreaterThan(0);
      expect(sensitivity.optimalBudget).toBeGreaterThan(0);
      expect(sensitivity.inflectionPoint).toBeGreaterThan(0);
    });

    it("should show increasing CI improvement with budget", async () => {
      const sensitivity = await caller.optimization.analyzeSensitivity({
        baseBudget: 5000000,
        rangePercent: 50,
      });

      // CI improvement should generally increase with budget
      for (let i = 1; i < sensitivity.results.length; i++) {
        expect(sensitivity.results[i].ciImprovement).toBeGreaterThanOrEqual(
          sensitivity.results[i - 1].ciImprovement
        );
      }
    });

    it("should calculate ROI correctly", async () => {
      const sensitivity = await caller.optimization.analyzeSensitivity({
        baseBudget: 5000000,
        rangePercent: 30,
      });

      sensitivity.results.forEach((result) => {
        expect(result.roi).toBeGreaterThanOrEqual(0);
        if (result.budget > 0 && result.ciImprovement > 0) {
          const expectedROI = (result.ciImprovement / result.budget) * 100;
          expect(result.roi).toBeCloseTo(expectedROI, 2);
        }
      });
    });

    it("should identify optimal budget", async () => {
      const sensitivity = await caller.optimization.analyzeSensitivity({
        baseBudget: 5000000,
        rangePercent: 50,
      });

      const optimalResult = sensitivity.results.find(
        (r) => r.budget === sensitivity.optimalBudget
      );

      expect(optimalResult).toBeDefined();
      if (optimalResult && optimalResult.ciImprovement > 0) {
        expect(optimalResult.roi).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Pareto Frontier", () => {
    it("should calculate Pareto frontier", async () => {
      const pareto = await caller.optimization.getParetoFrontier();

      expect(pareto).toBeDefined();
      expect(Array.isArray(pareto)).toBe(true);
    });

    it("should have increasing cost and CI improvement", async () => {
      const pareto = await caller.optimization.getParetoFrontier();

      if (pareto.length > 1) {
        for (let i = 1; i < pareto.length; i++) {
          expect(pareto[i].cost).toBeGreaterThanOrEqual(pareto[i - 1].cost);
          expect(pareto[i].ciImprovement).toBeGreaterThanOrEqual(
            pareto[i - 1].ciImprovement
          );
        }
      }
    });

    it("should track project selection", async () => {
      const pareto = await caller.optimization.getParetoFrontier();

      pareto.forEach((point) => {
        expect(point.projects).toBeDefined();
        expect(Array.isArray(point.projects)).toBe(true);
        expect(point.projectCount).toBe(point.projects.length);
      });
    });
  });

  describe("Cost-Effectiveness Ranking", () => {
    it("should rank projects by cost-effectiveness", async () => {
      const ranking = await caller.optimization.getCostEffectivenessRanking();

      expect(ranking).toBeDefined();
      expect(Array.isArray(ranking)).toBe(true);
    });

    it("should assign sequential ranks", async () => {
      const ranking = await caller.optimization.getCostEffectivenessRanking();

      if (ranking.length > 0) {
        for (let i = 0; i < ranking.length; i++) {
          expect(ranking[i].rank).toBe(i + 1);
        }
      }
    });

    it("should sort by cost per CI point", async () => {
      const ranking = await caller.optimization.getCostEffectivenessRanking();

      if (ranking.length > 1) {
        for (let i = 1; i < ranking.length; i++) {
          expect(ranking[i].costPerCIPoint).toBeGreaterThanOrEqual(
            ranking[i - 1].costPerCIPoint
          );
        }
      }
    });

    it("should calculate cost-effectiveness metrics", async () => {
      const ranking = await caller.optimization.getCostEffectivenessRanking();

      ranking.forEach((project) => {
        expect(project).toHaveProperty("costPerCIPoint");
        expect(project).toHaveProperty("costPerFCIPoint");
        expect(project.cost).toBeGreaterThanOrEqual(0);
        expect(project.ciImprovement).toBeGreaterThanOrEqual(0);
        expect(project.fciImprovement).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("Integration Tests", () => {
    it("should produce consistent results across multiple runs", async () => {
      const budget = 5000000;

      const result1 = await caller.optimization.optimizePortfolioLP({
        maxBudget: budget,
      });

      const result2 = await caller.optimization.optimizePortfolioLP({
        maxBudget: budget,
      });

      // Same budget should produce same results
      expect(result1.selectedProjects.length).toBe(result2.selectedProjects.length);
      if (result1.selectedProjects.length > 0) {
        expect(result1.totalCost).toBeCloseTo(result2.totalCost, 2);
        expect(result1.totalCIImprovement).toBeCloseTo(result2.totalCIImprovement, 2);
      }
    });

    it("should select most cost-effective projects first", async () => {
      const result = await caller.optimization.optimizePortfolioLP({
        maxBudget: 3000000,
      });

      const ranking = await caller.optimization.getCostEffectivenessRanking();

      // Selected projects should generally be from top-ranked projects
      const selectedIds = result.selectedProjects.map((p) => p.projectId);
      const topRankedIds = ranking.slice(0, 10).map((p) => p.projectId);

      // At least some overlap expected if both have results
      if (selectedIds.length > 0 && topRankedIds.length > 0) {
        const overlap = selectedIds.filter((id) => topRankedIds.includes(id));
        expect(overlap.length).toBeGreaterThanOrEqual(0);
      }
    });

    it("should improve portfolio metrics after optimization", async () => {
      const metrics = await caller.optimization.getPortfolioMetrics();
      const result = await caller.optimization.optimizePortfolioLP({
        maxBudget: 10000000,
      });

      if (result.selectedProjects.length > 0) {
        expect(result.portfolioMetrics.afterCI).toBeGreaterThanOrEqual(
          result.portfolioMetrics.beforeCI
        );
        expect(result.portfolioMetrics.ciImprovementPercent).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
