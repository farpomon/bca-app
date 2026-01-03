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
    res: {} as TrpcContext["res"],
  };
}

describe("Dashboard Data Endpoints", () => {
  it("should calculate financial planning data with 5-year periods", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 1. Create a project
    const project = await caller.projects.create({
      name: "Dashboard Test Building",
      address: "123 Test St",
      description: "Testing dashboard calculations",
    });

    // 2. Create assessments with action years and costs
    const currentYear = new Date().getFullYear();
    
    // Substructure (A) - near term
    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "A10",
      condition: "fair",
      estimatedRepairCost: 50000,
      replacementValue: 200000,
      actionYear: currentYear + 2,
    });

    // Shell (B) - mid term
    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "B10",
      condition: "poor",
      estimatedRepairCost: 100000,
      replacementValue: 500000,
      actionYear: currentYear + 7,
    });

    // Services/MEP (D) - long term
    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "D30",
      condition: "fair",
      estimatedRepairCost: 75000,
      replacementValue: 300000,
      actionYear: currentYear + 12,
    });

    // 3. Get financial planning data
    const financialData = await caller.projects.financialPlanning({ projectId: project.id });

    // 4. Verify structure
    expect(financialData).toBeDefined();
    expect(financialData.periods).toHaveLength(4);
    expect(financialData.groups.length).toBeGreaterThan(0);
    expect(financialData.grandTotal).toBe(225000);

    // 5. Verify groups contain expected systems
    const groupCodes = financialData.groups.map((g) => g.code);
    expect(groupCodes).toContain("A"); // Substructure
    expect(groupCodes).toContain("B"); // Shell
    expect(groupCodes).toContain("D"); // Services

    console.log("Financial planning data:", JSON.stringify(financialData, null, 2));
  });

  it("should generate condition matrix by building system", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 1. Create a project
    const project = await caller.projects.create({
      name: "Condition Matrix Test",
      address: "456 Test Ave",
    });

    // 2. Create assessments with different conditions
    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "B10",
      condition: "good",
      estimatedRepairCost: 5000,
      replacementValue: 100000,
    });

    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "B20",
      condition: "fair",
      estimatedRepairCost: 15000,
      replacementValue: 150000,
    });

    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "D30",
      condition: "poor",
      estimatedRepairCost: 50000,
      replacementValue: 200000,
    });

    // 3. Get condition matrix
    const conditionData = await caller.projects.conditionMatrix({ projectId: project.id });

    // 4. Verify structure
    expect(conditionData).toBeDefined();
    expect(conditionData.systems.length).toBeGreaterThan(0);

    // 5. Verify Shell (B) system shows fair condition (worst of good/fair)
    const shellSystem = conditionData.systems.find((s) => s.code === "B");
    expect(shellSystem).toBeDefined();
    expect(shellSystem?.condition).toBe("fair");
    expect(shellSystem?.componentCount).toBe(2);
    expect(shellSystem?.estimatedCost).toBe(20000);

    // 6. Verify Services (D) system shows poor condition
    const servicesSystem = conditionData.systems.find((s) => s.code === "D");
    expect(servicesSystem).toBeDefined();
    expect(servicesSystem?.condition).toBe("poor");
    expect(servicesSystem?.componentCount).toBe(1);
    expect(servicesSystem?.estimatedCost).toBe(50000);

    console.log("Condition matrix data:", JSON.stringify(conditionData, null, 2));
  });

  it("should integrate with FCI calculation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 1. Create a project
    const project = await caller.projects.create({
      name: "FCI Integration Test",
      address: "789 Test Blvd",
    });

    // 2. Create assessments
    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "B30",
      condition: "poor",
      estimatedRepairCost: 80000,
      replacementValue: 400000,
    });

    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "D20",
      condition: "fair",
      estimatedRepairCost: 20000,
      replacementValue: 100000,
    });

    // 3. Get FCI data
    const fciData = await caller.projects.fci({ projectId: project.id });

    // 4. Verify FCI calculation
    expect(fciData).toBeDefined();
    expect(fciData?.totalRepairCost).toBe(100000);
    expect(fciData?.totalReplacementValue).toBe(500000);
    expect(fciData?.fci).toBe(20); // 100000 / 500000 * 100 = 20%
    expect(fciData?.rating).toBe("poor"); // 20% is in poor range (10-30%)

    console.log("FCI data:", JSON.stringify(fciData, null, 2));
  });
});
