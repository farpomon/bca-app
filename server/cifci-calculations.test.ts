import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
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
    res: {} as TrpcContext["res"],
  };
}

describe("CI/FCI Automated Calculations", () => {
  let ctx: TrpcContext;
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testProjectId: number;

  beforeEach(async () => {
    ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);

    // Create test project
    const project = await caller.projects.create({
      name: "CI/FCI Test Project",
      address: "123 Test St",
      clientName: "Test Client",
    });
    testProjectId = project.id;
  });

  it("should calculate CI automatically when assessment is created", async () => {
    // Create an assessment with good condition (75%)
    await caller.assessments.upsert({
      projectId: testProjectId,
      componentCode: "A1010",
      condition: "good",
      conditionPercentage: "75",
      expectedUsefulLife: 30,
      remainingUsefulLife: 20,
      observations: "Test observation",
      recommendations: "Test recommendation",
      estimatedRepairCost: 5000,
      replacementValue: 50000,
      actionYear: 2025,
    });

    // Fetch updated project
    const project = await caller.projects.get({ id: testProjectId });

    // CI should be calculated and stored
    expect(project.ci).toBeDefined();
    expect(project.ci).not.toBeNull();
    
    const ci = parseFloat(project.ci!);
    expect(ci).toBeGreaterThan(0);
    expect(ci).toBeLessThanOrEqual(100);
    
    // With 75% condition, CI should be around 75
    expect(ci).toBeGreaterThan(70);
    expect(ci).toBeLessThan(80);
  });

  it("should calculate FCI automatically when assessment is created", async () => {
    // Create an assessment with fair condition and repair cost
    await caller.assessments.upsert({
      projectId: testProjectId,
      componentCode: "A1010",
      condition: "fair",
      conditionPercentage: "60",
      expectedUsefulLife: 30,
      remainingUsefulLife: 15,
      observations: "Needs repair",
      recommendations: "Schedule maintenance",
      estimatedRepairCost: 10000,
      replacementValue: 100000,
      actionYear: 2025,
    });

    // Fetch updated project
    const project = await caller.projects.get({ id: testProjectId });

    // FCI should be calculated
    expect(project.fci).toBeDefined();
    expect(project.fci).not.toBeNull();
    
    const fci = parseFloat(project.fci!);
    expect(fci).toBeGreaterThan(0);
    expect(fci).toBeLessThan(1);
    
    // FCI should be around 0.1 (10000 / 100000)
    expect(fci).toBeCloseTo(0.1, 1);
  });

  it("should update CI/FCI when assessment is modified", async () => {
    // Create initial assessment
    const assessment = await caller.assessments.upsert({
      projectId: testProjectId,
      componentCode: "A1010",
      condition: "good",
      conditionPercentage: "80",
      expectedUsefulLife: 30,
      remainingUsefulLife: 24,
      observations: "Good condition",
      recommendations: "Monitor",
      estimatedRepairCost: 2000,
      replacementValue: 50000,
      actionYear: 2030,
    });

    const project1 = await caller.projects.get({ id: testProjectId });
    const ci1 = parseFloat(project1.ci!);
    const fci1 = parseFloat(project1.fci!);

    // Update assessment to worse condition
    await caller.assessments.upsert({
      id: assessment.id,
      projectId: testProjectId,
      componentCode: "A1010",
      condition: "poor",
      conditionPercentage: "40", // Much worse
      expectedUsefulLife: 30,
      remainingUsefulLife: 5,
      observations: "Poor condition",
      recommendations: "Immediate repair needed",
      estimatedRepairCost: 20000, // Higher cost
      replacementValue: 50000,
      actionYear: 2025,
    });

    const project2 = await caller.projects.get({ id: testProjectId });
    const ci2 = parseFloat(project2.ci!);
    const fci2 = parseFloat(project2.fci!);

    // CI should decrease (worse condition)
    expect(ci2).toBeLessThan(ci1);
    
    // FCI should increase (higher repair cost)
    expect(fci2).toBeGreaterThan(fci1);
  });

  it("should calculate weighted CI for multiple components", async () => {
    // Create multiple assessments with different conditions and costs
    await caller.assessments.upsert({
      projectId: testProjectId,
      componentCode: "A1010",
      condition: "good",
      conditionPercentage: "90",
      expectedUsefulLife: 30,
      remainingUsefulLife: 27,
      observations: "Excellent",
      recommendations: "None",
      estimatedRepairCost: 0,
      replacementValue: 100000, // High value
      actionYear: 2035,
    });

    await caller.assessments.upsert({
      projectId: testProjectId,
      componentCode: "B1010",
      condition: "fair",
      conditionPercentage: "50",
      expectedUsefulLife: 20,
      remainingUsefulLife: 10,
      observations: "Fair",
      recommendations: "Plan replacement",
      estimatedRepairCost: 5000,
      replacementValue: 10000, // Low value
      actionYear: 2027,
    });

    const project = await caller.projects.get({ id: testProjectId });
    const ci = parseFloat(project.ci!);

    // CI should be weighted toward the higher-value component (90%)
    // Weighted average: (90*100000 + 50*10000) / (100000 + 10000) = 9.5M / 110K ≈ 86.4
    expect(ci).toBeGreaterThan(80);
    expect(ci).toBeLessThan(90);
  });

  it("should save CI/FCI snapshots for historical tracking", async () => {
    // Create assessment
    await caller.assessments.upsert({
      projectId: testProjectId,
      componentCode: "A1010",
      condition: "good",
      conditionPercentage: "70",
      expectedUsefulLife: 30,
      remainingUsefulLife: 21,
      observations: "Test",
      recommendations: "Test",
      estimatedRepairCost: 5000,
      replacementValue: 50000,
      actionYear: 2026,
    });

    // Fetch snapshots
    const snapshots = await caller.cifci.getSnapshots({ projectId: testProjectId });

    // Should have at least one snapshot
    expect(snapshots.length).toBeGreaterThan(0);
    
    const snapshot = snapshots[0];
    expect(snapshot.projectId).toBe(testProjectId);
    expect(snapshot.ci).toBeDefined();
    expect(snapshot.fci).toBeDefined();
    expect(snapshot.level).toBe("building");
    expect(snapshot.calculatedAt).toBeInstanceOf(Date);
  });

  it("should handle manual recalculation trigger", async () => {
    // Create assessment
    await caller.assessments.upsert({
      projectId: testProjectId,
      componentCode: "A1010",
      condition: "fair",
      conditionPercentage: "65",
      expectedUsefulLife: 30,
      remainingUsefulLife: 19,
      observations: "Test",
      recommendations: "Test",
      estimatedRepairCost: 8000,
      replacementValue: 60000,
      actionYear: 2027,
    });

    // Manually trigger recalculation
    const result = await caller.cifci.recalculate({ projectId: testProjectId });

    expect(result.ci).toBeGreaterThan(0);
    expect(result.fci).toBeGreaterThan(0);
    
    // Verify project was updated
    const project = await caller.projects.get({ id: testProjectId });
    expect(parseFloat(project.ci!)).toBeCloseTo(result.ci, 1);
    expect(parseFloat(project.fci!)).toBeCloseTo(result.fci, 2);
  });

  it("should handle projects with no assessments gracefully", async () => {
    // Fetch project with no assessments
    const project = await caller.projects.get({ id: testProjectId });

    // CI/FCI should be null or 0
    expect(project.ci === null || parseFloat(project.ci) === 0).toBe(true);
    expect(project.fci === null || parseFloat(project.fci) === 0).toBe(true);
  });

  it("should calculate deferred maintenance cost correctly", async () => {
    // Create assessment with repair cost
    await caller.assessments.upsert({
      projectId: testProjectId,
      componentCode: "A1010",
      condition: "fair",
      conditionPercentage: "55",
      expectedUsefulLife: 30,
      remainingUsefulLife: 16,
      observations: "Needs work",
      recommendations: "Repair soon",
      estimatedRepairCost: 15000,
      replacementValue: 75000,
      actionYear: 2026,
    });

    const project = await caller.projects.get({ id: testProjectId });
    const deferredCost = parseFloat(project.deferredMaintenanceCost!);

    // Deferred cost should include the repair cost
    expect(deferredCost).toBeGreaterThanOrEqual(15000);
  });

  it("should calculate replacement value correctly", async () => {
    // Create multiple assessments
    await caller.assessments.upsert({
      projectId: testProjectId,
      componentCode: "A1010",
      condition: "good",
      conditionPercentage: "70",
      expectedUsefulLife: 30,
      remainingUsefulLife: 21,
      observations: "Test",
      recommendations: "Test",
      estimatedRepairCost: 5000,
      replacementValue: 50000,
      actionYear: 2026,
    });

    await caller.assessments.upsert({
      projectId: testProjectId,
      componentCode: "B1010",
      condition: "fair",
      conditionPercentage: "60",
      expectedUsefulLife: 20,
      remainingUsefulLife: 12,
      observations: "Test",
      recommendations: "Test",
      estimatedRepairCost: 3000,
      replacementValue: 30000,
      actionYear: 2027,
    });

    const project = await caller.projects.get({ id: testProjectId });
    const replacementValue = parseFloat(project.currentReplacementValue!);

    // Total replacement value should be sum of all components
    expect(replacementValue).toBeGreaterThanOrEqual(80000);
  });
});
