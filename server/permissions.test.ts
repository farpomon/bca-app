import { describe, expect, it } from "vitest";
import { hasPermission } from "./permissions";

describe("RBAC Permissions", () => {
  describe("hasPermission", () => {
    it("should allow admin to perform all actions", () => {
      expect(hasPermission("admin", "project.create")).toBe(true);
      expect(hasPermission("admin", "project.edit")).toBe(true);
      expect(hasPermission("admin", "project.delete")).toBe(true);
      expect(hasPermission("admin", "project.share")).toBe(true);
      expect(hasPermission("admin", "project.view")).toBe(true);
      expect(hasPermission("admin", "user.manage")).toBe(true);
      expect(hasPermission("admin", "audit.view")).toBe(true);
    });

    it("should allow project_manager to manage projects", () => {
      expect(hasPermission("project_manager", "project.create")).toBe(true);
      expect(hasPermission("project_manager", "project.edit")).toBe(true);
      expect(hasPermission("project_manager", "project.delete")).toBe(true);
      expect(hasPermission("project_manager", "project.share")).toBe(true);
      expect(hasPermission("project_manager", "project.view")).toBe(true);
    });

    it("should restrict project_manager from user management", () => {
      expect(hasPermission("project_manager", "user.manage")).toBe(false);
      expect(hasPermission("project_manager", "audit.view")).toBe(false);
    });

    it("should allow editor to edit and view projects", () => {
      expect(hasPermission("editor", "project.create")).toBe(true);
      expect(hasPermission("editor", "project.edit")).toBe(true);
      expect(hasPermission("editor", "project.view")).toBe(true);
    });

    it("should restrict editor from deleting and sharing", () => {
      expect(hasPermission("editor", "project.delete")).toBe(false);
      expect(hasPermission("editor", "project.share")).toBe(false);
      expect(hasPermission("editor", "user.manage")).toBe(false);
    });

    it("should allow viewer to only view projects", () => {
      expect(hasPermission("viewer", "project.view")).toBe(true);
    });

    it("should restrict viewer from all modifications", () => {
      expect(hasPermission("viewer", "project.create")).toBe(false);
      expect(hasPermission("viewer", "project.edit")).toBe(false);
      expect(hasPermission("viewer", "project.delete")).toBe(false);
      expect(hasPermission("viewer", "project.share")).toBe(false);
      expect(hasPermission("viewer", "user.manage")).toBe(false);
    });

    it("should handle invalid permissions gracefully", () => {
      expect(hasPermission("admin", "invalid.permission" as any)).toBe(false);
      expect(hasPermission("viewer", "invalid.permission" as any)).toBe(false);
    });
  });

  describe("Role Hierarchy", () => {
    it("should have correct permission hierarchy", () => {
      // Admin has all permissions
      const adminPerms = [
        "project.create",
        "project.edit",
        "project.delete",
        "project.share",
        "project.view",
        "user.manage",
        "audit.view",
      ] as const;
      
      adminPerms.forEach(perm => {
        expect(hasPermission("admin", perm)).toBe(true);
      });

      // Project manager has project permissions but not user/audit
      expect(hasPermission("project_manager", "project.create")).toBe(true);
      expect(hasPermission("project_manager", "user.manage")).toBe(false);
      expect(hasPermission("project_manager", "audit.view")).toBe(false);

      // Editor can create and edit but not delete or share
      expect(hasPermission("editor", "project.create")).toBe(true);
      expect(hasPermission("editor", "project.edit")).toBe(true);
      expect(hasPermission("editor", "project.delete")).toBe(false);
      expect(hasPermission("editor", "project.share")).toBe(false);

      // Viewer can only view
      expect(hasPermission("viewer", "project.view")).toBe(true);
      expect(hasPermission("viewer", "project.create")).toBe(false);
    });
  });
});
