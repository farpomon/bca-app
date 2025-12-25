/**
 * Tests for Portfolio Report Financial Metrics Calculations
 */

import { describe, it, expect } from "vitest";
import {
  calculateFCI,
  getFCIRating,
  getConditionScore,
  getConditionRating,
  calculatePriorityScore,
  calculateRemainingUsefulLife,
  generateCapitalRenewalForecast,
  calculateFundingGap,
  aggregatePortfolioMetrics,
  groupByPriority,
  groupByCategory,
  formatCurrency,
  formatPercentage,
  AssetMetrics
} from "./portfolioReportCalculations";

describe("FCI Calculations", () => {
  it("calculates FCI correctly", () => {
    // FCI = (Deferred Maintenance / CRV) * 100
    expect(calculateFCI(50000, 1000000)).toBe(5);
    expect(calculateFCI(100000, 1000000)).toBe(10);
    expect(calculateFCI(300000, 1000000)).toBe(30);
    expect(calculateFCI(0, 1000000)).toBe(0);
  });

  it("handles zero CRV", () => {
    expect(calculateFCI(50000, 0)).toBe(0);
    expect(calculateFCI(0, 0)).toBe(0);
  });

  it("returns correct FCI rating", () => {
    expect(getFCIRating(3)).toBe("Good");
    expect(getFCIRating(5)).toBe("Good");
    expect(getFCIRating(7)).toBe("Fair");
    expect(getFCIRating(10)).toBe("Fair");
    expect(getFCIRating(15)).toBe("Poor");
    expect(getFCIRating(30)).toBe("Poor");
    expect(getFCIRating(35)).toBe("Critical");
    expect(getFCIRating(50)).toBe("Critical");
  });
});

describe("Condition Score Calculations", () => {
  it("maps condition enum to numeric score", () => {
    expect(getConditionScore("good")).toBe(85);
    expect(getConditionScore("fair")).toBe(65);
    expect(getConditionScore("poor")).toBe(35);
    expect(getConditionScore("critical")).toBe(15);
    expect(getConditionScore("not_assessed")).toBe(50);
  });

  it("handles null and unknown values", () => {
    expect(getConditionScore(null)).toBe(50);
    expect(getConditionScore("unknown")).toBe(50);
  });

  it("is case insensitive", () => {
    expect(getConditionScore("GOOD")).toBe(85);
    expect(getConditionScore("Fair")).toBe(65);
  });

  it("returns correct condition rating from score", () => {
    expect(getConditionRating(90)).toBe("Good");
    expect(getConditionRating(80)).toBe("Good");
    expect(getConditionRating(70)).toBe("Fair");
    expect(getConditionRating(60)).toBe("Fair");
    expect(getConditionRating(40)).toBe("Poor");
    expect(getConditionRating(30)).toBe("Poor");
    expect(getConditionRating(20)).toBe("Critical");
  });
});

describe("Priority Score Calculations", () => {
  it("calculates priority score within expected range", () => {
    const score = calculatePriorityScore(10, 50000, 100000, 30, 5);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("gives higher score for higher FCI", () => {
    const lowFCI = calculatePriorityScore(5, 50000, 100000, 30, 5);
    const highFCI = calculatePriorityScore(25, 50000, 100000, 30, 5);
    expect(highFCI).toBeGreaterThan(lowFCI);
  });

  it("gives higher score for more immediate needs", () => {
    const lowImmediate = calculatePriorityScore(10, 10000, 100000, 30, 5);
    const highImmediate = calculatePriorityScore(10, 80000, 100000, 30, 5);
    expect(highImmediate).toBeGreaterThan(lowImmediate);
  });

  it("gives higher score for older assets", () => {
    const young = calculatePriorityScore(10, 50000, 100000, 10, 5);
    const old = calculatePriorityScore(10, 50000, 100000, 50, 5);
    expect(old).toBeGreaterThan(young);
  });
});

describe("Remaining Useful Life", () => {
  it("calculates RUL correctly", () => {
    expect(calculateRemainingUsefulLife(30, 10)).toBe(20);
    expect(calculateRemainingUsefulLife(25, 25)).toBe(0);
    expect(calculateRemainingUsefulLife(20, 30)).toBe(0); // Cannot be negative
  });

  it("handles null expected life", () => {
    expect(calculateRemainingUsefulLife(null, 10)).toBe(0);
  });
});

describe("Capital Renewal Forecast", () => {
  it("generates 5-year forecast", () => {
    const forecast = generateCapitalRenewalForecast(100000, 200000, 300000, 400000);
    expect(forecast).toHaveLength(5);
  });

  it("includes all immediate needs in year 1", () => {
    const forecast = generateCapitalRenewalForecast(100000, 0, 0, 0);
    expect(forecast[0].immediateNeeds).toBe(100000);
    expect(forecast[0].totalProjectedCost).toBe(100000);
  });

  it("distributes short-term needs over years 1-3", () => {
    const forecast = generateCapitalRenewalForecast(0, 100000, 0, 0);
    const totalShortTerm = forecast.reduce((sum, y) => sum + y.shortTermNeeds, 0);
    expect(totalShortTerm).toBe(100000);
  });

  it("calculates cumulative costs correctly", () => {
    const forecast = generateCapitalRenewalForecast(100000, 200000, 300000, 400000);
    let cumulative = 0;
    for (const year of forecast) {
      cumulative += year.totalProjectedCost;
      expect(year.cumulativeCost).toBe(cumulative);
    }
  });

  it("uses correct start year", () => {
    const currentYear = new Date().getFullYear();
    const forecast = generateCapitalRenewalForecast(100000, 0, 0, 0);
    expect(forecast[0].year).toBe(currentYear);
    expect(forecast[4].year).toBe(currentYear + 4);
  });
});

describe("Funding Gap", () => {
  it("calculates gap correctly", () => {
    expect(calculateFundingGap(500000, 300000)).toBe(200000);
    expect(calculateFundingGap(500000, 500000)).toBe(0);
    expect(calculateFundingGap(500000, 600000)).toBe(0); // No negative gap
  });

  it("defaults to full deferred maintenance when no budget", () => {
    expect(calculateFundingGap(500000)).toBe(500000);
  });
});

describe("Portfolio Metrics Aggregation", () => {
  const sampleAssets: AssetMetrics[] = [
    {
      assetId: 1,
      assetName: "Building A",
      yearBuilt: 2000,
      currentReplacementValue: 1000000,
      deferredMaintenanceCost: 50000,
      fci: 5,
      fciRating: "Good",
      conditionScore: 85,
      conditionRating: "Good",
      assessmentCount: 10,
      deficiencyCount: 5,
      immediateNeeds: 10000,
      shortTermNeeds: 20000,
      mediumTermNeeds: 10000,
      longTermNeeds: 10000,
      averageRemainingLife: 20,
      priorityScore: 25
    },
    {
      assetId: 2,
      assetName: "Building B",
      yearBuilt: 1990,
      currentReplacementValue: 2000000,
      deferredMaintenanceCost: 200000,
      fci: 10,
      fciRating: "Fair",
      conditionScore: 65,
      conditionRating: "Fair",
      assessmentCount: 15,
      deficiencyCount: 10,
      immediateNeeds: 50000,
      shortTermNeeds: 80000,
      mediumTermNeeds: 40000,
      longTermNeeds: 30000,
      averageRemainingLife: 10,
      priorityScore: 45
    }
  ];

  it("aggregates total values correctly", () => {
    const summary = aggregatePortfolioMetrics(sampleAssets);
    expect(summary.totalAssets).toBe(2);
    expect(summary.totalCurrentReplacementValue).toBe(3000000);
    expect(summary.totalDeferredMaintenanceCost).toBe(250000);
    expect(summary.totalDeficiencies).toBe(15);
    expect(summary.totalAssessments).toBe(25);
  });

  it("calculates portfolio FCI correctly", () => {
    const summary = aggregatePortfolioMetrics(sampleAssets);
    // FCI = (250000 / 3000000) * 100 = 8.33%
    expect(summary.portfolioFCI).toBeCloseTo(8.33, 1);
    expect(summary.portfolioFCIRating).toBe("Fair");
  });

  it("calculates weighted average condition", () => {
    const summary = aggregatePortfolioMetrics(sampleAssets);
    // Weighted by CRV: (85*1M + 65*2M) / 3M = 71.67
    expect(summary.averageConditionScore).toBeCloseTo(72, 0);
  });

  it("handles empty asset list", () => {
    const summary = aggregatePortfolioMetrics([]);
    expect(summary.totalAssets).toBe(0);
    expect(summary.portfolioFCI).toBe(0);
    expect(summary.portfolioFCIRating).toBe("N/A");
  });
});

describe("Priority Grouping", () => {
  const sampleDeficiencies = [
    { priority: "immediate", estimatedCost: 10000, title: "Urgent repair", assetName: "Building A" },
    { priority: "immediate", estimatedCost: 15000, title: "Safety issue", assetName: "Building B" },
    { priority: "short_term", estimatedCost: 20000, title: "Roof repair", assetName: "Building A" },
    { priority: "medium_term", estimatedCost: 30000, title: "HVAC upgrade", assetName: "Building B" },
    { priority: "long_term", estimatedCost: 50000, title: "Facade renovation", assetName: "Building A" },
  ];

  it("groups deficiencies by priority", () => {
    const matrix = groupByPriority(sampleDeficiencies);
    expect(matrix).toHaveLength(4);
    
    const immediate = matrix.find(p => p.priority === "immediate");
    expect(immediate?.count).toBe(2);
    expect(immediate?.totalCost).toBe(25000);
  });

  it("calculates percentage of total correctly", () => {
    const matrix = groupByPriority(sampleDeficiencies);
    const totalCost = 125000;
    
    const immediate = matrix.find(p => p.priority === "immediate");
    expect(immediate?.percentageOfTotal).toBeCloseTo(20, 0);
  });
});

describe("Category Grouping", () => {
  const sampleAssessments = [
    { componentCode: "A10", estimatedRepairCost: 10000, replacementValue: 100000, condition: "good" },
    { componentCode: "A20", estimatedRepairCost: 15000, replacementValue: 150000, condition: "fair" },
    { componentCode: "B10", estimatedRepairCost: 20000, replacementValue: 200000, condition: "poor" },
    { componentCode: "D30", estimatedRepairCost: 30000, replacementValue: 300000, condition: "good" },
  ];

  it("groups by UNIFORMAT category", () => {
    const breakdown = groupByCategory(sampleAssessments);
    
    const categoryA = breakdown.find(c => c.categoryCode === "A");
    expect(categoryA?.assessmentCount).toBe(2);
    expect(categoryA?.totalRepairCost).toBe(25000);
    expect(categoryA?.totalReplacementValue).toBe(250000);
  });

  it("calculates FCI per category", () => {
    const breakdown = groupByCategory(sampleAssessments);
    
    const categoryA = breakdown.find(c => c.categoryCode === "A");
    // FCI = (25000 / 250000) * 100 = 10%
    expect(categoryA?.fci).toBe(10);
  });

  it("calculates average condition per category", () => {
    const breakdown = groupByCategory(sampleAssessments);
    
    const categoryA = breakdown.find(c => c.categoryCode === "A");
    // Average of good (85) and fair (65) = 75
    expect(categoryA?.averageCondition).toBe(75);
  });
});

describe("Formatting Functions", () => {
  it("formats currency correctly", () => {
    expect(formatCurrency(1000000)).toContain("1,000,000");
    expect(formatCurrency(0)).toContain("0");
  });

  it("formats percentage correctly", () => {
    expect(formatPercentage(5.5)).toBe("5.5%");
    expect(formatPercentage(10.123, 2)).toBe("10.12%");
    expect(formatPercentage(0)).toBe("0.0%");
  });
});
