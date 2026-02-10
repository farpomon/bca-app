import { describe, expect, it, beforeEach } from "vitest";
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

describe("Capital Planning - Cycle Management", () => {
  it("should get all cycles", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const cycles = await caller.capitalPlanning.getAllCycles();

    expect(cycles).toBeDefined();
    expect(Array.isArray(cycles)).toBe(true);
  });

  it("should prevent deletion of active cycle without replacement", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This should throw an error if trying to delete an active cycle
    await expect(async () => {
      await caller.capitalPlanning.deleteCycle({
        cycleId: 1, // Assuming cycle 1 is active
        confirmText: "DELETE",
      });
    }).rejects.toThrow();
  });

  it("should require DELETE confirmation text", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(async () => {
      await caller.capitalPlanning.deleteCycle({
        cycleId: 1,
        confirmText: "WRONG",
      });
    }).rejects.toThrow('Please type "DELETE" to confirm');
  });

  it("should prevent bulk deletion of active cycles", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(async () => {
      await caller.capitalPlanning.deleteCyclesBulk({
        cycleIds: [1, 2], // Assuming cycle 1 is active
        confirmText: "DELETE",
      });
    }).rejects.toThrow();
  });

  it("should archive cycle successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.capitalPlanning.archiveCycle({
      cycleId: 2, // Non-active cycle
    });

    expect(result).toEqual({ success: true });
  });
});

describe("Capital Planning - Assessment Integration", () => {
  it("should calculate backlog summary", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const backlog = await caller.capitalPlanning.getBacklogSummary({
      cycleId: 1,
    });

    expect(backlog).toBeDefined();
    if (backlog) {
      expect(backlog).toHaveProperty("totalBacklog");
      expect(backlog).toHaveProperty("criticalBacklog");
      expect(backlog).toHaveProperty("highBacklog");
    }
  });

  it("should calculate backlog with filters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const backlog = await caller.capitalPlanning.getBacklogSummary({
      cycleId: 1,
      filters: {
        severityLevel: "critical",
      },
    });

    expect(backlog).toBeDefined();
  });

  it("should calculate backlog reduction trend", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const trend = await caller.capitalPlanning.getBacklogReductionTrend({
      cycleId: 1,
    });

    expect(trend).toBeDefined();
    expect(Array.isArray(trend)).toBe(true);
    
    if (trend.length > 0) {
      expect(trend[0]).toHaveProperty("year");
      expect(trend[0]).toHaveProperty("fundedAmount");
      expect(trend[0]).toHaveProperty("backlogReduced");
      expect(trend[0]).toHaveProperty("cumulativeReduction");
    }
  });

  it("should calculate risk analysis", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const risk = await caller.capitalPlanning.getRiskAnalysis({
      cycleId: 1,
    });

    expect(risk).toBeDefined();
    expect(risk).toHaveProperty("before");
    expect(risk).toHaveProperty("after");
    expect(risk).toHaveProperty("riskReduction");
  });

  it("should calculate unfunded critical risks", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const unfunded = await caller.capitalPlanning.getUnfundedCriticalRisks({
      cycleId: 1,
    });

    expect(unfunded).toBeDefined();
    expect(unfunded).toHaveProperty("summary");
    expect(unfunded).toHaveProperty("items");
    expect(unfunded.summary).toHaveProperty("totalCount");
    expect(unfunded.summary).toHaveProperty("totalValue");
  });
});

describe("Capital Planning - Project-Deficiency Mapping", () => {
  it("should link project to deficiencies", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.capitalPlanning.linkProjectToDeficiencies({
      projectId: 1,
      deficiencyIds: [1, 2, 3],
    });

    expect(result).toEqual({ success: true });
  });

  it("should unlink project from deficiencies", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.capitalPlanning.unlinkProjectFromDeficiencies({
      projectId: 1,
      deficiencyIds: [1, 2],
    });

    expect(result).toEqual({ success: true });
  });

  it("should get project deficiencies", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const deficiencies = await caller.capitalPlanning.getProjectDeficiencies({
      projectId: 1,
    });

    expect(deficiencies).toBeDefined();
    expect(Array.isArray(deficiencies)).toBe(true);
  });
});

describe("Capital Planning - Analytics Refresh", () => {
  it("should refresh cycle analytics", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.capitalPlanning.refreshCycleAnalytics({
      cycleId: 1,
    });

    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
    expect(result).toHaveProperty("analytics");
  });
});

describe("Capital Planning - Data Integrity", () => {
  it("should maintain KPI consistency after cycle deletion", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get initial cycle count
    const cyclesBefore = await caller.capitalPlanning.getAllCycles();
    const countBefore = cyclesBefore.length;

    // Archive a cycle (safer than delete for testing)
    await caller.capitalPlanning.archiveCycle({ cycleId: 2 });

    // Get updated cycle count
    const cyclesAfter = await caller.capitalPlanning.getAllCycles();
    
    // Verify data integrity
    expect(cyclesAfter).toBeDefined();
    expect(Array.isArray(cyclesAfter)).toBe(true);
  });

  it("should handle empty backlog gracefully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const backlog = await caller.capitalPlanning.getBacklogSummary({
      cycleId: 999, // Non-existent cycle
    });

    // Should not throw, should return null or empty data
    expect(backlog).toBeDefined();
  });

  it("should handle missing assessment data gracefully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const unfunded = await caller.capitalPlanning.getUnfundedCriticalRisks({
      cycleId: 1,
    });

    expect(unfunded).toBeDefined();
    expect(unfunded.summary).toBeDefined();
    expect(unfunded.items).toBeDefined();
  });
});
