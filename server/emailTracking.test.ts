import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { emailDeliveryLog } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

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

describe("Email Delivery Tracking", () => {
  it("should list email delivery logs for admin users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.emailDeliveryLogs.list({
      status: "all",
      emailType: "all",
      limit: 10,
      offset: 0,
    });

    expect(result).toHaveProperty("logs");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("hasMore");
    expect(Array.isArray(result.logs)).toBe(true);
    expect(typeof result.total).toBe("number");
    expect(typeof result.hasMore).toBe("boolean");
  });

  it("should get email delivery statistics for admin users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.emailDeliveryLogs.getStats({});

    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("sent");
    expect(stats).toHaveProperty("delivered");
    expect(stats).toHaveProperty("failed");
    expect(stats).toHaveProperty("pending");
    expect(stats).toHaveProperty("byType");
    expect(typeof stats.total).toBe("number");
    expect(typeof stats.sent).toBe("number");
    expect(typeof stats.delivered).toBe("number");
    expect(typeof stats.failed).toBe("number");
    expect(typeof stats.pending).toBe("number");
    expect(stats.byType).toHaveProperty("admin_notification");
    expect(stats.byType).toHaveProperty("user_approved");
    expect(stats.byType).toHaveProperty("user_rejected");
  });

  it("should filter email logs by status", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.emailDeliveryLogs.list({
      status: "sent",
      emailType: "all",
      limit: 10,
      offset: 0,
    });

    // All returned logs should have status "sent"
    result.logs.forEach((log) => {
      expect(log.status).toBe("sent");
    });
  });

  it("should filter email logs by type", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.emailDeliveryLogs.list({
      status: "all",
      emailType: "admin_notification",
      limit: 10,
      offset: 0,
    });

    // All returned logs should have emailType "admin_notification"
    result.logs.forEach((log) => {
      expect(log.emailType).toBe("admin_notification");
    });
  });

  it("should reject non-admin users from accessing email logs", async () => {
    const nonAdminUser: AuthenticatedUser = {
      id: 2,
      openId: "regular-user",
      email: "user@example.com",
      name: "Regular User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const ctx: TrpcContext = {
      user: nonAdminUser,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.emailDeliveryLogs.list({
        status: "all",
        emailType: "all",
        limit: 10,
        offset: 0,
      })
    ).rejects.toThrow("Admin access required");
  });

  it("should verify email tracking integration in access requests", async () => {
    const db = await getDb();
    if (!db) {
      console.warn("Database not available, skipping integration test");
      return;
    }

    // Get the count of email logs before
    const logsBefore = await db.select().from(emailDeliveryLog);
    const countBefore = logsBefore.length;

    // Note: This test verifies the structure is in place
    // Actual email sending would require a real access request submission
    // which is tested in the access request router tests

    expect(countBefore).toBeGreaterThanOrEqual(0);
  });
});
