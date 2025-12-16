import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    accountStatus: "active",
    trialEndsAt: null,
    company: "Test Company",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    mfaRequired: 0,
    mfaEnforcedAt: null,
    mfaGracePeriodEnd: null,
    isRenewable: 0,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createTrialUserContext(daysRemaining: number): TrpcContext {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + daysRemaining);
  
  const user: AuthenticatedUser = {
    id: 2,
    openId: "trial-user",
    email: "trial@example.com",
    name: "Trial User",
    loginMethod: "manus",
    role: "editor",
    accountStatus: "trial",
    trialEndsAt: trialEndsAt.toISOString(),
    company: "Test Company",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    mfaRequired: 0,
    mfaEnforcedAt: null,
    mfaGracePeriodEnd: null,
    isRenewable: 0,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createSuspendedUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 3,
    openId: "suspended-user",
    email: "suspended@example.com",
    name: "Suspended User",
    loginMethod: "manus",
    role: "editor",
    accountStatus: "suspended",
    trialEndsAt: null,
    company: "Test Company",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    mfaRequired: 0,
    mfaEnforcedAt: null,
    mfaGracePeriodEnd: null,
    isRenewable: 0,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Trial Expiration Middleware", () => {
  describe("Active trial user", () => {
    it("should allow access for user with active trial via auth.me", async () => {
      const { appRouter } = await import("./routers");
      const ctx = createTrialUserContext(30); // 30 days remaining
      const caller = appRouter.createCaller(ctx);
      
      // auth.me is a public procedure that should work
      const result = await caller.auth.me();
      expect(result).toBeDefined();
      expect(result?.accountStatus).toBe("trial");
    });
  });

  describe("Expired trial user", () => {
    it("should block access for user with expired trial on protected routes", async () => {
      const { appRouter } = await import("./routers");
      const ctx = createTrialUserContext(-1); // Expired 1 day ago
      const caller = appRouter.createCaller(ctx);
      
      // Protected procedures should throw for expired trial
      await expect(caller.projects.list()).rejects.toThrow(
        "Your trial period has expired"
      );
    });
  });

  describe("Suspended user", () => {
    it("should block access for suspended user on protected routes", async () => {
      const { appRouter } = await import("./routers");
      const ctx = createSuspendedUserContext();
      const caller = appRouter.createCaller(ctx);
      
      // Protected procedures should throw for suspended users
      await expect(caller.projects.list()).rejects.toThrow(
        "Your account has been suspended"
      );
    });
  });
});

describe("Admin context validation", () => {
  it("should create valid admin context", () => {
    const ctx = createAdminContext();
    expect(ctx.user).toBeDefined();
    expect(ctx.user?.role).toBe("admin");
    expect(ctx.user?.accountStatus).toBe("active");
  });

  it("should create valid trial user context", () => {
    const ctx = createTrialUserContext(30);
    expect(ctx.user).toBeDefined();
    expect(ctx.user?.accountStatus).toBe("trial");
    expect(ctx.user?.trialEndsAt).toBeDefined();
  });

  it("should create valid suspended user context", () => {
    const ctx = createSuspendedUserContext();
    expect(ctx.user).toBeDefined();
    expect(ctx.user?.accountStatus).toBe("suspended");
  });
});
