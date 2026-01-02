import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      company: "Test Company",
      companyId: 1,
      isSuperAdmin: 0,
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Admin Memory Health Endpoints", () => {
  describe("getMemoryHealth", () => {
    it("should return memory statistics with alert level", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.getMemoryHealth();

      // Verify structure
      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("heap");
      expect(result).toHaveProperty("formatted");
      expect(result).toHaveProperty("alert");
      expect(result).toHaveProperty("rss");
      expect(result).toHaveProperty("external");
      expect(result).toHaveProperty("arrayBuffers");

      // Verify heap object
      expect(result.heap).toHaveProperty("used");
      expect(result.heap).toHaveProperty("total");
      expect(result.heap).toHaveProperty("limit");
      expect(result.heap).toHaveProperty("usagePercent");
      expect(typeof result.heap.usagePercent).toBe("number");
      expect(result.heap.usagePercent).toBeGreaterThanOrEqual(0);
      expect(result.heap.usagePercent).toBeLessThanOrEqual(100);

      // Verify formatted strings
      expect(result.formatted).toHaveProperty("heapUsed");
      expect(result.formatted).toHaveProperty("heapTotal");
      expect(result.formatted).toHaveProperty("heapLimit");
      expect(result.formatted).toHaveProperty("rss");
      expect(result.formatted).toHaveProperty("external");

      // Verify alert object
      expect(result.alert).toHaveProperty("level");
      expect(result.alert).toHaveProperty("message");
      expect(result.alert).toHaveProperty("warningThreshold");
      expect(result.alert).toHaveProperty("criticalThreshold");
      expect(["ok", "warning", "critical"]).toContain(result.alert.level);
    });

    it("should return formatted byte values", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.getMemoryHealth();

      // Formatted values should contain unit suffixes
      const byteUnits = ["B", "KB", "MB", "GB"];
      const hasUnit = (str: string) => byteUnits.some(unit => str.includes(unit));

      expect(hasUnit(result.formatted.heapUsed)).toBe(true);
      expect(hasUnit(result.formatted.heapTotal)).toBe(true);
      expect(hasUnit(result.formatted.heapLimit)).toBe(true);
      expect(hasUnit(result.formatted.rss)).toBe(true);
      expect(hasUnit(result.formatted.external)).toBe(true);
    });
  });

  describe("getMemoryHistory", () => {
    it("should return memory history samples", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.getMemoryHistory({ samples: 10 });

      expect(result).toHaveProperty("samples");
      expect(result).toHaveProperty("requestedSamples");
      expect(result.requestedSamples).toBe(10);
      expect(Array.isArray(result.samples)).toBe(true);
      expect(result.samples.length).toBeGreaterThan(0);

      // Verify sample structure
      const sample = result.samples[0];
      expect(sample).toHaveProperty("timestamp");
      expect(sample).toHaveProperty("usagePercent");
      expect(sample).toHaveProperty("heapUsed");
    });
  });

  describe("configureMemoryAlerts", () => {
    it("should accept valid threshold configuration", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.configureMemoryAlerts({
        warningThreshold: 70,
        criticalThreshold: 90,
        enableNotifications: true,
      });

      expect(result.success).toBe(true);
      expect(result.config).toHaveProperty("warningThreshold");
      expect(result.config).toHaveProperty("criticalThreshold");
      expect(result.config).toHaveProperty("enableNotifications");
    });

    it("should reject invalid threshold configuration", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Warning threshold should be less than critical
      await expect(
        caller.admin.configureMemoryAlerts({
          warningThreshold: 90,
          criticalThreshold: 80,
        })
      ).rejects.toThrow("Warning threshold must be less than critical threshold");
    });
  });
});
