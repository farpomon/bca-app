import { describe, it, expect } from "vitest";
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
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("Edit Assessment Functionality", () => {
  it("should create and then update an existing assessment", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 1. Create a project
    const project = await caller.projects.create({
      name: "Test Edit Project",
      address: "123 Test St",
      clientName: "Test Client",
    });

    // 2. Create initial assessment
    const initialAssessment = await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "B2010",
      condition: "fair",
      observations: "Initial observation",
      recommendations: "Initial recommendation",
      remainingUsefulLife: 10,
      expectedUsefulLife: 20,
      reviewYear: 2025,
      estimatedRepairCost: 5000,
      replacementValue: 15000,
      actionYear: 2026,
    });

    expect(initialAssessment).toBeDefined();

    // 3. Retrieve the assessment to verify it was created
    const assessments = await caller.assessments.list({ projectId: project.id });
    expect(assessments.length).toBe(1);
    expect(assessments[0]?.condition).toBe("fair");
    expect(assessments[0]?.observations).toBe("Initial observation");
    expect(assessments[0]?.estimatedRepairCost).toBe(5000);

    // 4. Update the assessment (simulating edit)
    const updatedAssessment = await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "B2010",
      condition: "poor",
      observations: "Updated observation after inspection",
      recommendations: "Updated recommendation - needs immediate attention",
      remainingUsefulLife: 5,
      expectedUsefulLife: 20,
      reviewYear: 2025,
      estimatedRepairCost: 12000,
      replacementValue: 15000,
      actionYear: 2025,
    });

    expect(updatedAssessment).toBeDefined();

    // 5. Verify the assessment was updated (not duplicated)
    const updatedAssessments = await caller.assessments.list({ projectId: project.id });
    expect(updatedAssessments.length).toBe(1); // Still only 1 assessment
    expect(updatedAssessments[0]?.condition).toBe("poor");
    expect(updatedAssessments[0]?.observations).toBe("Updated observation after inspection");
    expect(updatedAssessments[0]?.recommendations).toBe("Updated recommendation - needs immediate attention");
    expect(updatedAssessments[0]?.estimatedRepairCost).toBe(12000);
    expect(updatedAssessments[0]?.remainingUsefulLife).toBe(5);
    expect(updatedAssessments[0]?.actionYear).toBe(2025);

    console.log("✅ Edit assessment test passed!");
    console.log(`   Initial condition: fair → Updated condition: ${updatedAssessments[0]?.condition}`);
    console.log(`   Initial cost: $5000 → Updated cost: $${updatedAssessments[0]?.estimatedRepairCost}`);
  });

  it("should handle editing multiple fields independently", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const project = await caller.projects.create({
      name: "Multi-Edit Test Project",
      address: "456 Edit Ave",
    });

    // Create initial assessment with minimal data
    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "C1010",
      condition: "good",
      observations: "Good condition",
    });

    // First edit: Add cost information
    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "C1010",
      condition: "good",
      observations: "Good condition",
      estimatedRepairCost: 3000,
      replacementValue: 10000,
    });

    // Second edit: Update condition and add action year
    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "C1010",
      condition: "fair",
      observations: "Good condition",
      estimatedRepairCost: 3000,
      replacementValue: 10000,
      actionYear: 2027,
    });

    // Verify final state
    const finalAssessments = await caller.assessments.list({ projectId: project.id });
    expect(finalAssessments.length).toBe(1);
    expect(finalAssessments[0]?.condition).toBe("fair");
    expect(finalAssessments[0]?.estimatedRepairCost).toBe(3000);
    expect(finalAssessments[0]?.actionYear).toBe(2027);

    console.log("✅ Multiple edits test passed!");
  });
});
