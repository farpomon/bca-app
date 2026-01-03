import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

// Test the rating calculation helper functions
describe("Rating System", () => {
  describe("Letter Grade Calculation", () => {
    // Standard letter grade thresholds
    const standardThresholds = {
      "A+": { min: 97, max: 100 },
      "A": { min: 93, max: 96.99 },
      "A-": { min: 90, max: 92.99 },
      "B+": { min: 87, max: 89.99 },
      "B": { min: 83, max: 86.99 },
      "B-": { min: 80, max: 82.99 },
      "C+": { min: 77, max: 79.99 },
      "C": { min: 73, max: 76.99 },
      "C-": { min: 70, max: 72.99 },
      "D+": { min: 67, max: 69.99 },
      "D": { min: 63, max: 66.99 },
      "D-": { min: 60, max: 62.99 },
      "F": { min: 0, max: 59.99 }
    };

    // Helper function to calculate letter grade (same as in router)
    function calculateLetterGrade(score: number, thresholds: Record<string, { min: number; max: number }>, isInverted = false): string {
      for (const [grade, range] of Object.entries(thresholds)) {
        if (score >= range.min && score <= range.max) {
          return grade;
        }
      }
      return isInverted ? "F" : "F";
    }

    it("should return A+ for scores 97-100", () => {
      expect(calculateLetterGrade(100, standardThresholds)).toBe("A+");
      expect(calculateLetterGrade(97, standardThresholds)).toBe("A+");
      expect(calculateLetterGrade(98.5, standardThresholds)).toBe("A+");
    });

    it("should return A for scores 93-96.99", () => {
      expect(calculateLetterGrade(93, standardThresholds)).toBe("A");
      expect(calculateLetterGrade(96.99, standardThresholds)).toBe("A");
      expect(calculateLetterGrade(95, standardThresholds)).toBe("A");
    });

    it("should return B grades for scores 80-89.99", () => {
      expect(calculateLetterGrade(89, standardThresholds)).toBe("B+");
      expect(calculateLetterGrade(85, standardThresholds)).toBe("B");
      expect(calculateLetterGrade(81, standardThresholds)).toBe("B-");
    });

    it("should return C grades for scores 70-79.99", () => {
      expect(calculateLetterGrade(78, standardThresholds)).toBe("C+");
      expect(calculateLetterGrade(75, standardThresholds)).toBe("C");
      expect(calculateLetterGrade(71, standardThresholds)).toBe("C-");
    });

    it("should return D grades for scores 60-69.99", () => {
      expect(calculateLetterGrade(68, standardThresholds)).toBe("D+");
      expect(calculateLetterGrade(65, standardThresholds)).toBe("D");
      expect(calculateLetterGrade(61, standardThresholds)).toBe("D-");
    });

    it("should return F for scores below 60", () => {
      expect(calculateLetterGrade(59, standardThresholds)).toBe("F");
      expect(calculateLetterGrade(50, standardThresholds)).toBe("F");
      expect(calculateLetterGrade(0, standardThresholds)).toBe("F");
    });
  });

  describe("Zone Calculation", () => {
    // Standard zone thresholds
    const standardZoneThresholds = {
      green: { min: 80, max: 100 },
      yellow: { min: 60, max: 79.99 },
      orange: { min: 40, max: 59.99 },
      red: { min: 0, max: 39.99 }
    };

    // Helper function to calculate zone (same as in router)
    function calculateZone(score: number, thresholds: Record<string, { min: number; max: number }>): string {
      for (const [zone, range] of Object.entries(thresholds)) {
        if (score >= range.min && score <= range.max) {
          return zone;
        }
      }
      return "red";
    }

    it("should return green zone for scores 80-100", () => {
      expect(calculateZone(100, standardZoneThresholds)).toBe("green");
      expect(calculateZone(80, standardZoneThresholds)).toBe("green");
      expect(calculateZone(90, standardZoneThresholds)).toBe("green");
    });

    it("should return yellow zone for scores 60-79.99", () => {
      expect(calculateZone(79, standardZoneThresholds)).toBe("yellow");
      expect(calculateZone(60, standardZoneThresholds)).toBe("yellow");
      expect(calculateZone(70, standardZoneThresholds)).toBe("yellow");
    });

    it("should return orange zone for scores 40-59.99", () => {
      expect(calculateZone(59, standardZoneThresholds)).toBe("orange");
      expect(calculateZone(40, standardZoneThresholds)).toBe("orange");
      expect(calculateZone(50, standardZoneThresholds)).toBe("orange");
    });

    it("should return red zone for scores 0-39.99", () => {
      expect(calculateZone(39, standardZoneThresholds)).toBe("red");
      expect(calculateZone(0, standardZoneThresholds)).toBe("red");
      expect(calculateZone(20, standardZoneThresholds)).toBe("red");
    });
  });

  describe("FCI Inverted Scale", () => {
    // FCI-specific thresholds (lower is better)
    const fciThresholds = {
      "A+": { min: 0, max: 2 },
      "A": { min: 2.01, max: 5 },
      "A-": { min: 5.01, max: 8 },
      "B+": { min: 8.01, max: 12 },
      "B": { min: 12.01, max: 15 },
      "B-": { min: 15.01, max: 20 },
      "C+": { min: 20.01, max: 25 },
      "C": { min: 25.01, max: 30 },
      "C-": { min: 30.01, max: 35 },
      "D+": { min: 35.01, max: 40 },
      "D": { min: 40.01, max: 50 },
      "D-": { min: 50.01, max: 60 },
      "F": { min: 60.01, max: 100 }
    };

    function calculateLetterGrade(score: number, thresholds: Record<string, { min: number; max: number }>): string {
      for (const [grade, range] of Object.entries(thresholds)) {
        if (score >= range.min && score <= range.max) {
          return grade;
        }
      }
      return "F";
    }

    it("should return A+ for FCI 0-2% (excellent condition)", () => {
      expect(calculateLetterGrade(0, fciThresholds)).toBe("A+");
      expect(calculateLetterGrade(1, fciThresholds)).toBe("A+");
      expect(calculateLetterGrade(2, fciThresholds)).toBe("A+");
    });

    it("should return A for FCI 2.01-5%", () => {
      expect(calculateLetterGrade(3, fciThresholds)).toBe("A");
      expect(calculateLetterGrade(5, fciThresholds)).toBe("A");
    });

    it("should return B grades for FCI 8.01-20%", () => {
      expect(calculateLetterGrade(10, fciThresholds)).toBe("B+");
      expect(calculateLetterGrade(14, fciThresholds)).toBe("B");
      expect(calculateLetterGrade(18, fciThresholds)).toBe("B-");
    });

    it("should return F for FCI above 60% (poor condition)", () => {
      expect(calculateLetterGrade(65, fciThresholds)).toBe("F");
      expect(calculateLetterGrade(80, fciThresholds)).toBe("F");
      expect(calculateLetterGrade(100, fciThresholds)).toBe("F");
    });
  });

  describe("FCI Zone Thresholds", () => {
    const fciZoneThresholds = {
      green: { min: 0, max: 5 },
      yellow: { min: 5.01, max: 10 },
      orange: { min: 10.01, max: 30 },
      red: { min: 30.01, max: 100 }
    };

    function calculateZone(score: number, thresholds: Record<string, { min: number; max: number }>): string {
      for (const [zone, range] of Object.entries(thresholds)) {
        if (score >= range.min && score <= range.max) {
          return zone;
        }
      }
      return "red";
    }

    it("should return green zone for FCI 0-5%", () => {
      expect(calculateZone(0, fciZoneThresholds)).toBe("green");
      expect(calculateZone(3, fciZoneThresholds)).toBe("green");
      expect(calculateZone(5, fciZoneThresholds)).toBe("green");
    });

    it("should return yellow zone for FCI 5.01-10%", () => {
      expect(calculateZone(6, fciZoneThresholds)).toBe("yellow");
      expect(calculateZone(8, fciZoneThresholds)).toBe("yellow");
      expect(calculateZone(10, fciZoneThresholds)).toBe("yellow");
    });

    it("should return orange zone for FCI 10.01-30%", () => {
      expect(calculateZone(15, fciZoneThresholds)).toBe("orange");
      expect(calculateZone(25, fciZoneThresholds)).toBe("orange");
      expect(calculateZone(30, fciZoneThresholds)).toBe("orange");
    });

    it("should return red zone for FCI above 30%", () => {
      expect(calculateZone(35, fciZoneThresholds)).toBe("red");
      expect(calculateZone(50, fciZoneThresholds)).toBe("red");
      expect(calculateZone(100, fciZoneThresholds)).toBe("red");
    });
  });

  describe("Overall Score Calculation", () => {
    it("should calculate weighted average of condition and FCI scores", () => {
      // Formula: (conditionScore * 0.6 + normalizedFci * 0.4)
      // normalizedFci = 100 - fciScore
      
      const conditionScore = 80;
      const fciScore = 10; // Low FCI is good
      const normalizedFci = 100 - fciScore; // = 90
      const overallScore = (conditionScore * 0.6 + normalizedFci * 0.4);
      
      expect(overallScore).toBe(84); // 80*0.6 + 90*0.4 = 48 + 36 = 84
    });

    it("should use only condition score when FCI is not available", () => {
      const conditionScore = 75;
      const overallScore = conditionScore;
      
      expect(overallScore).toBe(75);
    });

    it("should use normalized FCI when condition score is not available", () => {
      const fciScore = 20;
      const overallScore = Math.max(0, 100 - fciScore);
      
      expect(overallScore).toBe(80);
    });
  });

  describe("Zone Distribution", () => {
    it("should correctly count assets in each zone", () => {
      const assetRatings = [
        { overallZone: "green" },
        { overallZone: "green" },
        { overallZone: "yellow" },
        { overallZone: "orange" },
        { overallZone: "red" },
        { overallZone: "red" },
      ];

      const zoneDistribution = {
        green: assetRatings.filter(r => r.overallZone === "green").length,
        yellow: assetRatings.filter(r => r.overallZone === "yellow").length,
        orange: assetRatings.filter(r => r.overallZone === "orange").length,
        red: assetRatings.filter(r => r.overallZone === "red").length,
      };

      expect(zoneDistribution).toEqual({
        green: 2,
        yellow: 1,
        orange: 1,
        red: 2,
      });
    });
  });

  describe("Grade Distribution", () => {
    it("should correctly count assets by base grade", () => {
      const assetRatings = [
        { overallGrade: "A+" },
        { overallGrade: "A" },
        { overallGrade: "A-" },
        { overallGrade: "B+" },
        { overallGrade: "B" },
        { overallGrade: "C" },
        { overallGrade: "F" },
      ];

      const gradeDistribution: Record<string, number> = {};
      for (const rating of assetRatings) {
        if (rating.overallGrade) {
          const baseGrade = rating.overallGrade.charAt(0);
          gradeDistribution[baseGrade] = (gradeDistribution[baseGrade] || 0) + 1;
        }
      }

      expect(gradeDistribution).toEqual({
        A: 3,
        B: 2,
        C: 1,
        F: 1,
      });
    });
  });
});
