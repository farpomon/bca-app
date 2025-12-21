import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { AuthenticatedUser } from "./_core/context";

/**
 * Test bulk compliance checking feature
 * Verifies that checkAllProjectComponents endpoint works correctly
 */

let testProjectId: number;
let testAssessmentIds: number[] = [];
let testContext: TrpcContext;

beforeAll(async () => {
  // Create test context with authenticated user
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

  testContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  const caller = appRouter.createCaller(testContext);

  // Get building codes
  const buildingCodes = await caller.buildingCodes.list();
  const bcCode = buildingCodes.find(c => c.code === "BCBC_2024");

  if (!bcCode) {
    throw new Error("BCBC_2024 building code not found");
  }

  // Create test project with building code
  const project = await caller.projects.create({
    name: "Bulk Compliance Test Project",
    propertyType: "commercial",
    buildingCodeId: bcCode.id,
  });
  testProjectId = project.id;

  // Create test asset
  const asset = await caller.assets.create({
    projectId: testProjectId,
    name: "Test Building",
    assetType: "building",
  });

  // Create multiple test assessments
  const assessmentData = [
    {
      projectId: testProjectId,
      assetId: asset.id,
      componentCode: "B2010",
      componentName: "Exterior Walls",
      condition: "fair",
      conditionPercentage: "65",
      observations: "Minor cracks observed in exterior walls. Some water staining visible.",
      reviewYear: 2024,
      estimatedUsefulLife: 40,
      remainingUsefulLife: 20,
    },
    {
      projectId: testProjectId,
      assetId: asset.id,
      componentCode: "B3010",
      componentName: "Roof Covering",
      condition: "poor",
      conditionPercentage: "45",
      observations: "Significant wear on roof membrane. Multiple areas showing signs of deterioration.",
      reviewYear: 2024,
      estimatedUsefulLife: 25,
      remainingUsefulLife: 5,
    },
    {
      projectId: testProjectId,
      assetId: asset.id,
      componentCode: "D3020",
      componentName: "HVAC System",
      condition: "good",
      conditionPercentage: "80",
      observations: "System operating efficiently. Regular maintenance up to date.",
      reviewYear: 2024,
      estimatedUsefulLife: 20,
      remainingUsefulLife: 12,
    },
  ];

  for (const data of assessmentData) {
    const assessment = await caller.assessments.upsert(data);
    testAssessmentIds.push(assessment.id);
  }
});

describe("Bulk Compliance Checking", () => {
  it("should check all project components for compliance", async () => {
    const caller = appRouter.createCaller(testContext);

    const result = await caller.complianceCheck.checkAllProjectComponents({
      projectId: testProjectId,
    });

    // Verify result structure
    expect(result.success).toBe(true);
    expect(result.results).toBeDefined();
    expect(result.errors).toBeDefined();
    expect(result.summary).toBeDefined();

    // Verify summary counts
    expect(result.summary.total).toBe(3);
    expect(result.summary.successful).toBeGreaterThan(0);
    expect(result.summary.compliant + result.summary.nonCompliant + result.summary.needsReview).toBe(result.summary.successful);

    // Verify each result has required fields
    result.results.forEach((r: any) => {
      expect(r.assessmentId).toBeDefined();
      expect(r.componentName).toBeDefined();
      expect(r.componentCode).toBeDefined();
      expect(r.result).toBeDefined();
      expect(r.result.status).toMatch(/compliant|non_compliant|needs_review/);
      expect(r.result.summary).toBeDefined();
      expect(r.buildingCode).toBeDefined();
    });
  });

  it("should fail when project has no building code", async () => {
    const caller = appRouter.createCaller(testContext);

    // Create project without building code
    const project = await caller.projects.create({
      name: "No Building Code Project",
      propertyType: "residential",
    });

    await expect(
      caller.complianceCheck.checkAllProjectComponents({
        projectId: project.id,
      })
    ).rejects.toThrow("does not have a building code selected");
  });

  it("should handle project with no assessments", async () => {
    const caller = appRouter.createCaller(testContext);

    // Get building codes
    const buildingCodes = await caller.buildingCodes.list();
    const bcCode = buildingCodes.find(c => c.code === "BCBC_2024");

    // Create project with building code but no assessments
    const project = await caller.projects.create({
      name: "Empty Project",
      propertyType: "commercial",
      buildingCodeId: bcCode!.id,
    });

    const result = await caller.complianceCheck.checkAllProjectComponents({
      projectId: project.id,
    });

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    expect(result.summary.total).toBe(0);
    expect(result.summary.successful).toBe(0);
    expect(result.summary.failed).toBe(0);
  });

  it("should store compliance results in database", async () => {
    const caller = appRouter.createCaller(testContext);

    await caller.complianceCheck.checkAllProjectComponents({
      projectId: testProjectId,
    });

    // Verify that assessments have compliance data
    for (const assessmentId of testAssessmentIds) {
      const assessment = await caller.assessments.get({ id: assessmentId });
      
      expect(assessment.complianceStatus).toBeDefined();
      expect(assessment.complianceStatus).toMatch(/compliant|non_compliant|needs_review/);
      expect(assessment.complianceIssues).toBeDefined();
      expect(assessment.complianceRecommendations).toBeDefined();
      expect(assessment.complianceCheckedAt).toBeDefined();
      expect(assessment.complianceCheckedBy).toBe(testContext.user.id);
    }
  });

  it("should provide detailed compliance summary", async () => {
    const caller = appRouter.createCaller(testContext);

    const result = await caller.complianceCheck.checkAllProjectComponents({
      projectId: testProjectId,
    });

    // Verify summary provides useful metrics
    expect(result.summary.total).toBe(testAssessmentIds.length);
    expect(result.summary.successful + result.summary.failed).toBe(result.summary.total);
    
    // At least one component should have a compliance status
    expect(result.summary.compliant + result.summary.nonCompliant + result.summary.needsReview).toBeGreaterThan(0);
  });
});
