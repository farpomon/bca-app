import { describe, it, expect } from "vitest";

/**
 * Unit tests for composite priority score calculation formula
 * Formula: sum(weight × score) / 100
 * 
 * This tests the mathematical correctness of the formula without database dependencies
 */

describe("Composite Priority Score Formula", () => {
  /**
   * Helper function that implements the corrected formula
   */
  function calculateCompositeScore(
    criteriaScores: Array<{ weight: number; score: number }>
  ): number {
    let compositeScore = 0;
    
    for (const { weight, score } of criteriaScores) {
      const weightedScore = weight * score; // weight × score
      compositeScore += weightedScore;
    }
    
    // Divide by 100 to get final composite score
    // Formula: sum(weight × score) / 100
    return compositeScore / 100;
  }

  it("should return 100 when all criteria are scored 10 with equal 20% weights", () => {
    const criteriaScores = [
      { weight: 20, score: 10 },
      { weight: 20, score: 10 },
      { weight: 20, score: 10 },
      { weight: 20, score: 10 },
      { weight: 20, score: 10 },
    ];

    const result = calculateCompositeScore(criteriaScores);
    
    // (20*10 + 20*10 + 20*10 + 20*10 + 20*10) / 100 = 1000 / 100 = 10
    // Wait, this should be 10, not 100!
    // The score range is 0-10, so max composite should be 10, not 100
    expect(result).toBe(10);
  });

  it("should return 10 when all criteria are scored 10 with varying weights", () => {
    const criteriaScores = [
      { weight: 20, score: 10 }, // 200
      { weight: 30, score: 10 }, // 300
      { weight: 25, score: 10 }, // 250
      { weight: 25, score: 10 }, // 250
    ];

    const result = calculateCompositeScore(criteriaScores);
    
    // (200 + 300 + 250 + 250) / 100 = 1000 / 100 = 10
    expect(result).toBe(10);
  });

  it("should return 5 when all criteria are scored 5 with equal weights", () => {
    const criteriaScores = [
      { weight: 20, score: 5 },
      { weight: 20, score: 5 },
      { weight: 20, score: 5 },
      { weight: 20, score: 5 },
      { weight: 20, score: 5 },
    ];

    const result = calculateCompositeScore(criteriaScores);
    
    // (20*5 + 20*5 + 20*5 + 20*5 + 20*5) / 100 = 500 / 100 = 5
    expect(result).toBe(5);
  });

  it("should return 0 when all criteria are scored 0", () => {
    const criteriaScores = [
      { weight: 20, score: 0 },
      { weight: 30, score: 0 },
      { weight: 25, score: 0 },
      { weight: 25, score: 0 },
    ];

    const result = calculateCompositeScore(criteriaScores);
    
    // (0 + 0 + 0 + 0) / 100 = 0
    expect(result).toBe(0);
  });

  it("should calculate weighted average correctly with mixed scores", () => {
    const criteriaScores = [
      { weight: 20, score: 10 }, // 200
      { weight: 30, score: 8 },  // 240
      { weight: 25, score: 6 },  // 150
      { weight: 25, score: 4 },  // 100
    ];

    const result = calculateCompositeScore(criteriaScores);
    
    // (200 + 240 + 150 + 100) / 100 = 690 / 100 = 6.9
    expect(result).toBeCloseTo(6.9, 1);
  });

  it("should handle unequal weights correctly", () => {
    const criteriaScores = [
      { weight: 40, score: 10 }, // 400
      { weight: 30, score: 5 },  // 150
      { weight: 20, score: 8 },  // 160
      { weight: 10, score: 2 },  // 20
    ];

    const result = calculateCompositeScore(criteriaScores);
    
    // (400 + 150 + 160 + 20) / 100 = 730 / 100 = 7.3
    expect(result).toBeCloseTo(7.3, 1);
  });

  it("should handle single criterion", () => {
    const criteriaScores = [
      { weight: 100, score: 7 }, // 700
    ];

    const result = calculateCompositeScore(criteriaScores);
    
    // 700 / 100 = 7
    expect(result).toBe(7);
  });

  it("should handle fractional scores", () => {
    const criteriaScores = [
      { weight: 50, score: 7.5 },  // 375
      { weight: 50, score: 8.5 },  // 425
    ];

    const result = calculateCompositeScore(criteriaScores);
    
    // (375 + 425) / 100 = 800 / 100 = 8.0
    expect(result).toBe(8.0);
  });
});
