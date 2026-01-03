import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import * as db from "../db";

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
    company: "Test Company",
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

describe("Offline Sync - Deficiency Sync", () => {
  let testProjectId: number;
  let testAssessmentId: number;

  beforeEach(async () => {
    // Create a test project
    testProjectId = await db.createProject({
      userId: 1,
      name: "Test Project for Offline Sync",
      status: "draft",
      company: "Test Company",
    });

    // Create a test assessment
    testAssessmentId = await db.upsertAssessment({
      projectId: testProjectId,
      componentCode: "A1010",
      condition: "fair",
      status: "active",
    });
  });

  it("should sync offline deficiency to server", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.offlineSync.syncDeficiency({
      offlineId: "offline_def_123",
      createdAt: new Date().toISOString(),
      projectId: testProjectId,
      assessmentId: testAssessmentId,
      componentCode: "A1010",
      title: "Test Deficiency",
      description: "This is a test deficiency created offline",
      severity: "high",
      priority: "immediate",
      estimatedCost: 5000,
      status: "open",
    });

    expect(result).toHaveProperty("deficiencyId");
    expect(result).toHaveProperty("offlineId", "offline_def_123");
    expect(typeof result.deficiencyId).toBe("number");

    // Verify deficiency was created in database
    const deficiencies = await db.getProjectDeficiencies(testProjectId);
    expect(deficiencies.length).toBeGreaterThan(0);
    
    const createdDeficiency = deficiencies.find(d => d.id === result.deficiencyId);
    expect(createdDeficiency).toBeDefined();
    expect(createdDeficiency?.title).toBe("Test Deficiency");
    expect(createdDeficiency?.severity).toBe("high");
    expect(createdDeficiency?.priority).toBe("immediate");
  });

  it("should reject deficiency sync for non-existent project", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.offlineSync.syncDeficiency({
        offlineId: "offline_def_456",
        createdAt: new Date().toISOString(),
        projectId: 999999, // Non-existent project
        title: "Test Deficiency",
        description: "Should fail",
        severity: "low",
        priority: "long_term",
      })
    ).rejects.toThrow("Project not found or access denied");
  });

  it("should sync deficiency with minimal required fields", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.offlineSync.syncDeficiency({
      offlineId: "offline_def_789",
      createdAt: new Date().toISOString(),
      projectId: testProjectId,
    });

    expect(result).toHaveProperty("deficiencyId");
    expect(result).toHaveProperty("offlineId", "offline_def_789");
  });
});

describe("Offline Sync - Assessment Sync", () => {
  let testProjectId: number;

  beforeEach(async () => {
    testProjectId = await db.createProject({
      userId: 1,
      name: "Test Project for Assessment Sync",
      status: "draft",
      company: "Test Company",
    });
  });

  it("should sync offline assessment to server", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.offlineSync.syncAssessment({
      offlineId: "offline_assessment_123",
      createdAt: new Date().toISOString(),
      projectId: testProjectId,
      componentCode: "B2010",
      condition: "good",
      status: "completed",
      observations: "Component in good condition",
      recommendations: "Continue regular maintenance",
      estimatedRepairCost: 1000,
      replacementValue: 10000,
    });

    expect(result).toHaveProperty("assessmentId");
    expect(result).toHaveProperty("offlineId", "offline_assessment_123");
    expect(result.conflict).toBe(false);

    // Verify assessment was created
    const assessments = await db.getProjectAssessments(testProjectId);
    expect(assessments.length).toBeGreaterThan(0);
    
    const created = assessments.find(a => a.id === result.assessmentId);
    expect(created).toBeDefined();
    expect(created?.componentCode).toBe("B2010");
    expect(created?.condition).toBe("good");
  });
});
