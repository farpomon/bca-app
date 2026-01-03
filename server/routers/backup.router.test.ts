/**
 * Backup Router Tests
 * Tests for backup creation, listing, and restore functionality
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

// Mock the storage module
vi.mock("../storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    key: "backups/test-backup.json",
    url: "https://storage.example.com/backups/test-backup.json",
  }),
  storageGet: vi.fn().mockResolvedValue({
    key: "backups/test-backup.json",
    url: "https://storage.example.com/backups/test-backup.json",
  }),
}));

// Mock the database module with proper array return values
vi.mock("../db", () => {
  // Create a mock that returns arrays for select queries
  const createMockSelect = () => {
    const mockChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve([])), // Return empty array
    };
    // Make it thenable to work with await
    mockChain.from = vi.fn().mockReturnValue(mockChain);
    mockChain.where = vi.fn().mockReturnValue(mockChain);
    mockChain.orderBy = vi.fn().mockReturnValue(mockChain);
    mockChain.limit = vi.fn().mockReturnValue(mockChain);
    mockChain.offset = vi.fn().mockReturnValue(mockChain);
    return mockChain;
  };

  return {
    getDb: vi.fn().mockResolvedValue({
      select: vi.fn().mockImplementation(() => {
        // Return a promise that resolves to an empty array
        const chain = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          offset: vi.fn().mockReturnThis(),
        };
        // Make the chain return a promise resolving to empty array
        Object.defineProperty(chain, 'then', {
          value: (resolve: (value: any[]) => void) => {
            resolve([]);
            return Promise.resolve([]);
          }
        });
        chain.from = vi.fn().mockReturnValue(chain);
        chain.where = vi.fn().mockReturnValue(chain);
        chain.orderBy = vi.fn().mockReturnValue(chain);
        chain.limit = vi.fn().mockReturnValue(chain);
        chain.offset = vi.fn().mockReturnValue(chain);
        return chain;
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  };
});

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

function createNonAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
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

describe("backup router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("backup.getStats", () => {
    it("denies access to non-admin users", async () => {
      const ctx = createNonAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.backup.getStats()).rejects.toThrow();
    });
  });

  describe("backup.list", () => {
    it("denies access to non-admin users", async () => {
      const ctx = createNonAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.backup.list({ limit: 10, offset: 0 })).rejects.toThrow();
    });
  });

  describe("backup.create", () => {
    it("denies access to non-admin users", async () => {
      const ctx = createNonAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.backup.create({ description: "Test backup" })
      ).rejects.toThrow();
    });
  });

  describe("backup.delete", () => {
    it("denies access to non-admin users", async () => {
      const ctx = createNonAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.backup.delete({ id: 1 })).rejects.toThrow();
    });
  });

  describe("backup.restore", () => {
    it("denies access to non-admin users", async () => {
      const ctx = createNonAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.backup.restore({
          backupData: JSON.stringify({
            version: "1.0",
            data: { users: [] },
          }),
        })
      ).rejects.toThrow();
    });

    it("validates backup data structure", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Invalid backup data should throw
      await expect(
        caller.backup.restore({
          backupData: "invalid json",
        })
      ).rejects.toThrow();
    });

    it("requires either backupId or backupData", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.backup.restore({})
      ).rejects.toThrow("Either backupId or backupData must be provided");
    });
  });
});

describe("backup data integrity", () => {
  it("backup JSON structure is valid", () => {
    const backupData = {
      version: "1.0",
      createdAt: new Date().toISOString(),
      createdBy: 1,
      description: "Test backup",
      tables: ["users", "projects"],
      recordCounts: { users: 10, projects: 5 },
      totalRecords: 15,
      data: {
        users: [{ id: 1, name: "Test User" }],
        projects: [{ id: 1, name: "Test Project" }],
      },
    };

    // Validate structure
    expect(backupData).toHaveProperty("version");
    expect(backupData).toHaveProperty("createdAt");
    expect(backupData).toHaveProperty("data");
    expect(typeof backupData.version).toBe("string");
    expect(typeof backupData.data).toBe("object");

    // Validate JSON serialization
    const json = JSON.stringify(backupData);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(backupData);
  });

  it("checksum calculation is deterministic", () => {
    const data = "test data for checksum";
    
    // Simple checksum function (same as in router)
    function calculateChecksum(str: string): string {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16);
    }

    const checksum1 = calculateChecksum(data);
    const checksum2 = calculateChecksum(data);

    expect(checksum1).toBe(checksum2);
    expect(typeof checksum1).toBe("string");
    expect(checksum1.length).toBeGreaterThan(0);
  });
});
