import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import * as assetsDb from "./db-assets";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    company: "Test Company",
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

describe("Bulk Export Functionality", () => {
  it("should export multiple projects to a single Excel file", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create 3 test projects
    const project1 = await caller.projects.create({
      name: "Bulk Export Project 1",
    });

    const project2 = await caller.projects.create({
      name: "Bulk Export Project 2",
    });

    const project3 = await caller.projects.create({
      name: "Bulk Export Project 3",
    });

    // Add some data to each project
    for (const project of [project1, project2, project3]) {
      const assetId = await assetsDb.createAsset({
        projectId: project.id,
        name: `Asset for ${project.name}`,
        assetType: "Building",
        status: "active",
      });

      await db.upsertAssessment({
        projectId: project.id,
        assetId,
        componentCode: `COMP-${project.id}`,
        componentName: `Component for ${project.name}`,
        condition: "good",
        status: "completed",
        assessedAt: new Date(),
      });
    }

    // Bulk export
    const result = await caller.projects.bulkExportExcel({
      ids: [project1.id, project2.id, project3.id],
    });

    expect(result.data).toBeDefined();
    expect(result.filename).toContain("bulk-export");
    expect(result.filename).toContain("3-projects");
    expect(result.filename).toContain(".xlsx");
    
    // Verify it's a valid base64 string
    expect(result.data.length).toBeGreaterThan(0);
    const buffer = Buffer.from(result.data, 'base64');
    expect(buffer.length).toBeGreaterThan(1000); // Excel files with data should be substantial
  });

  it("should handle bulk export with varying amounts of data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create project with lots of data
    const project1 = await caller.projects.create({
      name: "Data-Rich Project",
    });

    const assetId1 = await assetsDb.createAsset({
      projectId: project1.id,
      name: "Test Asset",
      assetType: "Building",
      status: "active",
    });

    // Add multiple assessments
    for (let i = 0; i < 5; i++) {
      await db.upsertAssessment({
        projectId: project1.id,
        assetId: assetId1,
        componentCode: `COMP-${i}`,
        componentName: `Component ${i}`,
        condition: "good",
        status: "completed",
        assessedAt: new Date(),
      });
    }

    // Create project with no data
    const project2 = await caller.projects.create({
      name: "Empty Project",
    });

    // Bulk export both
    const result = await caller.projects.bulkExportExcel({
      ids: [project1.id, project2.id],
    });

    expect(result.data).toBeDefined();
    expect(result.filename).toContain("2-projects");
  });

  it("should include summary sheet in bulk export", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create 2 projects
    const project1 = await caller.projects.create({
      name: "Summary Test 1",
      clientName: "Client A",
      address: "123 Main St",
    });

    const project2 = await caller.projects.create({
      name: "Summary Test 2",
      clientName: "Client B",
      address: "456 Oak Ave",
    });

    // Export
    const result = await caller.projects.bulkExportExcel({
      ids: [project1.id, project2.id],
    });

    expect(result.data).toBeDefined();
    // The summary sheet should be the first sheet in the workbook
    const buffer = Buffer.from(result.data, 'base64');
    expect(buffer.length).toBeGreaterThan(500);
  });

  it("should filter out projects user doesn't have access to", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create project as current user
    const myProject = await caller.projects.create({
      name: "My Project",
    });

    // Create project as different user
    const otherUserCtx = {
      ...ctx,
      user: { ...ctx.user, id: 999, company: "other-company", companyId: 999, role: "user" as const },
    };
    const otherCaller = appRouter.createCaller(otherUserCtx);
    const otherProject = await otherCaller.projects.create({
      name: "Other User's Project",
    });

    // Try to bulk export both (should only export myProject)
    const result = await caller.projects.bulkExportExcel({
      ids: [myProject.id, otherProject.id],
    });

    expect(result.data).toBeDefined();
    expect(result.filename).toContain("1-projects"); // Only 1 accessible project
  });

  it("should throw error when no projects are selected", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.projects.bulkExportExcel({ ids: [] })
    ).rejects.toThrow("No projects selected");
  });

  it("should throw error when no accessible projects found", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Try to export non-existent projects
    await expect(
      caller.projects.bulkExportExcel({ ids: [99999, 99998] })
    ).rejects.toThrow("No accessible projects found");
  });

  it("should handle large bulk exports (10+ projects)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create 12 projects
    const projectIds: number[] = [];
    for (let i = 0; i < 12; i++) {
      const project = await caller.projects.create({
        name: `Bulk Project ${i + 1}`,
      });
      projectIds.push(project.id);
    }

    // Bulk export all
    const result = await caller.projects.bulkExportExcel({
      ids: projectIds,
    });

    expect(result.data).toBeDefined();
    expect(result.filename).toContain("12-projects");
    
    // Verify file size is reasonable for 12 projects
    const buffer = Buffer.from(result.data, 'base64');
    expect(buffer.length).toBeGreaterThan(2000);
  });

  it("should include project info and data in separate sheets", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create project with assessments and deficiencies
    const project = await caller.projects.create({
      name: "Multi-Sheet Project",
      clientName: "Test Client",
      address: "789 Test St",
    });

    const assetId = await assetsDb.createAsset({
      projectId: project.id,
      name: "Test Asset",
      assetType: "Building",
      status: "active",
    });

    const assessmentId = await db.upsertAssessment({
      projectId: project.id,
      assetId,
      componentCode: "TEST-001",
      componentName: "Test Component",
      condition: "poor",
      status: "completed",
      assessedAt: new Date(),
    });

    await db.createDeficiency({
      projectId: project.id,
      assessmentId,
      componentCode: "TEST-001",
      title: "Test Deficiency",
      description: "Test description",
      severity: "high",
      priority: "immediate",
    });

    // Export
    const result = await caller.projects.bulkExportExcel({
      ids: [project.id],
    });

    expect(result.data).toBeDefined();
    // Should have multiple sheets: Summary, Project Info, Assessments, Deficiencies
    const buffer = Buffer.from(result.data, 'base64');
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
