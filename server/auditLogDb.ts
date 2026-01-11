import { and, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import { auditLogs } from "../drizzle/schema";
import type { AuditActionType, AuditEntityType } from "./auditLog";

/**
 * Filters for querying audit logs
 */
export interface AuditLogFilters {
  userId?: number;
  companyId?: number;
  actionType?: AuditActionType;
  entityType?: AuditEntityType;
  module?: string;
  status?: 'success' | 'failed' | 'partial';
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  searchTerm?: string; // Search in entityName, userName, changesSummary
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * Get audit logs with filters and pagination
 * 
 * @param filters - Filter criteria
 * @param pagination - Pagination parameters
 * @returns Paginated audit logs and total count
 */
export async function getAuditLogs(
  filters: AuditLogFilters = {},
  pagination: PaginationParams = {}
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const { page = 1, pageSize = 50 } = pagination;
  const offset = (page - 1) * pageSize;

  // Build where conditions
  const conditions = [];

  if (filters.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }

  if (filters.companyId) {
    conditions.push(eq(auditLogs.companyId, filters.companyId));
  }

  if (filters.actionType) {
    conditions.push(eq(auditLogs.actionType, filters.actionType));
  }

  if (filters.entityType) {
    conditions.push(eq(auditLogs.entityType, filters.entityType));
  }

  if (filters.module) {
    conditions.push(eq(auditLogs.module, filters.module));
  }

  if (filters.status) {
    conditions.push(eq(auditLogs.status, filters.status));
  }

  if (filters.startDate) {
    conditions.push(gte(auditLogs.timestamp, filters.startDate));
  }

  if (filters.endDate) {
    conditions.push(lte(auditLogs.timestamp, filters.endDate));
  }

  if (filters.searchTerm) {
    const searchPattern = `%${filters.searchTerm}%`;
    conditions.push(
      or(
        like(auditLogs.entityName, searchPattern),
        like(auditLogs.userName, searchPattern),
        like(auditLogs.changesSummary, searchPattern)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(whereClause);
  
  const totalCount = countResult[0]?.count ?? 0;

  // Get paginated results
  const logs = await db
    .select()
    .from(auditLogs)
    .where(whereClause)
    .orderBy(desc(auditLogs.timestamp))
    .limit(pageSize)
    .offset(offset);

  return {
    logs,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

/**
 * Get audit log by ID
 * 
 * @param id - Audit log ID
 * @returns Audit log entry or null
 */
export async function getAuditLogById(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.id, id))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Get audit logs for a specific entity
 * 
 * @param entityType - Type of entity
 * @param entityId - ID of entity
 * @returns Array of audit logs for the entity
 */
export async function getAuditLogsForEntity(
  entityType: AuditEntityType,
  entityId: number
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.entityType, entityType),
        eq(auditLogs.entityId, entityId)
      )
    )
    .orderBy(desc(auditLogs.timestamp));
}

/**
 * Get recent audit logs for a user
 * 
 * @param userId - User ID
 * @param limit - Number of logs to return
 * @returns Array of recent audit logs
 */
export async function getRecentAuditLogsForUser(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
}

/**
 * Get audit log statistics
 * 
 * @param filters - Filter criteria
 * @returns Statistics about audit logs
 */
export async function getAuditLogStats(filters: AuditLogFilters = {}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Build where conditions (same as getAuditLogs)
  const conditions = [];

  if (filters.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }

  if (filters.companyId) {
    conditions.push(eq(auditLogs.companyId, filters.companyId));
  }

  if (filters.startDate) {
    conditions.push(gte(auditLogs.timestamp, filters.startDate));
  }

  if (filters.endDate) {
    conditions.push(lte(auditLogs.timestamp, filters.endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get action type counts
  const actionTypeCounts = await db
    .select({
      actionType: auditLogs.actionType,
      count: sql<number>`count(*)`,
    })
    .from(auditLogs)
    .where(whereClause)
    .groupBy(auditLogs.actionType);

  // Get entity type counts
  const entityTypeCounts = await db
    .select({
      entityType: auditLogs.entityType,
      count: sql<number>`count(*)`,
    })
    .from(auditLogs)
    .where(whereClause)
    .groupBy(auditLogs.entityType);

  // Get status counts
  const statusCounts = await db
    .select({
      status: auditLogs.status,
      count: sql<number>`count(*)`,
    })
    .from(auditLogs)
    .where(whereClause)
    .groupBy(auditLogs.status);

  // Get total count
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(whereClause);

  return {
    total: totalResult[0]?.count ?? 0,
    byActionType: actionTypeCounts.reduce((acc, row) => {
      acc[row.actionType] = row.count;
      return acc;
    }, {} as Record<string, number>),
    byEntityType: entityTypeCounts.reduce((acc, row) => {
      acc[row.entityType] = row.count;
      return acc;
    }, {} as Record<string, number>),
    byStatus: statusCounts.reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {} as Record<string, number>),
  };
}

/**
 * Export audit logs to CSV format
 * 
 * @param filters - Filter criteria
 * @returns CSV string
 */
export async function exportAuditLogsToCSV(filters: AuditLogFilters = {}): Promise<string> {
  const { logs } = await getAuditLogs(filters, { page: 1, pageSize: 10000 }); // Max 10k records

  // CSV headers
  const headers = [
    'ID',
    'Timestamp',
    'User Name',
    'User Email',
    'Company Name',
    'Action Type',
    'Entity Type',
    'Entity ID',
    'Entity Name',
    'Module',
    'Changes Summary',
    'Status',
    'Error Message',
  ];

  // CSV rows
  const rows = logs.map(log => [
    log.id,
    log.timestamp,
    log.userName ?? '',
    log.userEmail ?? '',
    log.companyName ?? '',
    log.actionType,
    log.entityType,
    log.entityId ?? '',
    log.entityName ?? '',
    log.module ?? '',
    log.changesSummary ?? '',
    log.status,
    log.errorMessage ?? '',
  ]);

  // Escape CSV values
  const escapeCsvValue = (value: any): string => {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Build CSV
  const csvLines = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map(row => row.map(escapeCsvValue).join(',')),
  ];

  return csvLines.join('\n');
}
