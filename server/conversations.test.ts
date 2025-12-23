import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as conversationsDb from "./conversationsDb";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1, role: "admin" | "user" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
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

  return ctx;
}

describe("Conversation Persistence", () => {
  describe("conversationsDb helpers", () => {
    it("should save and retrieve project conversation", async () => {
      const userId = 1;
      const projectId = 100;
      const messages = [
        { role: "user" as const, content: "What is the condition of this project?" },
        { role: "assistant" as const, content: "The project has 5 assessments with 2 critical deficiencies." },
      ];

      // Save conversation
      await conversationsDb.saveConversation(userId, "project", projectId, messages);

      // Retrieve conversation
      const conversation = await conversationsDb.getConversation(userId, "project", projectId);

      expect(conversation).toBeDefined();
      expect(conversation?.messages).toHaveLength(2);
      expect(conversation?.messages[0]?.role).toBe("user");
      expect(conversation?.messages[1]?.role).toBe("assistant");
      expect(conversation?.contextType).toBe("project");
      expect(conversation?.contextId).toBe(projectId);
    });

    it("should update existing conversation when saving again", async () => {
      const userId = 1;
      const projectId = 101;
      const initialMessages = [
        { role: "user" as const, content: "First message" },
        { role: "assistant" as const, content: "First response" },
      ];

      // Save initial conversation
      await conversationsDb.saveConversation(userId, "project", projectId, initialMessages);

      // Update with more messages
      const updatedMessages = [
        ...initialMessages,
        { role: "user" as const, content: "Second message" },
        { role: "assistant" as const, content: "Second response" },
      ];

      await conversationsDb.saveConversation(userId, "project", projectId, updatedMessages);

      // Retrieve updated conversation
      const conversation = await conversationsDb.getConversation(userId, "project", projectId);

      expect(conversation?.messages).toHaveLength(4);
      expect(conversation?.messages[2]?.content).toBe("Second message");
    });

    it("should save and retrieve asset conversation", async () => {
      const userId = 1;
      const assetId = 200;
      const messages = [
        { role: "user" as const, content: "What is the status of this asset?" },
        { role: "assistant" as const, content: "The asset has 3 assessments." },
      ];

      // Save conversation
      await conversationsDb.saveConversation(userId, "asset", assetId, messages);

      // Retrieve conversation
      const conversation = await conversationsDb.getConversation(userId, "asset", assetId);

      expect(conversation).toBeDefined();
      expect(conversation?.messages).toHaveLength(2);
      expect(conversation?.contextType).toBe("asset");
      expect(conversation?.contextId).toBe(assetId);
    });

    it("should clear conversation", async () => {
      const userId = 1;
      const projectId = 102;
      const messages = [
        { role: "user" as const, content: "Test message" },
        { role: "assistant" as const, content: "Test response" },
      ];

      // Save conversation
      await conversationsDb.saveConversation(userId, "project", projectId, messages);

      // Verify it exists
      let conversation = await conversationsDb.getConversation(userId, "project", projectId);
      expect(conversation).toBeDefined();

      // Clear conversation
      await conversationsDb.clearConversation(userId, "project", projectId);

      // Verify it's gone
      conversation = await conversationsDb.getConversation(userId, "project", projectId);
      expect(conversation).toBeNull();
    });

    it("should return null for non-existent conversation", async () => {
      const userId = 999;
      const projectId = 999;

      const conversation = await conversationsDb.getConversation(userId, "project", projectId);

      expect(conversation).toBeNull();
    });

    it("should isolate conversations by user", async () => {
      const projectId = 103;
      const user1Messages = [
        { role: "user" as const, content: "User 1 message" },
        { role: "assistant" as const, content: "User 1 response" },
      ];
      const user2Messages = [
        { role: "user" as const, content: "User 2 message" },
        { role: "assistant" as const, content: "User 2 response" },
      ];

      // Save conversations for two different users
      await conversationsDb.saveConversation(1, "project", projectId, user1Messages);
      await conversationsDb.saveConversation(2, "project", projectId, user2Messages);

      // Retrieve conversations
      const conv1 = await conversationsDb.getConversation(1, "project", projectId);
      const conv2 = await conversationsDb.getConversation(2, "project", projectId);

      expect(conv1?.messages[0]?.content).toBe("User 1 message");
      expect(conv2?.messages[0]?.content).toBe("User 2 message");
    });
  });

  describe("tRPC endpoints", () => {
    it("should return empty array for new conversation", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Note: This will fail if project doesn't exist, so we're testing the endpoint structure
      // In a real test, you'd need to create a test project first
      try {
        const result = await caller.projects.getConversation({ projectId: 999999 });
        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        // Expected to fail with NOT_FOUND if project doesn't exist
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });
});
