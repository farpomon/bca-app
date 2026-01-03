import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: role,
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

describe("Validation System", () => {
  let testProjectId: number;
  let sameYearRuleId: number;

  beforeAll(async () => {
    // Create a test project
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const project = await caller.projects.create({
      name: "Validation Test Building",
      address: "123 Test St",
      yearBuilt: new Date().getFullYear(), // Current year for same-year testing
      clientName: "Test Client",
    });

    testProjectId = project.id;

    // Get the same-year inspection rule
    const rules = await db.getAllValidationRules();
    const sameYearRule = rules.find((r: any) => r.ruleType === "same_year_inspection");
    if (sameYearRule) {
      sameYearRuleId = (sameYearRule as any).id;
    }
  });

  it("should trigger same-year inspection warning", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.validation.check({
      projectId: testProjectId,
      assessmentData: {
        componentCode: "A10",
        condition: "good",
        assessedAt: new Date(), // Same year as building installation
      },
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r: any) => r.severity === "warning")).toBe(true);
    expect(results.some((r: any) => r.field === "assessedAt")).toBe(true);
  });

  it("should trigger negative useful life warning", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.validation.check({
      projectId: testProjectId,
      assessmentData: {
        componentCode: "A10",
        remainingUsefulLife: -5, // Negative value
      },
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r: any) => r.field === "remainingUsefulLife")).toBe(true);
  });

  it("should trigger zero ESL warning", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.validation.check({
      projectId: testProjectId,
      assessmentData: {
        componentCode: "A10",
        expectedUsefulLife: 0, // Zero ESL
      },
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r: any) => r.field === "expectedUsefulLife")).toBe(true);
  });

  it("should allow override with justification", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    if (!sameYearRuleId) {
      console.warn("Same-year rule not found, skipping override test");
      return;
    }

    const override = await caller.validation.logOverride({
      ruleId: sameYearRuleId,
      projectId: testProjectId,
      fieldName: "assessedAt",
      originalValue: new Date().toISOString(),
      overriddenValue: new Date().toISOString(),
      justification: "Building was completed and immediately inspected for certification",
    });

    expect(override.id).toBeDefined();
    expect(typeof override.id).toBe("number");
  });

  it("should retrieve validation overrides for project", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const overrides = await caller.validation.overrides({
      projectId: testProjectId,
    });

    expect(Array.isArray(overrides)).toBe(true);
    expect(overrides.length).toBeGreaterThan(0);
  });

  it("should list all validation rules", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const rules = await caller.validation.rules.list();

    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.some((r: any) => r.ruleType === "same_year_inspection")).toBe(true);
  });

  it("should allow admin to create validation rule", async () => {
    const { ctx } = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const rule = await caller.validation.rules.create({
      name: "Test Rule",
      description: "A test validation rule",
      ruleType: "numeric_range",
      severity: "warning",
      field: "testField",
      condition: JSON.stringify({ min: 0, max: 100 }),
      message: "Test field must be between 0 and 100",
      isActive: true,
    });

    expect(rule.id).toBeDefined();
    expect(typeof rule.id).toBe("number");

    // Clean up
    await caller.validation.rules.delete({ ruleId: rule.id });
  });

  it("should prevent non-admin from creating validation rule", async () => {
    const { ctx } = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.validation.rules.create({
        name: "Unauthorized Rule",
        ruleType: "numeric_range",
        severity: "warning",
        field: "testField",
        condition: JSON.stringify({ min: 0 }),
        message: "This should fail",
      })
    ).rejects.toThrow();
  });

  it("should allow admin to toggle rule active status", async () => {
    const { ctx } = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    if (!sameYearRuleId) {
      console.warn("Same-year rule not found, skipping toggle test");
      return;
    }

    // Disable rule
    await caller.validation.rules.toggle({
      ruleId: sameYearRuleId,
      isActive: false,
    });

    // Re-enable rule
    await caller.validation.rules.toggle({
      ruleId: sameYearRuleId,
      isActive: true,
    });

    const rules = await caller.validation.rules.list();
    const rule = rules.find((r: any) => r.id === sameYearRuleId);
    expect(rule).toBeDefined();
    expect((rule as any).isActive).toBe(1);
  });

  it("should not trigger warnings when data is valid", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create project with past year
    const oldProject = await caller.projects.create({
      name: "Old Building",
      yearBuilt: 2010,
    });

    const results = await caller.validation.check({
      projectId: oldProject.id,
      assessmentData: {
        componentCode: "A10",
        condition: "good",
        assessedAt: new Date(), // Current year, but building is from 2010
        remainingUsefulLife: 15,
        expectedUsefulLife: 25,
        estimatedRepairCost: 5000,
        replacementValue: 50000,
      },
    });

    // Should have no warnings for valid data
    expect(results.length).toBe(0);

    // Clean up
    await caller.projects.delete({ id: oldProject.id });
  });

  it("should save assessment with validation overrides", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const assessmentId = await caller.assessments.upsert({
      projectId: testProjectId,
      componentCode: "A10",
      condition: "good",
      hasValidationOverrides: 1,
      validationWarnings: JSON.stringify([sameYearRuleId]),
    });

    expect(assessmentId).toBeDefined();

    // Verify assessment was saved with override flag
    const assessment = await caller.assessments.get({
      projectId: testProjectId,
      componentCode: "A10",
    });

    expect(assessment).toBeDefined();
    expect(assessment?.hasValidationOverrides).toBe(1);
  });
});
