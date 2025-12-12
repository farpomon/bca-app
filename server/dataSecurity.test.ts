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
    company: null,
    city: null,
    accountStatus: "active",
    trialEndsAt: null,
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

describe("dataSecurity router", () => {
  describe("getRetentionPolicies", () => {
    it("returns retention policies for admin users", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const policies = await caller.dataSecurity.getRetentionPolicies();

      expect(policies).toBeDefined();
      expect(Array.isArray(policies)).toBe(true);
      expect(policies.length).toBeGreaterThan(0);
      
      // Check for default 7-year retention policies
      const projectPolicy = policies.find(p => p.dataType === "projects");
      expect(projectPolicy).toBeDefined();
      expect(projectPolicy?.retentionPeriodYears).toBe(7);
    });
  });

  describe("getActiveRetentionPolicies", () => {
    it("returns only active retention policies", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const policies = await caller.dataSecurity.getActiveRetentionPolicies();

      expect(policies).toBeDefined();
      expect(Array.isArray(policies)).toBe(true);
      
      // All returned policies should be active
      policies.forEach(policy => {
        expect(policy.isActive).toBe(1);
      });
    });
  });

  describe("getEncryptionKeys", () => {
    it("returns encryption key metadata", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const keys = await caller.dataSecurity.getEncryptionKeys();

      expect(keys).toBeDefined();
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBeGreaterThan(0);

      // Check for required encryption types
      const dataKey = keys.find(k => k.keyType === "data_encryption");
      const transportKey = keys.find(k => k.keyType === "transport");

      expect(dataKey).toBeDefined();
      expect(dataKey?.algorithm).toBe("AES-256-GCM");
      expect(transportKey).toBeDefined();
      expect(transportKey?.algorithm).toBe("TLS 1.3");
    });
  });

  describe("requestDataDisposal", () => {
    it("creates a data disposal request", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.dataSecurity.requestDataDisposal({
        requestType: "project",
        targetId: 999,
        targetType: "project",
        reason: "Test disposal request for expired project data",
      });

      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
      expect(typeof result.requestId).toBe("number");
    });
  });

  describe("getDisposalRequests", () => {
    it("returns all disposal requests", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const requests = await caller.dataSecurity.getDisposalRequests();

      expect(requests).toBeDefined();
      expect(Array.isArray(requests)).toBe(true);
    });

    it("filters disposal requests by status", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const pendingRequests = await caller.dataSecurity.getDisposalRequests({
        status: "pending",
      });

      expect(pendingRequests).toBeDefined();
      expect(Array.isArray(pendingRequests)).toBe(true);
      
      // All returned requests should have pending status
      pendingRequests.forEach(request => {
        expect(request.status).toBe("pending");
      });
    });
  });

  describe("getSecuritySummary", () => {
    it("returns security summary with correct metrics", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const summary = await caller.dataSecurity.getSecuritySummary();

      expect(summary).toBeDefined();
      expect(summary.activePolicies).toBeGreaterThanOrEqual(0);
      expect(summary.pendingDisposals).toBeGreaterThanOrEqual(0);
      expect(summary.activeEncryptionKeys).toBeGreaterThanOrEqual(0);
      expect(summary.defaultRetentionYears).toBe(7);
    });
  });

  describe("data ownership and encryption standards", () => {
    it("verifies encryption key ownership is set to City", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const keys = await caller.dataSecurity.getEncryptionKeys();

      keys.forEach(key => {
        expect(key.keyOwner).toContain("City");
        expect(key.keyStatus).toBe("active");
      });
    });

    it("verifies 7-year retention policy is enforced", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const policies = await caller.dataSecurity.getActiveRetentionPolicies();

      // All active policies should have 7-year retention
      policies.forEach(policy => {
        expect(policy.retentionPeriodYears).toBe(7);
      });
    });
  });
});
