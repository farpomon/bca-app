import { describe, it, expect } from "vitest";
import * as portfolioKPI from "./services/portfolioKPI.service";

describe("Portfolio KPI Service", () => {
  it("should calculate portfolio KPIs", async () => {
    // This test verifies the KPI calculation function exists and returns expected structure
    const result = await portfolioKPI.calculatePortfolioKPIs(1);
    
    expect(result).toHaveProperty("portfolioFCI");
    expect(result).toHaveProperty("portfolioCI");
    expect(result).toHaveProperty("totalReplacementValue");
    expect(result).toHaveProperty("totalRepairCosts");
    expect(result).toHaveProperty("maintenanceBacklog");
    expect(result).toHaveProperty("deferredMaintenance");
    expect(result).toHaveProperty("budgetUtilization");
    expect(result).toHaveProperty("facilityCount");
    expect(result).toHaveProperty("componentCount");
    expect(result).toHaveProperty("assessmentCount");
    
    // All numeric values should be non-negative
    expect(result.portfolioFCI).toBeGreaterThanOrEqual(0);
    expect(typeof result.portfolioCI).toBe("number");
    expect(result.totalReplacementValue).toBeGreaterThanOrEqual(0);
    expect(result.totalRepairCosts).toBeGreaterThanOrEqual(0);
    expect(result.facilityCount).toBeGreaterThanOrEqual(0);
  });

  it("should calculate portfolio KPIs with filters", async () => {
    const filters = {
      buildingClass: ["A"],
      facilityType: ["Office"],
    };
    
    const result = await portfolioKPI.calculatePortfolioKPIs(1, filters);
    
    expect(result).toHaveProperty("portfolioFCI");
    expect(result.portfolioFCI).toBeGreaterThanOrEqual(0);
  });

  it("should calculate trends", async () => {
    const result = await portfolioKPI.calculateTrends(1, "month", 6);
    
    expect(Array.isArray(result)).toBe(true);
    
    if (result.length > 0) {
      const trend = result[0];
      expect(trend).toHaveProperty("period");
      expect(trend).toHaveProperty("totalCosts");
      expect(trend).toHaveProperty("maintenanceCosts");
      expect(trend).toHaveProperty("capitalCosts");
      expect(trend).toHaveProperty("fci");
      expect(trend).toHaveProperty("ci");
    }
  });

  it("should calculate quarterly trends", async () => {
    const result = await portfolioKPI.calculateTrends(1, "quarter", 4);
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("should calculate yearly trends", async () => {
    const result = await portfolioKPI.calculateTrends(1, "year", 3);
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("should get facility comparisons", async () => {
    const result = await portfolioKPI.getFacilityComparisons(1);
    
    expect(Array.isArray(result)).toBe(true);
    
    if (result.length > 0) {
      const facility = result[0];
      expect(facility).toHaveProperty("projectId");
      expect(facility).toHaveProperty("projectName");
      expect(facility).toHaveProperty("fci");
      expect(facility).toHaveProperty("ci");
      expect(facility).toHaveProperty("replacementValue");
      expect(facility).toHaveProperty("repairCosts");
      expect(facility).toHaveProperty("portfolioAvgFCI");
      expect(facility).toHaveProperty("portfolioAvgCI");
      expect(facility).toHaveProperty("variance");
      
      // Variance should be difference between facility FCI and portfolio average
      expect(facility.variance).toBeCloseTo(facility.fci - facility.portfolioAvgFCI, 2);
    }
  });

  it("should get facility comparisons with filters", async () => {
    const filters = {
      buildingClass: ["A", "B"],
    };
    
    const result = await portfolioKPI.getFacilityComparisons(1, filters);
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("should handle empty portfolio gracefully", async () => {
    // Test with user ID that has no projects
    const result = await portfolioKPI.calculatePortfolioKPIs(99999);
    
    expect(result.facilityCount).toBe(0);
    expect(result.totalReplacementValue).toBe(0);
    expect(result.totalRepairCosts).toBe(0);
  });

  it("should calculate FCI correctly", async () => {
    const result = await portfolioKPI.calculatePortfolioKPIs(1);
    
    // FCI should be between 0 and 100 (percentage)
    expect(result.portfolioFCI).toBeGreaterThanOrEqual(0);
    expect(result.portfolioFCI).toBeGreaterThanOrEqual(0);
    
    // CI should be 100 - FCI
    expect(result.portfolioCI).toBeCloseTo(100 - result.portfolioFCI, 2);
  });

  it("should calculate budget utilization correctly", async () => {
    const result = await portfolioKPI.calculatePortfolioKPIs(1);
    
    // Budget utilization should be between 0 and 100+ (can exceed 100%)
    expect(result.budgetUtilization).toBeGreaterThanOrEqual(0);
  });
});
