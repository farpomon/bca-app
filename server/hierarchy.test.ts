import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
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

function createUserContext(): { ctx: TrpcContext } {
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

describe("hierarchy templates", () => {
  it("allows admin to create hierarchy template", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.hierarchy.templates.create({
      name: "Test Template",
      description: "A test hierarchy template",
      isDefault: false,
      config: {
        maxDepth: 3,
        componentWeights: { A: 1.2, B: 1.0 },
        componentPriorities: { A: "high", B: "medium" },
      },
    });

    expect(result).toBeDefined();
  });

  it("prevents non-admin from creating hierarchy template", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.hierarchy.templates.create({
        name: "Test Template",
        description: "Should fail",
        isDefault: false,
        config: {
          maxDepth: 3,
        },
      })
    ).rejects.toThrow("Admin access required");
  });

  it("lists all hierarchy templates", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const templates = await caller.hierarchy.templates.list();

    expect(Array.isArray(templates)).toBe(true);
  });

  it("gets default hierarchy template", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const defaultTemplate = await caller.hierarchy.templates.getDefault();

    // May be null if no default is set
    expect(defaultTemplate === null || typeof defaultTemplate === "object").toBe(true);
  });
});

describe("project hierarchy configuration", () => {
  it("allows user to configure project hierarchy", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project first
    const project = await caller.projects.create({
      name: "Test Project for Hierarchy",
      address: "123 Test St",
    });

    // Configure hierarchy for the project
    const result = await caller.hierarchy.project.upsert({
      projectId: project.id,
      maxDepth: 2,
      componentWeights: { A: 1.5, B: 1.0 },
      componentPriorities: { A: "critical", B: "high" },
      enabledComponents: ["A", "B", "C"],
    });

    expect(result.success).toBe(true);

    // Verify configuration was saved
    const config = await caller.hierarchy.project.get({ projectId: project.id });
    expect(config).toBeDefined();
    expect(config?.maxDepth).toBe(2);
  });

  it("filters components by project hierarchy config", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const project = await caller.projects.create({
      name: "Test Project for Component Filtering",
      address: "456 Test Ave",
    });

    // Configure hierarchy to only show level 1 and 2, and only A and B components
    await caller.hierarchy.project.upsert({
      projectId: project.id,
      maxDepth: 2,
      enabledComponents: ["A", "B"],
    });

    // Get components for this project
    const components = await caller.components.list({ projectId: project.id });

    // All components should be level 2 or below
    expect(components.every((c: any) => c.level <= 2)).toBe(true);

    // All components should start with A or B
    expect(
      components.every((c: any) => {
        const majorGroup = c.code.charAt(0);
        return majorGroup === "A" || majorGroup === "B";
      })
    ).toBe(true);
  });

  it("returns all components when no project config exists", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    // Create a project without hierarchy config
    const project = await caller.projects.create({
      name: "Test Project Without Config",
      address: "789 Test Blvd",
    });

    // Get components - should return all components
    const components = await caller.components.list({ projectId: project.id });

    expect(components.length).toBeGreaterThan(0);
  });

  it("allows user to delete project hierarchy config", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const project = await caller.projects.create({
      name: "Test Project for Deletion",
      address: "321 Test Ln",
    });

    // Configure hierarchy
    await caller.hierarchy.project.upsert({
      projectId: project.id,
      maxDepth: 2,
    });

    // Delete configuration
    const result = await caller.hierarchy.project.delete({ projectId: project.id });
    expect(result.success).toBe(true);

    // Verify config is deleted
    const config = await caller.hierarchy.project.get({ projectId: project.id });
    expect(config).toBeNull();
  });
});
