import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    company: "test-company",
    companyId: 1,
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

describe("Composite Score Display Fix", () => {
  it("should return composite score of 0 when no scores exist for a project", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Use a non-existent project ID
    const nonExistentProjectId = 999999;

    const compositeScore = await caller.prioritization.getCompositeScore({
      projectId: nonExistentProjectId,
    });

    // Should return composite score of 0 when no scores exist (criteria exist but not scored)
    expect(compositeScore).not.toBeNull();
    if (compositeScore) {
      expect(compositeScore.compositeScore).toBe(0);
      expect(compositeScore.projectId).toBe(nonExistentProjectId);
      expect(compositeScore.criteriaScores).toBeDefined();
      // All criteria scores should be 0
      compositeScore.criteriaScores.forEach((cs) => {
        expect(cs.score).toBe(0);
        expect(cs.weightedScore).toBe(0);
      });
    }
  });

  it("should calculate composite score correctly when scores exist", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First, ensure we have criteria
    const criteria = await caller.prioritization.getCriteria();
    
    if (criteria.length === 0) {
      // Create test criteria
      await caller.prioritization.createCriteria({
        name: "Test Urgency",
        description: "Test urgency criterion",
        category: "risk",
        weight: 50,
        scoringGuideline: "Test guideline",
      });

      await caller.prioritization.createCriteria({
        name: "Test Safety",
        description: "Test safety criterion",
        category: "risk",
        weight: 50,
        scoringGuideline: "Test guideline",
      });
    }

    // Get updated criteria
    const updatedCriteria = await caller.prioritization.getCriteria();
    expect(updatedCriteria.length).toBeGreaterThan(0);

    // Create a test project (assuming project ID 1 exists from mock data)
    const testProjectId = 3720172; // Small Portfolio project from mock data

    // Score the project
    const scores = updatedCriteria.slice(0, 2).map((criterion) => ({
      criteriaId: criterion.id,
      score: 7.5, // Medium-high score
      justification: "Test justification",
    }));

    await caller.prioritization.scoreProject({
      projectId: testProjectId,
      scores,
    });

    // Get composite score
    const compositeScore = await caller.prioritization.getCompositeScore({
      projectId: testProjectId,
    });

    // Verify composite score is calculated
    expect(compositeScore).not.toBeNull();
    if (compositeScore) {
      expect(compositeScore.projectId).toBe(testProjectId);
      expect(compositeScore.compositeScore).toBeGreaterThan(0);
      expect(compositeScore.compositeScore).toBeLessThanOrEqual(100);
      expect(compositeScore.criteriaScores).toBeDefined();
      expect(compositeScore.criteriaScores.length).toBeGreaterThan(0);
      expect(compositeScore.totalWeight).toBeGreaterThan(0);
    }
  });

  it("should calculate composite score after scoring project", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const testProjectId = 3720172;
    const criteria = await caller.prioritization.getCriteria();

    if (criteria.length === 0) {
      throw new Error("No criteria available for testing");
    }

    // Score the project with any valid scores
    const scores = criteria.map((criterion) => ({
      criteriaId: criterion.id,
      score: 7.5,
      justification: "Test scoring",
    }));

    await caller.prioritization.scoreProject({
      projectId: testProjectId,
      scores,
    });

    const compositeScore = await caller.prioritization.getCompositeScore({
      projectId: testProjectId,
    });

    // Verify composite score is calculated and returned
    expect(compositeScore).not.toBeNull();
    if (compositeScore) {
      expect(compositeScore.compositeScore).toBeGreaterThan(0);
      expect(compositeScore.compositeScore).toBeLessThanOrEqual(100);
      expect(compositeScore.projectId).toBe(testProjectId);
    }
  });

  it("should return composite score with correct structure", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const testProjectId = 3720172;
    const criteria = await caller.prioritization.getCriteria();

    if (criteria.length > 0) {
      const scores = criteria.slice(0, 2).map((criterion) => ({
        criteriaId: criterion.id,
        score: 5.0,
        justification: "Medium priority",
      }));

      await caller.prioritization.scoreProject({
        projectId: testProjectId,
        scores,
      });

      const compositeScore = await caller.prioritization.getCompositeScore({
        projectId: testProjectId,
      });

      if (compositeScore) {
        // Verify structure
        expect(compositeScore).toHaveProperty("projectId");
        expect(compositeScore).toHaveProperty("compositeScore");
        expect(compositeScore).toHaveProperty("criteriaScores");
        expect(compositeScore).toHaveProperty("totalWeight");

        // Verify types
        expect(typeof compositeScore.projectId).toBe("number");
        expect(typeof compositeScore.compositeScore).toBe("number");
        expect(Array.isArray(compositeScore.criteriaScores)).toBe(true);
        expect(typeof compositeScore.totalWeight).toBe("number");

        // Verify criteria scores structure
        if (compositeScore.criteriaScores.length > 0) {
          const firstCriteriaScore = compositeScore.criteriaScores[0];
          expect(firstCriteriaScore).toHaveProperty("criteriaId");
          expect(firstCriteriaScore).toHaveProperty("criteriaName");
          expect(firstCriteriaScore).toHaveProperty("score");
          expect(firstCriteriaScore).toHaveProperty("weight");
          expect(firstCriteriaScore).toHaveProperty("weightedScore");
        }
      }
    }
  });
});
