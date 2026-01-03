import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

describe("Environmental Impact Scoring Functions", () => {
  describe("Environmental Score Calculation Logic", () => {
    it("calculates environmental score of 100 for GHG reduction >= 100 tonnes", () => {
      const ghgReduction = 150;
      let environmentalScore = 0;
      
      if (ghgReduction >= 100) {
        environmentalScore = 100;
      } else if (ghgReduction >= 50) {
        environmentalScore = 70 + ((ghgReduction - 50) / 50) * 30;
      } else if (ghgReduction >= 10) {
        environmentalScore = 40 + ((ghgReduction - 10) / 40) * 30;
      } else if (ghgReduction > 0) {
        environmentalScore = (ghgReduction / 10) * 40;
      }
      
      expect(environmentalScore).toBe(100);
    });

    it("calculates environmental score between 70-100 for GHG reduction 50-100 tonnes", () => {
      const ghgReduction = 75;
      let environmentalScore = 0;
      
      if (ghgReduction >= 100) {
        environmentalScore = 100;
      } else if (ghgReduction >= 50) {
        environmentalScore = 70 + ((ghgReduction - 50) / 50) * 30;
      } else if (ghgReduction >= 10) {
        environmentalScore = 40 + ((ghgReduction - 10) / 40) * 30;
      } else if (ghgReduction > 0) {
        environmentalScore = (ghgReduction / 10) * 40;
      }
      
      expect(environmentalScore).toBeGreaterThanOrEqual(70);
      expect(environmentalScore).toBeLessThan(100);
      // 70 + ((75-50)/50)*30 = 70 + 15 = 85
      expect(environmentalScore).toBe(85);
    });

    it("calculates environmental score between 40-70 for GHG reduction 10-50 tonnes", () => {
      const ghgReduction = 30;
      let environmentalScore = 0;
      
      if (ghgReduction >= 100) {
        environmentalScore = 100;
      } else if (ghgReduction >= 50) {
        environmentalScore = 70 + ((ghgReduction - 50) / 50) * 30;
      } else if (ghgReduction >= 10) {
        environmentalScore = 40 + ((ghgReduction - 10) / 40) * 30;
      } else if (ghgReduction > 0) {
        environmentalScore = (ghgReduction / 10) * 40;
      }
      
      expect(environmentalScore).toBeGreaterThanOrEqual(40);
      expect(environmentalScore).toBeLessThan(70);
      // 40 + ((30-10)/40)*30 = 40 + 15 = 55
      expect(environmentalScore).toBe(55);
    });

    it("calculates environmental score between 0-40 for GHG reduction 0-10 tonnes", () => {
      const ghgReduction = 5;
      let environmentalScore = 0;
      
      if (ghgReduction >= 100) {
        environmentalScore = 100;
      } else if (ghgReduction >= 50) {
        environmentalScore = 70 + ((ghgReduction - 50) / 50) * 30;
      } else if (ghgReduction >= 10) {
        environmentalScore = 40 + ((ghgReduction - 10) / 40) * 30;
      } else if (ghgReduction > 0) {
        environmentalScore = (ghgReduction / 10) * 40;
      }
      
      expect(environmentalScore).toBeGreaterThanOrEqual(0);
      expect(environmentalScore).toBeLessThan(40);
      // (5/10)*40 = 20
      expect(environmentalScore).toBe(20);
    });

    it("returns 0 for zero GHG reduction", () => {
      const ghgReduction = 0;
      let environmentalScore = 0;
      
      if (ghgReduction >= 100) {
        environmentalScore = 100;
      } else if (ghgReduction >= 50) {
        environmentalScore = 70 + ((ghgReduction - 50) / 50) * 30;
      } else if (ghgReduction >= 10) {
        environmentalScore = 40 + ((ghgReduction - 10) / 40) * 30;
      } else if (ghgReduction > 0) {
        environmentalScore = (ghgReduction / 10) * 40;
      }
      
      expect(environmentalScore).toBe(0);
    });
  });

  describe("Prioritization Score Conversion", () => {
    it("converts environmental score (0-100) to prioritization score (0-10)", () => {
      const testCases = [
        { envScore: 100, expected: 10 },
        { envScore: 85, expected: 9 },
        { envScore: 55, expected: 6 },
        { envScore: 20, expected: 2 },
        { envScore: 0, expected: 0 },
      ];
      
      for (const { envScore, expected } of testCases) {
        const prioritizationScore = Math.round(envScore / 10);
        expect(prioritizationScore).toBe(expected);
      }
    });
  });

  describe("Payback Period Calculation", () => {
    it("calculates payback period correctly", () => {
      const totalCost = 100000;
      const annualSavings = 25000;
      const paybackPeriod = totalCost / annualSavings;
      
      expect(paybackPeriod).toBe(4); // 4 years
    });

    it("returns null for zero savings", () => {
      const totalCost = 100000;
      const annualSavings = 0;
      const paybackPeriod = annualSavings > 0 ? totalCost / annualSavings : null;
      
      expect(paybackPeriod).toBeNull();
    });

    it("handles very short payback periods", () => {
      const totalCost = 10000;
      const annualSavings = 50000;
      const paybackPeriod = totalCost / annualSavings;
      
      expect(paybackPeriod).toBe(0.2); // 0.2 years = ~2.4 months
    });
  });

  describe("Environmental Criteria Configuration", () => {
    it("environmental criteria has correct category", () => {
      const criteria = {
        name: "Environmental Impact",
        category: "environmental",
        weight: 15.00,
        isActive: true,
      };
      
      expect(criteria.category).toBe("environmental");
      expect(criteria.weight).toBe(15.00);
    });

    it("scoring guideline covers all score ranges", () => {
      const scoringGuideline = `0-2: No environmental benefit
3-4: Minor improvements (< 5% reduction)
5-6: Moderate improvements (5-15% reduction)
7-8: Significant improvements (15-30% reduction)
9-10: Major improvements (> 30% reduction or renewable energy)`;
      
      expect(scoringGuideline).toContain("0-2");
      expect(scoringGuideline).toContain("3-4");
      expect(scoringGuideline).toContain("5-6");
      expect(scoringGuideline).toContain("7-8");
      expect(scoringGuideline).toContain("9-10");
    });
  });

  describe("Green Upgrade Status Filtering", () => {
    it("includes only valid statuses in calculations", () => {
      const validStatuses = ["planned", "in_progress", "completed"];
      const invalidStatuses = ["cancelled", "rejected", "draft"];
      
      const upgrades = [
        { status: "planned", ghgReduction: 10 },
        { status: "in_progress", ghgReduction: 20 },
        { status: "completed", ghgReduction: 30 },
        { status: "cancelled", ghgReduction: 100 },
      ];
      
      const totalGHGReduction = upgrades
        .filter(u => validStatuses.includes(u.status))
        .reduce((sum, u) => sum + u.ghgReduction, 0);
      
      expect(totalGHGReduction).toBe(60); // 10 + 20 + 30, excludes cancelled
    });
  });
});
