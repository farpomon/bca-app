import { describe, expect, it } from "vitest";
import { calculatePriorityScore } from "./recalculation.service";

describe("recalculation.service", () => {
  describe("calculatePriorityScore", () => {
    it("should calculate high score for critical severity with immediate priority", () => {
      const score = calculatePriorityScore({
        severity: "critical",
        priority: "immediate",
        estimatedCost: 150000,
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      });
      
      expect(score).toBe(100);
    });

    it("should calculate medium score for medium severity with medium_term priority", () => {
      const score = calculatePriorityScore({
        severity: "medium",
        priority: "medium_term",
        estimatedCost: 5000,
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      });
      
      expect(score).toBe(47);
    });

    it("should calculate low score for low severity with long_term priority", () => {
      const score = calculatePriorityScore({
        severity: "low",
        priority: "long_term",
        estimatedCost: 500,
        createdAt: new Date(),
      });
      
      expect(score).toBe(20);
    });

    it("should handle missing optional fields", () => {
      const score = calculatePriorityScore({
        severity: "high",
        priority: "short_term",
      });
      
      expect(score).toBe(60);
    });

    it("should cap score at 100", () => {
      const score = calculatePriorityScore({
        severity: "critical",
        priority: "immediate",
        estimatedCost: 1000000000,
        createdAt: new Date(Date.now() - 1000 * 24 * 60 * 60 * 1000),
      });
      
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
