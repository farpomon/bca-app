import { describe, expect, it } from "vitest";
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

describe("Assessment Status Filter", () => {
  it("should filter assessments by status", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get all assessments for a project
    const allAssessments = await caller.assessments.list({ projectId: 1 });
    expect(Array.isArray(allAssessments)).toBe(true);

    // Get only active assessments
    const activeAssessments = await caller.assessments.list({ 
      projectId: 1, 
      status: "active" 
    });
    expect(Array.isArray(activeAssessments)).toBe(true);
    
    // If there are active assessments, verify they all have active status
    if (activeAssessments.length > 0) {
      activeAssessments.forEach(assessment => {
        expect(assessment.status).toBe("active");
      });
    }
  });

  it("should get status counts for a project", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const counts = await caller.assessments.statusCounts({ projectId: 1 });
    
    expect(counts).toHaveProperty("initial");
    expect(counts).toHaveProperty("active");
    expect(counts).toHaveProperty("completed");
    expect(typeof counts.initial).toBe("number");
    expect(typeof counts.active).toBe("number");
    expect(typeof counts.completed).toBe("number");
  });

  it("should save assessment with status", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.assessments.upsert({
      projectId: 1,
      componentCode: "B2010",
      condition: "good",
      status: "active",
      observations: "Test observation",
      expectedUsefulLife: 50,
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });
});
