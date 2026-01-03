import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    hasMultiAssetProjects: vi.fn(),
    getProjectStats: vi.fn(),
    getProjectById: vi.fn(),
  };
});

import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    company: "test-company",
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

describe("Portfolio Analytics Visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hasMultiAssetProjects", () => {
    it("should return true when a project has multiple assets", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      vi.mocked(db.hasMultiAssetProjects).mockResolvedValue(true);
      
      const result = await caller.projects.hasMultiAssetProjects();
      
      expect(result).toBe(true);
      expect(db.hasMultiAssetProjects).toHaveBeenCalledWith(1, "test-company", false);
    });

    it("should return false when no project has multiple assets", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      vi.mocked(db.hasMultiAssetProjects).mockResolvedValue(false);
      
      const result = await caller.projects.hasMultiAssetProjects();
      
      expect(result).toBe(false);
    });

    it("should pass isAdmin=true for admin users", async () => {
      const ctx = createAuthContext({ role: "admin" });
      const caller = appRouter.createCaller(ctx);
      
      vi.mocked(db.hasMultiAssetProjects).mockResolvedValue(true);
      
      await caller.projects.hasMultiAssetProjects();
      
      expect(db.hasMultiAssetProjects).toHaveBeenCalledWith(1, "test-company", true);
    });
  });

  describe("getProjectStats includes asset count", () => {
    it("should return asset count in project stats", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      vi.mocked(db.getProjectById).mockResolvedValue({
        id: 1,
        name: "Test Project",
        userId: 1,
        company: "test-company",
      } as any);
      
      vi.mocked(db.getProjectStats).mockResolvedValue({
        deficiencies: 5,
        assessments: 10,
        photos: 20,
        documents: 3,
        assets: 2,
        totalEstimatedCost: 50000,
      });
      
      const result = await caller.projects.stats({ projectId: 1 });
      
      expect(result).toHaveProperty("assets");
      expect(result?.assets).toBe(2);
    });
  });
});
