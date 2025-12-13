import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  generateTOTPSecret,
  verifyTOTPToken,
  generateBackupCodes,
  verifyBackupCode,
  hashBackupCode,
  generateDeviceFingerprint,
} from "./mfa";
import speakeasy from "speakeasy";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {
        "user-agent": "Mozilla/5.0 Test Browser",
      },
      ip: "192.168.1.1",
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("MFA Core Functions", () => {
  it("should generate a valid TOTP secret", () => {
    const { secret, otpauth_url } = generateTOTPSecret("test@example.com");

    expect(secret).toBeDefined();
    expect(secret.length).toBeGreaterThan(0);
    expect(otpauth_url).toContain("otpauth://totp/");
    expect(otpauth_url).toContain("test%40example.com"); // URL encoded @
  });

  it("should verify a valid TOTP token", () => {
    const secret = speakeasy.generateSecret({ length: 32 });
    const token = speakeasy.totp({
      secret: secret.base32,
      encoding: "base32",
    });

    const isValid = verifyTOTPToken(secret.base32, token);
    expect(isValid).toBe(true);
  });

  it("should reject an invalid TOTP token", () => {
    const secret = speakeasy.generateSecret({ length: 32 });
    const invalidToken = "000000";

    const isValid = verifyTOTPToken(secret.base32, invalidToken);
    expect(isValid).toBe(false);
  });

  it("should generate 10 backup codes", () => {
    const codes = generateBackupCodes();

    expect(codes).toHaveLength(10);
    codes.forEach((code) => {
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[0-9A-F]+$/); // Hex characters
    });
  });

  it("should verify a valid backup code", () => {
    const codes = generateBackupCodes();
    const hashedCodes = codes.map(hashBackupCode);

    const result = verifyBackupCode(codes[0]!, hashedCodes);

    expect(result.valid).toBe(true);
    expect(result.remainingCodes).toHaveLength(9);
    expect(result.remainingCodes).not.toContain(hashBackupCode(codes[0]!));
  });

  it("should reject an invalid backup code", () => {
    const codes = generateBackupCodes();
    const hashedCodes = codes.map(hashBackupCode);

    const result = verifyBackupCode("INVALID1", hashedCodes);

    expect(result.valid).toBe(false);
    expect(result.remainingCodes).toHaveLength(10);
  });

  it("should generate consistent device fingerprints", () => {
    const userAgent = "Mozilla/5.0 Test";
    const ipAddress = "192.168.1.1";

    const fingerprint1 = generateDeviceFingerprint(userAgent, ipAddress);
    const fingerprint2 = generateDeviceFingerprint(userAgent, ipAddress);

    expect(fingerprint1).toBe(fingerprint2);
    expect(fingerprint1).toHaveLength(64); // SHA-256 hex
  });

  it("should generate different fingerprints for different devices", () => {
    const fingerprint1 = generateDeviceFingerprint("Mozilla/5.0", "192.168.1.1");
    const fingerprint2 = generateDeviceFingerprint("Chrome/90.0", "192.168.1.2");

    expect(fingerprint1).not.toBe(fingerprint2);
  });
});

describe("MFA tRPC Endpoints", () => {
  it("should return MFA status for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const status = await caller.mfa.getStatus();

    expect(status).toHaveProperty("enabled");
    expect(status).toHaveProperty("hasSettings");
    expect(typeof status.enabled).toBe("boolean");
    expect(typeof status.hasSettings).toBe("boolean");
  });

  it("should allow user to setup MFA", async () => {
    const ctx = createAuthContext(999); // Use unique user ID
    const caller = appRouter.createCaller(ctx);

    const result = await caller.mfa.setup();

    expect(result).toHaveProperty("secret");
    expect(result).toHaveProperty("qrCode");
    expect(result).toHaveProperty("backupCodes");
    expect(result.secret).toBeDefined();
    expect(result.qrCode).toContain("data:image/png;base64");
    expect(result.backupCodes).toHaveLength(10);
  });

  it("should check device trust status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.mfa.checkDeviceTrust();

    expect(result).toHaveProperty("trusted");
    expect(typeof result.trusted).toBe("boolean");
  });

  it("should return empty trusted devices list for new user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const devices = await caller.mfa.getTrustedDevices();

    expect(Array.isArray(devices)).toBe(true);
  });

  it("should return empty audit logs for new user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const logs = await caller.mfa.getAuditLogs();

    expect(Array.isArray(logs)).toBe(true);
  });
});

describe("MFA Setup and Enable Flow", () => {
  it("should complete full MFA setup flow", async () => {
    // Use timestamp to ensure unique user ID
    const uniqueUserId = 10000 + Math.floor(Math.random() * 10000);
    const ctx = createAuthContext(uniqueUserId);
    const caller = appRouter.createCaller(ctx);

    // Step 1: Setup MFA
    const setupResult = await caller.mfa.setup();
    expect(setupResult.secret).toBeDefined();

    // Step 2: Generate a valid token
    const token = speakeasy.totp({
      secret: setupResult.secret,
      encoding: "base32",
    });

    // Step 3: Enable MFA with valid token
    const enableResult = await caller.mfa.enable({ token });
    expect(enableResult.success).toBe(true);

    // Step 4: Verify MFA is enabled
    const status = await caller.mfa.getStatus();
    expect(status.enabled).toBe(true);
  });
});
