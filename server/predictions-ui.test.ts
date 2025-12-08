import { describe, expect, it } from "vitest";
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
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("Predictions UI - Curve Management", () => {
  it("should list available deterioration curves", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const curves = await caller.predictions.curves({});

    expect(Array.isArray(curves)).toBe(true);
  });

  it("should create a custom deterioration curve", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const curve = await caller.predictions.createCurve({
      name: "Custom Test Curve",
      curveType: "design",
      componentType: "B30",
      interpolationType: "linear",
      param1: 100,
      param2: 90,
      param3: 80,
      param4: 70,
      param5: 60,
      param6: 50,
    });

    expect(curve).toBeDefined();
    expect(curve.id).toBeDefined();
    expect(curve.name).toBe("Custom Test Curve");
    expect(curve.curveType).toBe("design");
  });

  it("should update an existing curve", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create curve first
    const created = await caller.predictions.createCurve({
      name: "Curve to Update",
      curveType: "best",
      componentType: "D30",
      interpolationType: "polynomial",
      param1: 100,
      param2: 95,
      param3: 90,
      param4: 85,
      param5: 80,
      param6: 75,
    });

    // Update it
    const updated = await caller.predictions.updateCurve({
      id: created.id,
      name: "Updated Curve Name",
      param1: 100,
      param2: 92,
      param3: 84,
      param4: 76,
      param5: 68,
      param6: 60,
    });

    expect(updated.name).toBe("Updated Curve Name");
  });

  it("should delete a curve", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create curve
    const created = await caller.predictions.createCurve({
      name: "Curve to Delete",
      curveType: "worst",
      componentType: "B20",
      interpolationType: "exponential",
      param1: 100,
      param2: 85,
      param3: 70,
      param4: 55,
      param5: 40,
      param6: 25,
    });

    // Delete it
    await caller.predictions.deleteCurve({ id: created.id });

    // Verify it's gone
    const curves = await caller.predictions.curves({});
    const found = curves.find((c) => c.id === created.id);
    expect(found).toBeUndefined();
  });
});

describe("Predictions UI - Component Predictions", () => {
  it("should get prediction for a single component using curve method", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const project = await caller.projects.create({
      name: "Prediction Test Project",
      address: "123 Test St",
      yearBuilt: 2000,
      totalArea: 10000,
    });

    // Use existing building component B3010 (Exterior Walls)

    // Get prediction
    const prediction = await caller.predictions.component({
      projectId: project.id,
      componentCode: "B3010",
      method: "curve",
    });

    expect(prediction).toBeDefined();
    expect(prediction.predictedFailureYear).toBeDefined();
    expect(prediction.predictedRemainingLife).toBeDefined();
    expect(prediction.confidenceScore).toBeDefined();
    expect(prediction.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(prediction.confidenceScore).toBeLessThanOrEqual(1);
  });

  it("should get prediction for a single component using ML method", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const project = await caller.projects.create({
      name: "ML Prediction Test",
      address: "456 Test Ave",
      yearBuilt: 2010,
      totalArea: 15000,
    });

    // Use existing building component D3020 (HVAC)

    // Create some assessment history
    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "D3020",
      condition: "good",
      conditionPercentage: "75",
      observations: "System functioning well",
      assessedAt: new Date(2020, 0, 1),
      reviewYear: 2020,
    });

    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "D3020",
      condition: "fair",
      conditionPercentage: "65",
      observations: "Some wear visible",
      assessedAt: new Date(2023, 0, 1),
      reviewYear: 2023,
    });

    // Get ML prediction
    const prediction = await caller.predictions.component({
      projectId: project.id,
      componentCode: "D3020",
      method: "ml",
    });

    expect(prediction).toBeDefined();
    expect(prediction.predictedFailureYear).toBeDefined();
    expect(prediction.predictedRemainingLife).toBeDefined();
    expect(prediction.currentConditionEstimate).toBeDefined();
    expect(prediction.confidenceScore).toBeDefined();
  });

  it("should get predictions for all components in a project", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const project = await caller.projects.create({
      name: "Portfolio Prediction Test",
      address: "789 Test Blvd",
      yearBuilt: 2005,
      totalArea: 20000,
    });

    // Use existing building components B2010 (Roof) and C3020 (Flooring)

    // Add assessments for both
    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "B2010",
      condition: "good",
      conditionPercentage: "80",
      observations: "Roof in good condition",
      assessedAt: new Date(),
      reviewYear: new Date().getFullYear(),
    });

    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "C3020",
      condition: "fair",
      conditionPercentage: "60",
      observations: "Flooring shows wear",
      assessedAt: new Date(),
      reviewYear: new Date().getFullYear(),
    });

    // Get all predictions
    const predictions = await caller.predictions.project({
      projectId: project.id,
      method: "hybrid",
    });

    expect(Array.isArray(predictions)).toBe(true);
    expect(predictions.length).toBeGreaterThan(0);
    
    // Verify each prediction has required fields
    predictions.forEach((pred) => {
      expect(pred.componentCode).toBeDefined();
      expect(pred.riskLevel).toBeDefined();
      expect(["low", "medium", "high", "critical"]).toContain(pred.riskLevel);
      expect(pred.confidenceScore).toBeDefined();
    });
  });
});

describe("Predictions UI - Prediction History", () => {
  it("should track prediction history", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const project = await caller.projects.create({
      name: "History Test Project",
      address: "321 History Lane",
      yearBuilt: 2015,
      totalArea: 12000,
    });

    // Use existing building component D5020 (Electrical)

    // Add assessment
    await caller.assessments.upsert({
      projectId: project.id,
      componentCode: "D5020",
      condition: "good",
      conditionPercentage: "90",
      observations: "New system",
      assessedAt: new Date(),
      reviewYear: new Date().getFullYear(),
    });

    // Run prediction (this should save to history)
    await caller.predictions.component({
      projectId: project.id,
      componentCode: "D5020",
      method: "curve",
    });

    // Get prediction history
    const history = await caller.predictions.history({
      projectId: project.id,
      componentCode: "D5020",
    });

    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
    
    const latest = history[0];
    expect(latest.componentCode).toBe("D5020");
    expect(latest.predictionMethod).toBeDefined();
    expect(latest.predictedFailureYear).toBeDefined();
    expect(latest.confidenceScore).toBeDefined();
  });
});

describe("Predictions UI - Risk Level Determination", () => {
  it("should correctly determine critical risk level", async () => {
    const { determineRiskLevel } = await import("./mlPredictionService");

    const risk = determineRiskLevel(1, 15);
    expect(risk).toBe("critical");
  });

  it("should correctly determine high risk level", async () => {
    const { determineRiskLevel } = await import("./mlPredictionService");

    const risk = determineRiskLevel(3, 35);
    expect(risk).toBe("high");
  });

  it("should correctly determine medium risk level", async () => {
    const { determineRiskLevel } = await import("./mlPredictionService");

    const risk = determineRiskLevel(7, 55);
    expect(risk).toBe("medium");
  });

  it("should correctly determine low risk level", async () => {
    const { determineRiskLevel } = await import("./mlPredictionService");

    const risk = determineRiskLevel(15, 80);
    expect(risk).toBe("low");
  });
});
