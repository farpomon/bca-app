import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
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

describe("vocabulary.create", () => {
  it("creates a new vocabulary term", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.vocabulary.create({
      term: "HVAC",
      pronunciation: "H-V-A-C",
      category: "Technical Terms",
      notes: "Heating, Ventilation, and Air Conditioning",
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("creates a term with minimal data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.vocabulary.create({
      term: "Elastomeric",
    });

    expect(result).toHaveProperty("id");
  });
});

describe("vocabulary.list", () => {
  it("returns vocabulary terms for the user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a term first
    await caller.vocabulary.create({
      term: "Test Term",
      category: "Test",
    });

    const terms = await caller.vocabulary.list();

    expect(Array.isArray(terms)).toBe(true);
    expect(terms.length).toBeGreaterThan(0);
    expect(terms[0]).toHaveProperty("term");
    expect(terms[0]).toHaveProperty("userId");
  });
});

describe("vocabulary.getPrompt", () => {
  it("returns formatted prompt string", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create some terms
    await caller.vocabulary.create({
      term: "Membrane",
      pronunciation: "MEM-brayn",
    });

    const prompt = await caller.vocabulary.getPrompt();

    expect(typeof prompt).toBe("string");
    if (prompt) {
      expect(prompt).toContain("Technical terms to recognize:");
    }
  });
});
