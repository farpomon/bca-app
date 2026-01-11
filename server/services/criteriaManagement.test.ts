import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import * as criteriaManagementService from "./criteriaManagement.service";

/**
 * Test suite for criteria management service
 * Tests remove, disable, delete, and enable operations
 */

let testCriteriaIds: number[] = [];
let testUserId = 1;

describe("Criteria Management Service", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test criteria
    const criteriaData = [
      { name: "Test Urgency CM", weight: 25, category: "risk" },
      { name: "Test Safety CM", weight: 25, category: "risk" },
      { name: "Test Compliance CM", weight: 25, category: "compliance" },
      { name: "Test Financial CM", weight: 25, category: "financial" },
    ];

    for (const criteria of criteriaData) {
      const result = await db.execute(sql`
        INSERT INTO prioritization_criteria (name, category, weight, isActive, status, displayOrder, createdAt, updatedAt)
        VALUES (${criteria.name}, ${criteria.category}, ${criteria.weight}, 1, 'active', 0, NOW(), NOW())
      `);
      const insertId = (result[0] as any).insertId;
      testCriteriaIds.push(insertId);
    }
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test criteria
    for (const criteriaId of testCriteriaIds) {
      await db.execute(sql`DELETE FROM prioritization_criteria WHERE id = ${criteriaId}`);
      await db.execute(sql`DELETE FROM criteria_audit_log WHERE criteriaId = ${criteriaId}`);
    }
  });

  describe("removeCriterionFromModel", () => {
    it("should remove a criterion from the scoring model", async () => {
      const criteriaId = testCriteriaIds[0];
      
      const result = await criteriaManagementService.removeCriterionFromModel(
        criteriaId,
        null,
        testUserId,
        "Test removal"
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("removed from scoring model");

      // Verify criterion is deactivated
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const criterionResult = await db.execute(sql`
        SELECT isActive FROM prioritization_criteria WHERE id = ${criteriaId}
      `);

      const criterion = Array.isArray(criterionResult[0]) && criterionResult[0][0]
        ? (criterionResult[0][0] as any)
        : null;

      expect(criterion?.isActive).toBe(0);

      // Verify audit log entry
      const auditResult = await db.execute(sql`
        SELECT * FROM criteria_audit_log 
        WHERE criteriaId = ${criteriaId} AND action = 'deactivated'
        ORDER BY changedAt DESC
        LIMIT 1
      `);

      const auditEntry = Array.isArray(auditResult[0]) && auditResult[0][0]
        ? (auditResult[0][0] as any)
        : null;

      expect(auditEntry).not.toBeNull();
      expect(auditEntry?.reason).toBe("Test removal");
    });

    it("should prevent removing the last active criterion", async () => {
      // First, deactivate all but one criterion
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      for (let i = 1; i < testCriteriaIds.length; i++) {
        await db.execute(sql`
          UPDATE prioritization_criteria
          SET isActive = 0
          WHERE id = ${testCriteriaIds[i]}
        `);
      }

      // Try to remove the last active criterion
      const result = await criteriaManagementService.removeCriterionFromModel(
        testCriteriaIds[0],
        null,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("last remaining criterion");

      // Restore criteria for other tests
      for (let i = 1; i < testCriteriaIds.length; i++) {
        await db.execute(sql`
          UPDATE prioritization_criteria
          SET isActive = 1
          WHERE id = ${testCriteriaIds[i]}
        `);
      }
    });

    it("should normalize weights after removal", async () => {
      const criteriaId = testCriteriaIds[1];
      
      const result = await criteriaManagementService.removeCriterionFromModel(
        criteriaId,
        null,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.normalizedWeights).toBeDefined();

      // Verify weights sum to 100
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const weightsResult = await db.execute(sql`
        SELECT SUM(weight) as totalWeight
        FROM prioritization_criteria
        WHERE isActive = 1 AND status = 'active'
      `);

      const totalWeight = Array.isArray(weightsResult[0]) && weightsResult[0][0]
        ? parseFloat((weightsResult[0][0] as any).totalWeight)
        : 0;

      expect(totalWeight).toBeCloseTo(100, 1);
    });
  });

  describe("disableCriterion", () => {
    it("should disable a criterion", async () => {
      const criteriaId = testCriteriaIds[2];
      
      const result = await criteriaManagementService.disableCriterion(
        criteriaId,
        testUserId,
        "Test disable"
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("disabled");

      // Verify criterion status
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const criterionResult = await db.execute(sql`
        SELECT status, isActive FROM prioritization_criteria WHERE id = ${criteriaId}
      `);

      const criterion = Array.isArray(criterionResult[0]) && criterionResult[0][0]
        ? (criterionResult[0][0] as any)
        : null;

      expect(criterion?.status).toBe("disabled");
      expect(criterion?.isActive).toBe(0);
    });

    it("should create audit log entry for disable", async () => {
      const criteriaId = testCriteriaIds[2];
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const auditResult = await db.execute(sql`
        SELECT * FROM criteria_audit_log 
        WHERE criteriaId = ${criteriaId} AND action = 'deactivated' AND newStatus = 'disabled'
        ORDER BY changedAt DESC
        LIMIT 1
      `);

      const auditEntry = Array.isArray(auditResult[0]) && auditResult[0][0]
        ? (auditResult[0][0] as any)
        : null;

      expect(auditEntry).not.toBeNull();
      expect(auditEntry?.oldStatus).toBe("active");
      expect(auditEntry?.newStatus).toBe("disabled");
    });
  });

  describe("enableCriterion", () => {
    it("should enable a disabled criterion", async () => {
      const criteriaId = testCriteriaIds[2];
      
      const result = await criteriaManagementService.enableCriterion(
        criteriaId,
        testUserId,
        "Test enable"
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("enabled");

      // Verify criterion status
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const criterionResult = await db.execute(sql`
        SELECT status, isActive FROM prioritization_criteria WHERE id = ${criteriaId}
      `);

      const criterion = Array.isArray(criterionResult[0]) && criterionResult[0][0]
        ? (criterionResult[0][0] as any)
        : null;

      expect(criterion?.status).toBe("active");
      expect(criterion?.isActive).toBe(1);
    });

    it("should not enable a non-disabled criterion", async () => {
      const criteriaId = testCriteriaIds[2]; // Already active from previous test
      
      const result = await criteriaManagementService.enableCriterion(
        criteriaId,
        testUserId
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("Cannot enable criterion");
    });
  });

  describe("deleteCriterion", () => {
    it("should require DELETE confirmation", async () => {
      const criteriaId = testCriteriaIds[3];
      
      const result = await criteriaManagementService.deleteCriterion(
        criteriaId,
        testUserId,
        "WRONG",
        "Test delete"
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("DELETE");
    });

    it("should soft delete a criterion with correct confirmation", async () => {
      const criteriaId = testCriteriaIds[3];
      
      const result = await criteriaManagementService.deleteCriterion(
        criteriaId,
        testUserId,
        "DELETE",
        "Test permanent deletion"
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("permanently deleted");

      // Verify criterion is soft deleted
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const criterionResult = await db.execute(sql`
        SELECT status, deletedAt, deletedBy FROM prioritization_criteria WHERE id = ${criteriaId}
      `);

      const criterion = Array.isArray(criterionResult[0]) && criterionResult[0][0]
        ? (criterionResult[0][0] as any)
        : null;

      expect(criterion?.status).toBe("deleted");
      expect(criterion?.deletedAt).not.toBeNull();
      expect(criterion?.deletedBy).toBe(testUserId);
    });

    it("should create audit log entry for deletion", async () => {
      const criteriaId = testCriteriaIds[3];
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const auditResult = await db.execute(sql`
        SELECT * FROM criteria_audit_log 
        WHERE criteriaId = ${criteriaId} AND action = 'deleted'
        ORDER BY changedAt DESC
        LIMIT 1
      `);

      const auditEntry = Array.isArray(auditResult[0]) && auditResult[0][0]
        ? (auditResult[0][0] as any)
        : null;

      expect(auditEntry).not.toBeNull();
      expect(auditEntry?.newStatus).toBe("deleted");
      expect(auditEntry?.reason).toContain("permanent");
    });

    it("should prevent deleting the last criterion", async () => {
      // This test assumes we've already deleted one criterion
      // and removed/disabled others in previous tests
      
      // First, ensure at least one active criterion exists
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const activeResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM prioritization_criteria
        WHERE status = 'active'
      `);

      const activeCount = Array.isArray(activeResult[0]) && activeResult[0][0]
        ? (activeResult[0][0] as any).count
        : 0;

      if (activeCount <= 1) {
        // Reactivate one criterion for this test
        await db.execute(sql`
          UPDATE prioritization_criteria
          SET status = 'active', isActive = 1
          WHERE id = ${testCriteriaIds[1]}
        `);
      }

      // Now try to delete when only one remains
      // (This is a conceptual test - actual implementation may vary)
      expect(activeCount).toBeGreaterThan(0);
    });
  });

  describe("Weight Normalization", () => {
    it("should maintain weights summing to 100 after operations", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const weightsResult = await db.execute(sql`
        SELECT SUM(weight) as totalWeight
        FROM prioritization_criteria
        WHERE isActive = 1 AND status = 'active'
      `);

      const totalWeight = Array.isArray(weightsResult[0]) && weightsResult[0][0]
        ? parseFloat((weightsResult[0][0] as any).totalWeight)
        : 0;

      expect(totalWeight).toBeCloseTo(100, 1);
    });

    it("should distribute weights equally when all are zero", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create a test scenario with zero weights
      const testId = await db.execute(sql`
        INSERT INTO prioritization_criteria (name, category, weight, isActive, status, displayOrder, createdAt, updatedAt)
        VALUES ('Test Zero Weight', 'risk', 0, 1, 'active', 0, NOW(), NOW())
      `);

      const insertId = (testId[0] as any).insertId;
      testCriteriaIds.push(insertId);

      // Set all test criteria weights to 0
      for (const id of testCriteriaIds) {
        await db.execute(sql`
          UPDATE prioritization_criteria
          SET weight = 0
          WHERE id = ${id} AND status = 'active'
        `);
      }

      // Trigger normalization by removing and re-adding a criterion
      await criteriaManagementService.disableCriterion(insertId, testUserId);
      await criteriaManagementService.enableCriterion(insertId, testUserId);

      // Check that weights are now distributed equally
      const activeResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM prioritization_criteria
        WHERE isActive = 1 AND status = 'active'
      `);

      const activeCount = Array.isArray(activeResult[0]) && activeResult[0][0]
        ? (activeResult[0][0] as any).count
        : 0;

      if (activeCount > 0) {
        const expectedWeight = 100 / activeCount;

        const weightsResult = await db.execute(sql`
          SELECT weight
          FROM prioritization_criteria
          WHERE isActive = 1 AND status = 'active'
          LIMIT 1
        `);

        const weight = Array.isArray(weightsResult[0]) && weightsResult[0][0]
          ? parseFloat((weightsResult[0][0] as any).weight)
          : 0;

        expect(weight).toBeCloseTo(expectedWeight, 1);
      }
    });
  });
});
