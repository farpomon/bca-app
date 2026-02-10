/**
 * MFA Method Switching and Recovery Tests
 * Tests for both method switching and recovery flow features
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { userMfaSettings, mfaMethodSwitchRequests, mfaRecoveryRequests } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { encryptSecret, getMfaEncryptionKey } from "./mfa";

// Mock email sending
vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn().mockResolvedValue([{ statusCode: 202 }]),
  },
}));
vi.mock('./_core/email', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(true),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1, role: "admin" | "user" = "user"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `user${userId}@test.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("MFA Method Switching", () => {
  let testUserId: number;

  beforeEach(async () => {
    // Create a test user with MFA enabled
    testUserId = 999; // Use a high ID to avoid conflicts

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Clean up any existing test data
    await db.delete(mfaMethodSwitchRequests).where(eq(mfaMethodSwitchRequests.userId, testUserId));
    await db.delete(userMfaSettings).where(eq(userMfaSettings.userId, testUserId));
    // Also clean up the "no MFA" test user
    await db.delete(mfaMethodSwitchRequests).where(eq(mfaMethodSwitchRequests.userId, testUserId + 1));
    await db.delete(userMfaSettings).where(eq(userMfaSettings.userId, testUserId + 1));

    // Create MFA settings for test user with properly encrypted secret
    const encryptionKey = getMfaEncryptionKey();
    const encryptedSecret = encryptSecret("TEST_SECRET", encryptionKey);
    await db.insert(userMfaSettings).values({
      userId: testUserId,
      secret: encryptedSecret,
      enabled: 1,
      mfaMethod: "totp",
      backupCodes: JSON.stringify([]),
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });
  });

  it("should initiate method switch from TOTP to email", async () => {
    const { ctx } = createAuthContext(testUserId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.mfaMethodSwitch.initiateSwitch({
      newMethod: "email",
    });

    expect(result.success).toBe(undefined); // No success field, but should not throw
    expect(result.requestId).toBeTypeOf("number");
    expect(result.currentMethod).toBe("totp");
    expect(result.newMethod).toBe("email");
    expect(result.expiresInMinutes).toBe(30);
  });

  it("should fail to initiate switch if MFA is not enabled", async () => {
    const newUserId = testUserId + 1;
    const { ctx } = createAuthContext(newUserId);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.mfaMethodSwitch.initiateSwitch({ newMethod: "email" })
    ).rejects.toThrow("MFA must be enabled");
  });

  it("should fail to switch to the same method", async () => {
    const { ctx } = createAuthContext(testUserId);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.mfaMethodSwitch.initiateSwitch({ newMethod: "totp" })
    ).rejects.toThrow("already using this MFA method");
  });

  it("should get pending switch request", async () => {
    const { ctx } = createAuthContext(testUserId);
    const caller = appRouter.createCaller(ctx);

    // Initiate a switch
    await caller.mfaMethodSwitch.initiateSwitch({ newMethod: "email" });

    // Get pending request
    const pending = await caller.mfaMethodSwitch.getPendingSwitch();

    expect(pending).not.toBeNull();
    expect(pending?.currentMethod).toBe("totp");
    expect(pending?.newMethod).toBe("email");
    expect(pending?.newMethodVerified).toBe(false);
  });

  it("should cancel pending switch request", async () => {
    const { ctx } = createAuthContext(testUserId);
    const caller = appRouter.createCaller(ctx);

    // Initiate a switch
    await caller.mfaMethodSwitch.initiateSwitch({ newMethod: "email" });

    // Cancel the switch
    const result = await caller.mfaMethodSwitch.cancelSwitch();

    expect(result.success).toBe(true);
    expect(result.message).toBe("Switch request cancelled");

    // Verify no pending request
    const pending = await caller.mfaMethodSwitch.getPendingSwitch();
    expect(pending).toBeNull();
  });
});

describe("MFA Recovery Flow", () => {
  let testUserId: number;

  beforeEach(async () => {
    testUserId = 998; // Different from method switch tests

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Clean up any existing test data
    await db.delete(mfaRecoveryRequests).where(eq(mfaRecoveryRequests.userId, testUserId));
    await db.delete(userMfaSettings).where(eq(userMfaSettings.userId, testUserId));
    // Also clean up the "no MFA" test user
    await db.delete(mfaRecoveryRequests).where(eq(mfaRecoveryRequests.userId, testUserId + 1));
    await db.delete(userMfaSettings).where(eq(userMfaSettings.userId, testUserId + 1));

    // Create MFA settings for test user with properly encrypted secret
    const encryptionKey = getMfaEncryptionKey();
    const encryptedSecret = encryptSecret("TEST_SECRET", encryptionKey);
    await db.insert(userMfaSettings).values({
      userId: testUserId,
      secret: encryptedSecret,
      enabled: 1,
      mfaMethod: "totp",
      backupCodes: JSON.stringify([]),
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });
  });

  it("should submit a recovery request", async () => {
    const { ctx } = createAuthContext(testUserId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.mfaRecovery.submitRequest({
      reason: "Lost my phone with authenticator app",
      identityVerification: {
        email: "user@test.com",
        lastLoginDate: "2025-12-10",
        recentActivity: "Created a project yesterday",
      },
    });

    expect(result.success).toBe(true);
    expect(result.requestId).toBeTypeOf("number");
    expect(result.message).toContain("24-48 hours");
  });

  it("should fail to submit recovery request if MFA is not enabled", async () => {
    const newUserId = testUserId + 1;
    const { ctx } = createAuthContext(newUserId);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.mfaRecovery.submitRequest({
        reason: "Lost my phone",
        identityVerification: {},
      })
    ).rejects.toThrow("MFA is not enabled");
  });

  it("should fail to submit duplicate recovery request", async () => {
    const { ctx } = createAuthContext(testUserId);
    const caller = appRouter.createCaller(ctx);

    // Submit first request
    await caller.mfaRecovery.submitRequest({
      reason: "Lost my phone with authenticator app",
      identityVerification: {},
    });

    // Try to submit second request
    await expect(
      caller.mfaRecovery.submitRequest({
        reason: "Still lost my phone",
        identityVerification: {},
      })
    ).rejects.toThrow("already have a pending recovery request");
  });

  it("should get user's pending recovery request", async () => {
    const { ctx } = createAuthContext(testUserId);
    const caller = appRouter.createCaller(ctx);

    // Submit request
    await caller.mfaRecovery.submitRequest({
      reason: "Lost my phone",
      identityVerification: {},
    });

    // Get request
    const request = await caller.mfaRecovery.getMyRequest();

    expect(request).not.toBeNull();
    expect(request?.reason).toBe("Lost my phone");
    expect(request?.status).toBe("pending");
  });

  it("should allow admin to approve recovery request", async () => {
    const { ctx: userCtx } = createAuthContext(testUserId, "user");
    const { ctx: adminCtx } = createAuthContext(1, "admin");

    const userCaller = appRouter.createCaller(userCtx);
    const adminCaller = appRouter.createCaller(adminCtx);

    // User submits request
    const submitResult = await userCaller.mfaRecovery.submitRequest({
      reason: "Lost my phone",
      identityVerification: {},
    });

    // Admin approves request
    const approveResult = await adminCaller.mfaRecovery.approveRequest({
      requestId: submitResult.requestId,
      adminNotes: "Verified via email",
    });

    expect(approveResult.success).toBe(true);
    expect(approveResult.recoveryCode).toBeTypeOf("string");
    expect(approveResult.recoveryCode?.length).toBe(32);
  });

  it("should allow admin to reject recovery request", async () => {
    const { ctx: userCtx } = createAuthContext(testUserId, "user");
    const { ctx: adminCtx } = createAuthContext(1, "admin");

    const userCaller = appRouter.createCaller(userCtx);
    const adminCaller = appRouter.createCaller(adminCtx);

    // User submits request
    const submitResult = await userCaller.mfaRecovery.submitRequest({
      reason: "Lost my phone",
      identityVerification: {},
    });

    // Admin rejects request
    const rejectResult = await adminCaller.mfaRecovery.rejectRequest({
      requestId: submitResult.requestId,
      rejectionReason: "Unable to verify identity",
      adminNotes: "Suspicious request",
    });

    expect(rejectResult.success).toBe(true);
    expect(rejectResult.message).toBe("Recovery request rejected");
  });

  it("should fail admin operations for non-admin users", async () => {
    const { ctx } = createAuthContext(testUserId, "user");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.mfaRecovery.getPendingRequests()
    ).rejects.toThrow("Admin access required");

    await expect(
      caller.mfaRecovery.approveRequest({ requestId: 1 })
    ).rejects.toThrow("Admin access required");

    await expect(
      caller.mfaRecovery.rejectRequest({
        requestId: 1,
        rejectionReason: "Test",
      })
    ).rejects.toThrow("Admin access required");
  });
});
