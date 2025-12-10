/**
 * Role-Based Access Control (RBAC) Permissions
 * 
 * Defines what each role can do in the system
 */

export type UserRole = "viewer" | "editor" | "project_manager" | "admin";

export type Permission =
  | "project.view"
  | "project.create"
  | "project.edit"
  | "project.delete"
  | "project.share"
  | "assessment.view"
  | "assessment.create"
  | "assessment.edit"
  | "assessment.delete"
  | "user.view"
  | "user.manage"
  | "audit.view"
  | "settings.manage";

/**
 * Permission mapping for each role
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  viewer: [
    "project.view",
    "assessment.view",
  ],
  editor: [
    "project.view",
    "project.create",
    "project.edit",
    "assessment.view",
    "assessment.create",
    "assessment.edit",
  ],
  project_manager: [
    "project.view",
    "project.create",
    "project.edit",
    "project.delete",
    "project.share",
    "assessment.view",
    "assessment.create",
    "assessment.edit",
    "assessment.delete",
    "user.view",
  ],
  admin: [
    "project.view",
    "project.create",
    "project.edit",
    "project.delete",
    "project.share",
    "assessment.view",
    "assessment.create",
    "assessment.edit",
    "assessment.delete",
    "user.view",
    "user.manage",
    "audit.view",
    "settings.manage",
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
