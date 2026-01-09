import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

describe("Composite Score Calculation Fix", () => {
  const ctx = createTestContext();
  const caller = appRouter.createCaller(ctx);

  let testProjectId: number;
  let criteriaIds: number[];

  beforeAll(async () => {
    // Get an existing test project
    const projects = await caller.projects.list();
    if (projects.length === 0) {
      throw new Error("No projects found. Please create at least one project for testing.");
    }
    testProjectId = projects[0].id;

    // Get active criteria
    const criteria = await caller.prioritization.getCriteria();
    criteriaIds = criteria.map((c: any) => c.id);

    // Ensure we have at least 3 criteria for testing
    if (criteriaIds.length < 3) {
      throw new Error("Need at least 3 criteria for testing. Please seed the database.");
    }
  });

  it("should calculate and return composite score immediately after saving scores", async () => {
    // Score the project with known values
    const testScores = criteriaIds.slice(0, 3).map((criteriaId, index) => ({
      criteriaId,
      score: 5 + index * 2, // 5, 7, 9
      justification: `Test justification for criteria ${criteriaId}`,
    }));

    // Save scores - this should calculate composite score automatically
    const result = await caller.prioritization.scoreProject({
      projectId: testProjectId,
      scores: testScores,
    });

    // Verify the mutation returns success and composite score
    expect(result.success).toBe(true);
    expect(result.compositeScore).toBeDefined();
    expect(result.compositeScore).not.toBeNull();
    
    if (result.compositeScore) {
      expect(result.compositeScore.compositeScore).toBeGreaterThan(0);
      expect(result.compositeScore.compositeScore).toBeLessThanOrEqual(100);
      expect(result.compositeScore.projectId).toBe(testProjectId);
      expect(result.compositeScore.criteriaScores).toBeDefined();
      expect(result.compositeScore.criteriaScores.length).toBeGreaterThan(0);
    }
  });

  it("should retrieve composite score using getCompositeScore query", async () => {
    // Query the composite score
    const compositeScore = await caller.prioritization.getCompositeScore({
      projectId: testProjectId,
    });

    // Verify the score exists and is valid
    expect(compositeScore).toBeDefined();
    expect(compositeScore).not.toBeNull();
    
    if (compositeScore) {
      expect(compositeScore.compositeScore).toBeGreaterThan(0);
      expect(compositeScore.compositeScore).toBeLessThanOrEqual(100);
      expect(compositeScore.projectId).toBe(testProjectId);
    }
  });

  it("should include project in ranked projects list after scoring", async () => {
    // Get ranked projects
    const rankedProjects = await caller.prioritization.getRankedProjects();

    // Verify our test project is in the ranked list
    const ourProject = rankedProjects.find(p => p.projectId === testProjectId);
    expect(ourProject).toBeDefined();
    
    if (ourProject) {
      expect(ourProject.compositeScore).toBeGreaterThan(0);
      expect(ourProject.compositeScore).toBeLessThanOrEqual(100);
      expect(ourProject.rank).toBeGreaterThan(0);
    }
  });

  it("should update composite score when scores are modified", async () => {
    // Get initial composite score
    const initialScore = await caller.prioritization.getCompositeScore({
      projectId: testProjectId,
    });

    expect(initialScore).not.toBeNull();
    const initialCompositeValue = initialScore?.compositeScore || 0;

    // Update scores with different values
    const updatedScores = criteriaIds.slice(0, 3).map((criteriaId) => ({
      criteriaId,
      score: 10, // Max score
      justification: "Updated to maximum priority",
    }));

    const result = await caller.prioritization.scoreProject({
      projectId: testProjectId,
      scores: updatedScores,
    });

    // Verify the new composite score is different and higher
    expect(result.compositeScore).toBeDefined();
    if (result.compositeScore) {
      expect(result.compositeScore.compositeScore).toBeGreaterThan(initialCompositeValue);
    }
  });

  it("should recalculate all scores and maintain consistency", async () => {
    // Trigger recalculation of all project scores
    const result = await caller.prioritization.calculateAllScores();

    expect(result.success).toBe(true);
    expect(result.projectCount).toBeGreaterThan(0);

    // Verify our project still has a valid composite score
    const compositeScore = await caller.prioritization.getCompositeScore({
      projectId: testProjectId,
    });

    expect(compositeScore).toBeDefined();
    expect(compositeScore).not.toBeNull();
    if (compositeScore) {
      expect(compositeScore.compositeScore).toBeGreaterThan(0);
    }

    // Verify ranked projects list is consistent
    const rankedProjects = await caller.prioritization.getRankedProjects();
    const ourProject = rankedProjects.find(p => p.projectId === testProjectId);
    
    expect(ourProject).toBeDefined();
    if (ourProject && compositeScore) {
      // The composite score from the query should match the ranked list
      expect(Math.abs(ourProject.compositeScore - compositeScore.compositeScore)).toBeLessThan(0.1);
    }
  });
});
