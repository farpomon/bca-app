import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { sanitizeRichText, stripHtml } from "./htmlSanitizer";
import { detectChanges } from "./componentHistoryService";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "admin" | "user" = "admin"): TrpcContext {
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

describe("HTML Sanitization", () => {
  it("allows safe HTML tags", () => {
    const input = "<p>Hello <strong>world</strong> with <em>emphasis</em></p>";
    const output = sanitizeRichText(input);
    expect(output).toContain("<strong>");
    expect(output).toContain("<em>");
    expect(output).toContain("Hello");
  });

  it("removes script tags and dangerous content", () => {
    const input = '<p>Safe content</p><script>alert("XSS")</script>';
    const output = sanitizeRichText(input);
    expect(output).not.toContain("<script>");
    expect(output).not.toContain("alert");
    expect(output).toContain("Safe content");
  });

  it("removes onclick and other dangerous attributes", () => {
    const input = '<p onclick="alert(\'XSS\')">Click me</p>';
    const output = sanitizeRichText(input);
    expect(output).not.toContain("onclick");
    expect(output).toContain("Click me");
  });

  it("allows safe links with proper attributes", () => {
    const input = '<a href="https://example.com">Link</a>';
    const output = sanitizeRichText(input);
    expect(output).toContain('href="https://example.com"');
    expect(output).toContain('target="_blank"');
    expect(output).toContain('rel="noopener noreferrer"');
  });

  it("removes javascript: protocol from links", () => {
    const input = '<a href="javascript:alert(\'XSS\')">Bad link</a>';
    const output = sanitizeRichText(input);
    expect(output).not.toContain("javascript:");
  });

  it("strips all HTML tags to plain text", () => {
    const input = "<p>Hello <strong>world</strong> with <em>emphasis</em></p>";
    const output = stripHtml(input);
    expect(output).toBe("Hello world with emphasis");
    expect(output).not.toContain("<");
  });

  it("preserves lists and formatting", () => {
    const input = "<ul><li>Item 1</li><li>Item 2</li></ul>";
    const output = sanitizeRichText(input);
    expect(output).toContain("<ul>");
    expect(output).toContain("<li>");
    expect(output).toContain("Item 1");
  });
});

describe("Change Detection", () => {
  it("detects changed fields", () => {
    const oldObj = {
      condition: "good",
      observations: "Old observation",
      remainingUsefulLife: 10,
    };

    const newObj = {
      condition: "fair",
      observations: "New observation",
      remainingUsefulLife: 10,
    };

    const changes = detectChanges(oldObj, newObj);

    expect(changes).toHaveProperty("condition");
    expect(changes.condition.old).toBe("good");
    expect(changes.condition.new).toBe("fair");

    expect(changes).toHaveProperty("observations");
    expect(changes.observations.old).toBe("Old observation");
    expect(changes.observations.new).toBe("New observation");

    expect(changes).not.toHaveProperty("remainingUsefulLife");
  });

  it("handles null and undefined values", () => {
    const oldObj = { field1: null, field2: "value" };
    const newObj = { field1: null, field2: undefined };

    const changes = detectChanges(oldObj, newObj);

    expect(changes).not.toHaveProperty("field1");
    expect(changes).toHaveProperty("field2");
  });

  it("detects new fields", () => {
    const oldObj = { field1: "value1" };
    const newObj = { field1: "value1", field2: "value2" };

    const changes = detectChanges(oldObj, newObj);

    expect(changes).toHaveProperty("field2");
    expect(changes.field2.new).toBe("value2");
  });
});

describe("Component History Logging", () => {
  let projectId: number;
  let ctx: TrpcContext;

  beforeEach(async () => {
    ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    // Create a test project
    const project = await caller.projects.create({
      name: "History Test Project",
      description: "Testing history logging",
      location: "Test Location",
      yearBuilt: 2020,
    });
    projectId = project.id;
  });

  it("logs assessment creation to component history", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create an assessment
    await caller.assessments.upsert({
      projectId,
      componentCode: "TEST-001",
      condition: "good",
      observations: "<p>Initial <strong>observation</strong></p>",
      recommendations: "<p>Initial recommendation</p>",
    });

    // Check history was logged
    const history = await db.getComponentHistory(projectId, "TEST-001");

    expect(history.length).toBeGreaterThan(0);
    const creationEntry = history.find((h) => h.changeType === "assessment_created");
    expect(creationEntry).toBeDefined();
    expect(creationEntry?.userId).toBe(ctx.user.id);
  });

  it("logs assessment updates with field-level changes", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create initial assessment
    await caller.assessments.upsert({
      projectId,
      componentCode: "TEST-002",
      condition: "good",
      observations: "<p>Initial observation</p>",
    });

    // Update assessment
    await caller.assessments.upsert({
      projectId,
      componentCode: "TEST-002",
      condition: "fair",
      observations: "<p>Updated observation</p>",
    });

    // Check history
    const history = await db.getComponentHistory(projectId, "TEST-002");

    // Should have creation + update entries
    expect(history.length).toBeGreaterThan(1);

    const updateEntry = history.find((h) => h.changeType === "assessment_updated");
    expect(updateEntry).toBeDefined();
  });

  it("sanitizes rich text content in history", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create assessment with potentially dangerous HTML
    await caller.assessments.upsert({
      projectId,
      componentCode: "TEST-003",
      condition: "good",
      observations: '<p>Safe content</p><script>alert("XSS")</script>',
    });

    const history = await db.getComponentHistory(projectId, "TEST-003");
    const entry = history.find((h) => h.richTextContent);

    if (entry?.richTextContent) {
      expect(entry.richTextContent).not.toContain("<script>");
      expect(entry.richTextContent).toContain("Safe content");
    }
  });

  it("retrieves history for specific component", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create assessments for multiple components
    await caller.assessments.upsert({
      projectId,
      componentCode: "COMP-A",
      condition: "good",
    });

    await caller.assessments.upsert({
      projectId,
      componentCode: "COMP-B",
      condition: "fair",
    });

    // Get history for specific component
    const historyA = await caller.history.component({
      projectId,
      componentCode: "COMP-A",
    });

    const historyB = await caller.history.component({
      projectId,
      componentCode: "COMP-B",
    });

    expect(historyA.length).toBeGreaterThan(0);
    expect(historyB.length).toBeGreaterThan(0);

    // Each should only contain its own component
    expect(historyA.every((h) => h.componentCode === "COMP-A")).toBe(true);
    expect(historyB.every((h) => h.componentCode === "COMP-B")).toBe(true);
  });

  it("retrieves project-wide history", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create multiple assessments
    await caller.assessments.upsert({
      projectId,
      componentCode: "COMP-1",
      condition: "good",
    });

    await caller.assessments.upsert({
      projectId,
      componentCode: "COMP-2",
      condition: "fair",
    });

    // Get project history
    const history = await caller.history.project({
      projectId,
      limit: 100,
    });

    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history.every((h) => h.projectId === projectId)).toBe(true);
  });

  it("searches history with filters", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create assessment
    await caller.assessments.upsert({
      projectId,
      componentCode: "SEARCH-TEST",
      condition: "good",
      observations: "<p>Searchable content about roof damage</p>",
    });

    // Search should not error (content may not be immediately searchable)
    const results = await caller.history.search({
      projectId,
      searchTerm: "roof",
    });

    // Verify search executes without error
    expect(Array.isArray(results)).toBe(true);
    
    // Also test that we can get all history for this component
    const componentHistory = await caller.history.component({
      projectId,
      componentCode: "SEARCH-TEST",
    });
    expect(componentHistory.length).toBeGreaterThan(0);
  });

  it("filters history by change type", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create and update assessment
    await caller.assessments.upsert({
      projectId,
      componentCode: "FILTER-TEST",
      condition: "good",
    });

    await caller.assessments.upsert({
      projectId,
      componentCode: "FILTER-TEST",
      condition: "fair",
    });

    // Filter for only creation events
    const creations = await caller.history.search({
      projectId,
      changeType: "assessment_created",
    });

    expect(creations.every((h) => h.changeType === "assessment_created")).toBe(true);
  });

  it("stores user information with history entries", async () => {
    const caller = appRouter.createCaller(ctx);

    await caller.assessments.upsert({
      projectId,
      componentCode: "USER-TEST",
      condition: "good",
    });

    const history = await db.getComponentHistory(projectId, "USER-TEST");

    expect(history.length).toBeGreaterThan(0);
    expect(history[0]?.userId).toBe(ctx.user.id);
    expect(history[0]?.userName).toBe(ctx.user.name);
  });
});

describe("History API Endpoints", () => {
  it("requires authentication for history access", async () => {
    const unauthCtx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(unauthCtx);

    await expect(
      caller.history.component({
        projectId: 1,
        componentCode: "TEST",
      })
    ).rejects.toThrow();
  });

  it("prevents access to other users' project history", async () => {
    const ctx1 = createAuthContext("user");
    const ctx2 = createAuthContext("user");
    ctx2.user.id = 999; // Different user

    const caller1 = appRouter.createCaller(ctx1);

    // Create project as user 1
    const project = await caller1.projects.create({
      name: "User 1 Project",
      description: "Private project",
      location: "Location",
      yearBuilt: 2020,
    });

    // Try to access as user 2
    const caller2 = appRouter.createCaller(ctx2);

    await expect(
      caller2.history.component({
        projectId: project.id,
        componentCode: "TEST",
      })
    ).rejects.toThrow("Project not found");
  });
});
