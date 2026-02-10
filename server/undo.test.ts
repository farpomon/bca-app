import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { users, bulkOperationHistory, bulkOperationSnapshots } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("Undo Functionality", () => {
  it("should capture snapshot and allow undo for bulk delete", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Create test users with unique openIds
    const ts = Date.now();
    const testUser1 = await database.insert(users).values({
      openId: `test-undo-${ts}-1`,
      name: "Test User 1",
      email: `test-undo-${ts}-1@example.com`,
      role: "user",
      accountStatus: "active",
    });
    const userId1 = testUser1[0].insertId;
    const testUser2 = await database.insert(users).values({
      openId: `test-undo-${ts}-2`,
      name: "Test User 2",
      email: `test-undo-${ts}-2@example.com`,
      role: "user",
      accountStatus: "active",
    });
    const userId2 = testUser2[0].insertId;

    // Perform bulk delete
    const deleteResult = await caller.admin.bulkDeleteUsers({
      userIds: [userId1, userId2],
    });

    expect(deleteResult.success).toBe(true);
    expect(deleteResult.successCount).toBe(2);
    expect(deleteResult.operationId).toBeDefined();

    // Verify users are deleted
    const deletedUsers = await database
      .select()
      .from(users)
      .where(eq(users.id, userId1));
    expect(deletedUsers.length).toBe(0);

    // Get undoable operations
    const undoableOps = await caller.undo.listUndoable();
    expect(undoableOps.length).toBeGreaterThan(0);
    const operation = undoableOps.find((op) => op.id === deleteResult.operationId);
    expect(operation).toBeDefined();
    expect(operation?.operationType).toBe("delete_users");

    // Perform undo
    const undoResult = await caller.undo.undo({
      operationId: deleteResult.operationId!,
    });

    expect(undoResult.success).toBe(true);
    expect(undoResult.restoredCount).toBe(2);

    // Verify users are restored
    const restoredUsers = await database
      .select()
      .from(users)
      .where(eq(users.id, userId1));
    expect(restoredUsers.length).toBe(1);
    expect(restoredUsers[0]?.name).toBe("Test User 1");

    // Cleanup
    await database.delete(users).where(eq(users.id, userId1));
    await database.delete(users).where(eq(users.id, userId2));
    if (deleteResult.operationId) {
      await database
        .delete(bulkOperationSnapshots)
        .where(eq(bulkOperationSnapshots.operationId, deleteResult.operationId));
      await database
        .delete(bulkOperationHistory)
        .where(eq(bulkOperationHistory.id, deleteResult.operationId));
    }
  });

  it("should prevent undo of already undone operation", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Create test user
    const testUser = await database.insert(users).values({
      openId: `test-user-undo-twice-${Date.now()}`,
      name: "Test User",
      email: "test@example.com",
      role: "user",
      accountStatus: "active",
    });

    const userId = testUser[0].insertId;

    // Perform bulk delete
    const deleteResult = await caller.admin.bulkDeleteUsers({
      userIds: [userId],
    });

    expect(deleteResult.operationId).toBeDefined();

    // First undo
    const firstUndo = await caller.undo.undo({
      operationId: deleteResult.operationId!,
    });
    expect(firstUndo.success).toBe(true);

    // Second undo should fail
    const secondUndo = await caller.undo.undo({
      operationId: deleteResult.operationId!,
    });
    expect(secondUndo.success).toBe(false);
    expect(secondUndo.message).toContain("already undone");

    // Cleanup
    await database.delete(users).where(eq(users.id, userId));
    if (deleteResult.operationId) {
      await database
        .delete(bulkOperationSnapshots)
        .where(eq(bulkOperationSnapshots.operationId, deleteResult.operationId));
      await database
        .delete(bulkOperationHistory)
        .where(eq(bulkOperationHistory.id, deleteResult.operationId));
    }
  });

  it("should handle bulk suspend with undo", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Create test user
    const testUser = await database.insert(users).values({
      openId: `test-user-suspend-${Date.now()}`,
      name: "Test User Suspend",
      email: "suspend@example.com",
      role: "user",
      accountStatus: "active",
    });

    const userId = testUser[0].insertId;

    // Perform bulk suspend
    const suspendResult = await caller.admin.bulkSuspendUsers({
      userIds: [userId],
      reason: "Test suspension",
    });

    expect(suspendResult.success).toBe(true);
    expect(suspendResult.operationId).toBeDefined();

    // Verify user is suspended
    const [suspendedUser] = await database
      .select()
      .from(users)
      .where(eq(users.id, userId));
    expect(suspendedUser?.accountStatus).toBe("suspended");

    // Undo suspension
    const undoResult = await caller.undo.undo({
      operationId: suspendResult.operationId!,
    });

    expect(undoResult.success).toBe(true);

    // Verify user is restored to active
    const [restoredUser] = await database
      .select()
      .from(users)
      .where(eq(users.id, userId));
    expect(restoredUser?.accountStatus).toBe("active");

    // Cleanup
    await database.delete(users).where(eq(users.id, userId));
    if (suspendResult.operationId) {
      await database
        .delete(bulkOperationSnapshots)
        .where(eq(bulkOperationSnapshots.operationId, suspendResult.operationId));
      await database
        .delete(bulkOperationHistory)
        .where(eq(bulkOperationHistory.id, suspendResult.operationId));
    }
  });
});
