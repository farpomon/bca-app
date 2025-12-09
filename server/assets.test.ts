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

describe("Assets Management", () => {
  it("should create and list assets for a project", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const projectId = await db.createProject({
      name: "Asset Test Project",
      address: "123 Test St",
      userId: ctx.user.id,
      buildingType: "office",
      yearBuilt: 2000,
      totalArea: 10000,
    });

    // Create an asset
    const asset1 = await caller.assets.create({
      projectId,
      name: "Main Building",
      description: "Primary office building",
      assetType: "Office",
      yearBuilt: 2000,
      grossFloorArea: 5000,
      numberOfStories: 3,
      status: "active",
    });

    expect(asset1).toBeDefined();
    expect(asset1.id).toBeGreaterThan(0);

    // Create another asset
    const asset2 = await caller.assets.create({
      projectId,
      name: "Parking Structure",
      assetType: "Parking",
      status: "active",
    });

    expect(asset2).toBeDefined();

    // List assets
    const assets = await caller.assets.list({ projectId });

    expect(assets).toBeDefined();
    expect(assets.length).toBe(2);
    expect(assets.some(a => a.name === "Main Building")).toBe(true);
    expect(assets.some(a => a.name === "Parking Structure")).toBe(true);

    // Clean up
    await db.deleteProject(projectId, ctx.user.id);
  });

  it("should update an asset", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const projectId = await db.createProject({
      name: "Asset Update Test",
      address: "456 Test Ave",
      userId: ctx.user.id,
      buildingType: "residential",
      yearBuilt: 2010,
      totalArea: 5000,
    });

    // Create an asset
    const asset = await caller.assets.create({
      projectId,
      name: "Original Name",
      status: "active",
    });

    // Update the asset
    await caller.assets.update({
      id: asset.id,
      projectId,
      name: "Updated Name",
      description: "New description",
      status: "inactive",
    });

    // Get the updated asset
    const updated = await caller.assets.get({ id: asset.id, projectId });

    expect(updated).toBeDefined();
    expect(updated.name).toBe("Updated Name");
    expect(updated.description).toBe("New description");
    expect(updated.status).toBe("inactive");

    // Clean up
    await db.deleteProject(projectId, ctx.user.id);
  });

  it("should delete an asset", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const projectId = await db.createProject({
      name: "Asset Delete Test",
      address: "789 Test Blvd",
      userId: ctx.user.id,
      buildingType: "warehouse",
      yearBuilt: 1990,
      totalArea: 20000,
    });

    // Create an asset
    const asset = await caller.assets.create({
      projectId,
      name: "To Be Deleted",
      status: "active",
    });

    // Delete the asset
    await caller.assets.delete({ id: asset.id, projectId });

    // Try to get the deleted asset
    await expect(
      caller.assets.get({ id: asset.id, projectId })
    ).rejects.toThrow("Asset not found");

    // Clean up
    await db.deleteProject(projectId, ctx.user.id);
  });

  it("should link assessments to assets", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const projectId = await db.createProject({
      name: "Assessment Link Test",
      address: "321 Test Rd",
      userId: ctx.user.id,
      buildingType: "office",
      yearBuilt: 2005,
      totalArea: 8000,
    });

    // Create an asset
    const asset = await caller.assets.create({
      projectId,
      name: "Test Building",
      status: "active",
    });

    // Create an assessment linked to the asset
    await db.upsertAssessment({
      projectId,
      assetId: asset.id,
      componentCode: "B2010",
      condition: "good",
      assessedAt: new Date(),
    });

    // Verify the assessment exists
    const assessments = await db.getProjectAssessments(projectId);
    expect(assessments.length).toBe(1);
    expect(assessments[0].assetId).toBe(asset.id);

    // Clean up
    await db.deleteProject(projectId, ctx.user.id);
  });
});
