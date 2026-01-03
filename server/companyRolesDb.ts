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


/**
 * Create a new company and assign the creator as company_admin
 */
export async function createCompany(data: {
  name: string;
  city?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
}, creatorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Create the company
  const result = await db.insert(companies).values({
    name: data.name,
    city: data.city || null,
    contactEmail: data.contactEmail || null,
    contactPhone: data.contactPhone || null,
    address: data.address || null,
    notes: data.notes || null,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const companyId = result[0].insertId;

  // Add creator as company_admin
  await db.insert(companyUsers).values({
    companyId,
    userId: creatorUserId,
    companyRole: "company_admin",
    invitedBy: creatorUserId,
    invitedAt: new Date().toISOString(),
    acceptedAt: new Date().toISOString(),
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return companyId;
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result[0] || null;
}

/**
 * Create a pending invitation for a user to join a company
 */
export async function createPendingInvitation(data: {
  companyId: number;
  email: string;
  role: "company_admin" | "project_manager" | "editor" | "viewer";
  invitedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if user exists
  const existingUser = await findUserByEmail(data.email);
  
  if (existingUser) {
    // User exists, add them directly with pending status
    const existing = await db
      .select()
      .from(companyUsers)
      .where(
        and(
          eq(companyUsers.userId, existingUser.id),
          eq(companyUsers.companyId, data.companyId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing record
      await db
        .update(companyUsers)
        .set({
          companyRole: data.role,
          status: "pending",
          invitedBy: data.invitedBy,
          invitedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(companyUsers.id, existing[0].id));
      
      return { id: existing[0].id, userId: existingUser.id, isNewUser: false };
    }

    // Create new company user record
    const result = await db.insert(companyUsers).values({
      companyId: data.companyId,
      userId: existingUser.id,
      companyRole: data.role,
      invitedBy: data.invitedBy,
      invitedAt: new Date().toISOString(),
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { id: result[0].insertId, userId: existingUser.id, isNewUser: false };
  }

  // User doesn't exist - return info for email invitation
  return { id: null, userId: null, isNewUser: true, email: data.email };
}

/**
 * Accept a pending invitation
 */
export async function acceptInvitation(userId: number, companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(companyUsers)
    .set({
      status: "active",
      acceptedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(companyUsers.userId, userId),
        eq(companyUsers.companyId, companyId),
        eq(companyUsers.status, "pending")
      )
    );
}

/**
 * Get pending invitations for a user
 */
export async function getPendingInvitations(userId: number) {
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
        eq(companyUsers.status, "pending")
      )
    );

  return result;
}

/**
 * Update company details
 */
export async function updateCompany(companyId: number, data: {
  name?: string;
  city?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(companies)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(companies.id, companyId));
}
