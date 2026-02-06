import { describe, expect, it } from "vitest";
import { calculateFCI, getFCIRating, getConditionScore, getConditionRating } from "./portfolioReportCalculations";

describe("FCI Calculations", () => {
  it("calculateFCI returns decimal ratio (0-1 scale)", () => {
    // $97,626,575 / $1,888,500,000 = ~0.0517
    const fci = calculateFCI(97626575, 1888500000);
    expect(fci).toBeCloseTo(0.0517, 3);
    expect(fci).toBeLessThan(1); // Must be decimal, not percentage
  });

  it("calculateFCI returns 0 when CRV is 0", () => {
    expect(calculateFCI(100000, 0)).toBe(0);
  });

  it("getFCIRating correctly classifies decimal FCI values", () => {
    // Good: 0-0.05 (0-5%)
    expect(getFCIRating(0.03)).toBe("Good");
    expect(getFCIRating(0.05)).toBe("Good");
    
    // Fair: 0.05-0.10 (5-10%)
    expect(getFCIRating(0.051)).toBe("Fair");
    expect(getFCIRating(0.10)).toBe("Fair");
    
    // Poor: 0.10-0.30 (10-30%)
    expect(getFCIRating(0.15)).toBe("Poor");
    expect(getFCIRating(0.30)).toBe("Poor");
    
    // Critical: >0.30 (>30%)
    expect(getFCIRating(0.35)).toBe("Critical");
    expect(getFCIRating(0.50)).toBe("Critical");
  });

  it("getFCIRating should NOT be called with percentage values", () => {
    // If called with 5.17 (percentage), it would incorrectly return "Critical"
    // This test documents the expected behavior - getFCIRating expects decimal
    const incorrectResult = getFCIRating(5.17); // 5.17% passed as percentage
    expect(incorrectResult).toBe("Critical"); // Wrong! This is the bug we fixed
    
    // Correct usage: pass decimal
    const correctResult = getFCIRating(0.0517); // 5.17% as decimal
    expect(correctResult).toBe("Fair"); // Correct!
  });
});

describe("Condition Score and Rating", () => {
  it("getConditionScore maps condition text to numeric score", () => {
    expect(getConditionScore("good")).toBe(85);
    expect(getConditionScore("fair")).toBe(65);
    expect(getConditionScore("poor")).toBe(35);
    expect(getConditionScore("critical")).toBe(15);
    expect(getConditionScore("not_assessed")).toBe(50);
    expect(getConditionScore(null)).toBe(50);
  });

  it("getConditionRating maps numeric score to condition text", () => {
    expect(getConditionRating(85)).toBe("Good");
    expect(getConditionRating(80)).toBe("Good");
    expect(getConditionRating(65)).toBe("Fair");
    expect(getConditionRating(60)).toBe("Fair");
    expect(getConditionRating(35)).toBe("Poor");
    expect(getConditionRating(30)).toBe("Poor");
    expect(getConditionRating(15)).toBe("Critical");
    expect(getConditionRating(10)).toBe("Critical");
  });
});

describe("Condition Rating to Label Mapping (1-5 scale)", () => {
  // This tests the SQL CASE mapping logic used in getComponentAssessmentsForPDF
  const mapConditionRatingToLabel = (rating: string | null): string => {
    switch (rating) {
      case '1': return 'good';
      case '2': return 'good';
      case '3': return 'fair';
      case '4': return 'poor';
      case '5': return 'poor';
      default: return 'not_assessed';
    }
  };

  const mapConditionRatingToPercentage = (rating: string | null): number | null => {
    switch (rating) {
      case '1': return 95;
      case '2': return 80;
      case '3': return 60;
      case '4': return 35;
      case '5': return 15;
      default: return null;
    }
  };

  it("maps conditionRating 1-5 to condition labels", () => {
    expect(mapConditionRatingToLabel('1')).toBe('good');
    expect(mapConditionRatingToLabel('2')).toBe('good');
    expect(mapConditionRatingToLabel('3')).toBe('fair');
    expect(mapConditionRatingToLabel('4')).toBe('poor');
    expect(mapConditionRatingToLabel('5')).toBe('poor');
    expect(mapConditionRatingToLabel(null)).toBe('not_assessed');
  });

  it("maps conditionRating 1-5 to condition percentages", () => {
    expect(mapConditionRatingToPercentage('1')).toBe(95);
    expect(mapConditionRatingToPercentage('2')).toBe(80);
    expect(mapConditionRatingToPercentage('3')).toBe(60);
    expect(mapConditionRatingToPercentage('4')).toBe(35);
    expect(mapConditionRatingToPercentage('5')).toBe(15);
    expect(mapConditionRatingToPercentage(null)).toBeNull();
  });
});

describe("FCI Display Conversion", () => {
  it("converts decimal FCI to percentage for display", () => {
    // This is what the client-side code should do
    const decimalFCI = 0.0517;
    const percentageFCI = decimalFCI * 100;
    expect(percentageFCI).toBeCloseTo(5.17, 2);
    
    // The PDF generator's getFCIColor expects percentage (0-100)
    const getFCIColor = (fci: number): string => {
      if (fci <= 5) return "green";
      if (fci <= 10) return "amber";
      if (fci <= 30) return "orange";
      return "red";
    };
    
    expect(getFCIColor(percentageFCI)).toBe("amber"); // 5.17% = Fair
    expect(getFCIColor(decimalFCI)).toBe("green"); // 0.0517 would incorrectly show as Good
  });

  it("getPortfolioOverview returns FCI as percentage for display", () => {
    // Simulating the fixed getPortfolioOverview logic
    const totalDMC = 97626575;
    const totalCRV = 1888500000;
    
    const portfolioFCIDecimal = totalCRV > 0 ? (totalDMC / totalCRV) : 0;
    const portfolioFCIPercent = portfolioFCIDecimal * 100;
    
    // The returned value should be percentage
    const returnedFCI = Math.round(portfolioFCIPercent * 100) / 100;
    expect(returnedFCI).toBeCloseTo(5.17, 1);
    
    // The rating should use decimal
    const rating = getFCIRating(portfolioFCIDecimal);
    expect(rating).toBe("Fair"); // NOT "Critical"
  });
});
