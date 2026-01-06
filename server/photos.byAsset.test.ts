import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import * as assetsDb from "./db-assets";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

async function getAdminUser(): Promise<AuthenticatedUser | null> {
  const adminUser = await db.getUserByOpenId(process.env.OWNER_OPEN_ID || "");
  if (!adminUser) return null;
  return adminUser as AuthenticatedUser;
}

function createAuthContext(user: AuthenticatedUser): TrpcContext {

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("photos.byAsset with componentCode filtering", () => {
  it("should filter photos by componentCode when provided", async () => {
    const adminUser = await getAdminUser();
    if (!adminUser) {
      console.log("Admin user not found, skipping test");
      return;
    }
    const ctx = createAuthContext(adminUser);
    const caller = appRouter.createCaller(ctx);

    // Get a test project
    const projects = await db.getUserProjects(ctx.user.id, ctx.user.role === "admin", ctx.user.isSuperAdmin === 1, ctx.user.companyId, ctx.user.company);
    if (!projects || projects.length === 0) {
      console.log("No projects found, skipping test");
      return;
    }
    const projectId = projects[0].id;

    // Get an asset from the project
    const assets = await assetsDb.getAssetsByProjectId(projectId);
    if (!assets || assets.length === 0) {
      console.log("No assets found, skipping test");
      return;
    }
    const assetId = assets[0].id;

    // Test 1: Get all photos for the asset (no componentCode filter)
    const allPhotos = await caller.photos.byAsset({
      assetId,
      projectId,
    });

    console.log(`Total photos for asset ${assetId}: ${allPhotos.length}`);

    // Test 2: Get photos filtered by a specific component code
    // Use a common UNIFORMAT II code like B2010 (Exterior Walls)
    const componentCode = "B2010";
    const filteredPhotos = await caller.photos.byAsset({
      assetId,
      projectId,
      componentCode,
    });

    console.log(`Photos for component ${componentCode}: ${filteredPhotos.length}`);

    // Verify that filtered photos only contain the specified componentCode
    filteredPhotos.forEach((photo) => {
      expect(photo.componentCode).toBe(componentCode);
    });

    // Verify that filtered count is less than or equal to total count
    expect(filteredPhotos.length).toBeLessThanOrEqual(allPhotos.length);

    // Test 3: Get photos for a different component code
    const anotherComponentCode = "C3020";
    const anotherFilteredPhotos = await caller.photos.byAsset({
      assetId,
      projectId,
      componentCode: anotherComponentCode,
    });

    console.log(`Photos for component ${anotherComponentCode}: ${anotherFilteredPhotos.length}`);

    // Verify that photos from different components don't overlap
    anotherFilteredPhotos.forEach((photo) => {
      expect(photo.componentCode).toBe(anotherComponentCode);
    });

    // Test 4: Verify that photos with different component codes are separated
    const hasMultipleComponents = allPhotos.some(
      (p) => p.componentCode && p.componentCode !== componentCode
    );
    
    if (hasMultipleComponents) {
      // If there are photos with different component codes,
      // the filtered result should be smaller than the total
      expect(filteredPhotos.length).toBeLessThan(allPhotos.length);
    }

    console.log("✓ Photo filtering by componentCode works correctly");
  });

  it("should return empty array when no photos match the componentCode", async () => {
    const adminUser = await getAdminUser();
    if (!adminUser) {
      console.log("Admin user not found, skipping test");
      return;
    }
    const ctx = createAuthContext(adminUser);
    const caller = appRouter.createCaller(ctx);

    // Get a test project
    const projects = await db.getUserProjects(ctx.user.id, ctx.user.role === "admin", ctx.user.isSuperAdmin === 1, ctx.user.companyId, ctx.user.company);
    if (!projects || projects.length === 0) {
      console.log("No projects found, skipping test");
      return;
    }
    const projectId = projects[0].id;

    // Get an asset from the project
    const assets = await assetsDb.getAssetsByProjectId(projectId);
    if (!assets || assets.length === 0) {
      console.log("No assets found, skipping test");
      return;
    }
    const assetId = assets[0].id;

    // Use a component code that likely doesn't exist
    const nonExistentComponentCode = "Z9999";
    const filteredPhotos = await caller.photos.byAsset({
      assetId,
      projectId,
      componentCode: nonExistentComponentCode,
    });

    // Should return empty array
    expect(Array.isArray(filteredPhotos)).toBe(true);
    expect(filteredPhotos.length).toBe(0);

    console.log("✓ Returns empty array for non-existent componentCode");
  });
});
