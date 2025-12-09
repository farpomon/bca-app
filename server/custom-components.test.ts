import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1, role: "user" | "admin" = "user"): TrpcContext {
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

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("customComponents router", () => {
  const projectId = 1;

  describe("customComponents.create", () => {
    it("should create a custom component successfully", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customComponents.create({
        projectId,
        code: "TEST-001",
        name: "Test Custom Component",
        level: 3,
        parentCode: "A10",
        description: "A test custom component",
      });

      expect(result).toEqual({ success: true });
    });

    it("should reject duplicate component codes", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create first component
      await caller.customComponents.create({
        projectId,
        code: "DUP-001",
        name: "First Component",
        level: 3,
        parentCode: "A10",
      });

      // Try to create duplicate
      await expect(
        caller.customComponents.create({
          projectId,
          code: "DUP-001",
          name: "Duplicate Component",
          level: 3,
          parentCode: "A10",
        })
      ).rejects.toThrow("Component code already exists");
    });

    it("should allow same code in different projects", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create in project 1
      await caller.customComponents.create({
        projectId: 1,
        code: "SHARED-001",
        name: "Component in Project 1",
        level: 3,
        parentCode: "A10",
      });

      // Create same code in project 2
      const result = await caller.customComponents.create({
        projectId: 2,
        code: "SHARED-001",
        name: "Component in Project 2",
        level: 3,
        parentCode: "A10",
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe("customComponents.list", () => {
    it("should list custom components for a project", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create some custom components
      await caller.customComponents.create({
        projectId,
        code: "LIST-001",
        name: "Component 1",
        level: 3,
        parentCode: "A10",
      });

      await caller.customComponents.create({
        projectId,
        code: "LIST-002",
        name: "Component 2",
        level: 2,
        parentCode: "A",
      });

      const components = await caller.customComponents.list({ projectId });

      expect(components.length).toBeGreaterThanOrEqual(2);
      expect(components.some(c => c.code === "LIST-001")).toBe(true);
      expect(components.some(c => c.code === "LIST-002")).toBe(true);
    });

    it("should return empty array for project with no custom components", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const components = await caller.customComponents.list({ projectId: 9999 });

      expect(components).toEqual([]);
    });
  });

  describe("customComponents.delete", () => {
    it("should delete a custom component", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a component
      await caller.customComponents.create({
        projectId,
        code: "DEL-001",
        name: "To Be Deleted",
        level: 3,
        parentCode: "A10",
      });

      // Get the component to find its ID
      const components = await caller.customComponents.list({ projectId });
      const toDelete = components.find(c => c.code === "DEL-001");
      expect(toDelete).toBeDefined();

      // Delete it
      const result = await caller.customComponents.delete({
        id: toDelete!.id,
        projectId,
      });

      expect(result).toEqual({ success: true });

      // Verify it's gone
      const afterDelete = await caller.customComponents.list({ projectId });
      expect(afterDelete.some(c => c.code === "DEL-001")).toBe(false);
    });
  });

  describe("components.list integration", () => {
    it("should merge custom components with standard components", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a custom component
      await caller.customComponents.create({
        projectId,
        code: "MERGE-001",
        name: "Custom Merged Component",
        level: 3,
        parentCode: "A10",
      });

      // Get all components (should include both standard and custom)
      const allComponents = await caller.components.list({ projectId });

      // Should have standard components
      expect(allComponents.some(c => c.code.startsWith("A"))).toBe(true);
      
      // Should have our custom component
      const customComp = allComponents.find(c => c.code === "MERGE-001");
      expect(customComp).toBeDefined();
      expect(customComp?.isCustom).toBe(true);
    });
  });
});
