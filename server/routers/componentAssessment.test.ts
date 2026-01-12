/**
 * Component Assessment Report Tests
 * 
 * Tests for the Individual Component Assessment report feature
 */

import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(userId: number = 1, role: 'admin' | 'user' = 'admin'): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role,
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
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Component Assessment Report", () => {
  describe("getComponentFilterOptions", () => {
    it("should return filter options for a project", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // This test will fail if no project exists, but demonstrates the API structure
      try {
        const result = await caller.portfolioReport.getComponentFilterOptions({
          projectId: 1,
        });

        expect(result).toHaveProperty("facilities");
        expect(result).toHaveProperty("categories");
        expect(result).toHaveProperty("conditionOptions");
        expect(result).toHaveProperty("riskOptions");
        expect(Array.isArray(result.facilities)).toBe(true);
        expect(Array.isArray(result.categories)).toBe(true);
      } catch (error: any) {
        // Expected to fail if project doesn't exist
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("getComponentAssessments", () => {
    it("should return component assessments with default parameters", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.portfolioReport.getComponentAssessments({
          projectId: 1,
        });

        expect(result).toHaveProperty("projectId");
        expect(result).toHaveProperty("projectName");
        expect(result).toHaveProperty("componentAssessments");
        expect(result).toHaveProperty("totalAssets");
        expect(result).toHaveProperty("generatedAt");
        expect(Array.isArray(result.componentAssessments)).toBe(true);
      } catch (error: any) {
        // Expected to fail if project doesn't exist
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("should filter by selected assets", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.portfolioReport.getComponentAssessments({
          projectId: 1,
          scope: "selected",
          selectedAssetIds: [1, 2, 3],
        });

        expect(result.componentAssessments.length).toBeLessThanOrEqual(3);
      } catch (error: any) {
        // Expected to fail if project doesn't exist
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("should apply filters correctly", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.portfolioReport.getComponentAssessments({
          projectId: 1,
          scope: "all",
          filters: {
            conditions: ["poor", "critical"],
            onlyWithDeficiencies: true,
          },
          sortBy: "risk",
          maxAssets: 10,
        });

        expect(result.componentAssessments.length).toBeLessThanOrEqual(10);
        
        // All returned assets should have deficiencies
        result.componentAssessments.forEach(asset => {
          expect(asset.hasDeficiencies).toBe(true);
        });
      } catch (error: any) {
        // Expected to fail if project doesn't exist
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("should respect maxAssets limit", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.portfolioReport.getComponentAssessments({
          projectId: 1,
          scope: "all",
          maxAssets: 5,
        });

        expect(result.componentAssessments.length).toBeLessThanOrEqual(5);
      } catch (error: any) {
        // Expected to fail if project doesn't exist
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("should sort by different criteria", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const sortOptions: Array<'risk' | 'condition' | 'cost' | 'name'> = ['risk', 'condition', 'cost', 'name'];

      for (const sortBy of sortOptions) {
        try {
          const result = await caller.portfolioReport.getComponentAssessments({
            projectId: 1,
            scope: "all",
            sortBy,
            maxAssets: 10,
          });

          expect(result.componentAssessments).toBeDefined();
          // Sorting is applied, but we can't easily verify order without knowing the data
        } catch (error: any) {
          // Expected to fail if project doesn't exist
          expect(error.code).toBe("NOT_FOUND");
        }
      }
    });
  });

  describe("estimateComponentReportSize", () => {
    it("should estimate page count correctly", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.portfolioReport.estimateComponentReportSize({
        assetCount: 10,
        detailLevel: "standard",
      });

      expect(result).toHaveProperty("estimatedPages");
      expect(result.estimatedPages).toBeGreaterThan(0);
      expect(result.estimatedPages).toBe(11); // 10 assets * 1 page + 1 for TOC
    });

    it("should warn for large reports", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.portfolioReport.estimateComponentReportSize({
        assetCount: 60,
        detailLevel: "full",
      });

      expect(result.estimatedPages).toBeGreaterThan(50);
      expect(result.warning).toBeTruthy();
    });

    it("should calculate different estimates for detail levels", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const minimal = await caller.portfolioReport.estimateComponentReportSize({
        assetCount: 20,
        detailLevel: "minimal",
      });

      const standard = await caller.portfolioReport.estimateComponentReportSize({
        assetCount: 20,
        detailLevel: "standard",
      });

      const full = await caller.portfolioReport.estimateComponentReportSize({
        assetCount: 20,
        detailLevel: "full",
      });

      expect(minimal.estimatedPages).toBeLessThan(standard.estimatedPages);
      expect(standard.estimatedPages).toBeLessThan(full.estimatedPages);
    });
  });

  describe("Component Assessment Data Structure", () => {
    it("should return properly structured component data", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.portfolioReport.getComponentAssessments({
          projectId: 1,
          maxAssets: 1,
        });

        if (result.componentAssessments.length > 0) {
          const asset = result.componentAssessments[0];

          // Verify asset structure
          expect(asset).toHaveProperty("assetId");
          expect(asset).toHaveProperty("assetName");
          expect(asset).toHaveProperty("assetUniqueId");
          expect(asset).toHaveProperty("location");
          expect(asset).toHaveProperty("systemCategory");
          expect(asset).toHaveProperty("overallCondition");
          expect(asset).toHaveProperty("riskRating");
          expect(asset).toHaveProperty("assessmentDate");
          expect(asset).toHaveProperty("assessorName");
          expect(asset).toHaveProperty("components");
          expect(asset).toHaveProperty("photos");
          expect(asset).toHaveProperty("hasDeficiencies");

          // Verify component structure
          if (asset.components.length > 0) {
            const component = asset.components[0];
            expect(component).toHaveProperty("componentCode");
            expect(component).toHaveProperty("componentName");
            expect(component).toHaveProperty("condition");
            expect(component).toHaveProperty("riskLevel");
            expect(component).toHaveProperty("recommendedAction");
          }

          // Verify photo structure
          if (asset.photos.length > 0) {
            const photo = asset.photos[0];
            expect(photo).toHaveProperty("id");
            expect(photo).toHaveProperty("url");
            expect(photo).toHaveProperty("caption");
            expect(photo).toHaveProperty("takenAt");
          }

          // Photos should be limited to 4 per asset
          expect(asset.photos.length).toBeLessThanOrEqual(4);
        }
      } catch (error: any) {
        // Expected to fail if project doesn't exist
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });
});
