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
    company: "test-company",
    companyId: 1,
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

describe("Component Name and Location Fields", () => {
  it("should save assessment with componentName and componentLocation", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const project = await caller.projects.create({
      name: "Test Project for Component Fields",
      address: "123 Test St",
    });

    // Create assessment with component name and location
    const assessment = await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "A1010",
      condition: "good",
      status: "active",
      componentName: "Foundation Wall - North Side",
      componentLocation: "Building A, North Perimeter",
      observations: "Foundation wall in good condition",
      estimatedRepairCost: 5000,
    });

    expect(assessment).toBeDefined();
    expect(assessment.id).toBeGreaterThan(0);

    // Retrieve the assessment and verify fields
    const retrieved = await caller.assessments.get({
      projectId: project.id,
      componentCode: "A1010",
    });

    expect(retrieved).toBeDefined();
    expect(retrieved?.componentName).toBe("Foundation Wall - North Side");
    expect(retrieved?.componentLocation).toBe("Building A, North Perimeter");
  });

  it("should update assessment with new componentName and componentLocation", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const project = await caller.projects.create({
      name: "Test Project for Update",
      address: "456 Update Ave",
    });

    // Create initial assessment
    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "B1010",
      condition: "fair",
      componentName: "Original Name",
      componentLocation: "Original Location",
    });

    // Update assessment with new values
    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "B1010",
      condition: "fair",
      componentName: "Updated Roof System",
      componentLocation: "Building B, East Wing",
    });

    // Retrieve and verify update
    const updated = await caller.assessments.get({
      projectId: project.id,
      componentCode: "B1010",
    });

    expect(updated?.componentName).toBe("Updated Roof System");
    expect(updated?.componentLocation).toBe("Building B, East Wing");
  });

  it("should handle optional componentName and componentLocation fields", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const project = await caller.projects.create({
      name: "Test Project for Optional Fields",
      address: "789 Optional Rd",
    });

    // Create assessment without component name and location
    const assessment = await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "C1010",
      condition: "poor",
      observations: "Interior walls need repair",
    });

    expect(assessment).toBeDefined();

    // Retrieve and verify fields are null/undefined
    const retrieved = await caller.assessments.get({
      projectId: project.id,
      componentCode: "C1010",
    });

    expect(retrieved).toBeDefined();
    // Fields should be null or undefined when not provided
    expect(retrieved?.componentName == null || retrieved?.componentName === "").toBe(true);
    expect(retrieved?.componentLocation == null || retrieved?.componentLocation === "").toBe(true);
  });
});
