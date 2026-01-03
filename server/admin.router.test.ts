import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const adminUser: AuthenticatedUser = {
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
    user: adminUser,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const regularUser: AuthenticatedUser = {
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
    user: regularUser,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin.getSystemStats", () => {
  it("returns system statistics for admin users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getSystemStats();

    expect(result).toHaveProperty("totalUsers");
    expect(result).toHaveProperty("adminUsers");
    expect(result).toHaveProperty("totalProjects");
    expect(result).toHaveProperty("projectsByStatus");
    expect(result.projectsByStatus).toHaveProperty("draft");
    expect(result.projectsByStatus).toHaveProperty("in_progress");
    expect(result.projectsByStatus).toHaveProperty("completed");
    expect(result.projectsByStatus).toHaveProperty("archived");
  });

  it("throws FORBIDDEN error for non-admin users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getSystemStats()).rejects.toThrow();
  });
});

describe("admin.getAllUsers", () => {
  it("returns list of all users for admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getAllUsers();

    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("openId");
      expect(result[0]).toHaveProperty("email");
      expect(result[0]).toHaveProperty("role");
    }
  });

  it("throws FORBIDDEN error for non-admin users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getAllUsers()).rejects.toThrow();
  });
});

describe("admin.getAllProjects", () => {
  it("returns paginated list of projects", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getAllProjects({
      limit: 10,
      offset: 0,
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("filters projects by status", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getAllProjects({
      status: "draft",
      limit: 10,
      offset: 0,
    });

    expect(Array.isArray(result)).toBe(true);
    // All returned projects should have status "draft"
    result.forEach((project: any) => {
      expect(project.status).toBe("draft");
    });
  });

  it("respects pagination limits", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getAllProjects({
      limit: 5,
      offset: 0,
    });

    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("throws FORBIDDEN error for non-admin users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.getAllProjects({ limit: 10, offset: 0 })
    ).rejects.toThrow();
  });
});

describe("admin.updateUserRole", () => {
  it("throws FORBIDDEN error for non-admin users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.updateUserRole({ userId: 1, role: "admin" })
    ).rejects.toThrow();
  });
});

describe("admin.deleteUser", () => {
  it("prevents admin from deleting their own account", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Try to delete self (userId = 1, same as admin context)
    await expect(
      caller.admin.deleteUser({ userId: 1 })
    ).rejects.toThrow("Cannot delete your own account");
  });

  it("throws FORBIDDEN error for non-admin users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.deleteUser({ userId: 3 })
    ).rejects.toThrow();
  });
});

describe("admin role-based access control", () => {
  it("admin procedures require admin role", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    // All admin endpoints should throw for non-admin users
    await expect(caller.admin.getSystemStats()).rejects.toThrow();
    await expect(caller.admin.getAllUsers()).rejects.toThrow();
    await expect(
      caller.admin.getAllProjects({ limit: 10, offset: 0 })
    ).rejects.toThrow();
  });

  it("admin procedures allow admin role", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // All admin endpoints should work for admin users
    await expect(caller.admin.getSystemStats()).resolves.toBeDefined();
    await expect(caller.admin.getAllUsers()).resolves.toBeDefined();
    await expect(
      caller.admin.getAllProjects({ limit: 10, offset: 0 })
    ).resolves.toBeDefined();
  });
});
