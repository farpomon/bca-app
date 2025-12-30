import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db functions
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    updateUserUnitPreference: vi.fn().mockResolvedValue(undefined),
    getUserUnitPreference: vi.fn().mockResolvedValue("metric"),
  };
});

import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
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

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("settings router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateUnitPreference", () => {
    it("should update unit preference to metric", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.settings.updateUnitPreference({ 
        unitPreference: "metric" 
      });

      expect(result).toEqual({ success: true, unitPreference: "metric" });
      expect(db.updateUserUnitPreference).toHaveBeenCalledWith(1, "metric");
    });

    it("should update unit preference to imperial", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.settings.updateUnitPreference({ 
        unitPreference: "imperial" 
      });

      expect(result).toEqual({ success: true, unitPreference: "imperial" });
      expect(db.updateUserUnitPreference).toHaveBeenCalledWith(1, "imperial");
    });

    it("should require authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.settings.updateUnitPreference({ unitPreference: "metric" })
      ).rejects.toThrow();
    });

    it("should reject invalid unit preference values", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.settings.updateUnitPreference({ 
          unitPreference: "invalid" as any 
        })
      ).rejects.toThrow();
    });
  });

  describe("getUnitPreference", () => {
    it("should return user unit preference", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.settings.getUnitPreference();

      expect(result).toEqual({ unitPreference: "metric" });
      expect(db.getUserUnitPreference).toHaveBeenCalledWith(1);
    });

    it("should return metric as default when no preference is set", async () => {
      vi.mocked(db.getUserUnitPreference).mockResolvedValueOnce(null);
      
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.settings.getUnitPreference();

      expect(result).toEqual({ unitPreference: "metric" });
    });

    it("should require authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.settings.getUnitPreference()).rejects.toThrow();
    });
  });
});
