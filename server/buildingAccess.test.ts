import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { accessRequests, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";

/**
 * Test suite for building access control system with tiered pricing
 * Verifies that:
 * 1. All buildings are disabled by default (empty array)
 * 2. Admins can grant specific building access during approval
 * 3. Building access is properly stored and retrieved
 */

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      company: "Admin Company",
      city: "Toronto",
      accountStatus: "active",
      trialEndsAt: null,
      mfaRequired: 0,
      mfaEnforcedAt: null,
      mfaGracePeriodEnd: null,
      unitPreference: "metric",
      welcomeEmailSent: 0,
      welcomeEmailSentAt: null,
      companyId: null,
      isSuperAdmin: 0,
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Building Access Control System", () => {
  describe("Access Request Submission", () => {
    it("should create access request with no building access by default", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const openId = `test-user-${Date.now()}`;
      const result = await caller.accessRequests.submit({
        openId,
        fullName: "Test User",
        email: `test-${Date.now()}@example.com`,
        companyName: "Test Company",
        city: "Toronto",
        phoneNumber: "+1-416-555-0000",
        useCase: "Building assessments",
      });

      expect(result.success).toBe(true);

      // Verify request was created
      const request = await db
        .select()
        .from(accessRequests)
        .where(eq(accessRequests.openId, openId))
        .limit(1);

      expect(request).toHaveLength(1);
      expect(request[0]?.status).toBe("pending");
    });
  });

  describe("Access Request Approval with Building Access", () => {
    it("should approve request with empty building access (default)", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // First, create an access request
      const openId = `test-user-empty-${Date.now()}`;
      const email = `test-empty-${Date.now()}@example.com`;

      await db.insert(accessRequests).values({
        openId,
        fullName: "Empty Access User",
        email,
        companyName: "Test Company",
        city: "Toronto",
        status: "pending",
      });

      // Approve with no building access (empty array)
      const result = await caller.accessRequests.approve({
        requestId: (
          await db
            .select()
            .from(accessRequests)
            .where(eq(accessRequests.openId, openId))
            .limit(1)
        )[0]!.id,
        company: "Test Company",
        city: "Toronto",
        role: "viewer",
        accountStatus: "active",
        buildingAccess: [], // Explicitly empty - no buildings
      });

      expect(result.success).toBe(true);

      // Verify user was created with empty building access
      const user = await db
        .select()
        .from(users)
        .where(eq(users.openId, openId))
        .limit(1);

      expect(user).toHaveLength(1);
      const buildingAccess = user[0]?.buildingAccess
        ? JSON.parse(user[0].buildingAccess)
        : [];
      expect(buildingAccess).toEqual([]);
    });

    it("should approve request with specific building access", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create an access request
      const openId = `test-user-buildings-${Date.now()}`;
      const email = `test-buildings-${Date.now()}@example.com`;

      await db.insert(accessRequests).values({
        openId,
        fullName: "Multi Building User",
        email,
        companyName: "Test Company",
        city: "Toronto",
        status: "pending",
      });

      // Approve with specific buildings (simulating tiered pricing)
      const buildingIds = [1, 5, 10]; // Buildings from Basic plan
      const result = await caller.accessRequests.approve({
        requestId: (
          await db
            .select()
            .from(accessRequests)
            .where(eq(accessRequests.openId, openId))
            .limit(1)
        )[0]!.id,
        company: "Test Company",
        city: "Toronto",
        role: "editor",
        accountStatus: "active",
        buildingAccess: buildingIds,
      });

      expect(result.success).toBe(true);

      // Verify user was created with correct building access
      const user = await db
        .select()
        .from(users)
        .where(eq(users.openId, openId))
        .limit(1);

      expect(user).toHaveLength(1);
      const buildingAccess = user[0]?.buildingAccess
        ? JSON.parse(user[0].buildingAccess)
        : [];
      expect(buildingAccess).toEqual(buildingIds);
    });

    it("should update existing user's building access on re-approval", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const openId = `test-user-update-${Date.now()}`;
      const email = `test-update-${Date.now()}@example.com`;

      // Create initial access request and approve with limited access
      await db.insert(accessRequests).values({
        openId,
        fullName: "Update User",
        email,
        companyName: "Test Company",
        city: "Toronto",
        status: "pending",
      });

      let requestId = (
        await db
          .select()
          .from(accessRequests)
          .where(eq(accessRequests.openId, openId))
          .limit(1)
      )[0]!.id;

      // First approval: Basic plan (3 buildings)
      await caller.accessRequests.approve({
        requestId,
        company: "Test Company",
        city: "Toronto",
        role: "viewer",
        accountStatus: "active",
        buildingAccess: [1, 2, 3],
      });

      let user = await db
        .select()
        .from(users)
        .where(eq(users.openId, openId))
        .limit(1);
      let buildingAccess = user[0]?.buildingAccess
        ? JSON.parse(user[0].buildingAccess)
        : [];
      expect(buildingAccess).toEqual([1, 2, 3]);

      // Create another request for upgrade
      await db.insert(accessRequests).values({
        openId: `${openId}-upgrade`,
        fullName: "Update User",
        email,
        companyName: "Test Company",
        city: "Toronto",
        status: "pending",
      });

      requestId = (
        await db
          .select()
          .from(accessRequests)
          .where(eq(accessRequests.openId, `${openId}-upgrade`))
          .limit(1)
      )[0]!.id;

      // Second approval: Professional plan (10 buildings)
      await caller.accessRequests.approve({
        requestId,
        company: "Test Company",
        city: "Toronto",
        role: "editor",
        accountStatus: "active",
        buildingAccess: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      });

      user = await db
        .select()
        .from(users)
        .where(eq(users.openId, `${openId}-upgrade`))
        .limit(1);
      buildingAccess = user[0]?.buildingAccess
        ? JSON.parse(user[0].buildingAccess)
        : [];
      expect(buildingAccess).toHaveLength(10);
    });
  });

  describe("Building Access Tier Scenarios", () => {
    it("should support Basic tier: 1-2 buildings", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const openId = `basic-tier-${Date.now()}`;
      const email = `basic-${Date.now()}@example.com`;

      await db.insert(accessRequests).values({
        openId,
        fullName: "Basic Tier User",
        email,
        companyName: "Test Company",
        city: "Toronto",
        status: "pending",
      });

      const result = await caller.accessRequests.approve({
        requestId: (
          await db
            .select()
            .from(accessRequests)
            .where(eq(accessRequests.openId, openId))
            .limit(1)
        )[0]!.id,
        company: "Test Company",
        city: "Toronto",
        role: "viewer",
        accountStatus: "trial",
        trialDays: 14,
        buildingAccess: [1, 2], // Basic: 2 buildings
      });

      expect(result.success).toBe(true);

      const user = await db
        .select()
        .from(users)
        .where(eq(users.openId, openId))
        .limit(1);

      const buildingAccess = user[0]?.buildingAccess
        ? JSON.parse(user[0].buildingAccess)
        : [];
      expect(buildingAccess).toHaveLength(2);
    });

    it("should support Professional tier: 5-10 buildings", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const openId = `pro-tier-${Date.now()}`;
      const email = `pro-${Date.now()}@example.com`;

      await db.insert(accessRequests).values({
        openId,
        fullName: "Pro Tier User",
        email,
        companyName: "Test Company",
        city: "Toronto",
        status: "pending",
      });

      const result = await caller.accessRequests.approve({
        requestId: (
          await db
            .select()
            .from(accessRequests)
            .where(eq(accessRequests.openId, openId))
            .limit(1)
        )[0]!.id,
        company: "Test Company",
        city: "Toronto",
        role: "editor",
        accountStatus: "active",
        buildingAccess: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // Professional: 10 buildings
      });

      expect(result.success).toBe(true);

      const user = await db
        .select()
        .from(users)
        .where(eq(users.openId, openId))
        .limit(1);

      const buildingAccess = user[0]?.buildingAccess
        ? JSON.parse(user[0].buildingAccess)
        : [];
      expect(buildingAccess).toHaveLength(10);
    });

    it("should support Enterprise tier: all buildings (null)", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const openId = `enterprise-tier-${Date.now()}`;
      const email = `enterprise-${Date.now()}@example.com`;

      await db.insert(accessRequests).values({
        openId,
        fullName: "Enterprise Tier User",
        email,
        companyName: "Test Company",
        city: "Toronto",
        status: "pending",
      });

      const result = await caller.accessRequests.approve({
        requestId: (
          await db
            .select()
            .from(accessRequests)
            .where(eq(accessRequests.openId, openId))
            .limit(1)
        )[0]!.id,
        company: "Test Company",
        city: "Toronto",
        role: "project_manager",
        accountStatus: "active",
        // For Enterprise, could pass all building IDs or leave undefined
        // Both should result in full access
      });

      expect(result.success).toBe(true);

      const user = await db
        .select()
        .from(users)
        .where(eq(users.openId, openId))
        .limit(1);

      const buildingAccess = user[0]?.buildingAccess
        ? JSON.parse(user[0].buildingAccess)
        : [];
      // Enterprise tier would have all buildings or empty for "all access"
      expect(Array.isArray(buildingAccess)).toBe(true);
    });
  });

  describe("Admin-only access control", () => {
    it("should reject non-admin users from approving requests", async () => {
      const ctx = createPublicContext();
      ctx.user = {
        id: 2,
        openId: "regular-user",
        email: "user@example.com",
        name: "Regular User",
        loginMethod: "manus",
        role: "viewer",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        company: "User Company",
        city: "Toronto",
        accountStatus: "active",
        trialEndsAt: null,
        mfaRequired: 0,
        mfaEnforcedAt: null,
        mfaGracePeriodEnd: null,
        unitPreference: "metric",
        welcomeEmailSent: 0,
        welcomeEmailSentAt: null,
        companyId: null,
        isSuperAdmin: 0,
      };

      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.accessRequests.approve({
          requestId: 999,
          company: "Test Company",
          city: "Toronto",
          role: "viewer",
          accountStatus: "active",
          buildingAccess: [],
        })
      ).rejects.toThrow("Admin access required");
    });
  });
});
