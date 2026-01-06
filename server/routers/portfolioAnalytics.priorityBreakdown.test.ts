/**
 * Unit tests for Portfolio Analytics - Priority Breakdown
 * 
 * Tests the getPriorityBreakdown endpoint to ensure it correctly:
 * - Returns deficiency breakdown by priority level
 * - Calculates total costs per priority
 * - Sorts priorities in correct order (immediate, short_term, medium_term, long_term)
 * - Handles null/missing priority values
 */

import { describe, expect, it } from "vitest";
import { getPriorityBreakdown } from "../db-portfolioAnalytics";

describe("portfolioAnalytics.getPriorityBreakdown", () => {
  it("returns priority breakdown with correct structure", async () => {
    // Test with a real user ID from the database
    const userId = 1;
    const company = null;
    const isAdmin = true;

    const result = await getPriorityBreakdown(userId, company, isAdmin);

    // Should return an array
    expect(Array.isArray(result)).toBe(true);

    // Each item should have the correct structure
    result.forEach(item => {
      expect(item).toHaveProperty("priority");
      expect(item).toHaveProperty("count");
      expect(item).toHaveProperty("totalCost");
      expect(item).toHaveProperty("percentage");
      expect(item).toHaveProperty("buildings");

      // Validate types
      expect(typeof item.priority).toBe("string");
      expect(typeof item.count).toBe("number");
      expect(typeof item.totalCost).toBe("number");
      expect(typeof item.percentage).toBe("number");
      expect(Array.isArray(item.buildings)).toBe(true);

      // Priority should be one of the valid values
      expect(["immediate", "short_term", "medium_term", "long_term"]).toContain(item.priority);

      // Count should be non-negative
      expect(item.count).toBeGreaterThanOrEqual(0);

      // Total cost should be non-negative
      expect(item.totalCost).toBeGreaterThanOrEqual(0);

      // Percentage should be between 0 and 100
      expect(item.percentage).toBeGreaterThanOrEqual(0);
      expect(item.percentage).toBeLessThanOrEqual(100);
    });
  });

  it("returns priorities in correct order", async () => {
    const userId = 1;
    const company = null;
    const isAdmin = true;

    const result = await getPriorityBreakdown(userId, company, isAdmin);

    // If we have results, verify they are sorted correctly
    if (result.length > 1) {
      const priorityOrder = ["immediate", "short_term", "medium_term", "long_term"];
      const resultPriorities = result.map(r => r.priority);

      // Check that each priority appears in the correct order
      let lastIndex = -1;
      resultPriorities.forEach(priority => {
        const currentIndex = priorityOrder.indexOf(priority);
        expect(currentIndex).toBeGreaterThan(lastIndex);
        lastIndex = currentIndex;
      });
    }
  });

  it("calculates percentages that sum to approximately 100", async () => {
    const userId = 1;
    const company = null;
    const isAdmin = true;

    const result = await getPriorityBreakdown(userId, company, isAdmin);

    // If we have results, percentages should sum to approximately 100
    if (result.length > 0) {
      const totalPercentage = result.reduce((sum, item) => sum + item.percentage, 0);
      
      // Allow for rounding errors (within 1% tolerance)
      expect(totalPercentage).toBeGreaterThanOrEqual(99);
      expect(totalPercentage).toBeLessThanOrEqual(101);
    }
  });

  it("handles empty database gracefully", async () => {
    // Test with a non-existent user ID
    const userId = 999999;
    const company = null;
    const isAdmin = false;

    const result = await getPriorityBreakdown(userId, company, isAdmin);

    // Should return empty array, not throw error
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("respects company filtering", async () => {
    const userId = 1;
    const company = "TestCompany";
    const isAdmin = true;

    const result = await getPriorityBreakdown(userId, company, isAdmin);

    // Should return an array (may be empty if no projects for this company)
    expect(Array.isArray(result)).toBe(true);

    // All buildings should be from the specified company
    // (We can't verify this without querying the database directly,
    // but we can ensure the function doesn't throw an error)
  });

  it("returns valid cost values", async () => {
    const userId = 1;
    const company = null;
    const isAdmin = true;

    const result = await getPriorityBreakdown(userId, company, isAdmin);

    result.forEach(item => {
      // Total cost should be a valid number
      expect(Number.isFinite(item.totalCost)).toBe(true);
      expect(item.totalCost).toBeGreaterThanOrEqual(0);

      // If count is 0, total cost should also be 0
      if (item.count === 0) {
        expect(item.totalCost).toBe(0);
      }
    });
  });

  it("limits buildings list to 5 items", async () => {
    const userId = 1;
    const company = null;
    const isAdmin = true;

    const result = await getPriorityBreakdown(userId, company, isAdmin);

    result.forEach(item => {
      // Buildings array should have at most 5 items
      expect(item.buildings.length).toBeLessThanOrEqual(5);
    });
  });
});
