import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import * as prioritizationService from "./services/prioritization.service";

describe("Composite Priority Score Calculation", () => {
  let testProjectId: number;
  let testCriteriaIds: number[] = [];

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create a test project
    const projectResult = await db.execute(sql`
      INSERT INTO projects (name, userId, createdAt, updatedAt)
      VALUES ('Test Priority Project', 1, NOW(), NOW())
    `);
    testProjectId = Number(projectResult[0].insertId);

    // Clean up any existing test criteria from previous runs
    await db.execute(sql`DELETE FROM project_scores WHERE projectId IN (SELECT id FROM projects WHERE name = 'Test Priority Project')`);
    await db.execute(sql`DELETE FROM prioritization_criteria WHERE name LIKE 'Test %'`);
    // Deactivate all existing criteria to avoid interference
    await db.execute(sql`UPDATE prioritization_criteria SET isActive = 0 WHERE isActive = 1`);
    
    // Create test criteria with known weights that sum to 100
    const criteriaData = [
      { name: "Test Urgency", weight: 20 },
      { name: "Test Safety", weight: 30 },
      { name: "Test Compliance", weight: 25 },
      { name: "Test Financial", weight: 25 },
    ];

    for (const criteria of criteriaData) {
      const result = await db.execute(sql`
        INSERT INTO prioritization_criteria (name, category, weight, isActive, displayOrder, createdAt, updatedAt)
        VALUES (${criteria.name}, 'risk', ${criteria.weight}, 1, 0, NOW(), NOW())
      `);
      testCriteriaIds.push(Number(result[0].insertId));
    }
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    await db.execute(sql`DELETE FROM project_scores WHERE projectId = ${testProjectId}`);
    await db.execute(sql`DELETE FROM projects WHERE id = ${testProjectId}`);
    for (const criteriaId of testCriteriaIds) {
      await db.execute(sql`DELETE FROM prioritization_criteria WHERE id = ${criteriaId}`);
    }
    // Reactivate all criteria that were deactivated
    await db.execute(sql`UPDATE prioritization_criteria SET isActive = 1 WHERE isActive = 0 AND name NOT LIKE 'Test %'`);
  });

  it("should calculate composite score as 100 when all criteria are scored 10", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Clear existing scores and score all criteria with 10 (critical)
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
    expect(result?.compositeScore).toBe(10);
  });

  it("should calculate composite score as 50 when all criteria are scored 5", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Clear existing scores and score all criteria with 5 (medium)
    await db.execute(sql`DELETE FROM project_scores WHERE projectId = ${testProjectId}`);
    for (const criteriaId of testCriteriaIds) {
      await db.execute(sql`
        INSERT INTO project_scores (projectId, criteriaId, score, scoredBy, scoredAt, updatedAt)
        VALUES (${testProjectId}, ${criteriaId}, 5, 1, NOW(), NOW())
      `);
    }

    // Calculate composite score
    const result = await prioritizationService.calculateCompositeScore(testProjectId);

    expect(result).not.toBeNull();
    expect(result?.compositeScore).toBe(5);
  });

  it("should calculate composite score as 0 when all criteria are scored 0", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Clear existing scores and score all criteria with 0
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
    expect(result?.compositeScore).toBe(0);
  });

  it("should calculate weighted composite score correctly with mixed scores", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Score criteria with different values:
    // Urgency (20%): 10 → 20 * 10 = 200
    // Safety (30%): 8 → 30 * 8 = 240
    // Compliance (25%): 6 → 25 * 6 = 150
    // Financial (25%): 4 → 25 * 4 = 100
    // Total: (200 + 240 + 150 + 100) / 100 = 6.9
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
    // Expected: (20*10 + 30*8 + 25*6 + 25*4) / 100 = 690 / 100 = 6.9
    expect(result?.compositeScore).toBeCloseTo(6.9, 1);
  });

  it("should verify individual weighted scores are calculated correctly", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Set specific scores
    const testScores = [
      { criteriaId: testCriteriaIds[0], score: 10, weight: 20, expectedWeighted: 200 }, // 20 * 10 = 200
      { criteriaId: testCriteriaIds[1], score: 5, weight: 30, expectedWeighted: 150 },  // 30 * 5 = 150
      { criteriaId: testCriteriaIds[2], score: 8, weight: 25, expectedWeighted: 200 },  // 25 * 8 = 200
      { criteriaId: testCriteriaIds[3], score: 2, weight: 25, expectedWeighted: 50 },   // 25 * 2 = 50
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
    
    // Verify each weighted score
    for (const expected of testScores) {
      const criteriaScore = result?.criteriaScores.find(
        (cs) => cs.criteriaId === expected.criteriaId
      );
      expect(criteriaScore).toBeDefined();
      expect(criteriaScore?.weightedScore).toBe(expected.expectedWeighted);
    }

    // Verify total composite score: (200 + 150 + 200 + 50) / 100 = 6.0
    expect(result?.compositeScore).toBeCloseTo(6.0, 1);
  });
});
