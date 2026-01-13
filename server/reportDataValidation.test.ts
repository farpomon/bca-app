import { describe, expect, it } from "vitest";
import {
  calculateFCI,
  getFCIRating,
  fciToPercentage,
  validateAssetReport,
  validatePortfolioReport,
  formatValidationReport,
  type AssetReportData,
  type PortfolioReportData,
} from "./reportDataValidation";

describe("FCI Calculations", () => {
  it("calculates FCI as decimal ratio correctly", () => {
    expect(calculateFCI(50000, 1000000)).toBe(0.05); // 5%
    expect(calculateFCI(100000, 1000000)).toBe(0.10); // 10%
    expect(calculateFCI(300000, 1000000)).toBe(0.30); // 30%
    expect(calculateFCI(0, 1000000)).toBe(0);
    expect(calculateFCI(50000, 0)).toBe(0); // Handle division by zero
  });

  it("assigns correct FCI ratings", () => {
    expect(getFCIRating(0.03)).toBe("Good"); // 3%
    expect(getFCIRating(0.05)).toBe("Good"); // 5% boundary
    expect(getFCIRating(0.07)).toBe("Fair"); // 7%
    expect(getFCIRating(0.10)).toBe("Fair"); // 10% boundary
    expect(getFCIRating(0.20)).toBe("Poor"); // 20%
    expect(getFCIRating(0.30)).toBe("Poor"); // 30% boundary
    expect(getFCIRating(0.40)).toBe("Critical"); // 40%
  });

  it("converts FCI to percentage correctly", () => {
    expect(fciToPercentage(0.05)).toBe(5);
    expect(fciToPercentage(0.10)).toBe(10);
    expect(fciToPercentage(0.30)).toBe(30);
  });
});

describe("Asset Report Validation", () => {
  it("passes validation for clean data", () => {
    const data: AssetReportData = {
      asset: {
        id: 1,
        name: "Test Building",
        grossFloorArea: 10000,
      },
      projectName: "Test Project",
      assessments: [
        {
          id: 1,
          componentName: "Roof",
          estimatedRepairCost: 50000,
          replacementValue: 200000,
          condition: "fair",
        },
        {
          id: 2,
          componentName: "HVAC",
          estimatedRepairCost: 30000,
          replacementValue: 150000,
          condition: "good",
        },
      ],
      deficiencies: [],
    };

    const result = validateAssetReport(data);
    expect(result.canExport).toBe(true);
    expect(result.issues.filter(i => i.severity === "error")).toHaveLength(0);
  });

  it("detects FCI rating mismatch", () => {
    const data: AssetReportData = {
      asset: {
        id: 1,
        name: "Test Building",
        fci: 0.05, // 5% - should be "Good"
        fciRating: "Poor", // Wrong rating
      },
      projectName: "Test Project",
      assessments: [],
      deficiencies: [],
    };

    const result = validateAssetReport(data);
    expect(result.canExport).toBe(false);
    const fciError = result.issues.find(i => i.field === "fciRating");
    expect(fciError).toBeDefined();
    expect(fciError?.severity).toBe("error");
    expect(fciError?.expectedValue).toBe("Good");
  });

  it("removes duplicate components", () => {
    const data: AssetReportData = {
      asset: {
        id: 1,
        name: "Test Building",
      },
      projectName: "Test Project",
      assessments: [
        {
          id: 1,
          assetId: 1,
          componentName: "Roof",
          estimatedRepairCost: 50000,
        },
        {
          id: 2,
          assetId: 1,
          componentName: "Roof", // Duplicate
          estimatedRepairCost: 60000,
        },
        {
          id: 3,
          assetId: 1,
          componentName: "HVAC",
          estimatedRepairCost: 30000,
        },
      ],
      deficiencies: [],
    };

    const result = validateAssetReport(data);
    const duplicateWarning = result.issues.find(i => i.category === "data_quality");
    expect(duplicateWarning).toBeDefined();
    expect(duplicateWarning?.severity).toBe("warning");
    expect(result.correctedData?.assessments).toHaveLength(2);
  });

  it("detects unresolved template variables", () => {
    const data: AssetReportData = {
      asset: {
        id: 1,
        name: "Test Building",
        description: "Asset life extension: ${assetLifeExtension} years", // Unresolved
      },
      projectName: "Test Project",
      assessments: [],
      deficiencies: [],
    };

    const result = validateAssetReport(data);
    expect(result.canExport).toBe(false);
    const templateError = result.issues.find(i => i.category === "template");
    expect(templateError).toBeDefined();
    expect(templateError?.severity).toBe("error");
    expect(templateError?.actualValue).toContain("${assetLifeExtension}");
  });

  it("detects negative cost values", () => {
    const data: AssetReportData = {
      asset: {
        id: 1,
        name: "Test Building",
      },
      projectName: "Test Project",
      assessments: [
        {
          id: 1,
          componentName: "Roof",
          estimatedRepairCost: -50000, // Negative
        },
      ],
      deficiencies: [],
    };

    const result = validateAssetReport(data);
    expect(result.canExport).toBe(false);
    const negativeError = result.issues.find(
      i => i.message.includes("Negative repair cost")
    );
    expect(negativeError).toBeDefined();
    expect(negativeError?.severity).toBe("error");
  });
});

describe("Portfolio Report Validation", () => {
  it("passes validation for consistent data", () => {
    const data: PortfolioReportData = {
      overview: {
        totalDeferredMaintenance: 500000,
        totalCurrentReplacementValue: 5000000,
        portfolioFCI: 0.10, // 10%
        totalDeficiencies: 25,
        criticalDeficiencies: 5,
      },
      buildingComparison: [
        {
          assetId: 1,
          name: "Building A",
          deferredMaintenanceCost: 300000,
          currentReplacementValue: 3000000,
          fci: 0.10,
          fciRating: "Fair",
        },
        {
          assetId: 2,
          name: "Building B",
          deferredMaintenanceCost: 200000,
          currentReplacementValue: 2000000,
          fci: 0.10,
          fciRating: "Fair",
        },
      ],
      costByPriority: {
        immediate: 100000,
        shortTerm: 150000,
        mediumTerm: 150000,
        longTerm: 100000,
      },
      capitalForecast: [
        {
          year: 1,
          immediateNeeds: 100000,
          shortTermNeeds: 50000,
          mediumTermNeeds: 30000,
          longTermNeeds: 20000,
          totalProjectedCost: 200000,
        },
      ],
    };

    const result = validatePortfolioReport(data);
    expect(result.canExport).toBe(true);
    expect(result.issues.filter(i => i.severity === "error")).toHaveLength(0);
  });

  it("detects DM by priority mismatch", () => {
    const data: PortfolioReportData = {
      overview: {
        totalDeferredMaintenance: 500000,
        totalCurrentReplacementValue: 5000000,
        portfolioFCI: 0.10,
        totalDeficiencies: 25,
        criticalDeficiencies: 5,
      },
      buildingComparison: [],
      costByPriority: {
        immediate: 100000,
        shortTerm: 150000,
        mediumTerm: 150000,
        longTerm: 50000, // Total = 450000, not 500000
      },
      capitalForecast: [],
    };

    const result = validatePortfolioReport(data);
    expect(result.canExport).toBe(false);
    const priorityError = result.issues.find(
      i => i.field === "costByPriority"
    );
    expect(priorityError).toBeDefined();
    expect(priorityError?.severity).toBe("error");
  });

  it("detects capital forecast total mismatch", () => {
    const data: PortfolioReportData = {
      overview: {
        totalDeferredMaintenance: 500000,
        totalCurrentReplacementValue: 5000000,
        portfolioFCI: 0.10,
        totalDeficiencies: 25,
        criticalDeficiencies: 5,
      },
      buildingComparison: [],
      costByPriority: {
        immediate: 100000,
        shortTerm: 150000,
        mediumTerm: 150000,
        longTerm: 100000,
      },
      capitalForecast: [
        {
          year: 1,
          immediateNeeds: 100000,
          shortTermNeeds: 50000,
          mediumTermNeeds: 30000,
          longTermNeeds: 20000,
          totalProjectedCost: 250000, // Wrong, should be 200000
        },
      ],
    };

    const result = validatePortfolioReport(data);
    expect(result.canExport).toBe(false);
    const forecastError = result.issues.find(i =>
      i.field?.includes("capitalForecast")
    );
    expect(forecastError).toBeDefined();
    expect(forecastError?.severity).toBe("error");
  });

  it("detects building rollup mismatch", () => {
    const data: PortfolioReportData = {
      overview: {
        totalDeferredMaintenance: 500000, // Doesn't match building sum
        totalCurrentReplacementValue: 5000000,
        portfolioFCI: 0.10,
        totalDeficiencies: 25,
        criticalDeficiencies: 5,
      },
      buildingComparison: [
        {
          assetId: 1,
          name: "Building A",
          deferredMaintenanceCost: 300000,
          currentReplacementValue: 3000000,
          fci: 0.10,
          fciRating: "Fair",
        },
        {
          assetId: 2,
          name: "Building B",
          deferredMaintenanceCost: 150000, // Sum = 450000, not 500000
          currentReplacementValue: 2000000,
          fci: 0.075,
          fciRating: "Fair",
        },
      ],
      costByPriority: {
        immediate: 100000,
        shortTerm: 150000,
        mediumTerm: 150000,
        longTerm: 100000,
      },
      capitalForecast: [],
    };

    const result = validatePortfolioReport(data);
    expect(result.canExport).toBe(false);
    const rollupError = result.issues.find(
      i => i.field === "totalDeferredMaintenance"
    );
    expect(rollupError).toBeDefined();
    expect(rollupError?.severity).toBe("error");
  });

  it("detects multiple FCI rating mismatches", () => {
    const data: PortfolioReportData = {
      overview: {
        totalDeferredMaintenance: 500000,
        totalCurrentReplacementValue: 5000000,
        portfolioFCI: 0.10,
        totalDeficiencies: 25,
        criticalDeficiencies: 5,
      },
      buildingComparison: [
        {
          assetId: 1,
          name: "Building A",
          deferredMaintenanceCost: 300000,
          currentReplacementValue: 3000000,
          fci: 0.10, // 10% - should be "Fair"
          fciRating: "Poor", // Wrong
        },
        {
          assetId: 2,
          name: "Building B",
          deferredMaintenanceCost: 200000,
          currentReplacementValue: 2000000,
          fci: 0.03, // 3% - should be "Good"
          fciRating: "Fair", // Wrong
        },
      ],
      costByPriority: {
        immediate: 100000,
        shortTerm: 150000,
        mediumTerm: 150000,
        longTerm: 100000,
      },
      capitalForecast: [],
    };

    const result = validatePortfolioReport(data);
    expect(result.canExport).toBe(false);
    const fciErrors = result.issues.filter(
      i => i.category === "financial" && i.field === "fciRating"
    );
    expect(fciErrors).toHaveLength(2);
  });
});

describe("Validation Report Formatting", () => {
  it("formats clean validation result", () => {
    const result = {
      isValid: true,
      canExport: true,
      issues: [],
    };

    const report = formatValidationReport(result);
    expect(report).toContain("All validation checks passed");
  });

  it("formats validation result with errors and warnings", () => {
    const result = {
      isValid: false,
      canExport: false,
      issues: [
        {
          severity: "error" as const,
          category: "financial" as const,
          message: "FCI rating mismatch",
          fixAction: "Update FCI rating",
        },
        {
          severity: "warning" as const,
          category: "data_quality" as const,
          message: "Duplicate component removed",
          fixAction: "Review components",
        },
      ],
    };

    const report = formatValidationReport(result);
    expect(report).toContain("Errors: 1");
    expect(report).toContain("Warnings: 1");
    expect(report).toContain("Can Export: No");
    expect(report).toContain("FCI rating mismatch");
    expect(report).toContain("Duplicate component removed");
  });
});
