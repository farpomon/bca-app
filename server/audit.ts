import { getDb } from "./db";
import { auditLog } from "../drizzle/schema";

export type AuditAction = "create" | "update" | "delete";
export type AuditEntityType = "project" | "assessment" | "deficiency" | "user" | "component";

interface AuditLogEntry {
  userId: number;
  entityType: AuditEntityType;
  entityId: number;
  action: AuditAction;
  changes: Record<string, any>;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  };
}

/**
 * Log an audit entry for tracking changes
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Audit] Database not available, skipping audit log");
      return;
    }

    await db.insert(auditLog).values({
      userId: entry.userId,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      changes: JSON.stringify(entry.changes),
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    });
  } catch (error) {
    console.error("[Audit] Failed to log audit entry:", error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Log a project creation
 */
export async function logProjectCreated(
  userId: number,
  projectId: number,
  projectData: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  await logAudit({
    userId,
    entityType: "project",
    entityId: projectId,
    action: "create",
    changes: {
      after: projectData,
    },
    metadata,
  });
}

/**
 * Log a project update
 */
export async function logProjectUpdated(
  userId: number,
  projectId: number,
  before: Record<string, any>,
  after: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  await logAudit({
    userId,
    entityType: "project",
    entityId: projectId,
    action: "update",
    changes: {
      before,
      after,
    },
    metadata,
  });
}

/**
 * Log a project deletion
 */
export async function logProjectDeleted(
  userId: number,
  projectId: number,
  projectData: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  await logAudit({
    userId,
    entityType: "project",
    entityId: projectId,
    action: "delete",
    changes: {
      before: projectData,
    },
    metadata,
  });
}

/**
 * Log an assessment action
 */
export async function logAssessmentAction(
  userId: number,
  assessmentId: number,
  action: AuditAction,
  changes: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  await logAudit({
    userId,
    entityType: "assessment",
    entityId: assessmentId,
    action,
    changes,
    metadata,
  });
}

/**
 * Log a user management action
 */
export async function logUserAction(
  adminUserId: number,
  targetUserId: number,
  action: AuditAction,
  changes: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  await logAudit({
    userId: adminUserId,
    entityType: "user",
    entityId: targetUserId,
    action,
    changes,
    metadata,
  });
}
