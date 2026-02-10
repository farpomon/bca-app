import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as prioritizationDb from "./db/prioritization.db";

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

describe("Multi-Criteria Prioritization", () => {
  const ctx = createTestContext();
  const caller = appRouter.createCaller(ctx);

  describe("Criteria Management", () => {
    it("should create a new criteria", async () => {
      const result = await caller.prioritization.createCriteria({
        name: `Test Urgency ${Date.now()}`,
        description: "How urgent is this project",
        category: "risk",
        weight: 25,
        scoringGuideline: "10=Immediate, 5=Medium, 1=Low",
      });

      expect(result.criteriaId).toBeGreaterThan(0);
    });

    it("should retrieve all active criteria", async () => {
      const criteria = await caller.prioritization.getCriteria();

      expect(Array.isArray(criteria)).toBe(true);
      expect(criteria.length).toBeGreaterThan(0);
      
      // Check that created criteria exist (from previous test)
      const testCriteria = criteria.find((c: any) => c.name.startsWith("Test Urgency"));
      expect(testCriteria).toBeDefined();
      expect(testCriteria?.category).toBe("risk");
    });

    it("should update criteria weight", async () => {
      const criteria = await caller.prioritization.getCriteria();
      const firstCriteria = criteria[0];
      const originalWeight = parseFloat(firstCriteria.weight);

      await caller.prioritization.updateCriteria({
        criteriaId: firstCriteria.id,
        weight: 30,
      });

      const updated = await prioritizationDb.getCriteriaById(firstCriteria.id);
      const newWeight = parseFloat(updated!.weight);
      // Weight gets normalized, so just check it changed
      expect(newWeight).not.toBe(originalWeight);
      expect(newWeight).toBeGreaterThan(0);
    });

    it("should normalize weights to 100%", async () => {
      await caller.prioritization.normalizeWeights();

      const criteria = await caller.prioritization.getCriteria();
      const totalWeight = criteria.reduce((sum: number, c: any) => sum + parseFloat(c.weight), 0);

      expect(totalWeight).toBeCloseTo(100, 1);
    });

    it("should soft delete criteria", async () => {
      // Create a test criteria
      const result = await caller.prioritization.createCriteria({
        name: `Temporary Criteria ${Date.now()}`,
        category: "operational",
        weight: 5,
      });

      // Delete it
      await caller.prioritization.deleteCriteria({ criteriaId: result.criteriaId });

      // Should not appear in active criteria list
      const criteria = await caller.prioritization.getCriteria();
      const deleted = criteria.find((c: any) => c.id === result.criteriaId);
      expect(deleted).toBeUndefined();
    });
  });

  describe("Project Scoring", () => {
    let testProjectId: number;
    let criteriaIds: number[];

    beforeEach(async () => {
      // Get existing project or create one for testing
      const projects = await caller.projects.list();
      if (projects.length > 0) {
        testProjectId = projects[0].id;
      } else {
        const newProject = await caller.projects.create({
          name: "Test Scoring Project",
          address: "Test Location",
          yearBuilt: 2000,
          
        });
        testProjectId = newProject.id;
      }

      // Get active criteria
      const criteria = await caller.prioritization.getCriteria();
      criteriaIds = criteria.map((c: any) => c.id);
    });

    it("should score a project across all criteria", async () => {
      const scores = criteriaIds.slice(0, 3).map((criteriaId, index) => ({
        criteriaId,
        score: 5 + index * 2, // 5, 7, 9
        justification: `Test justification for criteria ${criteriaId}`,
      }));

      const result = await caller.prioritization.scoreProject({
        projectId: testProjectId,
        scores,
      });

      expect(result.success).toBe(true);
      expect(result.compositeScore).toBeDefined();
      expect(result.compositeScore.compositeScore).toBeGreaterThan(0);
    });

    it("should retrieve project scores", async () => {
      // First score the project
      const scores = criteriaIds.slice(0, 2).map((criteriaId) => ({
        criteriaId,
        score: 8,
        justification: "High priority",
      }));

      await caller.prioritization.scoreProject({
        projectId: testProjectId,
        scores,
      });

      // Then retrieve scores
      const projectScores = await caller.prioritization.getProjectScores({
        projectId: testProjectId,
      });

      expect(projectScores.length).toBeGreaterThanOrEqual(2);
      expect(projectScores[0]).toHaveProperty("score");
      expect(projectScores[0]).toHaveProperty("justification");
    });

    it("should calculate composite score correctly", async () => {
      // Score with known values
      const criteria = await caller.prioritization.getCriteria();
      const firstTwo = criteria.slice(0, 2);

      const scores = firstTwo.map((c: any) => ({
        criteriaId: c.id,
        score: 10, // Max score
        justification: "Critical",
      }));

      await caller.prioritization.scoreProject({
        projectId: testProjectId,
        scores,
      });

      const compositeScore = await caller.prioritization.getCompositeScore({
        projectId: testProjectId,
      });

      expect(compositeScore.compositeScore).toBeGreaterThan(0);
      expect(compositeScore.compositeScore).toBeLessThanOrEqual(100);
    });

    it("should retrieve and verify project scores", async () => {
      // First score the project to ensure scores exist
      if (criteriaIds.length > 0) {
        await caller.prioritization.scoreProject({
          projectId: testProjectId,
          scores: criteriaIds.slice(0, 2).map((criteriaId) => ({
            criteriaId,
            score: 7,
            justification: "Test score",
          })),
        });
      }

      const projectScores = await caller.prioritization.getProjectScores({
        projectId: testProjectId,
      });

      expect(Array.isArray(projectScores)).toBe(true);
      expect(projectScores.length).toBeGreaterThan(0);
      
      // Verify score structure
      const firstScore = projectScores[0];
      expect(firstScore).toHaveProperty("criteriaId");
      expect(firstScore).toHaveProperty("score");
      expect(firstScore).toHaveProperty("justification");
      expect(parseFloat(firstScore.score)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(firstScore.score)).toBeLessThanOrEqual(10);
    });
  });

  describe("Project Ranking", () => {
    it("should rank projects by composite score", async () => {
      const rankedProjects = await caller.prioritization.getRankedProjects();

      expect(Array.isArray(rankedProjects)).toBe(true);

      // Check ranking order (descending by score)
      for (let i = 0; i < rankedProjects.length - 1; i++) {
        expect(rankedProjects[i].compositeScore).toBeGreaterThanOrEqual(
          rankedProjects[i + 1].compositeScore
        );
        expect(rankedProjects[i].rank).toBeLessThan(rankedProjects[i + 1].rank);
      }
    });

    it("should filter ranked projects by score range", async () => {
      const highPriorityProjects = await caller.prioritization.getRankedProjects({
        minScore: 70,
      });

      expect(Array.isArray(highPriorityProjects)).toBe(true);
      highPriorityProjects.forEach((project: any) => {
        expect(project.compositeScore).toBeGreaterThanOrEqual(70);
      });
    });

    it("should limit number of ranked projects", async () => {
      const topFive = await caller.prioritization.getRankedProjects({
        limit: 5,
      });

      expect(topFive.length).toBeLessThanOrEqual(5);
    });

    it("should recalculate all project scores", async () => {
      const result = await caller.prioritization.calculateAllScores();

      expect(result.success).toBe(true);
      expect(result.projectCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Capital Budget Cycles", () => {
    let testCycleId: number;

    it("should create a budget cycle", async () => {
      const currentYear = new Date().getFullYear();

      const result = await caller.prioritization.createBudgetCycle({
        name: `Test Cycle ${currentYear}-${currentYear + 3}`,
        description: "Test 4-year capital plan",
        startYear: currentYear,
        endYear: currentYear + 3,
        totalBudget: 5000000,
      });

      expect(result.cycleId).toBeGreaterThan(0);
      testCycleId = result.cycleId;
    });

    it("should retrieve all budget cycles", async () => {
      const cycles = await caller.prioritization.getBudgetCycles();

      expect(Array.isArray(cycles)).toBe(true);
      expect(cycles.length).toBeGreaterThan(0);
    });

    it("should retrieve budget cycle details", async () => {
      const cycles = await caller.prioritization.getBudgetCycles();
      const firstCycle = cycles[0];

      const details = await caller.prioritization.getBudgetCycle({
        cycleId: firstCycle.id,
      });

      expect(details.cycle).toBeDefined();
      expect(details.cycle.id).toBe(firstCycle.id);
      expect(details.allocations).toBeDefined();
      expect(details.summary).toBeDefined();
    });

    it("should update budget cycle", async () => {
      const cycles = await caller.prioritization.getBudgetCycles();
      const firstCycle = cycles[0];

      await caller.prioritization.updateBudgetCycle({
        cycleId: firstCycle.id,
        status: "approved",
        totalBudget: 6000000,
      });

      const updated = await prioritizationDb.getBudgetCycleById(firstCycle.id);
      expect(updated!.status).toBe("approved");
      expect(parseFloat(updated!.totalBudget || "0")).toBe(6000000);
    });

    it("should delete budget cycle and its allocations", async () => {
      const currentYear = new Date().getFullYear();

      const result = await caller.prioritization.createBudgetCycle({
        name: "Temporary Cycle",
        startYear: currentYear + 10,
        endYear: currentYear + 13,
      });

      await caller.prioritization.deleteBudgetCycle({ cycleId: result.cycleId });

      const cycles = await caller.prioritization.getBudgetCycles();
      const deleted = cycles.find((c: any) => c.id === result.cycleId);
      expect(deleted).toBeUndefined();
    });
  });

  describe("Budget Allocations", () => {
    let testCycleId: number;
    let testProjectId: number;

    beforeEach(async () => {
      // Get or create a budget cycle
      const cycles = await caller.prioritization.getBudgetCycles();
      if (cycles.length > 0) {
        testCycleId = cycles[0].id;
      } else {
        const currentYear = new Date().getFullYear();
        const result = await caller.prioritization.createBudgetCycle({
          name: "Test Allocation Cycle",
          startYear: currentYear,
          endYear: currentYear + 3,
          totalBudget: 10000000,
        });
        testCycleId = result.cycleId;
      }

      // Get or create a project
      const projects = await caller.projects.list();
      if (projects.length > 0) {
        testProjectId = projects[0].id;
      } else {
        const newProject = await caller.projects.create({
          name: "Test Allocation Project",
          address: "Test Location",
          totalGrossFloorArea: 15000,
          constructionYear: 1995,
        });
        testProjectId = newProject.id;
      }
    });

    it("should allocate project to budget cycle", async () => {
      const currentYear = new Date().getFullYear();

      const result = await caller.prioritization.allocateProject({
        cycleId: testCycleId,
        projectId: testProjectId,
        year: currentYear,
        allocatedAmount: 500000,
        priority: 1,
        justification: "Critical infrastructure renewal",
        strategicAlignment: "Aligns with safety and compliance goals",
      });

      expect(result.allocationId).toBeGreaterThan(0);
    });

    it("should retrieve allocations for a cycle", async () => {
      const allocations = await caller.prioritization.getAllocationsForCycle({
        cycleId: testCycleId,
      });

      expect(Array.isArray(allocations)).toBe(true);
    });

    it("should update allocation status", async () => {
      // Create allocation
      const currentYear = new Date().getFullYear();
      const result = await caller.prioritization.allocateProject({
        cycleId: testCycleId,
        projectId: testProjectId,
        year: currentYear + 1,
        allocatedAmount: 750000,
        priority: 2,
      });

      // Update status
      await caller.prioritization.updateAllocation({
        allocationId: result.allocationId,
        status: "approved",
        allocatedAmount: 800000,
      });

      const allocations = await caller.prioritization.getAllocationsForCycle({
        cycleId: testCycleId,
      });

      const updated = allocations.find((a: any) => a.id === result.allocationId);
      expect(updated?.status).toBe("approved");
      expect(parseFloat(updated?.allocatedAmount || "0")).toBe(800000);
    });

    it("should get budget summary by year", async () => {
      const summary = await caller.prioritization.getBudgetSummary({
        cycleId: testCycleId,
      });

      expect(Array.isArray(summary)).toBe(true);
      
      summary.forEach((yearSummary: any) => {
        expect(yearSummary).toHaveProperty("year");
        expect(yearSummary).toHaveProperty("totalAllocated");
        expect(yearSummary).toHaveProperty("projectCount");
      });
    });

    it("should delete allocation", async () => {
      const currentYear = new Date().getFullYear();
      const result = await caller.prioritization.allocateProject({
        cycleId: testCycleId,
        projectId: testProjectId,
        year: currentYear + 2,
        allocatedAmount: 300000,
        priority: 10,
      });

      await caller.prioritization.deleteAllocation({ allocationId: result.allocationId });

      const allocations = await caller.prioritization.getAllocationsForCycle({
        cycleId: testCycleId,
      });

      const deleted = allocations.find((a: any) => a.id === result.allocationId);
      expect(deleted).toBeUndefined();
    });
  });
});
