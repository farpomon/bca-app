import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FacilitySummaryData } from "./services/facilitySummary.service";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";
import { getFacilitySummary } from "./services/facilitySummary.service";

const mockGetDb = vi.mocked(getDb);

// Helper to create mock database with execute method
function createMockDb(projectData: any, financialData: any[] = [], componentStats: any = null, deficiencyStats: any = null, assessmentActivity: any = null, snapshots: any[] = []) {
  return {
    execute: vi.fn().mockImplementation((query: any) => {
      const queryStr = query?.sql?.toString() || query?.toString() || "";
      
      // Project query
      if (queryStr.includes("FROM projects") || queryStr.includes("from projects")) {
        return Promise.resolve([[projectData]]);
      }
      
      // Financial query (renovation_costs)
      if (queryStr.includes("renovation_costs")) {
        return Promise.resolve([financialData]);
      }
      
      // Component stats query (assessments with COUNT)
      if (queryStr.includes("FROM assessments") && queryStr.includes("COUNT")) {
        return Promise.resolve([[componentStats || {
          totalComponents: 0,
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0,
          critical: 0,
        }]]);
      }
      
      // Assessment activity query (MAX assessmentDate)
      if (queryStr.includes("MAX(assessmentDate)")) {
        return Promise.resolve([[assessmentActivity || {
          lastAssessmentDate: null,
          totalAssessments: 0,
        }]]);
      }
      
      // Deficiency stats query
      if (queryStr.includes("FROM deficiencies") || queryStr.includes("from deficiencies")) {
        return Promise.resolve([[deficiencyStats || {
          immediate: 0,
          high: 0,
          medium: 0,
          low: 0,
        }]]);
      }
      
      // CI/FCI snapshots query
      if (queryStr.includes("ci_fci_snapshots")) {
        return Promise.resolve([snapshots]);
      }
      
      return Promise.resolve([[]]);
    }),
  };
}

describe("Facility Summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Facility Summary Data", () => {
    it("should retrieve complete facility summary", async () => {
      const projectData = {
        ci: "85",
        fci: "0.05",
        deferredMaintenanceCost: "10000",
        currentReplacementValue: "1000000",
        yearBuilt: 1990,
        designLife: 50,
        endOfLifeDate: null,
        holdingDepartment: "Facilities Management",
        propertyManager: "John Doe",
        managerEmail: "john.doe@example.com",
        managerPhone: "(555) 123-4567",
        facilityType: "Office Building",
        occupancyStatus: "occupied",
        criticalityLevel: "important",
      };

      const financialData = [
        { costType: "planned", totalAmount: "200000" },
        { costType: "executed", totalAmount: "50000" },
      ];

      mockGetDb.mockResolvedValue(createMockDb(projectData, financialData) as any);

      const summary = await getFacilitySummary(1);

      expect(summary).toBeDefined();
      expect(summary.condition).toBeDefined();
      expect(summary.financial).toBeDefined();
      expect(summary.lifecycle).toBeDefined();
      expect(summary.administrative).toBeDefined();
      expect(summary.stats).toBeDefined();
      expect(summary.actionItems).toBeDefined();
    });

    it("should calculate condition metrics correctly", async () => {
      const projectData = {
        ci: "85",
        fci: "0.05",
        deferredMaintenanceCost: "10000",
        currentReplacementValue: "1000000",
        yearBuilt: 1990,
        designLife: 50,
        endOfLifeDate: null,
        holdingDepartment: "Facilities Management",
        propertyManager: "John Doe",
        managerEmail: "john.doe@example.com",
        managerPhone: "(555) 123-4567",
        facilityType: "Office Building",
        occupancyStatus: "occupied",
        criticalityLevel: "important",
      };

      mockGetDb.mockResolvedValue(createMockDb(projectData) as any);

      const summary = await getFacilitySummary(1);

      expect(summary.condition.ci).toBeGreaterThan(0);
      expect(summary.condition.ci).toBeLessThanOrEqual(100);
      expect(summary.condition.fci).toBeGreaterThanOrEqual(0);
      expect(summary.condition.fci).toBeLessThanOrEqual(1);
      expect(summary.condition.conditionRating).toMatch(/Excellent|Good|Fair|Poor|Critical/);
      expect(summary.condition.trend).toMatch(/improving|stable|declining/);
      expect(summary.condition.healthScore).toBeGreaterThanOrEqual(0);
      expect(summary.condition.healthScore).toBeLessThanOrEqual(100);
    });

    it("should aggregate financial metrics correctly", async () => {
      const projectData = {
        ci: "85",
        fci: "0.05",
        deferredMaintenanceCost: "10000",
        currentReplacementValue: "1000000",
        yearBuilt: 1990,
        designLife: 50,
        endOfLifeDate: null,
        holdingDepartment: "Facilities Management",
        propertyManager: "John Doe",
        managerEmail: "john.doe@example.com",
        managerPhone: "(555) 123-4567",
        facilityType: "Office Building",
        occupancyStatus: "occupied",
        criticalityLevel: "important",
      };

      const financialData = [
        { costType: "planned", totalAmount: "200000" },
        { costType: "executed", totalAmount: "50000" },
      ];

      mockGetDb.mockResolvedValue(createMockDb(projectData, financialData) as any);

      const summary = await getFacilitySummary(1);

      expect(summary.financial.identifiedCosts).toBeGreaterThanOrEqual(0);
      expect(summary.financial.plannedCosts).toBe(200000);
      expect(summary.financial.executedCosts).toBe(50000);
      expect(summary.financial.totalCosts).toBeGreaterThan(0);
      expect(summary.financial.budgetUtilization).toBe(25); // 50k / 200k = 25%
    });

    it("should calculate lifecycle information correctly", async () => {
      const projectData = {
        ci: "85",
        fci: "0.05",
        deferredMaintenanceCost: "10000",
        currentReplacementValue: "1000000",
        yearBuilt: 1990,
        designLife: 50,
        endOfLifeDate: null,
        holdingDepartment: "Facilities Management",
        propertyManager: "John Doe",
        managerEmail: "john.doe@example.com",
        managerPhone: "(555) 123-4567",
        facilityType: "Office Building",
        occupancyStatus: "occupied",
        criticalityLevel: "important",
      };

      mockGetDb.mockResolvedValue(createMockDb(projectData) as any);

      const summary = await getFacilitySummary(1);
      const currentYear = new Date().getFullYear();

      expect(summary.lifecycle.age).toBe(currentYear - 1990);
      expect(summary.lifecycle.designLife).toBe(50);
      expect(summary.lifecycle.remainingYears).toBeGreaterThanOrEqual(0);
      expect(summary.lifecycle.lifecycleStage).toMatch(/new|mid_life|aging|end_of_life/);
      expect(summary.lifecycle.endOfLifeDate).toBeDefined();
    });

    it("should include administrative details", async () => {
      const projectData = {
        ci: "85",
        fci: "0.05",
        deferredMaintenanceCost: "10000",
        currentReplacementValue: "1000000",
        yearBuilt: 1990,
        designLife: 50,
        endOfLifeDate: null,
        holdingDepartment: "Facilities Management",
        propertyManager: "John Doe",
        managerEmail: "john.doe@example.com",
        managerPhone: "(555) 123-4567",
        facilityType: "Office Building",
        occupancyStatus: "occupied",
        criticalityLevel: "important",
      };

      mockGetDb.mockResolvedValue(createMockDb(projectData) as any);

      const summary = await getFacilitySummary(1);

      expect(summary.administrative.holdingDepartment).toBe("Facilities Management");
      expect(summary.administrative.propertyManager).toBe("John Doe");
      expect(summary.administrative.managerEmail).toBe("john.doe@example.com");
      expect(summary.administrative.managerPhone).toBe("(555) 123-4567");
      expect(summary.administrative.facilityType).toBe("Office Building");
      expect(summary.administrative.occupancyStatus).toBe("occupied");
      expect(summary.administrative.criticalityLevel).toBe("important");
    });

    it("should provide component statistics", async () => {
      const projectData = {
        ci: "85",
        fci: "0.05",
        deferredMaintenanceCost: "10000",
        currentReplacementValue: "1000000",
        yearBuilt: 1990,
        designLife: 50,
        endOfLifeDate: null,
        holdingDepartment: "Facilities Management",
        propertyManager: "John Doe",
        managerEmail: "john.doe@example.com",
        managerPhone: "(555) 123-4567",
        facilityType: "Office Building",
        occupancyStatus: "occupied",
        criticalityLevel: "important",
      };

      const componentStats = {
        totalComponents: 10,
        excellent: 3,
        good: 4,
        fair: 2,
        poor: 1,
        critical: 0,
      };

      mockGetDb.mockResolvedValue(createMockDb(projectData, [], componentStats) as any);

      const summary = await getFacilitySummary(1);

      expect(summary.stats.totalComponents).toBeGreaterThanOrEqual(0);
      expect(summary.stats.componentsByCondition).toBeDefined();
      expect(summary.stats.deficienciesByPriority).toBeDefined();
    });

    it("should identify action items", async () => {
      const projectData = {
        ci: "85",
        fci: "0.05",
        deferredMaintenanceCost: "10000",
        currentReplacementValue: "1000000",
        yearBuilt: 1990,
        designLife: 50,
        endOfLifeDate: null,
        holdingDepartment: "Facilities Management",
        propertyManager: "John Doe",
        managerEmail: "john.doe@example.com",
        managerPhone: "(555) 123-4567",
        facilityType: "Office Building",
        occupancyStatus: "occupied",
        criticalityLevel: "important",
      };

      mockGetDb.mockResolvedValue(createMockDb(projectData) as any);

      const summary = await getFacilitySummary(1);

      expect(summary.actionItems.criticalDeficiencies).toBeGreaterThanOrEqual(0);
      expect(summary.actionItems.upcomingMaintenance).toBeGreaterThanOrEqual(0);
      expect(summary.actionItems.overdueItems).toBeGreaterThanOrEqual(0);
      expect(summary.actionItems.budgetAlerts).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Lifecycle Management", () => {
    it("should update facility lifecycle information", async () => {
      // This test validates that lifecycle data is calculated correctly
      const projectData = {
        ci: "85",
        fci: "0.05",
        deferredMaintenanceCost: "10000",
        currentReplacementValue: "1000000",
        yearBuilt: 1990,
        designLife: 60, // Updated design life
        endOfLifeDate: null,
        holdingDepartment: "Facilities Management",
        propertyManager: "John Doe",
        managerEmail: "john.doe@example.com",
        managerPhone: "(555) 123-4567",
        facilityType: "Office Building",
        occupancyStatus: "occupied",
        criticalityLevel: "important",
      };

      mockGetDb.mockResolvedValue(createMockDb(projectData) as any);

      const summary = await getFacilitySummary(1);
      expect(summary.lifecycle.designLife).toBe(60);
    });

    it("should update administrative information", async () => {
      // This test validates that administrative data is returned correctly
      const projectData = {
        ci: "85",
        fci: "0.05",
        deferredMaintenanceCost: "10000",
        currentReplacementValue: "1000000",
        yearBuilt: 1990,
        designLife: 50,
        endOfLifeDate: null,
        holdingDepartment: "Public Works",
        propertyManager: "Jane Smith",
        managerEmail: "jane.smith@example.com",
        managerPhone: "(555) 987-6543",
        facilityType: "Office Building",
        occupancyStatus: "occupied",
        criticalityLevel: "important",
      };

      mockGetDb.mockResolvedValue(createMockDb(projectData) as any);

      const summary = await getFacilitySummary(1);
      expect(summary.administrative.holdingDepartment).toBe("Public Works");
      expect(summary.administrative.propertyManager).toBe("Jane Smith");
    });
  });

  describe("Renovation Costs", () => {
    it("should aggregate renovation costs by type", async () => {
      const projectData = {
        ci: "85",
        fci: "0.05",
        deferredMaintenanceCost: "10000",
        currentReplacementValue: "1000000",
        yearBuilt: 1990,
        designLife: 50,
        endOfLifeDate: null,
        holdingDepartment: "Facilities Management",
        propertyManager: "John Doe",
        managerEmail: "john.doe@example.com",
        managerPhone: "(555) 123-4567",
        facilityType: "Office Building",
        occupancyStatus: "occupied",
        criticalityLevel: "important",
      };

      const financialData = [
        { costType: "planned", totalAmount: "275000" },
        { costType: "executed", totalAmount: "50000" },
        { costType: "identified", totalAmount: "25000" },
      ];

      mockGetDb.mockResolvedValue(createMockDb(projectData, financialData) as any);

      const summary = await getFacilitySummary(1);

      expect(summary.financial.plannedCosts).toBe(275000);
      expect(summary.financial.executedCosts).toBe(50000);
    });

    it("should calculate budget utilization correctly", async () => {
      const projectData = {
        ci: "85",
        fci: "0.05",
        deferredMaintenanceCost: "10000",
        currentReplacementValue: "1000000",
        yearBuilt: 1990,
        designLife: 50,
        endOfLifeDate: null,
        holdingDepartment: "Facilities Management",
        propertyManager: "John Doe",
        managerEmail: "john.doe@example.com",
        managerPhone: "(555) 123-4567",
        facilityType: "Office Building",
        occupancyStatus: "occupied",
        criticalityLevel: "important",
      };

      const financialData = [
        { costType: "planned", totalAmount: "100000" },
        { costType: "executed", totalAmount: "75000" },
      ];

      mockGetDb.mockResolvedValue(createMockDb(projectData, financialData) as any);

      const summary = await getFacilitySummary(1);

      expect(summary.financial.budgetUtilization).toBe(75); // 75k / 100k = 75%
    });

    it("should handle zero planned costs", async () => {
      const projectData = {
        ci: "85",
        fci: "0.05",
        deferredMaintenanceCost: "10000",
        currentReplacementValue: "1000000",
        yearBuilt: 1990,
        designLife: 50,
        endOfLifeDate: null,
        holdingDepartment: "Facilities Management",
        propertyManager: "John Doe",
        managerEmail: "john.doe@example.com",
        managerPhone: "(555) 123-4567",
        facilityType: "Office Building",
        occupancyStatus: "occupied",
        criticalityLevel: "important",
      };

      const financialData: any[] = [];

      mockGetDb.mockResolvedValue(createMockDb(projectData, financialData) as any);

      const summary = await getFacilitySummary(1);

      expect(summary.financial.budgetUtilization).toBe(0);
    });

    it("should aggregate total costs correctly", async () => {
      const projectData = {
        ci: "85",
        fci: "0.05",
        deferredMaintenanceCost: "50000",
        currentReplacementValue: "1000000",
        yearBuilt: 1990,
        designLife: 50,
        endOfLifeDate: null,
        holdingDepartment: "Facilities Management",
        propertyManager: "John Doe",
        managerEmail: "john.doe@example.com",
        managerPhone: "(555) 123-4567",
        facilityType: "Office Building",
        occupancyStatus: "occupied",
        criticalityLevel: "important",
      };

      const financialData = [
        { costType: "planned", totalAmount: "200000" },
        { costType: "executed", totalAmount: "100000" },
      ];

      mockGetDb.mockResolvedValue(createMockDb(projectData, financialData) as any);

      const summary = await getFacilitySummary(1);

      // Total = identified (50000) + planned (200000) + executed (100000)
      expect(summary.financial.totalCosts).toBe(350000);
    });
  });

  describe("Health Score Calculation", () => {
    it("should calculate health score based on multiple factors", async () => {
      const projectData = {
        ci: "90",
        fci: "0.02",
        deferredMaintenanceCost: "10000",
        currentReplacementValue: "1000000",
        yearBuilt: 2010,
        designLife: 50,
        endOfLifeDate: null,
        holdingDepartment: "Facilities Management",
        propertyManager: "John Doe",
        managerEmail: "john.doe@example.com",
        managerPhone: "(555) 123-4567",
        facilityType: "Office Building",
        occupancyStatus: "occupied",
        criticalityLevel: "important",
      };

      mockGetDb.mockResolvedValue(createMockDb(projectData) as any);

      const summary = await getFacilitySummary(1);

      // Health score should be between 0-100
      expect(summary.condition.healthScore).toBeGreaterThanOrEqual(0);
      expect(summary.condition.healthScore).toBeLessThanOrEqual(100);

      // With high CI (90) and low FCI (0.02), health score should be high
      expect(summary.condition.healthScore).toBeGreaterThan(50);
    });
  });
});
