import { describe, expect, it, beforeEach } from "vitest";
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

describe("Project Management Features", () => {
  describe("Bulk Delete", () => {
    it("should delete multiple projects", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create test projects
      const project1 = await caller.projects.create({
        name: "Test Project 1",
      });
      const project2 = await caller.projects.create({
        name: "Test Project 2",
      });

      // Bulk delete
      const result = await caller.projects.bulkDelete({
        ids: [project1.id, project2.id],
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);

      // Verify projects are deleted
      const projects = await db.getUserProjects(ctx.user.id);
      const deletedIds = [project1.id, project2.id];
      const stillExists = projects.some((p) => deletedIds.includes(p.id));
      expect(stillExists).toBe(false);
    });

    it("should only delete projects belonging to the user", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a project
      const project = await caller.projects.create({
        name: "My Project",
      });

      // Try to delete with wrong user context
      const otherUserCtx = {
        ...ctx,
        user: { ...ctx.user, id: 999, company: "other-company", companyId: 999, role: "user" as const },
      };
      const otherCaller = appRouter.createCaller(otherUserCtx);

      // Should throw because the other user doesn't own the project
      await expect(
        otherCaller.projects.bulkDelete({ ids: [project.id] })
      ).rejects.toThrow();

      // Verify project still exists for original user
      const projects = await db.getUserProjects(ctx.user.id, false, ctx.user.company, ctx.user.role === "admin");
      const exists = projects.some((p) => p.id === project.id);
      expect(exists).toBe(true);
    });
  });

  describe("Archive/Unarchive", () => {
    it("should archive a project", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a project
      const project = await caller.projects.create({
        name: "Test Project",
      });

      // Archive it
      const result = await caller.projects.archive({ id: project.id });
      expect(result.success).toBe(true);

      // Verify status changed
      const updated = await db.getProjectById(project.id, ctx.user.id);
      expect(updated?.status).toBe("archived");
    });

    it("should unarchive a project", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create and archive a project
      const project = await caller.projects.create({
        name: "Test Project",
      });
      await caller.projects.archive({ id: project.id });

      // Unarchive it
      const result = await caller.projects.unarchive({ id: project.id });
      expect(result.success).toBe(true);

      // Verify status changed back to draft
      const updated = await db.getProjectById(project.id, ctx.user.id);
      expect(updated?.status).toBe("draft");
    });
  });

  describe("Export/Import", () => {
    it("should export a project with all related data", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a project
      const project = await caller.projects.create({
        name: "Export Test Project",
        address: "123 Test St",
        clientName: "Test Client",
      });

      // Create an asset
      const assetId = await assetsDb.createAsset({
        projectId: project.id,
        name: "Test Asset",
        assetType: "Building",
        status: "active",
      });

      // Create an assessment
      await db.upsertAssessment({
        projectId: project.id,
        assetId,
        componentCode: "TEST-001",
        componentName: "Test Component",
        condition: "good",
        status: "completed",
        assessedAt: new Date(),
      });

      // Export the project
      const exported = await caller.projects.export({ id: project.id });

      // Verify export structure
      expect(exported.version).toBe("1.0");
      expect(exported.project.name).toBe("Export Test Project");
      expect(exported.project.address).toBe("123 Test St");
      expect(exported.assets).toHaveLength(1);
      expect(exported.assessments).toHaveLength(1);
      expect(exported.assessments[0].componentCode).toBe("TEST-001");
    });

    it("should import a project and create new records", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create and export a project
      const originalProject = await caller.projects.create({
        name: "Original Project",
        address: "456 Original St",
      });

      const assetId = await assetsDb.createAsset({
        projectId: originalProject.id,
        name: "Original Asset",
        assetType: "Building",
        status: "active",
      });

      await db.upsertAssessment({
        projectId: originalProject.id,
        assetId,
        componentCode: "ORIG-001",
        componentName: "Original Component",
        condition: "fair",
        status: "completed",
        assessedAt: new Date(),
      });

      const exportData = await caller.projects.export({
        id: originalProject.id,
      });

      // Import as a new project
      const importResult = await caller.projects.import({ data: exportData });

      expect(importResult.success).toBe(true);
      expect(importResult.projectId).toBeDefined();
      expect(importResult.projectId).not.toBe(originalProject.id);

      // Verify imported project
      const importedProject = await db.getProjectById(
        importResult.projectId,
        ctx.user.id
      );
      expect(importedProject?.name).toBe("Original Project");
      expect(importedProject?.address).toBe("456 Original St");

      // Verify imported assets
      const importedAssets = await assetsDb.getProjectAssets(
        importResult.projectId
      );
      expect(importedAssets).toHaveLength(1);
      expect(importedAssets[0].name).toBe("Original Asset");

      // Verify imported assessments
      const importedAssessments = await db.getProjectAssessments(
        importResult.projectId
      );
      expect(importedAssessments).toHaveLength(1);
      expect(importedAssessments[0].componentCode).toBe("ORIG-001");
    });

    it("should handle import without optional data", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create minimal export data
      const minimalExport = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        project: {
          name: "Minimal Project",
          userId: ctx.user.id,
          status: "draft" as const,
        },
        assessments: [],
        deficiencies: [],
        photos: [],
        assets: [],
        sections: [],
      };

      // Import should work
      const result = await caller.projects.import({ data: minimalExport });

      expect(result.success).toBe(true);
      expect(result.projectId).toBeDefined();

      // Verify project was created
      const project = await db.getProjectById(result.projectId, ctx.user.id);
      expect(project?.name).toBe("Minimal Project");
    });
  });
});
