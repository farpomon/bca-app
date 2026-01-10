import { describe, expect, it } from "vitest";
import { getScoringStatus } from "./services/prioritization.service";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

describe("QA Bug Fixes - Priority Scoring", () => {
  describe("Issue 1: Negative Pending Count", () => {
    it("should only count scores for active projects (not deleted)", async () => {
      const status = await getScoringStatus();

      // Verify that unscored projects is never negative
      expect(status.unscoredProjects).toBeGreaterThanOrEqual(0);

      // Verify that the math adds up
      expect(status.totalProjects).toBe(status.scoredProjects + status.unscoredProjects);
    });

    it("should not count deleted projects in scored count", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get count of active projects
      const activeResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM projects WHERE deletedAt IS NULL
      `);
      const activeProjects = (activeResult[0] as any)[0]?.count || 0;

      // Get count of scored projects (should only include active projects)
      const scoredResult = await db.execute(sql`
        SELECT COUNT(DISTINCT ps.projectId) as count 
        FROM project_scores ps
        INNER JOIN projects p ON ps.projectId = p.id
        WHERE p.deletedAt IS NULL
      `);
      const scoredProjects = (scoredResult[0] as any)[0]?.count || 0;

      // Scored projects should never exceed active projects
      expect(scoredProjects).toBeLessThanOrEqual(activeProjects);
    });
  });

  describe("Issue 2: Duplicate Criteria Names", () => {
    it("should not have duplicate active criteria names", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check for duplicate active criteria names
      const result = await db.execute(sql`
        SELECT name, COUNT(*) as count 
        FROM prioritization_criteria 
        WHERE isActive = 1 
        GROUP BY name 
        HAVING count > 1
      `);

      const duplicates = result[0] as any[];

      // Should have no duplicates
      expect(duplicates).toHaveLength(0);
    });

    it("should have exactly one active Test Urgency criterion", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM prioritization_criteria 
        WHERE name = 'Test Urgency' AND isActive = 1
      `);

      const count = (result[0] as any)[0]?.count || 0;

      // Should have exactly 1 active Test Urgency criterion
      expect(count).toBe(1);
    });
  });

  describe("Integration: KPI Display", () => {
    it("should return valid KPI values for dashboard", async () => {
      const status = await getScoringStatus();

      // All values should be non-negative
      expect(status.totalProjects).toBeGreaterThanOrEqual(0);
      expect(status.scoredProjects).toBeGreaterThanOrEqual(0);
      expect(status.unscoredProjects).toBeGreaterThanOrEqual(0);

      // Scored projects should not exceed total
      expect(status.scoredProjects).toBeLessThanOrEqual(status.totalProjects);

      // Math should be correct
      expect(status.totalProjects).toBe(status.scoredProjects + status.unscoredProjects);
    });
  });
});
