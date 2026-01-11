import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { auditLogs, type InsertAuditLog } from "../drizzle/schema";
import type { User } from "../drizzle/schema";

/**
 * Action types for audit logging
 */
export type AuditActionType = 'create' | 'update' | 'delete' | 'recalculate' | 'import' | 'export' | 'bulk_delete' | 'bulk_update';

/**
 * Entity types that can be audited
 */
export type AuditEntityType = 
  | 'project' 
  | 'asset' 
  | 'assessment' 
  | 'deficiency' 
  | 'photo' 
  | 'criteria' 
  | 'cycle' 
  | 'allocation' 
  | 'analytics' 
  | 'ranking' 
  | 'esg_rating' 
  | 'report' 
  | 'user' 
  | 'company' 
  | 'building_code' 
  | 'maintenance_schedule' 
  | 'capital_plan' 
  | 'risk_assessment' 
  | 'timeline_event';

/**
 * Audit log entry parameters
 */
export interface AuditLogParams {
  user?: User | null;
  actionType: AuditActionType;
  entityType: AuditEntityType;
  entityId?: number | null;
  entityName?: string | null;
  module?: string;
  beforeState?: any;
  afterState?: any;
  changesSummary?: string;
  status?: 'success' | 'failed' | 'partial';
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: any;
}

/**
 * Create an audit log entry
 * 
 * This function captures system actions for governance, compliance, and debugging.
 * It should be called after successful operations or on failures to track what happened.
 * 
 * @param params - Audit log parameters
 * @returns The created audit log entry or null if logging failed
 */
export async function createAuditLog(params: AuditLogParams): Promise<typeof auditLogs.$inferSelect | null> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[AuditLog] Database not available, skipping audit log");
      return null;
    }

    const entry: InsertAuditLog = {
      timestamp: new Date().toISOString(),
      userId: params.user?.id ?? null,
      userName: params.user?.name ?? null,
      userEmail: params.user?.email ?? null,
      companyId: params.user?.companyId ?? null,
      companyName: null, // Will be populated if needed
      actionType: params.actionType,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      entityName: params.entityName ?? null,
      module: params.module ?? null,
      beforeState: params.beforeState ? JSON.stringify(params.beforeState) : null,
      afterState: params.afterState ? JSON.stringify(params.afterState) : null,
      changesSummary: params.changesSummary ?? null,
      status: params.status ?? 'success',
      errorMessage: params.errorMessage ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      sessionId: params.sessionId ?? null,
      requestId: params.requestId ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    };

    const result = await db.insert(auditLogs).values(entry);
    
    // Fetch the created entry to return it
    if (result && result[0]?.insertId) {
      const created = await db.select().from(auditLogs).where(eq(auditLogs.id, result[0].insertId)).limit(1);
      return created[0] ?? null;
    }

    return null;
  } catch (error) {
    console.error("[AuditLog] Failed to create audit log:", error);
    // Don't throw - audit logging should not break the main operation
    return null;
  }
}

/**
 * Generate a human-readable summary of changes between before and after states
 * 
 * @param before - State before the change
 * @param after - State after the change
 * @returns A summary string describing the changes
 */
export function generateChangesSummary(before: any, after: any): string {
  if (!before && after) {
    return "New record created";
  }
  
  if (before && !after) {
    return "Record deleted";
  }

  if (!before || !after) {
    return "No changes detected";
  }

  const changes: string[] = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const beforeVal = before[key];
    const afterVal = after[key];

    // Skip timestamp fields and IDs
    if (key.includes('At') || key.includes('Id') || key === 'id') {
      continue;
    }

    if (beforeVal !== afterVal) {
      if (beforeVal === null || beforeVal === undefined) {
        changes.push(`${key} set to "${afterVal}"`);
      } else if (afterVal === null || afterVal === undefined) {
        changes.push(`${key} cleared`);
      } else {
        changes.push(`${key} changed from "${beforeVal}" to "${afterVal}"`);
      }
    }
  }

  return changes.length > 0 ? changes.join(", ") : "No significant changes";
}

/**
 * Audit log wrapper for create operations
 * 
 * @param params - Audit parameters
 * @param operation - The operation to execute
 * @returns The result of the operation
 */
export async function auditCreate<T>(
  params: Omit<AuditLogParams, 'actionType' | 'beforeState'>,
  operation: () => Promise<T>
): Promise<T> {
  try {
    const result = await operation();
    
    await createAuditLog({
      ...params,
      actionType: 'create',
      afterState: result,
      status: 'success',
    });

    return result;
  } catch (error) {
    await createAuditLog({
      ...params,
      actionType: 'create',
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Audit log wrapper for update operations
 * 
 * @param params - Audit parameters including before state
 * @param operation - The operation to execute
 * @returns The result of the operation
 */
export async function auditUpdate<T>(
  params: Omit<AuditLogParams, 'actionType' | 'changesSummary'>,
  operation: () => Promise<T>
): Promise<T> {
  try {
    const result = await operation();
    
    const changesSummary = params.beforeState && result 
      ? generateChangesSummary(params.beforeState, result)
      : undefined;

    await createAuditLog({
      ...params,
      actionType: 'update',
      afterState: result,
      changesSummary,
      status: 'success',
    });

    return result;
  } catch (error) {
    await createAuditLog({
      ...params,
      actionType: 'update',
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Audit log wrapper for delete operations
 * 
 * @param params - Audit parameters including before state
 * @param operation - The operation to execute
 * @returns The result of the operation
 */
export async function auditDelete<T>(
  params: Omit<AuditLogParams, 'actionType' | 'afterState'>,
  operation: () => Promise<T>
): Promise<T> {
  try {
    const result = await operation();
    
    await createAuditLog({
      ...params,
      actionType: 'delete',
      status: 'success',
    });

    return result;
  } catch (error) {
    await createAuditLog({
      ...params,
      actionType: 'delete',
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
