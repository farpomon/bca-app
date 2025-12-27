import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
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

describe("Economic Indicators", () => {
  it("should list economic indicators", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.economicIndicators.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should get latest economic indicator for Canada", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.economicIndicators.getLatest({ region: "Canada" });

    if (result) {
      expect(result).toHaveProperty("region");
      expect(result.region).toBe("Canada");
      expect(result).toHaveProperty("constructionInflationRate");
      expect(result).toHaveProperty("recommendedDiscountRate");
    }
  });

  it("should get available regions", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.economicIndicators.getRegions();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create economic indicator (admin only)", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.economicIndicators.create({
      indicatorDate: "2025-06-01",
      region: "Test Region",
      constructionInflationRate: "3.5",
      recommendedDiscountRate: "4.0",
    });

    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
    expect(result).toHaveProperty("id");
  });
});

describe("Portfolio Targets", () => {
  it("should list portfolio targets", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.portfolioTargets.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should get FCI targets", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.portfolioTargets.getFCITargets();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("targetType");
      expect(result[0].targetType).toBe("fci");
    }
  });

  it("should get active portfolio targets", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.portfolioTargets.getActive();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create portfolio target (admin only)", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.portfolioTargets.create({
      targetYear: 2026,
      targetType: "fci",
      metricName: "Test FCI Target",
      targetValue: "5.0",
      currentValue: "10.0",
      status: "on_track",
      reviewFrequency: "quarterly",
    });

    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
    expect(result).toHaveProperty("id");
  });

  it("should create target with minimal required fields", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.portfolioTargets.create({
      targetYear: 2027,
      targetType: "ci",
      metricName: "Minimal Test Target",
      targetValue: "3.0",
      status: "on_track",
      reviewFrequency: "quarterly",
    });

    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
  });
});

describe("Integration Tests", () => {
  it("should retrieve economic indicators and use them for calculations", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const latest = await caller.economicIndicators.getLatest({ region: "Canada" });

    if (latest) {
      expect(latest.constructionInflationRate).toBeDefined();
      expect(latest.recommendedDiscountRate).toBeDefined();

      // Verify values are numeric strings that can be parsed
      if (latest.constructionInflationRate) {
        const inflationRate = parseFloat(latest.constructionInflationRate);
        expect(inflationRate).toBeGreaterThan(0);
        expect(inflationRate).toBeLessThan(100);
      }

      if (latest.recommendedDiscountRate) {
        const discountRate = parseFloat(latest.recommendedDiscountRate);
        expect(discountRate).toBeGreaterThan(0);
        expect(discountRate).toBeLessThan(100);
      }
    }
  });

  it("should track portfolio target progress", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const fciTargets = await caller.portfolioTargets.getFCITargets();

    if (fciTargets.length > 0) {
      const target = fciTargets[0];
      
      expect(target.targetValue).toBeDefined();
      expect(target.baselineValue).toBeDefined();
      
      // Verify target values are lower than baseline (improvement)
      if (target.targetValue && target.baselineValue) {
        const targetVal = parseFloat(target.targetValue);
        const baselineVal = parseFloat(target.baselineValue);
        expect(targetVal).toBeLessThanOrEqual(baselineVal);
      }
    }
  });
});
