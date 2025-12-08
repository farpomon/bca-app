import { describe, it, expect, beforeAll } from "vitest";
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
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("Facility Summary", () => {
  let testProjectId: number;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    const { ctx } = createAuthContext();
    caller = appRouter.createCaller(ctx);

    // Create a test project
    const projectResult = await caller.projects.create({
      name: "Test Facility",
      address: "123 Test St",
      clientName: "Test Client",
      propertyType: "Office Building",
      yearBuilt: 1990,
      designLife: 50,
      holdingDepartment: "Facilities Management",
      propertyManager: "John Doe",
      managerEmail: "john.doe@example.com",
      managerPhone: "(555) 123-4567",
      facilityType: "Office Building",
      occupancyStatus: "occupied",
      criticalityLevel: "important",
    });

    testProjectId = projectResult.id;

    // Add renovation costs
    await caller.facility.addRenovationCost({
      projectId: testProjectId,
      costType: "planned",
      amount: 200000,
      status: "approved",
      description: "HVAC replacement",
      category: "HVAC",
      fiscalYear: 2025,
    });

    await caller.facility.addRenovationCost({
      projectId: testProjectId,
      costType: "executed",
      amount: 50000,
      status: "completed",
      description: "Roof repairs",
      category: "Roof",
      fiscalYear: 2024,
    });
  });

  describe("Facility Summary Data", () => {
    it("should retrieve complete facility summary", async () => {
      const summary = await caller.facility.getSummary({ projectId: testProjectId });

      expect(summary).toBeDefined();
      expect(summary.condition).toBeDefined();
      expect(summary.financial).toBeDefined();
      expect(summary.lifecycle).toBeDefined();
      expect(summary.administrative).toBeDefined();
      expect(summary.stats).toBeDefined();
      expect(summary.actionItems).toBeDefined();
    });

    it("should calculate condition metrics correctly", async () => {
      const summary = await caller.facility.getSummary({ projectId: testProjectId });

      expect(summary.condition.ci).toBeGreaterThan(0);
      expect(summary.condition.ci).toBeLessThanOrEqual(100);
      expect(summary.condition.fci).toBeGreaterThanOrEqual(0);
      expect(summary.condition.fci).toBeLessThanOrEqual(1);
      expect(summary.condition.conditionRating).toMatch(/Excellent|Good|Fair|Poor|Critical/);
      expect(summary.condition.trend).toMatch(/improving|stable|declining/);
      expect(summary.condition.healthScore).toBeGreaterThanOrEqual(0);
      expect(summary.condition.healthScore).toBeLessThanOrEqual(100);
    });

    it("should aggregate financial metrics correctly", async () => {
      const summary = await caller.facility.getSummary({ projectId: testProjectId });

      expect(summary.financial.identifiedCosts).toBeGreaterThanOrEqual(0);
      expect(summary.financial.plannedCosts).toBe(200000);
      expect(summary.financial.executedCosts).toBe(50000);
      expect(summary.financial.totalCosts).toBeGreaterThan(0);
      expect(summary.financial.budgetUtilization).toBe(25); // 50k / 200k = 25%
    });

    it("should calculate lifecycle information correctly", async () => {
      const summary = await caller.facility.getSummary({ projectId: testProjectId });
      const currentYear = new Date().getFullYear();

      expect(summary.lifecycle.age).toBe(currentYear - 1990);
      expect(summary.lifecycle.designLife).toBe(50);
      expect(summary.lifecycle.remainingYears).toBeGreaterThanOrEqual(0);
      expect(summary.lifecycle.lifecycleStage).toMatch(/new|mid_life|aging|end_of_life/);
      expect(summary.lifecycle.endOfLifeDate).toBeDefined();
    });

    it("should include administrative details", async () => {
      const summary = await caller.facility.getSummary({ projectId: testProjectId });

      expect(summary.administrative.holdingDepartment).toBe("Facilities Management");
      expect(summary.administrative.propertyManager).toBe("John Doe");
      expect(summary.administrative.managerEmail).toBe("john.doe@example.com");
      expect(summary.administrative.managerPhone).toBe("(555) 123-4567");
      expect(summary.administrative.facilityType).toBe("Office Building");
      expect(summary.administrative.occupancyStatus).toBe("occupied");
      expect(summary.administrative.criticalityLevel).toBe("important");
    });

    it("should provide component statistics", async () => {
      const summary = await caller.facility.getSummary({ projectId: testProjectId });

      expect(summary.stats.totalComponents).toBeGreaterThanOrEqual(0);
      expect(summary.stats.componentsByCondition).toBeDefined();
      expect(summary.stats.deficienciesByPriority).toBeDefined();
    });

    it("should identify action items", async () => {
      const summary = await caller.facility.getSummary({ projectId: testProjectId });

      expect(summary.actionItems.criticalDeficiencies).toBeGreaterThanOrEqual(0);
      expect(summary.actionItems.upcomingMaintenance).toBeGreaterThanOrEqual(0);
      expect(summary.actionItems.overdueItems).toBeGreaterThanOrEqual(0);
      expect(summary.actionItems.budgetAlerts).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Lifecycle Management", () => {
    it("should update facility lifecycle information", async () => {
      const result = await caller.facility.updateLifecycle({
        projectId: testProjectId,
        designLife: 60,
      });

      expect(result.success).toBe(true);

      const summary = await caller.facility.getSummary({ projectId: testProjectId });
      expect(summary.lifecycle.designLife).toBe(60);
    });

    it("should update administrative information", async () => {
      const result = await caller.facility.updateAdministrative({
        projectId: testProjectId,
        holdingDepartment: "Public Works",
        propertyManager: "Jane Smith",
        managerEmail: "jane.smith@example.com",
        managerPhone: "(555) 987-6543",
      });

      expect(result.success).toBe(true);

      const summary = await caller.facility.getSummary({ projectId: testProjectId });
      expect(summary.administrative.holdingDepartment).toBe("Public Works");
      expect(summary.administrative.propertyManager).toBe("Jane Smith");
    });
  });

  describe("Renovation Costs", () => {
    it("should add renovation cost", async () => {
      const result = await caller.facility.addRenovationCost({
        projectId: testProjectId,
        costType: "planned",
        amount: 75000,
        status: "pending",
        description: "Electrical upgrades",
        category: "Electrical",
        fiscalYear: 2026,
      });

      expect(result.id).toBeDefined();
    });

    it("should retrieve renovation costs by type", async () => {
      const costs = await caller.facility.getRenovationCosts({
        projectId: testProjectId,
        costType: "planned",
      });

      expect(costs.length).toBeGreaterThan(0);
      expect(costs.every((c) => c.costType === "planned")).toBe(true);
    });

    it("should retrieve all renovation costs", async () => {
      const costs = await caller.facility.getRenovationCosts({
        projectId: testProjectId,
      });

      expect(costs.length).toBeGreaterThan(0);
    });

    it("should update renovation cost status", async () => {
      const costs = await caller.facility.getRenovationCosts({
        projectId: testProjectId,
        costType: "planned",
      });

      const firstCost = costs[0];
      if (firstCost) {
        const result = await caller.facility.updateRenovationCost({
          id: firstCost.id,
          status: "in_progress",
        });

        expect(result.success).toBe(true);
      }
    });

    it("should delete renovation cost", async () => {
      // Create a cost to delete
      const created = await caller.facility.addRenovationCost({
        projectId: testProjectId,
        costType: "identified",
        amount: 1000,
        description: "Test cost to delete",
      });

      const result = await caller.facility.deleteRenovationCost({
        id: created.id,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Health Score Calculation", () => {
    it("should calculate health score based on multiple factors", async () => {
      const summary = await caller.facility.getSummary({ projectId: testProjectId });

      // Health score should be between 0-100
      expect(summary.condition.healthScore).toBeGreaterThanOrEqual(0);
      expect(summary.condition.healthScore).toBeLessThanOrEqual(100);

      // Health score should reflect condition metrics
      // Better CI should contribute to higher health score
      if (summary.condition.ci > 80) {
        expect(summary.condition.healthScore).toBeGreaterThan(50);
      }
    });
  });
});
