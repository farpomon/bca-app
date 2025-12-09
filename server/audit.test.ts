import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(): TrpcContext {
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

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
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

describe("Audit Trail System", () => {
  it("should create manual audit log entry", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.audit.createLog({
      entityType: "assessment",
      entityId: 1,
      action: "update",
      changes: JSON.stringify({
        before: { condition: "fair" },
        after: { condition: "good" },
      }),
      changeDescription: "Updated condition rating",
    });

    expect(result.success).toBe(true);
  });

  it("should retrieve audit logs for an entity", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    // Create a log entry first
    await caller.audit.createLog({
      entityType: "deficiency",
      entityId: 100,
      action: "create",
      changes: JSON.stringify({
        before: null,
        after: { description: "Test deficiency", priority: "high" },
      }),
    });

    // Retrieve logs
    const logs = await caller.audit.logs({ entityType: "deficiency", entityId: 100 });

    expect(logs).toBeDefined();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].entityType).toBe("deficiency");
    expect(logs[0].entityId).toBe(100);
  });

  it("should allow admins to view all audit logs", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const logs = await caller.audit.allLogs({ limit: 10 });

    expect(logs).toBeDefined();
    expect(Array.isArray(logs)).toBe(true);
  });

  it("should prevent non-admins from viewing all audit logs", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.audit.allLogs({ limit: 10 })).rejects.toThrow("Admin access required");
  });

  it("should create assessment version snapshots", async () => {
    const ctx = createUserContext();

    // Create a test project
    const projectId = await db.createProject({
      name: "Test Building",
      address: "123 Test St",
      userId: ctx.user.id,
      buildingType: "office",
      yearBuilt: 2000,
      totalArea: 10000,
    });

    // Create an assessment
    const assessmentId = await db.upsertAssessment({
      projectId,
      assetId: 1,
      componentCode: "B2010",
      condition: "good",
      notes: "Initial assessment",
      assessedAt: new Date(),
    });

    // Create version snapshot
    await db.createAssessmentVersion({
      assessmentId,
      versionNumber: 1,
      data: JSON.stringify({
        condition: "good",
        notes: "Initial assessment",
      }),
      changedBy: ctx.user.id,
      changeDescription: "Initial version",
    });

    // Retrieve versions
    const versions = await db.getAssessmentVersions(assessmentId);

    expect(versions).toBeDefined();
    expect(versions.length).toBe(1);
    expect(versions[0].versionNumber).toBe(1);
    expect(versions[0].changedBy).toBe(ctx.user.id);

    // Clean up
    await db.deleteProject(projectId, ctx.user.id);
  });

  it("should track multiple versions of an assessment", async () => {
    const ctx = createUserContext();

    // Create a test project
    const projectId = await db.createProject({
      name: "Test Building 2",
      address: "456 Test Ave",
      userId: ctx.user.id,
      buildingType: "residential",
      yearBuilt: 2010,
      totalArea: 5000,
    });

    // Create an assessment
    const assessmentId = await db.upsertAssessment({
      projectId,
      assetId: 1,
      componentCode: "B2020",
      condition: "fair",
      notes: "First version",
      assessedAt: new Date(),
    });

    // Create multiple versions
    await db.createAssessmentVersion({
      assessmentId,
      versionNumber: 1,
      data: JSON.stringify({ condition: "fair", notes: "First version" }),
      changedBy: ctx.user.id,
    });

    await db.createAssessmentVersion({
      assessmentId,
      versionNumber: 2,
      data: JSON.stringify({ condition: "poor", notes: "Second version" }),
      changedBy: ctx.user.id,
    });

    await db.createAssessmentVersion({
      assessmentId,
      versionNumber: 3,
      data: JSON.stringify({ condition: "good", notes: "Third version" }),
      changedBy: ctx.user.id,
    });

    // Retrieve all versions
    const versions = await db.getAssessmentVersions(assessmentId);

    expect(versions.length).toBe(3);
    expect(versions[0].versionNumber).toBe(3); // Most recent first
    expect(versions[1].versionNumber).toBe(2);
    expect(versions[2].versionNumber).toBe(1);

    // Clean up
    await db.deleteProject(projectId, ctx.user.id);
  });
});
