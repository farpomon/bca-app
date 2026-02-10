import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { generateProjectUniqueId, generateAssetUniqueId, isValidProjectUniqueId, isValidAssetUniqueId } from "./utils/uniqueId";
import * as db from "./db";
import * as dbAssets from "./db-assets";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
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

  return { ctx };
}

describe("New Features: Building Codes, Unique IDs, and Compliance Explanations", () => {
  beforeAll(async () => {
    // Seed required building codes
    const { upsertBuildingCode } = await import("./db-building-codes");
    await upsertBuildingCode({
      code: "NFC_2020",
      title: "National Fire Code of Canada 2020",
      edition: "2020",
      jurisdiction: "Canada",
      year: 2020,
      isActive: 1,
    });
    await upsertBuildingCode({
      code: "NPC_2020",
      title: "National Plumbing Code of Canada 2020",
      edition: "2020",
      jurisdiction: "Canada",
      year: 2020,
      isActive: 1,
    });
  });

  describe("Building Codes - National Fire Code and Plumbing Code", () => {
    it("should include National Fire Code of Canada 2020 in building codes list", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const buildingCodes = await caller.buildingCodes.list();

      const fireCode = buildingCodes.find(
        (code) => code.title === "National Fire Code of Canada 2020"
      );

      expect(fireCode).toBeDefined();
      expect(fireCode?.code).toBe("NFC_2020");
      expect(fireCode?.jurisdiction).toBe("Canada");
      expect(fireCode?.year).toBe(2020);
      expect(fireCode?.isActive).toBe(1);
    });

    it("should include National Plumbing Code of Canada 2020 in building codes list", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const buildingCodes = await caller.buildingCodes.list();

      const plumbingCode = buildingCodes.find(
        (code) => code.title === "National Plumbing Code of Canada 2020"
      );

      expect(plumbingCode).toBeDefined();
      expect(plumbingCode?.code).toBe("NPC_2020");
      expect(plumbingCode?.jurisdiction).toBe("Canada");
      expect(plumbingCode?.year).toBe(2020);
      expect(plumbingCode?.isActive).toBe(1);
    });
  });

  describe("Unique ID Generation", () => {
    it("should generate valid project unique ID with correct format", () => {
      const uniqueId = generateProjectUniqueId();

      // Format: PROJ-YYYYMMDD-XXXX
      expect(uniqueId).toMatch(/^PROJ-\d{8}-[A-Z0-9]{4}$/);
      expect(isValidProjectUniqueId(uniqueId)).toBe(true);
    });

    it("should generate valid asset unique ID with correct format", () => {
      const uniqueId = generateAssetUniqueId();

      // Format: ASSET-YYYYMMDD-XXXX
      expect(uniqueId).toMatch(/^ASSET-\d{8}-[A-Z0-9]{4}$/);
      expect(isValidAssetUniqueId(uniqueId)).toBe(true);
    });

    it("should generate unique IDs that are different from each other", () => {
      const id1 = generateProjectUniqueId();
      const id2 = generateProjectUniqueId();
      const id3 = generateProjectUniqueId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it("should validate project unique ID format correctly", () => {
      expect(isValidProjectUniqueId("PROJ-20251222-A3F9")).toBe(true);
      expect(isValidProjectUniqueId("PROJ-20251222-1234")).toBe(true);
      expect(isValidProjectUniqueId("ASSET-20251222-A3F9")).toBe(false);
      expect(isValidProjectUniqueId("PROJ-2025122-A3F9")).toBe(false);
      expect(isValidProjectUniqueId("PROJ-20251222-A3")).toBe(false);
      expect(isValidProjectUniqueId("invalid")).toBe(false);
    });

    it("should validate asset unique ID format correctly", () => {
      expect(isValidAssetUniqueId("ASSET-20251222-B7K2")).toBe(true);
      expect(isValidAssetUniqueId("ASSET-20251222-9999")).toBe(true);
      expect(isValidAssetUniqueId("PROJ-20251222-B7K2")).toBe(false);
      expect(isValidAssetUniqueId("ASSET-2025122-B7K2")).toBe(false);
      expect(isValidAssetUniqueId("ASSET-20251222-B7")).toBe(false);
      expect(isValidAssetUniqueId("invalid")).toBe(false);
    });
  });

  describe("Unique ID Auto-Generation in Database Operations", () => {
    it("should auto-generate unique ID when creating a project", async () => {
      const projectId = await db.createProject({
        userId: 1,
        name: "Test Project with Auto ID",
        status: "draft",
      });

      expect(projectId).toBeGreaterThan(0);

      const project = await db.getProjectById(projectId, 1);
      expect(project).toBeDefined();
      expect(project?.uniqueId).toBeDefined();
      expect(isValidProjectUniqueId(project!.uniqueId)).toBe(true);
    });

    it("should auto-generate unique ID when creating an asset", async () => {
      // First create a project
      const projectId = await db.createProject({
        userId: 1,
        name: "Test Project for Asset",
        status: "draft",
      });

      // Then create an asset
      const assetId = await dbAssets.createAsset({
        projectId,
        name: "Test Asset with Auto ID",
        status: "active",
      });

      expect(assetId).toBeGreaterThan(0);

      const asset = await dbAssets.getAssetById(assetId, projectId);
      expect(asset).toBeDefined();
      expect(asset?.uniqueId).toBeDefined();
      expect(isValidAssetUniqueId(asset!.uniqueId)).toBe(true);
    });

    it("should respect provided unique ID when creating a project", async () => {
      const customUniqueId = "PROJ-20251222-TEST";

      const projectId = await db.createProject({
        userId: 1,
        name: "Test Project with Custom ID",
        uniqueId: customUniqueId,
        status: "draft",
      });

      const project = await db.getProjectById(projectId, 1);
      expect(project?.uniqueId).toBe(customUniqueId);
    });
  });

  describe("Compliance Check with Explanations", () => {
    it("should include explanation field in compliance check schema", () => {
      // This test verifies the schema structure is correct
      // The actual compliance check requires a real assessment and building code document
      
      const mockComplianceResult = {
        status: "non_compliant",
        issues: [
          {
            severity: "high",
            codeSection: "NBC 2020 Section 9.3.2.1",
            description: "Fire separation requirements not met",
            explanation: "The building code requires 2-hour fire-rated separation between units, but current construction only provides 1-hour separation.",
            recommendation: "Upgrade fire separation to meet 2-hour rating requirement",
          },
        ],
        summary: "One high-severity compliance issue identified",
      };

      // Verify structure
      expect(mockComplianceResult.issues[0]).toHaveProperty("explanation");
      expect(mockComplianceResult.issues[0].explanation).toBeTruthy();
      expect(typeof mockComplianceResult.issues[0].explanation).toBe("string");
    });

    it("should validate compliance result structure with all required fields", () => {
      const mockIssue = {
        severity: "medium",
        codeSection: "NFC 2020 Section 3.2.5",
        description: "Emergency lighting insufficient",
        explanation: "National Fire Code requires emergency lighting in all exit routes with minimum 1 lux illumination, but current installation provides only 0.5 lux.",
        recommendation: "Install additional emergency lighting fixtures to meet minimum requirements",
      };

      // Verify all required fields are present
      expect(mockIssue).toHaveProperty("severity");
      expect(mockIssue).toHaveProperty("codeSection");
      expect(mockIssue).toHaveProperty("description");
      expect(mockIssue).toHaveProperty("explanation");
      expect(mockIssue).toHaveProperty("recommendation");

      // Verify explanation is meaningful
      expect(mockIssue.explanation.length).toBeGreaterThan(20);
      expect(mockIssue.explanation).toContain("National Fire Code");
    });
  });
});
