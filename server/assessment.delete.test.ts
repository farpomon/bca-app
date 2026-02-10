import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
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

  return ctx;
}

function createNonAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
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

  return ctx;
}

describe("assessments.adminDelete", () => {
  let testAssessmentId: number;
  let testProjectId: number;
  let testAssetId: number;

  beforeAll(async () => {
    // Create a test project
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const project = await caller.projects.create({
      name: "Delete Test Project",
      address: "123 Delete St",
    });
    testProjectId = project.id;
    
    // Create a test asset
    const { createAsset } = await import("./db-assets");
    testAssetId = await createAsset({
      projectId: testProjectId,
      name: "Delete Test Asset",
      assetType: "building",
    });
    
    // Create a fresh test assessment for deletion
    testAssessmentId = await db.upsertAssessment({
      projectId: testProjectId,
      assetId: testAssetId,
      componentCode: "TEST-DEL",
      componentName: "Test Component",
      condition: "fair",
      status: "initial",
      estimatedRepairCost: 1000,
      assessedAt: new Date().toISOString(),
    });
  });

  it("should allow admin to delete assessment", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.assessments.adminDelete({
      assessmentId: testAssessmentId,
      projectId: testProjectId,
      reason: "Test deletion",
    });

    expect(result).toEqual({ success: true, message: "Assessment deleted successfully" });

    // Verify assessment is soft-deleted
    const deletedAssessment = await db.getAssessmentById(testAssessmentId);
    expect(deletedAssessment).toBeUndefined(); // Should not be returned since it's deleted
  });

  it("should reject non-admin user from deleting assessment", async () => {
    const ctx = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.assessments.adminDelete({
        assessmentId: testAssessmentId,
        projectId: testProjectId,
        reason: "Unauthorized deletion attempt",
      })
    ).rejects.toThrow("Only administrators can delete assessments");
  });

  it("should reject deletion of non-existent assessment", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.assessments.adminDelete({
        assessmentId: 999999,
        projectId: testProjectId,
        reason: "Test deletion",
      })
    ).rejects.toThrow("Assessment not found");
  });

  it("should reject deletion when assessment doesn't belong to project", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create a fresh assessment since the original was deleted in the first test
    const newAssessmentId = await db.upsertAssessment({
      projectId: testProjectId,
      assetId: testAssetId,
      componentCode: "TEST-CROSS",
      componentName: "Cross Project Test",
      condition: "fair",
      status: "initial",
      estimatedRepairCost: 500,
      assessedAt: new Date().toISOString(),
    });

    await expect(
      caller.assessments.adminDelete({
        assessmentId: newAssessmentId,
        projectId: 999999, // Wrong project ID
        reason: "Test deletion",
      })
    ).rejects.toThrow();
  });
});
