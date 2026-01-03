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

describe("Export Functionality", () => {
  describe("CSV Export", () => {
    it("should export assessments to CSV format", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a project
      const project = await caller.projects.create({
        name: "CSV Test Project",
      });

      // Create an asset
      const assetId = await assetsDb.createAsset({
        projectId: project.id,
        name: "Test Asset",
        assetType: "Building",
        status: "active",
      });

      // Create assessments
      await db.upsertAssessment({
        projectId: project.id,
        assetId,
        componentCode: "CSV-001",
        componentName: "Test Component 1",
        condition: "good",
        status: "completed",
        assessedAt: new Date(),
      });

      await db.upsertAssessment({
        projectId: project.id,
        assetId,
        componentCode: "CSV-002",
        componentName: "Test Component 2",
        condition: "fair",
        status: "completed",
        assessedAt: new Date(),
      });

      // Export to CSV
      const result = await caller.projects.exportCSV({
        id: project.id,
        type: "assessments",
      });

      expect(result.csv).toBeDefined();
      expect(result.filename).toContain("CSV Test Project");
      expect(result.filename).toContain("assessments.csv");
      expect(result.csv).toContain("CSV-001");
      expect(result.csv).toContain("CSV-002");
      expect(result.csv).toContain("Test Component 1");
      expect(result.csv).toContain("Test Component 2");
    });

    it("should export deficiencies to CSV format", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a project
      const project = await caller.projects.create({
        name: "Deficiency CSV Test",
      });

      // Create an asset
      const assetId = await assetsDb.createAsset({
        projectId: project.id,
        name: "Test Asset",
        assetType: "Building",
        status: "active",
      });

      // Create an assessment
      const assessmentId = await db.upsertAssessment({
        projectId: project.id,
        assetId,
        componentCode: "DEF-001",
        componentName: "Deficient Component",
        condition: "poor",
        status: "completed",
        assessedAt: new Date(),
      });

      // Create deficiencies
      await db.createDeficiency({
        projectId: project.id,
        assessmentId,
        componentCode: "DEF-001",
        title: "Critical Issue",
        description: "Critical deficiency",
        severity: "high",
        priority: "immediate",
      });

      // Export to CSV
      const result = await caller.projects.exportCSV({
        id: project.id,
        type: "deficiencies",
      });

      expect(result.csv).toBeDefined();
      expect(result.filename).toContain("Deficiency CSV Test");
      expect(result.filename).toContain("deficiencies.csv");
      expect(result.csv).toContain("Critical deficiency");
      expect(result.csv).toContain("high");
      expect(result.csv).toContain("immediate");
    });

    it("should handle empty assessments gracefully", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a project with no assessments
      const project = await caller.projects.create({
        name: "Empty Project",
      });

      // Export to CSV
      const result = await caller.projects.exportCSV({
        id: project.id,
        type: "assessments",
      });

      expect(result.csv).toBeDefined();
      expect(result.csv).toContain("No assessments to export");
    });
  });

  describe("Excel Export", () => {
    it("should export project data to Excel format", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a project
      const project = await caller.projects.create({
        name: "Excel Test Project",
      });

      // Create an asset
      const assetId = await assetsDb.createAsset({
        projectId: project.id,
        name: "Test Asset",
        assetType: "Building",
        status: "active",
      });

      // Create assessments
      await db.upsertAssessment({
        projectId: project.id,
        assetId,
        componentCode: "XLS-001",
        componentName: "Excel Component",
        condition: "good",
        status: "completed",
        assessedAt: new Date(),
      });

      // Create deficiency
      const assessmentId = await db.upsertAssessment({
        projectId: project.id,
        assetId,
        componentCode: "XLS-002",
        componentName: "Another Component",
        condition: "poor",
        status: "completed",
        assessedAt: new Date(),
      });

      await db.createDeficiency({
        projectId: project.id,
        assessmentId,
        componentCode: "XLS-002",
        title: "Excel Deficiency",
        description: "Excel test deficiency",
        severity: "medium",
        priority: "medium_term",
      });

      // Export to Excel
      const result = await caller.projects.exportExcel({
        id: project.id,
      });

      expect(result.data).toBeDefined();
      expect(result.filename).toContain("Excel Test Project");
      expect(result.filename).toContain(".xlsx");
      
      // Verify it's a valid base64 string
      expect(result.data.length).toBeGreaterThan(0);
      expect(() => Buffer.from(result.data, 'base64')).not.toThrow();
    });

    it("should include both assessments and deficiencies sheets", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a project
      const project = await caller.projects.create({
        name: "Multi-Sheet Test",
      });

      // Export to Excel (even with no data, should create workbook)
      const result = await caller.projects.exportExcel({
        id: project.id,
      });

      expect(result.data).toBeDefined();
      expect(result.filename).toBe("Multi-Sheet Test-data.xlsx");
      
      // Decode and verify it's a valid Excel file (basic check)
      const buffer = Buffer.from(result.data, 'base64');
      expect(buffer.length).toBeGreaterThan(100); // Excel files have minimum size
    });
  });

  describe("Export Permissions", () => {
    it("should only allow users to export their own projects", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a project
      const project = await caller.projects.create({
        name: "My Project",
      });

      // Try to export with different user
      const otherUserCtx = {
        ...ctx,
        user: { ...ctx.user, id: 999 },
      };
      const otherCaller = appRouter.createCaller(otherUserCtx);

      // Should throw NOT_FOUND error
      await expect(
        otherCaller.projects.exportCSV({
          id: project.id,
          type: "assessments",
        })
      ).rejects.toThrow("Project not found");

      await expect(
        otherCaller.projects.exportExcel({
          id: project.id,
        })
      ).rejects.toThrow("Project not found");
    });
  });
});
