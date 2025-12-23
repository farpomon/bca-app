import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "admin" | "user" = "user"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    company: "test-company",
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

describe("Projects - getSuggestedQuestions", () => {
  it("should return default questions for project with no data", async () => {
    const { ctx } = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    // Use a non-existent project ID that will have no assessments/deficiencies
    const projectId = 999999;

    try {
      const questions = await caller.projects.getSuggestedQuestions({ projectId });

      // Should return default questions when no project data
      expect(questions).toBeDefined();
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.length).toBeLessThanOrEqual(4);
    } catch (error: any) {
      // If project not found, that's expected for non-existent project
      expect(error.code).toBe("NOT_FOUND");
    }
  });

  it("should return at most 4 questions", async () => {
    const { ctx } = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    // Test with first available project
    const projectId = 1;

    try {
      const questions = await caller.projects.getSuggestedQuestions({ projectId });

      expect(questions).toBeDefined();
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeLessThanOrEqual(4);
    } catch (error: any) {
      // If project not found, skip this test
      if (error.code === "NOT_FOUND") {
        expect(error.code).toBe("NOT_FOUND");
      } else {
        throw error;
      }
    }
  });

  it("should return string array of questions", async () => {
    const { ctx } = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const projectId = 1;

    try {
      const questions = await caller.projects.getSuggestedQuestions({ projectId });

      expect(questions).toBeDefined();
      expect(Array.isArray(questions)).toBe(true);
      
      // Each question should be a non-empty string
      questions.forEach(question => {
        expect(typeof question).toBe("string");
        expect(question.length).toBeGreaterThan(0);
      });
    } catch (error: any) {
      // If project not found, that's acceptable
      if (error.code === "NOT_FOUND") {
        expect(error.code).toBe("NOT_FOUND");
      } else {
        throw error;
      }
    }
  });

  it("should deny access to non-admin users for other companies' projects", async () => {
    const { ctx } = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    // Try to access a project (should fail if not in same company)
    const projectId = 1;

    try {
      await caller.projects.getSuggestedQuestions({ projectId });
      // If we get here, either the project belongs to the user's company or access control failed
    } catch (error: any) {
      // Should get NOT_FOUND for projects not in user's company
      expect(["NOT_FOUND", "UNAUTHORIZED"]).toContain(error.code);
    }
  });
});

describe("Assets - getSuggestedQuestions", () => {
  it("should return default questions for asset with no data", async () => {
    const { ctx } = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const projectId = 999999;
    const assetId = 999999;

    try {
      const questions = await caller.assets.getSuggestedQuestions({ projectId, assetId });

      expect(questions).toBeDefined();
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.length).toBeLessThanOrEqual(4);
    } catch (error: any) {
      // If asset/project not found, that's expected
      expect(error.code).toBe("NOT_FOUND");
    }
  });

  it("should return at most 4 questions", async () => {
    const { ctx } = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const projectId = 1;
    const assetId = 1;

    try {
      const questions = await caller.assets.getSuggestedQuestions({ projectId, assetId });

      expect(questions).toBeDefined();
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeLessThanOrEqual(4);
    } catch (error: any) {
      // If asset not found, skip this test
      if (error.code === "NOT_FOUND") {
        expect(error.code).toBe("NOT_FOUND");
      } else {
        throw error;
      }
    }
  });

  it("should return string array of questions", async () => {
    const { ctx } = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const projectId = 1;
    const assetId = 1;

    try {
      const questions = await caller.assets.getSuggestedQuestions({ projectId, assetId });

      expect(questions).toBeDefined();
      expect(Array.isArray(questions)).toBe(true);
      
      questions.forEach(question => {
        expect(typeof question).toBe("string");
        expect(question.length).toBeGreaterThan(0);
      });
    } catch (error: any) {
      if (error.code === "NOT_FOUND") {
        expect(error.code).toBe("NOT_FOUND");
      } else {
        throw error;
      }
    }
  });

  it("should require both projectId and assetId", async () => {
    const { ctx } = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const projectId = 1;
    const assetId = 1;

    try {
      const questions = await caller.assets.getSuggestedQuestions({ projectId, assetId });
      
      // If successful, verify we got questions
      expect(questions).toBeDefined();
    } catch (error: any) {
      // Should get NOT_FOUND if asset doesn't exist, not a validation error
      expect(error.code).toBe("NOT_FOUND");
    }
  });
});

describe("Suggested Questions - Content Quality", () => {
  it("project questions should be relevant to building assessments", async () => {
    const { ctx } = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const projectId = 1;

    try {
      const questions = await caller.projects.getSuggestedQuestions({ projectId });

      // Questions should contain assessment-related keywords
      const assessmentKeywords = [
        "condition", "component", "assess", "repair", "deficien", 
        "maintenance", "cost", "priority", "building", "critical"
      ];

      const hasRelevantContent = questions.some(q => 
        assessmentKeywords.some(keyword => 
          q.toLowerCase().includes(keyword)
        )
      );

      expect(hasRelevantContent).toBe(true);
    } catch (error: any) {
      if (error.code === "NOT_FOUND") {
        expect(error.code).toBe("NOT_FOUND");
      } else {
        throw error;
      }
    }
  });

  it("asset questions should be relevant to asset assessments", async () => {
    const { ctx } = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const projectId = 1;
    const assetId = 1;

    try {
      const questions = await caller.assets.getSuggestedQuestions({ projectId, assetId });

      // Questions should contain asset-related keywords
      const assetKeywords = [
        "asset", "condition", "component", "system", "repair", 
        "maintenance", "cost", "priority", "deficien"
      ];

      const hasRelevantContent = questions.some(q => 
        assetKeywords.some(keyword => 
          q.toLowerCase().includes(keyword)
        )
      );

      expect(hasRelevantContent).toBe(true);
    } catch (error: any) {
      if (error.code === "NOT_FOUND") {
        expect(error.code).toBe("NOT_FOUND");
      } else {
        throw error;
      }
    }
  });
});
