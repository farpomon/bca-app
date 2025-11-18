import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
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
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("projects", () => {
  it("creates a new project", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.create({
      name: "Test Building Assessment",
      address: "123 Test Street",
      clientName: "Test Client",
      propertyType: "Commercial",
      yearBuilt: 2000,
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("lists user projects", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const projects = await caller.projects.list();

    expect(Array.isArray(projects)).toBe(true);
  });

  it("retrieves project stats", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a project first
    const project = await caller.projects.create({
      name: "Stats Test Project",
      address: "456 Stats Ave",
    });

    const stats = await caller.projects.stats({ projectId: project.id });

    expect(stats).toHaveProperty("deficiencies");
    expect(stats).toHaveProperty("assessments");
    expect(stats).toHaveProperty("photos");
    expect(stats).toHaveProperty("totalEstimatedCost");
    expect(typeof stats?.deficiencies).toBe("number");
    expect(typeof stats?.assessments).toBe("number");
  });
});

describe("components", () => {
  it("lists all building components", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const components = await caller.components.list();

    expect(Array.isArray(components)).toBe(true);
    expect(components.length).toBeGreaterThan(0);
    
    // Check for UNIFORMAT II structure
    const level1 = components.filter(c => c.level === 1);
    const level2 = components.filter(c => c.level === 2);
    const level3 = components.filter(c => c.level === 3);
    
    expect(level1.length).toBeGreaterThan(0);
    expect(level2.length).toBeGreaterThan(0);
    expect(level3.length).toBeGreaterThan(0);
  });

  it("filters components by level", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const level1Components = await caller.components.byLevel({ level: 1 });
    
    expect(Array.isArray(level1Components)).toBe(true);
    expect(level1Components.every(c => c.level === 1)).toBe(true);
  });
});

describe("assessments", () => {
  it("creates and retrieves an assessment", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a project
    const project = await caller.projects.create({
      name: "Assessment Test Project",
    });

    // Create an assessment
    const assessment = await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "B3010",
      condition: "fair",
      observations: "Roof showing signs of wear",
      remainingUsefulLife: 10,
      expectedUsefulLife: 25,
    });

    expect(assessment).toHaveProperty("id");

    // Retrieve the assessment
    const retrieved = await caller.assessments.get({
      projectId: project.id,
      componentCode: "B3010",
    });

    expect(retrieved).toBeDefined();
    expect(retrieved?.condition).toBe("fair");
    expect(retrieved?.observations).toBe("Roof showing signs of wear");
  });

  it("updates an existing assessment", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const project = await caller.projects.create({
      name: "Update Assessment Test",
    });

    // Create initial assessment
    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "C3010",
      condition: "good",
      observations: "Initial observation",
    });

    // Update the assessment
    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "C3010",
      condition: "fair",
      observations: "Updated observation",
    });

    const updated = await caller.assessments.get({
      projectId: project.id,
      componentCode: "C3010",
    });

    expect(updated?.condition).toBe("fair");
    expect(updated?.observations).toBe("Updated observation");
  });
});

describe("deficiencies", () => {
  it("creates a deficiency", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const project = await caller.projects.create({
      name: "Deficiency Test Project",
    });

    const assessment = await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "D3020",
      condition: "poor",
    });

    const deficiency = await caller.deficiencies.create({
      projectId: project.id,
      assessmentId: assessment.id,
      componentCode: "D3020",
      title: "Boiler requires replacement",
      description: "Heating system is beyond its useful life",
      severity: "high",
      priority: "short_term",
      estimatedCost: 1500000, // $15,000 in cents
    });

    expect(deficiency).toHaveProperty("id");
  });

  it("lists project deficiencies", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const project = await caller.projects.create({
      name: "List Deficiencies Test",
    });

    const assessment = await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "B2010",
      condition: "poor",
    });

    await caller.deficiencies.create({
      projectId: project.id,
      assessmentId: assessment.id,
      componentCode: "B2010",
      title: "Exterior wall damage",
      severity: "medium",
      priority: "medium_term",
    });

    const deficiencies = await caller.deficiencies.list({
      projectId: project.id,
    });

    expect(Array.isArray(deficiencies)).toBe(true);
    expect(deficiencies.length).toBeGreaterThan(0);
  });
});
