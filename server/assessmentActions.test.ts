import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    getProjectById: vi.fn().mockResolvedValue({ id: 1, name: "Test Project", userId: 1, company: "test-company" }),
    getAssessmentActions: vi.fn(),
    bulkUpsertAssessmentActions: vi.fn(),
  };
});

import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    company: "test-company",
    companyId: 1,
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

describe("assessments.getActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when no actions exist", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    (db.getAssessmentActions as any).mockResolvedValue([]);

    const result = await caller.assessments.getActions({
      assessmentId: 1,
      projectId: 1,
    });

    expect(result).toEqual([]);
    expect(db.getAssessmentActions).toHaveBeenCalledWith(1);
  });

  it("returns actions when they exist", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const mockActions = [
      {
        id: 1,
        assessmentId: 1,
        description: "Replace damaged roofing",
        priority: "immediate",
        timeline: "Within 6 months",
        estimatedCost: "15000.00",
        consequenceOfDeferral: "Water damage to interior",
        confidence: 85,
        sortOrder: 0,
      },
      {
        id: 2,
        assessmentId: 1,
        description: "Repair flashing",
        priority: "short_term",
        timeline: "1-2 years",
        estimatedCost: "5000.00",
        consequenceOfDeferral: "Accelerated deterioration",
        confidence: 90,
        sortOrder: 1,
      },
    ];

    (db.getAssessmentActions as any).mockResolvedValue(mockActions);

    const result = await caller.assessments.getActions({
      assessmentId: 1,
      projectId: 1,
    });

    expect(result).toHaveLength(2);
    expect(result[0].description).toBe("Replace damaged roofing");
    expect(result[1].description).toBe("Repair flashing");
  });
});

describe("assessments.saveActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves new actions successfully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const savedActions = [
      {
        id: 1,
        assessmentId: 1,
        description: "Replace damaged roofing",
        priority: "immediate",
        timeline: "Within 6 months",
        estimatedCost: "15000.00",
        consequenceOfDeferral: "Water damage to interior",
        confidence: 85,
        sortOrder: 0,
      },
    ];

    (db.bulkUpsertAssessmentActions as any).mockResolvedValue(savedActions);

    const result = await caller.assessments.saveActions({
      assessmentId: 1,
      projectId: 1,
      actions: [
        {
          description: "Replace damaged roofing",
          priority: "immediate",
          timeline: "Within 6 months",
          estimatedCost: 15000,
          consequenceOfDeferral: "Water damage to interior",
          confidence: 85,
          sortOrder: 0,
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(db.bulkUpsertAssessmentActions).toHaveBeenCalled();
  });

  it("updates existing actions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const updatedActions = [
      {
        id: 1,
        assessmentId: 1,
        description: "Updated description",
        priority: "short_term",
        timeline: "1-2 years",
        estimatedCost: "20000.00",
        consequenceOfDeferral: "Updated consequence",
        confidence: 90,
        sortOrder: 0,
      },
    ];

    (db.bulkUpsertAssessmentActions as any).mockResolvedValue(updatedActions);

    const result = await caller.assessments.saveActions({
      assessmentId: 1,
      projectId: 1,
      actions: [
        {
          id: 1,
          description: "Updated description",
          priority: "short_term",
          timeline: "1-2 years",
          estimatedCost: 20000,
          consequenceOfDeferral: "Updated consequence",
          confidence: 90,
          sortOrder: 0,
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Updated description");
  });

  it("handles multiple actions with different priorities", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const multipleActions = [
      {
        id: 1,
        assessmentId: 1,
        description: "Immediate action",
        priority: "immediate",
        sortOrder: 0,
      },
      {
        id: 2,
        assessmentId: 1,
        description: "Short term action",
        priority: "short_term",
        sortOrder: 1,
      },
      {
        id: 3,
        assessmentId: 1,
        description: "Long term action",
        priority: "long_term",
        sortOrder: 2,
      },
    ];

    (db.bulkUpsertAssessmentActions as any).mockResolvedValue(multipleActions);

    const result = await caller.assessments.saveActions({
      assessmentId: 1,
      projectId: 1,
      actions: [
        { description: "Immediate action", priority: "immediate", sortOrder: 0 },
        { description: "Short term action", priority: "short_term", sortOrder: 1 },
        { description: "Long term action", priority: "long_term", sortOrder: 2 },
      ],
    });

    expect(result).toHaveLength(3);
    expect(result[0].priority).toBe("immediate");
    expect(result[1].priority).toBe("short_term");
    expect(result[2].priority).toBe("long_term");
  });
});
