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

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
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

describe("Rating Scales System", () => {
  it("should list all predefined rating scales", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const scales = await caller.ratings.scales.list();

    expect(scales).toBeDefined();
    expect(scales.length).toBeGreaterThan(0);
    
    // Check for predefined scales
    const fciScale = scales.find(s => s.type === "fci" && s.isDefault);
    const ciScale = scales.find(s => s.type === "ci" && s.isDefault);
    const conditionScale = scales.find(s => s.type === "condition" && s.isDefault);
    const priorityScale = scales.find(s => s.type === "priority" && s.isDefault);

    expect(fciScale).toBeDefined();
    expect(ciScale).toBeDefined();
    expect(conditionScale).toBeDefined();
    expect(priorityScale).toBeDefined();
  });

  it("should get rating scales by type", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const fciScales = await caller.ratings.scales.byType({ type: "fci" });
    const ciScales = await caller.ratings.scales.byType({ type: "ci" });

    expect(fciScales.every(s => s.type === "fci")).toBe(true);
    expect(ciScales.every(s => s.type === "ci")).toBe(true);
  });

  it("should get default rating scale for a type", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const defaultFci = await caller.ratings.scales.getDefault({ type: "fci" });
    const defaultCi = await caller.ratings.scales.getDefault({ type: "ci" });

    expect(defaultFci).toBeDefined();
    expect(defaultFci?.isDefault).toBe(true);
    expect(defaultCi).toBeDefined();
    expect(defaultCi?.isDefault).toBe(true);
  });

  it("should prevent non-admins from creating rating scales", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.ratings.scales.create({
        name: "Custom Scale",
        type: "custom",
        minValue: 1,
        maxValue: 5,
        scaleItems: [
          { value: 1, label: "Poor" },
          { value: 5, label: "Excellent" },
        ],
      })
    ).rejects.toThrow("Admin access required");
  });

  it("should calculate overall building condition", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const projectId = await db.createProject({
      name: "Test Building",
      address: "123 Test St",
      userId: ctx.user.id,
      buildingType: "office",
      yearBuilt: 2000,
      totalArea: 10000,
    });

    // Add some assessments
    await db.upsertAssessment({
      projectId,
      assetId: 1,
      componentCode: "B2010",
      condition: "good",
      notes: "Test assessment 1",
      assessedAt: new Date(),
    });

    await db.upsertAssessment({
      projectId,
      assetId: 1,
      componentCode: "B2020",
      condition: "fair",
      notes: "Test assessment 2",
      assessedAt: new Date(),
    });

    // Calculate overall condition
    const result = await db.calculateOverallBuildingCondition(projectId);

    expect(result).toBeDefined();
    expect(result?.overallConditionScore).toBeGreaterThan(0);
    expect(result?.overallConditionRating).toMatch(/Good|Fair|Poor/);
    expect(result?.assessmentCount).toBe(2);

    // Clean up
    await db.deleteProject(projectId, ctx.user.id);
  });
});
