import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
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

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Assessment Enhancements", () => {
  it("should accept estimatedRepairCost, replacementValue, and actionYear in assessment upsert", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project first
    const result = await caller.projects.create({
      name: "Test FCI Project",
      address: "123 Test Street",
      clientName: "Test Client",
    });
    const projectId = result.id;

    // Upsert an assessment with new fields
    const assessmentResult = await caller.assessments.upsert({
      projectId,
      componentCode: "A1010",
      condition: "fair",
      conditionPercentage: "75-50% of ESL",
      observations: "Component shows moderate wear",
      remainingUsefulLife: 10,
      expectedUsefulLife: 20,
      reviewYear: 2026,
      lastTimeAction: 2015,
      estimatedRepairCost: 5000,
      replacementValue: 25000,
      actionYear: 2027,
    });

    expect(assessmentResult).toBeDefined();
    expect(assessmentResult.id).toBeTypeOf("number");
  });
});

describe("FCI Calculation", () => {
  it("should calculate FCI correctly for a project", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const result = await caller.projects.create({
      name: "FCI Test Project",
      address: "456 FCI Avenue",
      clientName: "FCI Client",
    });
    const projectId = result.id;

    // Add assessments with repair costs and replacement values
    await caller.assessments.upsert({
      projectId,
      componentCode: "A1010",
      condition: "fair",
      estimatedRepairCost: 10000,
      replacementValue: 100000,
    });

    await caller.assessments.upsert({
      projectId,
      componentCode: "B2010",
      condition: "poor",
      estimatedRepairCost: 5000,
      replacementValue: 50000,
    });

    // Get FCI
    const fci = await caller.projects.fci({ projectId });

    expect(fci).toBeDefined();
    expect(fci?.totalRepairCost).toBe(15000);
    expect(fci?.totalReplacementValue).toBe(150000);
    expect(fci?.fci).toBe(10); // (15000 / 150000) * 100 = 10%
    expect(fci?.rating).toBe("fair"); // 10% falls in Fair range (5-10%)
  });

  it("should rate FCI as good when FCI <= 5%", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.create({
      name: "Good FCI Project",
    });
    const projectId = result.id;

    await caller.assessments.upsert({
      projectId,
      componentCode: "A1010",
      condition: "good",
      estimatedRepairCost: 2000,
      replacementValue: 100000,
    });

    const fci = await caller.projects.fci({ projectId });

    expect(fci?.fci).toBe(2); // 2%
    expect(fci?.rating).toBe("good");
  });

  it("should rate FCI as poor when FCI > 10% and <= 30%", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.create({
      name: "Poor FCI Project",
    });
    const projectId = result.id;

    await caller.assessments.upsert({
      projectId,
      componentCode: "A1010",
      condition: "poor",
      estimatedRepairCost: 20000,
      replacementValue: 100000,
    });

    const fci = await caller.projects.fci({ projectId });

    expect(fci?.fci).toBe(20); // 20%
    expect(fci?.rating).toBe("poor");
  });

  it("should rate FCI as critical when FCI > 30%", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.create({
      name: "Critical FCI Project",
    });
    const projectId = result.id;

    await caller.assessments.upsert({
      projectId,
      componentCode: "A1010",
      condition: "poor",
      estimatedRepairCost: 40000,
      replacementValue: 100000,
    });

    const fci = await caller.projects.fci({ projectId });

    expect(fci?.fci).toBe(40); // 40%
    expect(fci?.rating).toBe("critical");
  });

  it("should return 0% FCI when no replacement value exists", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.create({
      name: "No Value Project",
    });
    const projectId = result.id;

    // Assessment without replacement value
    await caller.assessments.upsert({
      projectId,
      componentCode: "A1010",
      condition: "fair",
      estimatedRepairCost: 5000,
    });

    const fci = await caller.projects.fci({ projectId });

    expect(fci?.fci).toBe(0);
    expect(fci?.rating).toBe("good");
  });
});
