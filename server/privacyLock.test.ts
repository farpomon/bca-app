import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

// Mock ENV
vi.mock("./_core/env", () => ({
  ENV: {
    ownerOpenId: "owner-open-id",
  },
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    company: "Test Company",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("privacyLock router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStatus", () => {
    it("should return privacy lock status for a company", async () => {
      const { getDb } = await import("./db");
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { privacyLockEnabled: 1, name: "Test Company" }
        ]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.privacyLock.getStatus({ companyId: 1 });

      expect(result).toEqual({
        companyId: 1,
        companyName: "Test Company",
        privacyLockEnabled: true,
      });
    });

    it("should throw NOT_FOUND for non-existent company", async () => {
      const { getDb } = await import("./db");
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.privacyLock.getStatus({ companyId: 999 }))
        .rejects.toThrow("Company not found");
    });
  });

  describe("generateAccessCode", () => {
    it("should generate access code for company admin", async () => {
      const { getDb } = await import("./db");
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { id: 1, name: "Test Company" }
        ]),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockResolvedValue({}),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const ctx = createMockContext({ company: "Test Company" });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.privacyLock.generateAccessCode({ companyId: 1 });

      expect(result.code).toBeDefined();
      expect(result.code.length).toBe(12);
      expect(result.expiresIn).toBe("1 hour");
      expect(result.expiresAt).toBeDefined();
    });

    it("should reject site owner from generating access codes", async () => {
      const { getDb } = await import("./db");
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { id: 1, name: "Other Company" }
        ]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Site owner context
      const ctx = createMockContext({ 
        openId: "owner-open-id",
        company: "Owner Company" 
      });
      const caller = appRouter.createCaller(ctx);

      await expect(caller.privacyLock.generateAccessCode({ companyId: 1 }))
        .rejects.toThrow("Site owner cannot generate access codes for themselves");
    });

    it("should reject user from generating code for other company", async () => {
      const { getDb } = await import("./db");
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { id: 1, name: "Other Company" }
        ]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const ctx = createMockContext({ company: "My Company" });
      const caller = appRouter.createCaller(ctx);

      await expect(caller.privacyLock.generateAccessCode({ companyId: 1 }))
        .rejects.toThrow("You can only generate access codes for your own company");
    });
  });

  describe("verifyAccessCode", () => {
    it("should reject non-owner from using access codes", async () => {
      const { getDb } = await import("./db");
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const ctx = createMockContext({ openId: "regular-user" });
      const caller = appRouter.createCaller(ctx);

      await expect(caller.privacyLock.verifyAccessCode({ companyId: 1, code: "TEST123" }))
        .rejects.toThrow("Only site owner can use access codes");
    });

    it("should reject invalid access code", async () => {
      const { getDb } = await import("./db");
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Site owner context
      const ctx = createMockContext({ openId: "owner-open-id" });
      const caller = appRouter.createCaller(ctx);

      await expect(caller.privacyLock.verifyAccessCode({ companyId: 1, code: "INVALID" }))
        .rejects.toThrow("Invalid or expired access code");
    });

    it("should verify valid access code for site owner", async () => {
      const { getDb } = await import("./db");
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { 
            id: 1, 
            companyId: 1, 
            code: "VALIDCODE123",
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            usedBy: null 
          }
        ]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Site owner context
      const ctx = createMockContext({ openId: "owner-open-id" });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.privacyLock.verifyAccessCode({ 
        companyId: 1, 
        code: "VALIDCODE123" 
      });

      expect(result.success).toBe(true);
      expect(result.companyId).toBe(1);
      expect(result.accessGrantedUntil).toBeDefined();
    });
  });

  describe("checkOwnerAccess", () => {
    it("should return hasAccess true for non-owner users", async () => {
      const { getDb } = await import("./db");
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const ctx = createMockContext({ openId: "regular-user" });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.privacyLock.checkOwnerAccess({ companyId: 1 });

      expect(result.needsAccessCode).toBe(false);
      expect(result.hasAccess).toBe(true);
    });

    it("should return needsAccessCode true for owner accessing locked company", async () => {
      const { getDb } = await import("./db");
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn()
          .mockResolvedValueOnce([{ privacyLockEnabled: 1, name: "Other Company" }]) // company query
          .mockResolvedValueOnce([]), // access codes query
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Site owner context
      const ctx = createMockContext({ 
        openId: "owner-open-id",
        company: "Owner Company"
      });
      const caller = appRouter.createCaller(ctx);

      const result = await caller.privacyLock.checkOwnerAccess({ companyId: 1 });

      expect(result.needsAccessCode).toBe(true);
      expect(result.hasAccess).toBe(false);
    });
  });
});
