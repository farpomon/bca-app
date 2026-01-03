import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock user for testing
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    companyId: 1,
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

describe("buildingTemplates.templates", () => {
  describe("list", () => {
    it("should return templates list for authenticated user", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.buildingTemplates.templates.list({});
      
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe("buildingTemplates.serviceLifeValues", () => {
  describe("list", () => {
    it("should return service life values for authenticated user", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.buildingTemplates.serviceLifeValues.list({});
      
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe("buildingTemplates.bulkUpdates", () => {
  describe("list", () => {
    it("should return bulk updates list for authenticated user", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.buildingTemplates.bulkUpdates.list({});
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("preview", () => {
    it("should return preview for bulk update", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.buildingTemplates.bulkUpdates.preview({
        updateType: "component",
        componentCode: "B30",
        newServiceLife: 25,
      });
      
      expect(result).toHaveProperty("estimatedAffectedAssessments");
      expect(result).toHaveProperty("estimatedAffectedProjects");
      expect(result.newServiceLife).toBe(25);
    });
  });
});
