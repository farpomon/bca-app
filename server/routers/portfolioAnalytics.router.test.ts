import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

// Mock the database functions
vi.mock("../db-portfolioAnalytics", () => ({
  getPortfolioOverview: vi.fn(),
  getConditionDistribution: vi.fn(),
  getCategoryCostBreakdown: vi.fn(),
  getBuildingComparison: vi.fn(),
  getGeographicDistribution: vi.fn(),
  getPropertyTypeDistribution: vi.fn(),
  getPriorityBreakdown: vi.fn(),
  getDeficiencyTrends: vi.fn(),
  getCapitalPlanningForecast: vi.fn(),
}));

import {
  getPortfolioOverview,
  getConditionDistribution,
  getCategoryCostBreakdown,
  getBuildingComparison,
  getGeographicDistribution,
  getPropertyTypeDistribution,
  getPriorityBreakdown,
  getDeficiencyTrends,
  getCapitalPlanningForecast,
} from "../db-portfolioAnalytics";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    company: "test-company",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("portfolioAnalytics router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOverview", () => {
    it("returns portfolio overview metrics", async () => {
      const mockOverview = {
        totalBuildings: 10,
        totalAssets: 50,
        totalAssessments: 200,
        totalDeficiencies: 75,
        totalCurrentReplacementValue: 50000000,
        totalDeferredMaintenance: 5000000,
        portfolioFCI: 10,
        portfolioFCIRating: "Fair",
        averageConditionScore: 65,
        averageConditionRating: "Fair",
        averageBuildingAge: 25,
        immediateNeeds: 1000000,
        shortTermNeeds: 1500000,
        mediumTermNeeds: 1500000,
        longTermNeeds: 1000000,
        criticalDeficiencies: 5,
        highPriorityDeficiencies: 15,
      };

      (getPortfolioOverview as any).mockResolvedValue(mockOverview);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.portfolioAnalytics.getOverview();

      expect(result).toEqual(mockOverview);
      expect(getPortfolioOverview).toHaveBeenCalledWith(1, "test-company", false);
    });

    it("passes isAdmin=true for admin users", async () => {
      const mockOverview = {
        totalBuildings: 20,
        totalAssets: 100,
        totalAssessments: 400,
        totalDeficiencies: 150,
        totalCurrentReplacementValue: 100000000,
        totalDeferredMaintenance: 10000000,
        portfolioFCI: 10,
        portfolioFCIRating: "Fair",
        averageConditionScore: 65,
        averageConditionRating: "Fair",
        averageBuildingAge: 30,
        immediateNeeds: 2000000,
        shortTermNeeds: 3000000,
        mediumTermNeeds: 3000000,
        longTermNeeds: 2000000,
        criticalDeficiencies: 10,
        highPriorityDeficiencies: 30,
      };

      (getPortfolioOverview as any).mockResolvedValue(mockOverview);

      const ctx = createAuthContext({ role: "admin" });
      const caller = appRouter.createCaller(ctx);

      await caller.portfolioAnalytics.getOverview();

      expect(getPortfolioOverview).toHaveBeenCalledWith(1, "test-company", true);
    });
  });

  describe("getConditionDistribution", () => {
    it("returns condition distribution data", async () => {
      const mockDistribution = [
        { condition: "good", count: 50, percentage: 25, totalCost: 500000 },
        { condition: "fair", count: 80, percentage: 40, totalCost: 1500000 },
        { condition: "poor", count: 50, percentage: 25, totalCost: 2000000 },
        { condition: "not_assessed", count: 20, percentage: 10, totalCost: 0 },
      ];

      (getConditionDistribution as any).mockResolvedValue(mockDistribution);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.portfolioAnalytics.getConditionDistribution();

      expect(result).toEqual(mockDistribution);
      expect(result).toHaveLength(4);
    });
  });

  describe("getCategoryCostBreakdown", () => {
    it("returns UNIFORMAT category breakdown", async () => {
      const mockBreakdown = [
        {
          categoryCode: "B",
          categoryName: "Shell",
          totalRepairCost: 2000000,
          totalReplacementValue: 20000000,
          assessmentCount: 50,
          deficiencyCount: 20,
          averageCondition: "Fair",
          fci: 10,
          percentage: 40,
        },
        {
          categoryCode: "D",
          categoryName: "Services",
          totalRepairCost: 1500000,
          totalReplacementValue: 15000000,
          assessmentCount: 40,
          deficiencyCount: 15,
          averageCondition: "Fair",
          fci: 10,
          percentage: 30,
        },
      ];

      (getCategoryCostBreakdown as any).mockResolvedValue(mockBreakdown);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.portfolioAnalytics.getCategoryCostBreakdown();

      expect(result).toEqual(mockBreakdown);
      expect(result[0].categoryCode).toBe("B");
    });
  });

  describe("getBuildingComparison", () => {
    it("returns building comparison with default sorting", async () => {
      const mockComparison = [
        {
          projectId: 1,
          projectName: "Building A",
          address: "123 Main St",
          city: "Vancouver",
          province: "BC",
          propertyType: "Office",
          yearBuilt: 1990,
          buildingAge: 34,
          assetCount: 5,
          assessmentCount: 20,
          deficiencyCount: 8,
          currentReplacementValue: 5000000,
          deferredMaintenanceCost: 500000,
          fci: 10,
          fciRating: "Fair",
          conditionScore: 65,
          conditionRating: "Fair",
          immediateNeeds: 100000,
          shortTermNeeds: 150000,
          priorityScore: 45,
        },
      ];

      (getBuildingComparison as any).mockResolvedValue(mockComparison);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.portfolioAnalytics.getBuildingComparison();

      expect(result).toEqual(mockComparison);
      expect(getBuildingComparison).toHaveBeenCalledWith(1, "test-company", false, "priorityScore", "desc", 50);
    });

    it("accepts custom sorting parameters", async () => {
      (getBuildingComparison as any).mockResolvedValue([]);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await caller.portfolioAnalytics.getBuildingComparison({
        sortBy: "fci",
        sortOrder: "asc",
        limit: 25,
      });

      expect(getBuildingComparison).toHaveBeenCalledWith(1, "test-company", false, "fci", "asc", 25);
    });
  });

  describe("getGeographicDistribution", () => {
    it("returns geographic distribution data", async () => {
      const mockDistribution = [
        {
          city: "Vancouver",
          province: "BC",
          buildingCount: 5,
          totalCRV: 25000000,
          totalDeferredMaintenance: 2500000,
          averageFCI: 10,
          totalDeficiencies: 30,
        },
        {
          city: "Toronto",
          province: "ON",
          buildingCount: 3,
          totalCRV: 15000000,
          totalDeferredMaintenance: 1500000,
          averageFCI: 10,
          totalDeficiencies: 20,
        },
      ];

      (getGeographicDistribution as any).mockResolvedValue(mockDistribution);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.portfolioAnalytics.getGeographicDistribution();

      expect(result).toEqual(mockDistribution);
      expect(result).toHaveLength(2);
    });
  });

  describe("getPropertyTypeDistribution", () => {
    it("returns property type distribution data", async () => {
      const mockDistribution = [
        {
          propertyType: "Office",
          buildingCount: 4,
          totalCRV: 20000000,
          totalDeferredMaintenance: 2000000,
          averageFCI: 10,
          averageAge: 25,
          totalDeficiencies: 25,
        },
        {
          propertyType: "Residential",
          buildingCount: 6,
          totalCRV: 30000000,
          totalDeferredMaintenance: 3000000,
          averageFCI: 10,
          averageAge: 30,
          totalDeficiencies: 35,
        },
      ];

      (getPropertyTypeDistribution as any).mockResolvedValue(mockDistribution);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.portfolioAnalytics.getPropertyTypeDistribution();

      expect(result).toEqual(mockDistribution);
    });
  });

  describe("getPriorityBreakdown", () => {
    it("returns priority breakdown data", async () => {
      const mockBreakdown = [
        { priority: "immediate", count: 5, totalCost: 500000, percentage: 10, buildings: ["Building A"] },
        { priority: "short_term", count: 15, totalCost: 1500000, percentage: 30, buildings: ["Building A", "Building B"] },
        { priority: "medium_term", count: 20, totalCost: 2000000, percentage: 40, buildings: ["Building B", "Building C"] },
        { priority: "long_term", count: 10, totalCost: 1000000, percentage: 20, buildings: ["Building C"] },
      ];

      (getPriorityBreakdown as any).mockResolvedValue(mockBreakdown);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.portfolioAnalytics.getPriorityBreakdown();

      expect(result).toEqual(mockBreakdown);
      expect(result).toHaveLength(4);
    });
  });

  describe("getDeficiencyTrends", () => {
    it("returns deficiency trends with default months", async () => {
      const mockTrends = [
        {
          period: "2024-01",
          totalDeficiencies: 10,
          immediateCount: 2,
          shortTermCount: 3,
          mediumTermCount: 3,
          longTermCount: 2,
          totalCost: 500000,
          resolvedCount: 1,
        },
        {
          period: "2024-02",
          totalDeficiencies: 12,
          immediateCount: 3,
          shortTermCount: 4,
          mediumTermCount: 3,
          longTermCount: 2,
          totalCost: 600000,
          resolvedCount: 2,
        },
      ];

      (getDeficiencyTrends as any).mockResolvedValue(mockTrends);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.portfolioAnalytics.getDeficiencyTrends();

      expect(result).toEqual(mockTrends);
      expect(getDeficiencyTrends).toHaveBeenCalledWith(1, "test-company", false, 12);
    });

    it("accepts custom months parameter", async () => {
      (getDeficiencyTrends as any).mockResolvedValue([]);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await caller.portfolioAnalytics.getDeficiencyTrends({ months: 6 });

      expect(getDeficiencyTrends).toHaveBeenCalledWith(1, "test-company", false, 6);
    });
  });

  describe("getCapitalForecast", () => {
    it("returns capital forecast with default years", async () => {
      const mockForecast = [
        {
          year: 2024,
          immediateNeeds: 1000000,
          shortTermNeeds: 300000,
          mediumTermNeeds: 0,
          longTermNeeds: 0,
          totalProjectedCost: 1300000,
          cumulativeCost: 1300000,
        },
        {
          year: 2025,
          immediateNeeds: 0,
          shortTermNeeds: 600000,
          mediumTermNeeds: 150000,
          longTermNeeds: 0,
          totalProjectedCost: 750000,
          cumulativeCost: 2050000,
        },
      ];

      (getCapitalPlanningForecast as any).mockResolvedValue(mockForecast);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.portfolioAnalytics.getCapitalForecast();

      expect(result).toEqual(mockForecast);
      expect(getCapitalPlanningForecast).toHaveBeenCalledWith(1, "test-company", false, 5);
    });

    it("accepts custom years parameter", async () => {
      (getCapitalPlanningForecast as any).mockResolvedValue([]);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await caller.portfolioAnalytics.getCapitalForecast({ years: 10 });

      expect(getCapitalPlanningForecast).toHaveBeenCalledWith(1, "test-company", false, 10);
    });
  });

  describe("getDashboardData", () => {
    it("returns all analytics data in a single request", async () => {
      const mockOverview = { totalBuildings: 10, portfolioFCI: 10 };
      const mockCondition = [{ condition: "good", count: 50 }];
      const mockCategory = [{ categoryCode: "B", totalRepairCost: 2000000 }];
      const mockBuildings = [{ projectId: 1, projectName: "Building A" }];
      const mockGeo = [{ city: "Vancouver", buildingCount: 5 }];
      const mockProperty = [{ propertyType: "Office", buildingCount: 4 }];
      const mockPriority = [{ priority: "immediate", count: 5 }];
      const mockTrends = [{ period: "2024-01", totalDeficiencies: 10 }];
      const mockForecast = [{ year: 2024, totalProjectedCost: 1300000 }];

      (getPortfolioOverview as any).mockResolvedValue(mockOverview);
      (getConditionDistribution as any).mockResolvedValue(mockCondition);
      (getCategoryCostBreakdown as any).mockResolvedValue(mockCategory);
      (getBuildingComparison as any).mockResolvedValue(mockBuildings);
      (getGeographicDistribution as any).mockResolvedValue(mockGeo);
      (getPropertyTypeDistribution as any).mockResolvedValue(mockProperty);
      (getPriorityBreakdown as any).mockResolvedValue(mockPriority);
      (getDeficiencyTrends as any).mockResolvedValue(mockTrends);
      (getCapitalPlanningForecast as any).mockResolvedValue(mockForecast);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.portfolioAnalytics.getDashboardData();

      expect(result.overview).toEqual(mockOverview);
      expect(result.conditionDistribution).toEqual(mockCondition);
      expect(result.categoryCostBreakdown).toEqual(mockCategory);
      expect(result.buildingComparison).toEqual(mockBuildings);
      expect(result.geographicDistribution).toEqual(mockGeo);
      expect(result.propertyTypeDistribution).toEqual(mockProperty);
      expect(result.priorityBreakdown).toEqual(mockPriority);
      expect(result.deficiencyTrends).toEqual(mockTrends);
      expect(result.capitalForecast).toEqual(mockForecast);
      expect(result.generatedAt).toBeDefined();
    });
  });
});
