import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

// Mock the LLM module
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    id: "test-id",
    created: Date.now(),
    model: "gemini-2.5-flash",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "To create a new project, go to the Projects page and click the 'New Project' button.",
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    },
  }),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
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
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("chatbot.chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a response for a valid message", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chatbot.chat({
      message: "How do I create a new project?",
    });

    expect(result).toBeDefined();
    expect(result.response).toBeDefined();
    expect(typeof result.response).toBe("string");
    expect(result.response.length).toBeGreaterThan(0);
  });

  it("accepts message history for context", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chatbot.chat({
      message: "Can you tell me more about that?",
      history: [
        { role: "user", content: "How do I create a new project?" },
        { role: "assistant", content: "To create a new project, click New Project." },
      ],
    });

    expect(result).toBeDefined();
    expect(result.response).toBeDefined();
  });

  it("rejects empty messages", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.chatbot.chat({
        message: "",
      })
    ).rejects.toThrow();
  });

  it("rejects messages that are too long", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const longMessage = "a".repeat(2001);

    await expect(
      caller.chatbot.chat({
        message: longMessage,
      })
    ).rejects.toThrow();
  });

  it("limits history to 20 messages", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create 21 messages (exceeds limit)
    const tooManyMessages = Array.from({ length: 21 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `Message ${i}`,
    }));

    await expect(
      caller.chatbot.chat({
        message: "Test message",
        history: tooManyMessages,
      })
    ).rejects.toThrow();
  });
});
