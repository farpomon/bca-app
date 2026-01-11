import { describe, expect, it, beforeEach } from "vitest";
import { logAuditEvent } from "./auditLog";
import { getDb } from "./db";
import { auditLogs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import type { User } from "../drizzle/schema";

describe("Audit Logging", () => {
  const mockUser: User = {
    id: 1,
    openId: "test-user",
    name: "Test User",
    email: "test@example.com",
    loginMethod: "manus",
    role: "admin",
    companyId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    accountStatus: "active",
    mfaEnabled: 0,
    mfaSecret: null,
    mfaBackupCodes: null,
    mfaTimeRestrictionEnabled: 0,
    mfaTimeRestrictionStart: null,
    mfaTimeRestrictionEnd: null,
  };

  it("should create audit log for create action", async () => {
    const result = await logAuditEvent({
      user: mockUser,
      actionType: "create",
      entityType: "project",
      entityId: 123,
      entityName: "Test Project",
      changesSummary: "Created new project",
      status: "success",
    });

    expect(result.success).toBe(true);
    
    // Verify log was created in database
    const db = await getDb();
    if (db) {
      const logs = await db.select()
        .from(auditLogs)
        .where(eq(auditLogs.entityId, 123))
        .limit(1);
      
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].actionType).toBe("create");
      expect(logs[0].entityType).toBe("project");
      expect(logs[0].status).toBe("success");
    }
  });

  it("should create audit log for update action with before/after state", async () => {
    const beforeState = { name: "Old Name", status: "active" };
    const afterState = { name: "New Name", status: "active" };

    const result = await logAuditEvent({
      user: mockUser,
      actionType: "update",
      entityType: "asset",
      entityId: 456,
      entityName: "Test Asset",
      beforeState,
      afterState,
      changesSummary: "Updated asset name",
      status: "success",
    });

    expect(result.success).toBe(true);

    // Verify before/after state was stored
    const db = await getDb();
    if (db) {
      const logs = await db.select()
        .from(auditLogs)
        .where(eq(auditLogs.entityId, 456))
        .limit(1);
      
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].beforeState).toBeTruthy();
      expect(logs[0].afterState).toBeTruthy();
      
      const before = JSON.parse(logs[0].beforeState || "{}");
      const after = JSON.parse(logs[0].afterState || "{}");
      
      expect(before.name).toBe("Old Name");
      expect(after.name).toBe("New Name");
    }
  });

  it("should create audit log for delete action", async () => {
    const result = await logAuditEvent({
      user: mockUser,
      actionType: "delete",
      entityType: "deficiency",
      entityId: 789,
      entityName: "Test Deficiency",
      changesSummary: "Deleted deficiency",
      status: "success",
    });

    expect(result.success).toBe(true);
  });

  it("should create audit log for failed action", async () => {
    const result = await logAuditEvent({
      user: mockUser,
      actionType: "update",
      entityType: "project",
      entityId: 999,
      entityName: "Test Project",
      changesSummary: "Failed to update project",
      status: "failed",
      errorMessage: "Database connection error",
    });

    expect(result.success).toBe(true);

    // Verify error was stored
    const db = await getDb();
    if (db) {
      const logs = await db.select()
        .from(auditLogs)
        .where(eq(auditLogs.entityId, 999))
        .limit(1);
      
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].status).toBe("failed");
      expect(logs[0].errorMessage).toBeTruthy();
    }
  });

  it("should create audit log for bulk operations", async () => {
    const result = await logAuditEvent({
      user: mockUser,
      actionType: "bulk_delete",
      entityType: "assessment",
      changesSummary: "Deleted 5 assessments",
      status: "success",
      metadata: {
        deletedCount: 5,
        deletedIds: [1, 2, 3, 4, 5],
      },
    });

    expect(result.success).toBe(true);

    // Verify metadata was stored
    const db = await getDb();
    if (db) {
      const logs = await db.select()
        .from(auditLogs)
        .where(eq(auditLogs.actionType, "bulk_delete"))
        .limit(1);
      
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].metadata).toBeTruthy();
      
      const metadata = JSON.parse(logs[0].metadata || "{}");
      expect(metadata.deletedCount).toBe(5);
      expect(metadata.deletedIds).toHaveLength(5);
    }
  });
});
