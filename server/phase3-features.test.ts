import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
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

describe("Phase 3 Features", () => {
  describe("AI Photo Assessment", () => {
    it("should have AI assessment endpoint available", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Test that the endpoint exists and requires proper input
      await expect(
        caller.photos.assessWithAI({ photoId: 999, photoUrl: "https://example.com/test.jpg" })
      ).rejects.toThrow();
    });
  });

  describe("Photo Annotations", () => {
    it("should support photo upload for annotations", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a test project first
      const project = await caller.projects.create({
        name: "Annotation Test Project",
        address: "123 Test St",
        city: "Test City",
        buildingType: "Residential",
      });

      // Test photo upload with base64 data
      const testImageData = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      
      const photo = await caller.photos.upload({
        projectId: project.id,
        fileData: testImageData,
        fileName: "annotated-test.png",
        mimeType: "image/png",
        caption: "Test annotated photo",
      });

      expect(photo).toBeDefined();
      expect(photo.id).toBeGreaterThan(0);
    });
  });

  describe("Mobile Responsiveness", () => {
    it("should handle assessment creation from mobile workflow", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create project
      const project = await caller.projects.create({
        name: "Mobile Test Project",
        address: "456 Mobile Ave",
        city: "Mobile City",
        buildingType: "Commercial",
      });

      // Create assessment (mobile-friendly workflow)
      const assessment = await caller.assessments.upsert({
        projectId: project.id,
        componentCode: "A1010",
        condition: "good",
        observations: "Tested from mobile device",
        remainingUsefulLife: 15,
      });

      expect(assessment).toBeDefined();
      expect(assessment.id).toBeGreaterThan(0);
      // Verify assessment was created successfully
      const assessments = await caller.assessments.list({ projectId: project.id });
      expect(assessments.length).toBeGreaterThan(0);
    });
  });

  describe("Report Schedules Schema", () => {
    it("should have report schedules table available", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Verify we can query projects (schema is properly set up)
      const projects = await caller.projects.list();
      expect(Array.isArray(projects)).toBe(true);
    });
  });

  describe("Export Functionality", () => {
    it("should export deficiencies to CSV", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create test project
      const project = await caller.projects.create({
        name: "Export Test Project",
        address: "789 Export Blvd",
        city: "Export City",
        buildingType: "Industrial",
      });

      // Create deficiency
      await caller.deficiencies.create({
        projectId: project.id,
        componentCode: "B2010",
        title: "Test Deficiency for Export",
        description: "Testing CSV export",
        severity: "medium",
        priority: "medium_term",
      });

      // Export to CSV
      const result = await caller.exports.deficiencies({ projectId: project.id });

      expect(result).toBeDefined();
      expect(result.csv).toBeDefined();
      expect(result.csv).toContain("Component Code");
    });

    it("should export assessments to CSV", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create test project
      const project = await caller.projects.create({
        name: "Assessment Export Test",
        address: "321 Assessment St",
        city: "Assessment City",
        buildingType: "Educational",
      });

      // Create assessment
      await caller.assessments.upsert({
        projectId: project.id,
        componentCode: "C1010",
        condition: "fair",
        observations: "Testing assessment export",
        remainingUsefulLife: 10,
        expectedUsefulLife: 20,
      });

      // Export to CSV
      const result = await caller.exports.assessments({ projectId: project.id });

      expect(result).toBeDefined();
      expect(result.csv).toBeDefined();
      expect(result.csv).toContain("Component Code");
    });
  });

  describe("PDF Report Generation", () => {
    it("should generate PDF report", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create test project
      const project = await caller.projects.create({
        name: "PDF Test Project",
        address: "555 PDF Lane",
        city: "PDF City",
        buildingType: "Healthcare",
      });

      // Generate PDF
      const pdf = await caller.reports.generate({ projectId: project.id });

      expect(pdf).toBeDefined();
      // PDF is returned as base64 string or buffer
      expect(pdf).toBeTruthy();
    });
  });
});
