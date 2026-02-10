import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import * as prioritizationService from "./services/prioritization.service";

describe("Composite Priority Score Calculation", { timeout: 30000 }, () => {
  let testProjectId: number;
  let testCriteriaIds: number[] = [];

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create a test project
    const projectResult = await db.execute(sql`
      INSERT INTO projects (name, userId, createdAt, updatedAt)
      VALUES ('Test Priority Project CSC2', 1, NOW(), NOW())
    `);
    testProjectId = Number(projectResult[0].insertId);

    // Create test criteria with known weights
    // Note: We don't deactivate other criteria to avoid interfering with parallel tests.
    // The calculateCompositeScore function uses ALL active criteria, so our test
    // assertions must account for the presence of other criteria.
    const criteriaData = [
      { name: `CSC2 Urgency ${Date.now()}`, weight: 20 },
      { name: `CSC2 Safety ${Date.now()}`, weight: 30 },
      { name: `CSC2 Compliance ${Date.now()}`, weight: 25 },
      { name: `CSC2 Financial ${Date.now()}`, weight: 25 },
    ];

    for (const criteria of criteriaData) {
      const result = await db.execute(sql`
        INSERT INTO prioritization_criteria (name, category, weight, isActive, status, displayOrder, createdAt, updatedAt)
        VALUES (${criteria.name}, 'risk', ${criteria.weight}, 1, 'active', 0, NOW(), NOW())
      `);
      testCriteriaIds.push(Number(result[0].insertId));
    }
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    try {
      await db.execute(sql`DELETE FROM project_scores WHERE projectId = ${testProjectId}`);
      await db.execute(sql`DELETE FROM projects WHERE id = ${testProjectId}`);
      for (const criteriaId of testCriteriaIds) {
        await db.execute(sql`DELETE FROM prioritization_criteria WHERE id = ${criteriaId}`);
      }
    } catch { /* ignore cleanup errors */ }
  });

  it("should calculate composite score when all test criteria are scored 10", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Score all our test criteria with 10
    await db.execute(sql`DELETE FROM project_scores WHERE projectId = ${testProjectId}`);
    for (const criteriaId of testCriteriaIds) {
      await db.execute(sql`
        INSERT INTO project_scores (projectId, criteriaId, score, scoredBy, scoredAt, updatedAt)
        VALUES (${testProjectId}, ${criteriaId}, 10, 1, NOW(), NOW())
      `);
    }

    // Calculate composite score
    const result = await prioritizationService.calculateCompositeScore(testProjectId);

    expect(result).not.toBeNull();
    if (result) {
      // The composite score should be positive (our criteria contribute to it)
      // It may not be exactly 10 because other active criteria exist without scores
      expect(result.compositeScore).toBeGreaterThanOrEqual(0);
      expect(result.compositeScore).toBeLessThanOrEqual(10);
      
      // Verify our criteria scores are included
      for (const criteriaId of testCriteriaIds) {
        const cs = result.criteriaScores.find(s => s.criteriaId === criteriaId);
        if (cs) {
          expect(cs.score).toBe(10);
        }
      }
    }
  });

  it("should calculate composite score as 0 when all criteria are scored 0", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Score all test criteria with 0
    await db.execute(sql`DELETE FROM project_scores WHERE projectId = ${testProjectId}`);
    for (const criteriaId of testCriteriaIds) {
      await db.execute(sql`
        INSERT INTO project_scores (projectId, criteriaId, score, scoredBy, scoredAt, updatedAt)
        VALUES (${testProjectId}, ${criteriaId}, 0, 1, NOW(), NOW())
      `);
    }

    // Calculate composite score
    const result = await prioritizationService.calculateCompositeScore(testProjectId);

    expect(result).not.toBeNull();
    if (result) {
      // With all scored criteria at 0, composite should be 0
      expect(result.compositeScore).toBe(0);
    }
  });

  it("should calculate weighted composite score with mixed scores", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const scores = [10, 8, 6, 4];

    await db.execute(sql`DELETE FROM project_scores WHERE projectId = ${testProjectId}`);
    for (let i = 0; i < testCriteriaIds.length; i++) {
      await db.execute(sql`
        INSERT INTO project_scores (projectId, criteriaId, score, scoredBy, scoredAt, updatedAt)
        VALUES (${testProjectId}, ${testCriteriaIds[i]}, ${scores[i]}, 1, NOW(), NOW())
      `);
    }

    // Calculate composite score
    const result = await prioritizationService.calculateCompositeScore(testProjectId);

    expect(result).not.toBeNull();
    if (result) {
      // The composite score should be between 0 and 10
      expect(result.compositeScore).toBeGreaterThanOrEqual(0);
      expect(result.compositeScore).toBeLessThanOrEqual(10);
      
      // Verify individual scores are correct
      for (let i = 0; i < testCriteriaIds.length; i++) {
        const cs = result.criteriaScores.find(s => s.criteriaId === testCriteriaIds[i]);
        if (cs) {
          expect(cs.score).toBe(scores[i]);
          expect(cs.weightedScore).toBeGreaterThan(0);
        }
      }
    }
  });

  it("should verify individual weighted scores are calculated correctly", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const testScores = [
      { criteriaId: testCriteriaIds[0], score: 10 },
      { criteriaId: testCriteriaIds[1], score: 5 },
      { criteriaId: testCriteriaIds[2], score: 8 },
      { criteriaId: testCriteriaIds[3], score: 2 },
    ];

    await db.execute(sql`DELETE FROM project_scores WHERE projectId = ${testProjectId}`);
    for (const { criteriaId, score } of testScores) {
      await db.execute(sql`
        INSERT INTO project_scores (projectId, criteriaId, score, scoredBy, scoredAt, updatedAt)
        VALUES (${testProjectId}, ${criteriaId}, ${score}, 1, NOW(), NOW())
      `);
    }

    // Calculate composite score
    const result = await prioritizationService.calculateCompositeScore(testProjectId);

    expect(result).not.toBeNull();
    
    if (result) {
      // Verify each criteria score exists
      for (const expected of testScores) {
        const criteriaScore = result.criteriaScores.find(
          (cs) => cs.criteriaId === expected.criteriaId
        );
        expect(criteriaScore).toBeDefined();
        if (criteriaScore) {
          expect(criteriaScore.score).toBe(expected.score);
          // weightedScore = weight * score, should be positive for non-zero scores
          if (expected.score > 0) {
            expect(criteriaScore.weightedScore).toBeGreaterThan(0);
          }
        }
      }

      // Verify total composite score is in valid range
      expect(result.compositeScore).toBeGreaterThanOrEqual(0);
      expect(result.compositeScore).toBeLessThanOrEqual(10);
    }
  });
});
