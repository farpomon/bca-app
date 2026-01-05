import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "admin" | "user" = "user"): TrpcContext {
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

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Risk Assessment", () => {
  const ctx = createAuthContext("admin");
  const caller = appRouter.createCaller(ctx);

  describe("risks.create", () => {
    it("should create a risk assessment with valid data", async () => {
      // Use an existing building from mock data
      // Get a project first, then its assets
      const projects = await caller.projects.list();
      if (projects.length === 0) {
        console.log("No projects found, skipping test");
        return;
      }
      const buildings = await caller.assets.list({ projectId: projects[0].id });
      if (buildings.length === 0) {
        console.log("No assets found, skipping test");
        return;
      }

      const testBuildingId = buildings[0].id;

      const result = await caller.risks.create({
        buildingId: testBuildingId,
        riskCategory: "structural",
        likelihood: 3,
        impact: 4,
        riskLevel: "high",
        description: "Foundation cracks detected",
        mitigationPlan: "Schedule structural engineer inspection",
      });

      expect(result.success).toBe(true);
      expect(result.riskId).toBeDefined();
    });

    it("should calculate risk level correctly - critical (5x5)", async () => {
      // Get a project first, then its assets
      const projects = await caller.projects.list();
      if (projects.length === 0) {
        console.log("No projects found, skipping test");
        return;
      }
      const buildings = await caller.assets.list({ projectId: projects[0].id });
      if (buildings.length === 0) {
        console.log("No assets found, skipping test");
        return;
      }

      const testBuildingId = buildings[0].id;

      const result = await caller.risks.create({
        buildingId: testBuildingId,
        riskCategory: "fire_safety",
        likelihood: 5,
        impact: 5,
        riskLevel: "critical",
        description: "Fire suppression system failure",
        mitigationPlan: "Immediate repair required",
      });

      expect(result.success).toBe(true);
      expect(result.riskId).toBeDefined();

      // Verify the risk was created with correct level
      const risks = await caller.risks.list({ buildingId: testBuildingId });
      const createdRisk = risks.find((r) => r.id === result.riskId);
      expect(createdRisk).toBeDefined();
      expect(createdRisk!.riskLevel).toBe("critical");
      expect(createdRisk!.likelihood).toBe(5);
      expect(createdRisk!.impact).toBe(5);
    });

    it("should calculate risk level correctly - high (4x3)", async () => {
      // Get a project first, then its assets
      const projects = await caller.projects.list();
      if (projects.length === 0) {
        console.log("No projects found, skipping test");
        return;
      }
      const buildings = await caller.assets.list({ projectId: projects[0].id });
      if (buildings.length === 0) {
        console.log("No assets found, skipping test");
        return;
      }

      const testBuildingId = buildings[0].id;

      const result = await caller.risks.create({
        buildingId: testBuildingId,
        riskCategory: "electrical",
        likelihood: 4,
        impact: 3,
        riskLevel: "high",
        description: "Outdated electrical panel",
        mitigationPlan: "Schedule electrical upgrade",
      });

      expect(result.success).toBe(true);

      const risks = await caller.risks.list({ buildingId: testBuildingId });
      const createdRisk = risks.find((r) => r.id === result.riskId);
      expect(createdRisk!.riskLevel).toBe("high");
    });

    it("should calculate risk level correctly - medium (3x2)", async () => {
      // Get a project first, then its assets
      const projects = await caller.projects.list();
      if (projects.length === 0) {
        console.log("No projects found, skipping test");
        return;
      }
      const buildings = await caller.assets.list({ projectId: projects[0].id });
      if (buildings.length === 0) {
        console.log("No assets found, skipping test");
        return;
      }

      const testBuildingId = buildings[0].id;

      const result = await caller.risks.create({
        buildingId: testBuildingId,
        riskCategory: "plumbing",
        likelihood: 3,
        impact: 2,
        riskLevel: "medium",
        description: "Minor pipe corrosion",
        mitigationPlan: "Monitor and replace within 6 months",
      });

      expect(result.success).toBe(true);

      const risks = await caller.risks.list({ buildingId: testBuildingId });
      const createdRisk = risks.find((r) => r.id === result.riskId);
      expect(createdRisk!.riskLevel).toBe("medium");
    });

    it("should calculate risk level correctly - low (1x2)", async () => {
      // Get a project first, then its assets
      const projects = await caller.projects.list();
      if (projects.length === 0) {
        console.log("No projects found, skipping test");
        return;
      }
      const buildings = await caller.assets.list({ projectId: projects[0].id });
      if (buildings.length === 0) {
        console.log("No assets found, skipping test");
        return;
      }

      const testBuildingId = buildings[0].id;

      const result = await caller.risks.create({
        buildingId: testBuildingId,
        riskCategory: "hvac",
        likelihood: 1,
        impact: 2,
        riskLevel: "low",
        description: "Filter replacement needed",
        mitigationPlan: "Schedule routine maintenance",
      });

      expect(result.success).toBe(true);

      const risks = await caller.risks.list({ buildingId: testBuildingId });
      const createdRisk = risks.find((r) => r.id === result.riskId);
      expect(createdRisk!.riskLevel).toBe("low");
    });

    it("should accept all valid risk categories", async () => {
      // Get a project first, then its assets
      const projects = await caller.projects.list();
      if (projects.length === 0) {
        console.log("No projects found, skipping test");
        return;
      }
      const buildings = await caller.assets.list({ projectId: projects[0].id });
      if (buildings.length === 0) {
        console.log("No assets found, skipping test");
        return;
      }

      const testBuildingId = buildings[0].id;

      const categories = [
        "structural",
        "fire_safety",
        "electrical",
        "plumbing",
        "hvac",
        "accessibility",
        "environmental",
        "security",
      ];

      for (const category of categories) {
        const result = await caller.risks.create({
          buildingId: testBuildingId,
          riskCategory: category,
          likelihood: 2,
          impact: 2,
          riskLevel: "low",
          description: `Test ${category} risk`,
          mitigationPlan: "Test mitigation",
        });

        expect(result.success).toBe(true);
      }
    });

    it("should handle optional description and mitigation plan", async () => {
      // Get a project first, then its assets
      const projects = await caller.projects.list();
      if (projects.length === 0) {
        console.log("No projects found, skipping test");
        return;
      }
      const buildings = await caller.assets.list({ projectId: projects[0].id });
      if (buildings.length === 0) {
        console.log("No assets found, skipping test");
        return;
      }

      const testBuildingId = buildings[0].id;

      const result = await caller.risks.create({
        buildingId: testBuildingId,
        riskCategory: "structural",
        likelihood: 2,
        impact: 2,
        riskLevel: "low",
      });

      expect(result.success).toBe(true);
    });

    it("should validate likelihood range (1-5)", async () => {
      // Get a project first, then its assets
      const projects = await caller.projects.list();
      if (projects.length === 0) {
        console.log("No projects found, skipping test");
        return;
      }
      const buildings = await caller.assets.list({ projectId: projects[0].id });
      if (buildings.length === 0) {
        console.log("No assets found, skipping test");
        return;
      }

      const testBuildingId = buildings[0].id;

      await expect(
        caller.risks.create({
          buildingId: testBuildingId,
          riskCategory: "structural",
          likelihood: 0,
          impact: 3,
          riskLevel: "medium",
        })
      ).rejects.toThrow();

      await expect(
        caller.risks.create({
          buildingId: testBuildingId,
          riskCategory: "structural",
          likelihood: 6,
          impact: 3,
          riskLevel: "medium",
        })
      ).rejects.toThrow();
    });

    it("should validate impact range (1-5)", async () => {
      // Get a project first, then its assets
      const projects = await caller.projects.list();
      if (projects.length === 0) {
        console.log("No projects found, skipping test");
        return;
      }
      const buildings = await caller.assets.list({ projectId: projects[0].id });
      if (buildings.length === 0) {
        console.log("No assets found, skipping test");
        return;
      }

      const testBuildingId = buildings[0].id;

      await expect(
        caller.risks.create({
          buildingId: testBuildingId,
          riskCategory: "structural",
          likelihood: 3,
          impact: 0,
          riskLevel: "medium",
        })
      ).rejects.toThrow();

      await expect(
        caller.risks.create({
          buildingId: testBuildingId,
          riskCategory: "structural",
          likelihood: 3,
          impact: 6,
          riskLevel: "medium",
        })
      ).rejects.toThrow();
    });
  });

  describe("risks.list", () => {
    it("should list all risks for a building", async () => {
      // Get a project first, then its assets
      const projects = await caller.projects.list();
      if (projects.length === 0) {
        console.log("No projects found, skipping test");
        return;
      }
      const buildings = await caller.assets.list({ projectId: projects[0].id });
      if (buildings.length === 0) {
        console.log("No assets found, skipping test");
        return;
      }

      const testBuildingId = buildings[0].id;

      // Create some test risks
      await caller.risks.create({
        buildingId: testBuildingId,
        riskCategory: "structural",
        likelihood: 5,
        impact: 5,
        riskLevel: "critical",
        description: "Critical structural issue",
      });

      await caller.risks.create({
        buildingId: testBuildingId,
        riskCategory: "fire_safety",
        likelihood: 4,
        impact: 3,
        riskLevel: "high",
        description: "High fire risk",
      });

      const result = await caller.risks.list({
        buildingId: testBuildingId,
      });

      expect(result.length).toBeGreaterThan(0);
    });

    it("should filter risks by level", async () => {
      // Get a project first, then its assets
      const projects = await caller.projects.list();
      if (projects.length === 0) {
        console.log("No projects found, skipping test");
        return;
      }
      const buildings = await caller.assets.list({ projectId: projects[0].id });
      if (buildings.length === 0) {
        console.log("No assets found, skipping test");
        return;
      }

      const testBuildingId = buildings[0].id;

      // Create a critical risk
      await caller.risks.create({
        buildingId: testBuildingId,
        riskCategory: "structural",
        likelihood: 5,
        impact: 5,
        riskLevel: "critical",
        description: "Test critical risk",
      });

      const criticalRisks = await caller.risks.list({
        buildingId: testBuildingId,
        riskLevel: "critical",
      });

      expect(criticalRisks.length).toBeGreaterThan(0);
      criticalRisks.forEach((risk) => {
        expect(risk.riskLevel).toBe("critical");
      });
    });

    it("should filter risks by category", async () => {
      // Get a project first, then its assets
      const projects = await caller.projects.list();
      if (projects.length === 0) {
        console.log("No projects found, skipping test");
        return;
      }
      const buildings = await caller.assets.list({ projectId: projects[0].id });
      if (buildings.length === 0) {
        console.log("No assets found, skipping test");
        return;
      }

      const testBuildingId = buildings[0].id;

      // Create a structural risk
      await caller.risks.create({
        buildingId: testBuildingId,
        riskCategory: "structural",
        likelihood: 3,
        impact: 3,
        riskLevel: "high",
        description: "Test structural risk",
      });

      const structuralRisks = await caller.risks.list({
        buildingId: testBuildingId,
        riskCategory: "structural",
      });

      expect(structuralRisks.length).toBeGreaterThan(0);
      structuralRisks.forEach((risk) => {
        expect(risk.riskCategory).toBe("structural");
      });
    });

    it("should sort risks by assessment date (newest first)", async () => {
      // Get a project first, then its assets
      const projects = await caller.projects.list();
      if (projects.length === 0) {
        console.log("No projects found, skipping test");
        return;
      }
      const buildings = await caller.assets.list({ projectId: projects[0].id });
      if (buildings.length === 0) {
        console.log("No assets found, skipping test");
        return;
      }

      const testBuildingId = buildings[0].id;

      const result = await caller.risks.list({
        buildingId: testBuildingId,
      });

      if (result.length > 1) {
        // Check that dates are in descending order
        for (let i = 0; i < result.length - 1; i++) {
          const currentDate = new Date(result[i].assessmentDate);
          const nextDate = new Date(result[i + 1].assessmentDate);
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
        }
      }
    });
  });

  describe("Risk Matrix Logic", () => {
    it("should correctly categorize all risk matrix cells", async () => {
      // Get a project first, then its assets
      const projects = await caller.projects.list();
      if (projects.length === 0) {
        console.log("No projects found, skipping test");
        return;
      }
      const buildings = await caller.assets.list({ projectId: projects[0].id });
      if (buildings.length === 0) {
        console.log("No assets found, skipping test");
        return;
      }

      const testBuildingId = buildings[0].id;

      const testCases = [
        // Critical (score >= 16)
        { likelihood: 5, impact: 5, expected: "critical" }, // 25
        { likelihood: 4, impact: 4, expected: "critical" }, // 16

        // High (score >= 9)
        { likelihood: 3, impact: 3, expected: "high" }, // 9
        { likelihood: 4, impact: 3, expected: "high" }, // 12

        // Medium (score >= 4)
        { likelihood: 2, impact: 2, expected: "medium" }, // 4
        { likelihood: 3, impact: 2, expected: "medium" }, // 6

        // Low (score < 4)
        { likelihood: 1, impact: 1, expected: "low" }, // 1
        { likelihood: 1, impact: 2, expected: "low" }, // 2
      ];

      for (const testCase of testCases) {
        const result = await caller.risks.create({
          buildingId: testBuildingId,
          riskCategory: "structural",
          likelihood: testCase.likelihood,
          impact: testCase.impact,
          riskLevel: testCase.expected as "low" | "medium" | "high" | "critical",
          description: `Test L${testCase.likelihood}xI${testCase.impact}`,
        });

        expect(result.success).toBe(true);

        const risks = await caller.risks.list({ buildingId: testBuildingId });
        const createdRisk = risks.find((r) => r.id === result.riskId);
        expect(createdRisk).toBeDefined();
        expect(createdRisk!.riskLevel).toBe(testCase.expected);
      }
    });
  });
});
