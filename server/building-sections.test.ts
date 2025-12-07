import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "admin" | "user" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
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
    res: {} as TrpcContext["res"],
  };
}

describe("Building Sections Management", () => {
  it("should create a building section", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const section = await caller.buildingSections.create({
      projectId: 600001,
      name: "East Wing Addition",
      description: "2015 addition to main building",
      sectionType: "addition",
      installDate: "2015-06-01",
      expectedLifespan: 50,
    });

    expect(section).toBeDefined();
    expect(section.name).toBe("East Wing Addition");
    expect(section.expectedLifespan).toBe(50);
  });

  it("should list building sections for a project", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a section first
    await caller.buildingSections.create({
      projectId: 600001,
      name: "Original Building",
      description: "Main structure built in 1985",
      sectionType: "original",
      installDate: "1985-01-01",
      expectedLifespan: 75,
    });

    const sections = await caller.buildingSections.list({
      projectId: 600001,
    });

    expect(sections.length).toBeGreaterThan(0);
    expect(sections.some(s => s.name === "Original Building")).toBe(true);
  });

  it("should update a building section", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a section
    const section = await caller.buildingSections.create({
      projectId: 600001,
      name: "West Wing",
      description: "Original description",
      sectionType: "extension",
      installDate: "2010-01-01",
      expectedLifespan: 50,
    });

    // Update it
    const updated = await caller.buildingSections.update({
      sectionId: section.id,
      description: "Updated description",
      expectedLifespan: 60,
    });

    expect(updated.description).toBe("Updated description");
    expect(updated.expectedLifespan).toBe(60);
  });

  it("should delete a building section", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a section
    const section = await caller.buildingSections.create({
      projectId: 600001,
      name: "Temporary Structure",
      sectionType: "addition",
      installDate: "2020-01-01",
      expectedLifespan: 10,
    });

    // Delete it
    await caller.buildingSections.delete({ sectionId: section.id });

    // Verify it's gone
    const sections = await caller.buildingSections.list({
      projectId: 600001,
    });

    expect(sections.some(s => s.id === section.id)).toBe(false);
  });

  it("should calculate section-specific stats", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a section
    const section = await caller.buildingSections.create({
      projectId: 600001,
      name: "North Wing",
      sectionType: "extension",
      installDate: "2000-01-01",
      expectedLifespan: 50,
    });

    // Get stats (should be 0 initially)
    const stats = await caller.buildingSections.stats({
      sectionId: section.id,
    });

    expect(stats).toBeDefined();
    expect(stats.total).toBe(0);
    expect(stats.good).toBe(0);
    expect(stats.fair).toBe(0);
    expect(stats.poor).toBe(0);
  });
});
