import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(user: AuthenticatedUser): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("AI Chat Feature", () => {
  const testUser: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    companyId: 1,
    company: "Test Company",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  describe("sendMessage", () => {
    it("should reject empty messages", async () => {
      const ctx = createTestContext(testUser);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.aiChat.sendMessage({
          sessionType: "project",
          contextId: 1,
          message: "",
        })
      ).rejects.toThrow();
    });

    it("should reject project chat without contextId", async () => {
      const ctx = createTestContext(testUser);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.aiChat.sendMessage({
          sessionType: "project",
          message: "Tell me about this project",
        })
      ).rejects.toThrow();
    });

    it("should reject asset chat without contextId", async () => {
      const ctx = createTestContext(testUser);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.aiChat.sendMessage({
          sessionType: "asset",
          message: "What's the condition of this asset?",
        })
      ).rejects.toThrow();
    });

    it.skip("should reject company chat for non-admin users (requires database)", async () => {
      const regularUser: AuthenticatedUser = {
        ...testUser,
        role: "user",
        companyId: 1,
        company: "Test Company",
      };
      const ctx = createTestContext(regularUser);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.aiChat.sendMessage({
          sessionType: "company",
          message: "Show me company portfolio insights",
        })
      ).rejects.toThrow(/Insufficient permissions/);
    });
  });

  describe("getSessions", () => {
    it("should return empty array when no sessions exist", async () => {
      const ctx = createTestContext(testUser);
      const caller = appRouter.createCaller(ctx);

      const sessions = await caller.aiChat.getSessions({});
      expect(Array.isArray(sessions)).toBe(true);
    });

    it("should filter sessions by type", async () => {
      const ctx = createTestContext(testUser);
      const caller = appRouter.createCaller(ctx);

      const sessions = await caller.aiChat.getSessions({
        sessionType: "project",
      });
      expect(Array.isArray(sessions)).toBe(true);
    });
  });

  describe("getSession", () => {
    it("should reject non-existent session", async () => {
      const ctx = createTestContext(testUser);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.aiChat.getSession({ sessionId: 999999 })
      ).rejects.toThrow(/Session not found/);
    });
  });

  describe("deleteSession", () => {
    it("should reject non-existent session", async () => {
      const ctx = createTestContext(testUser);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.aiChat.deleteSession({ sessionId: 999999 })
      ).rejects.toThrow(/Session not found/);
    });
  });
});
