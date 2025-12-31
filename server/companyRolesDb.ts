import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { companyUsers, companies, users, type CompanyUser, type InsertCompanyUser } from "../drizzle/schema";

/**
 * Get all companies a user belongs to with their roles
 */
export async function getUserCompanies(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      companyUser: companyUsers,
      company: companies,
    })
    .from(companyUsers)
    .innerJoin(companies, eq(companyUsers.companyId, companies.id))
    .where(
      and(
        eq(companyUsers.userId, userId),
        eq(companyUsers.status, "active")
      )
    );

  return result;
}

/**
 * Get user's role in a specific company
 */
export async function getUserRoleInCompany(userId: number, companyId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(companyUsers)
    .where(
      and(
        eq(companyUsers.userId, userId),
        eq(companyUsers.companyId, companyId),
        eq(companyUsers.status, "active")
      )
    )
    .limit(1);

  return result[0] || null;
}

/**
 * Check if user has a specific role or higher in a company
 * Role hierarchy: company_admin > project_manager > editor > viewer
 */
export async function hasCompanyRole(
  userId: number,
  companyId: number,
  requiredRole: "company_admin" | "project_manager" | "editor" | "viewer"
): Promise<boolean> {
  const userRole = await getUserRoleInCompany(userId, companyId);
  if (!userRole) return false;

  const roleHierarchy = {
    company_admin: 4,
    project_manager: 3,
    editor: 2,
    viewer: 1,
  };

  return roleHierarchy[userRole.companyRole] >= roleHierarchy[requiredRole];
}

/**
 * Get all users in a company with their roles
 */
export async function getCompanyUsers(companyId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      companyUser: companyUsers,
      user: users,
    })
    .from(companyUsers)
    .innerJoin(users, eq(companyUsers.userId, users.id))
    .where(eq(companyUsers.companyId, companyId));

  return result;
}

/**
 * Add a user to a company with a specific role
 */
export async function addUserToCompany(data: InsertCompanyUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if user is already in the company
  const existing = await db
    .select()
    .from(companyUsers)
    .where(
      and(
        eq(companyUsers.userId, data.userId),
        eq(companyUsers.companyId, data.companyId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing record
    await db
      .update(companyUsers)
      .set({
        companyRole: data.companyRole,
        status: data.status || "active",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(companyUsers.id, existing[0].id));
    
    return existing[0].id;
  }

  // Insert new record
  const result = await db.insert(companyUsers).values({
    ...data,
    invitedAt: new Date().toISOString(),
    acceptedAt: data.status === "active" ? new Date().toISOString() : undefined,
  });

  return result[0].insertId;
}

/**
 * Remove a user from a company
 */
export async function removeUserFromCompany(userId: number, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(companyUsers)
    .set({
      status: "inactive",
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(companyUsers.userId, userId),
        eq(companyUsers.companyId, companyId)
      )
    );
}

/**
 * Update user's role in a company
 */
export async function updateUserRoleInCompany(
  userId: number,
  companyId: number,
  newRole: "company_admin" | "project_manager" | "editor" | "viewer"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(companyUsers)
    .set({
      companyRole: newRole,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(companyUsers.userId, userId),
        eq(companyUsers.companyId, companyId)
      )
    );
}

/**
 * Get all companies (admin only)
 */
export async function getAllCompanies() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(companies);
}

/**
 * Get company by ID
 */
export async function getCompanyById(companyId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  return result[0] || null;
}

/**
 * Check if user belongs to any of the specified companies
 */
export async function userBelongsToCompanies(userId: number, companyIds: number[]): Promise<boolean> {
  if (companyIds.length === 0) return false;
  
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select()
    .from(companyUsers)
    .where(
      and(
        eq(companyUsers.userId, userId),
        inArray(companyUsers.companyId, companyIds),
        eq(companyUsers.status, "active")
      )
    )
    .limit(1);

  return result.length > 0;
}
