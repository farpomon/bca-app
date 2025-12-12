/**
 * Test AI-powered building code compliance checking
 */

import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { assessments } from "../drizzle/schema";

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

describe("Building Code Compliance Checking", () => {
  let testProjectId: number;
  let testAssessmentId: number;

  beforeAll(async () => {
    // Create a test project with building code
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const buildingCodes = await caller.buildingCodes.list();
    const bcCode = buildingCodes.find(c => c.code === "BCBC_2024");

    if (!bcCode) {
      throw new Error("BC Building Code not found for testing");
    }

    // Create test project
    const project = await caller.projects.create({
      name: "Test Compliance Project",
      address: "123 Test St",
      buildingCodeId: bcCode.id,
    });
    testProjectId = project.id;

    // Create test assessment with observations that might have compliance issues
    const dbInstance = await db.getDb();
    if (!dbInstance) throw new Error("Database not available");

    const result = await dbInstance.insert(assessments).values({
      projectId: testProjectId,
      componentCode: "B2010",
      componentName: "Exterior Walls",
      observations: "Fire-rated wall assembly shows signs of deterioration. Gaps observed in fire stopping material around penetrations.",
      condition: "poor",
      conditionPercentage: "30",
      reviewYear: 2025,
      status: "active",
    });

    testAssessmentId = Number(result[0].insertId);
  });

  it("should require a building code to be selected", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create project without building code
    const project = await caller.projects.create({
      name: "Project Without Code",
      address: "456 Test Ave",
    });

    // Create assessment for this project
    const dbInstance = await db.getDb();
    if (!dbInstance) throw new Error("Database not available");

    const result = await dbInstance.insert(assessments).values({
      projectId: project.id,
      componentCode: "B2010",
      componentName: "Exterior Walls",
      observations: "Test observation",
      condition: "good",
      status: "active",
    });

    const assessmentId = Number(result[0].insertId);

    // Try to check compliance - should fail
    await expect(
      caller.complianceCheck.checkAssessmentCompliance({ assessmentId })
    ).rejects.toThrow(/building code/i);

    // Clean up
    await caller.projects.delete({ id: project.id });
  });

  it("should check assessment compliance against building code", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.complianceCheck.checkAssessmentCompliance({
      assessmentId: testAssessmentId,
    });

    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    expect(result.result.status).toMatch(/compliant|non_compliant|needs_review/);
    expect(result.result.issues).toBeDefined();
    expect(Array.isArray(result.result.issues)).toBe(true);
    expect(result.result.summary).toBeDefined();
    expect(result.buildingCode).toBeDefined();
    expect(result.buildingCode.title).toContain("British Columbia");
  }, 60000); // 60 second timeout for LLM call

  it("should store compliance results in database", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await caller.complianceCheck.checkAssessmentCompliance({
      assessmentId: testAssessmentId,
    });

    // Fetch the assessment and verify compliance fields are populated
    const assessment = await db.getAssessmentById(testAssessmentId);

    expect(assessment).toBeDefined();
    expect(assessment?.complianceStatus).toBeDefined();
    expect(assessment?.complianceStatus).toMatch(/compliant|non_compliant|needs_review/);
    expect(assessment?.complianceIssues).toBeDefined();
    expect(assessment?.complianceRecommendations).toBeDefined();
    expect(assessment?.complianceCheckedAt).toBeDefined();
    expect(assessment?.complianceCheckedBy).toBe(ctx.user.id);
  }, 60000);

  it("should handle compliance issues with proper structure", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.complianceCheck.checkAssessmentCompliance({
      assessmentId: testAssessmentId,
    });

    if (result.result.issues.length > 0) {
      const issue = result.result.issues[0];
      expect(issue.severity).toMatch(/high|medium|low/);
      expect(issue.codeSection).toBeDefined();
      expect(issue.description).toBeDefined();
      expect(issue.recommendation).toBeDefined();
    }
  }, 60000);
});
