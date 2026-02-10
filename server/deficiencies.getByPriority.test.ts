import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "admin" | "user" = "user"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
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
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("deficiencies.getByPriority", () => {
  it("returns deficiencies filtered by immediate priority", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.deficiencies.getByPriority({ priority: "immediate" });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    // Verify all returned deficiencies have immediate priority
    result.forEach((deficiency: any) => {
      expect(deficiency.priority).toBe("immediate");
    });
  });

  it("returns deficiencies filtered by short_term priority", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.deficiencies.getByPriority({ priority: "short_term" });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    // Verify all returned deficiencies have short_term priority
    result.forEach((deficiency: any) => {
      expect(deficiency.priority).toBe("short_term");
    });
  });

  it("returns deficiencies filtered by medium_term priority", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.deficiencies.getByPriority({ priority: "medium_term" });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    // Verify all returned deficiencies have medium_term priority
    result.forEach((deficiency: any) => {
      expect(deficiency.priority).toBe("medium_term");
    });
  });

  it("returns deficiencies filtered by long_term priority", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.deficiencies.getByPriority({ priority: "long_term" });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    // Verify all returned deficiencies have long_term priority
    result.forEach((deficiency: any) => {
      expect(deficiency.priority).toBe("long_term");
    });
  });

  it("returns deficiencies with asset and component information", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.deficiencies.getByPriority({ priority: "immediate" });

    // If there are results, verify structure
    if (result.length > 0) {
      const firstDeficiency = result[0];
      expect(firstDeficiency).toHaveProperty("id");
      expect(firstDeficiency).toHaveProperty("description");
      expect(firstDeficiency).toHaveProperty("severity");
      expect(firstDeficiency).toHaveProperty("priority");
      expect(firstDeficiency).toHaveProperty("estimatedCost");
      // assetId is not in deficiencies table schema
      expect(firstDeficiency).toHaveProperty("projectId");
      expect(firstDeficiency).toHaveProperty("asset");
      expect(firstDeficiency).toHaveProperty("component");
    }
  });

  it("returns empty array for non-existent priority", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.deficiencies.getByPriority({ priority: "non_existent" });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("admin can query deficiencies by priority", async () => {
    const { ctx } = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.deficiencies.getByPriority({ priority: "immediate" });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    // Admin should see deficiencies from all projects
  });

  it("regular user can query deficiencies by priority from their projects", async () => {
    const { ctx } = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.deficiencies.getByPriority({ priority: "immediate" });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    // Verify all returned deficiencies have projectId
    result.forEach((deficiency: any) => {
      expect(deficiency.projectId).toBeDefined();
    });
  });
});
