import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as prioritizationDb from "./db/prioritization.db";
import * as prioritizationService from "./services/prioritization.service";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
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

describe("Prioritization Dashboard Improvements", () => {
  describe("Backend Calculation Consistency", () => {
    it("should return consistent criteria count from getCriteria", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const criteria = await caller.prioritization.getCriteria();
      
      // Verify criteria are returned
      expect(Array.isArray(criteria)).toBe(true);
      
      // Verify only active criteria are returned
      const allActive = criteria.every((c: any) => c.isActive === 1);
      expect(allActive).toBe(true);
      
      // Store count for comparison
      const criteriaCount = criteria.length;
      expect(criteriaCount).toBeGreaterThanOrEqual(0);
    });

    it("should calculate composite scores consistently", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Get ranked projects
      const rankedProjects = await caller.prioritization.getRankedProjects();
      
      // Verify ranked projects structure
      expect(Array.isArray(rankedProjects)).toBe(true);
      
      // If there are ranked projects, verify they have required fields
      if (rankedProjects.length > 0) {
        rankedProjects.forEach((project: any) => {
          expect(project).toHaveProperty("projectId");
          expect(project).toHaveProperty("projectName");
          expect(project).toHaveProperty("compositeScore");
          expect(project).toHaveProperty("rank");
          
          // Verify composite score is a valid number
          expect(typeof project.compositeScore).toBe("number");
          expect(project.compositeScore).toBeGreaterThanOrEqual(0);
          expect(project.compositeScore).toBeLessThanOrEqual(100);
        });
        
        // Verify projects are ranked in descending order by composite score
        for (let i = 0; i < rankedProjects.length - 1; i++) {
          expect(rankedProjects[i].compositeScore).toBeGreaterThanOrEqual(
            rankedProjects[i + 1].compositeScore
          );
        }
        
        // Verify ranks are sequential starting from 1
        rankedProjects.forEach((project: any, index: number) => {
          expect(project.rank).toBe(index + 1);
        });
      }
    });

    it("should recalculate all scores and update cache", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Recalculate all scores
      const result = await caller.prioritization.calculateAllScores();
      
      // Verify result structure
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("projectCount");
      expect(result.success).toBe(true);
      expect(typeof result.projectCount).toBe("number");
      expect(result.projectCount).toBeGreaterThanOrEqual(0);
      
      // Verify ranked projects are updated
      const rankedProjects = await caller.prioritization.getRankedProjects();
      expect(rankedProjects.length).toBe(result.projectCount);
    });

    it("should normalize criteria weights to 100%", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Get all criteria
      const criteria = await caller.prioritization.getCriteria();
      
      if (criteria.length > 0) {
        // Calculate total weight
        const totalWeight = criteria.reduce((sum: number, c: any) => {
          return sum + parseFloat(c.weight);
        }, 0);
        
        // Verify weights sum to approximately 100% (allow small floating point errors)
        expect(totalWeight).toBeCloseTo(100, 1);
        
        // Verify each weight is positive
        criteria.forEach((c: any) => {
          expect(parseFloat(c.weight)).toBeGreaterThan(0);
        });
      }
    });
  });

  describe("Data Integrity", () => {
    it("should only return projects with scores in ranked list", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const rankedProjects = await caller.prioritization.getRankedProjects();
      
      // All ranked projects should have valid composite scores
      rankedProjects.forEach((project: any) => {
        expect(project.compositeScore).toBeDefined();
        expect(typeof project.compositeScore).toBe("number");
        expect(isNaN(project.compositeScore)).toBe(false);
      });
    });

    it("should handle empty state gracefully", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // These should not throw errors even if no data exists
      const criteria = await caller.prioritization.getCriteria();
      const rankedProjects = await caller.prioritization.getRankedProjects();
      const budgetCycles = await caller.prioritization.getBudgetCycles();
      
      expect(Array.isArray(criteria)).toBe(true);
      expect(Array.isArray(rankedProjects)).toBe(true);
      expect(Array.isArray(budgetCycles)).toBe(true);
    });
  });

  describe("Score Calculation Logic", () => {
    it("should calculate weighted scores correctly", async () => {
      // Test the composite score calculation logic
      const mockProjectId = 1;
      
      const compositeScore = await prioritizationService.calculateCompositeScore(mockProjectId);
      
      if (compositeScore) {
        // Verify composite score structure
        expect(compositeScore).toHaveProperty("projectId");
        expect(compositeScore).toHaveProperty("compositeScore");
        expect(compositeScore).toHaveProperty("criteriaScores");
        expect(compositeScore).toHaveProperty("totalWeight");
        
        // Verify composite score is in valid range
        expect(compositeScore.compositeScore).toBeGreaterThanOrEqual(0);
        expect(compositeScore.compositeScore).toBeLessThanOrEqual(100);
        
        // Verify criteria scores are properly weighted
        compositeScore.criteriaScores.forEach((cs) => {
          expect(cs.score).toBeGreaterThanOrEqual(0);
          expect(cs.score).toBeLessThanOrEqual(10);
          expect(cs.weight).toBeGreaterThan(0);
          expect(cs.weightedScore).toBeGreaterThanOrEqual(0);
        });
      }
    });
  });
});
