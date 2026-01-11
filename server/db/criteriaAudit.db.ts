import { getDb } from "../db";
import { sql } from "drizzle-orm";
import type { PrioritizationCriteria } from "../../drizzle/schema";

/**
 * Criteria Audit Logging
 * Functions to track all changes to prioritization criteria
 */

export type CriteriaAuditAction = 'created' | 'updated' | 'deactivated' | 'reactivated' | 'deleted';

export interface CriteriaAuditLogEntry {
  id?: number;
  criteriaId: number;
  action: CriteriaAuditAction;
  oldName?: string | null;
  newName?: string | null;
  oldDescription?: string | null;
  newDescription?: string | null;
  oldCategory?: string | null;
  newCategory?: string | null;
  oldWeight?: string | null;
  newWeight?: string | null;
  oldIsActive?: number | null;
  newIsActive?: number | null;
  changedBy: number;
  changedAt?: string;
  reason?: string | null;
  changeDetails?: string | null;
}

/**
 * Log a criteria audit event
 */
export async function logCriteriaAudit(entry: CriteriaAuditLogEntry): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(sql`
    INSERT INTO criteria_audit_log (
      criteriaId, action, oldName, newName, oldDescription, newDescription,
      oldCategory, newCategory, oldWeight, newWeight, oldIsActive, newIsActive,
      changedBy, reason, changeDetails
    ) VALUES (
      ${entry.criteriaId},
      ${entry.action},
      ${entry.oldName || null},
      ${entry.newName || null},
      ${entry.oldDescription || null},
      ${entry.newDescription || null},
      ${entry.oldCategory || null},
      ${entry.newCategory || null},
      ${entry.oldWeight || null},
      ${entry.newWeight || null},
      ${entry.oldIsActive !== undefined ? entry.oldIsActive : null},
      ${entry.newIsActive !== undefined ? entry.newIsActive : null},
      ${entry.changedBy},
      ${entry.reason || null},
      ${entry.changeDetails || null}
    )
  `);

  return result[0].insertId;
}

/**
 * Log criteria creation
 */
export async function logCriteriaCreation(
  criteriaId: number,
  criteria: Partial<PrioritizationCriteria>,
  userId: number,
  reason?: string
): Promise<number> {
  return await logCriteriaAudit({
    criteriaId,
    action: 'created',
    newName: criteria.name,
    newDescription: criteria.description,
    newCategory: criteria.category,
    newWeight: criteria.weight,
    newIsActive: criteria.isActive !== undefined ? criteria.isActive : 1,
    changedBy: userId,
    reason,
    changeDetails: JSON.stringify({
      displayOrder: criteria.displayOrder,
      scoringGuideline: criteria.scoringGuideline,
    }),
  });
}

/**
 * Log criteria update
 */
export async function logCriteriaUpdate(
  criteriaId: number,
  oldCriteria: Partial<PrioritizationCriteria>,
  newCriteria: Partial<PrioritizationCriteria>,
  userId: number,
  reason?: string
): Promise<number> {
  const changes: Record<string, any> = {};
  
  // Track what changed
  if (oldCriteria.displayOrder !== newCriteria.displayOrder) {
    changes.displayOrder = { old: oldCriteria.displayOrder, new: newCriteria.displayOrder };
  }
  if (oldCriteria.scoringGuideline !== newCriteria.scoringGuideline) {
    changes.scoringGuideline = { old: oldCriteria.scoringGuideline, new: newCriteria.scoringGuideline };
  }

  return await logCriteriaAudit({
    criteriaId,
    action: 'updated',
    oldName: oldCriteria.name,
    newName: newCriteria.name,
    oldDescription: oldCriteria.description,
    newDescription: newCriteria.description,
    oldCategory: oldCriteria.category,
    newCategory: newCriteria.category,
    oldWeight: oldCriteria.weight,
    newWeight: newCriteria.weight,
    oldIsActive: oldCriteria.isActive,
    newIsActive: newCriteria.isActive,
    changedBy: userId,
    reason,
    changeDetails: Object.keys(changes).length > 0 ? JSON.stringify(changes) : null,
  });
}

/**
 * Log criteria deactivation
 */
export async function logCriteriaDeactivation(
  criteriaId: number,
  criteria: Partial<PrioritizationCriteria>,
  userId: number,
  reason?: string
): Promise<number> {
  return await logCriteriaAudit({
    criteriaId,
    action: 'deactivated',
    oldName: criteria.name,
    newName: criteria.name,
    oldIsActive: 1,
    newIsActive: 0,
    changedBy: userId,
    reason,
  });
}

/**
 * Log criteria reactivation
 */
export async function logCriteriaReactivation(
  criteriaId: number,
  criteria: Partial<PrioritizationCriteria>,
  userId: number,
  reason?: string
): Promise<number> {
  return await logCriteriaAudit({
    criteriaId,
    action: 'reactivated',
    oldName: criteria.name,
    newName: criteria.name,
    oldIsActive: 0,
    newIsActive: 1,
    changedBy: userId,
    reason,
  });
}

/**
 * Log criteria deletion
 */
export async function logCriteriaDeletion(
  criteriaId: number,
  criteria: Partial<PrioritizationCriteria>,
  userId: number,
  reason?: string
): Promise<number> {
  return await logCriteriaAudit({
    criteriaId,
    action: 'deleted',
    oldName: criteria.name,
    oldDescription: criteria.description,
    oldCategory: criteria.category,
    oldWeight: criteria.weight,
    oldIsActive: criteria.isActive,
    changedBy: userId,
    reason,
  });
}

/**
 * Get audit history for a specific criteria
 */
export async function getCriteriaAuditHistory(criteriaId: number): Promise<CriteriaAuditLogEntry[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      cal.*,
      u.name as changedByName,
      u.email as changedByEmail
    FROM criteria_audit_log cal
    LEFT JOIN users u ON cal.changedBy = u.id
    WHERE cal.criteriaId = ${criteriaId}
    ORDER BY cal.changedAt DESC
  `);

  return Array.isArray(result[0]) ? result[0] : [];
}

/**
 * Get recent audit history for all criteria
 */
export async function getRecentCriteriaAuditHistory(limit: number = 100): Promise<CriteriaAuditLogEntry[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      cal.*,
      u.name as changedByName,
      u.email as changedByEmail,
      pc.name as criteriaName
    FROM criteria_audit_log cal
    LEFT JOIN users u ON cal.changedBy = u.id
    LEFT JOIN prioritization_criteria pc ON cal.criteriaId = pc.id
    ORDER BY cal.changedAt DESC
    LIMIT ${limit}
  `);

  return Array.isArray(result[0]) ? result[0] : [];
}

/**
 * Get audit statistics
 */
export async function getCriteriaAuditStats(): Promise<{
  totalChanges: number;
  createdCount: number;
  updatedCount: number;
  deactivatedCount: number;
  reactivatedCount: number;
  deletedCount: number;
  recentChanges: number; // Last 30 days
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [statsResult] = await db.execute(sql`
    SELECT 
      COUNT(*) as totalChanges,
      SUM(CASE WHEN action = 'created' THEN 1 ELSE 0 END) as createdCount,
      SUM(CASE WHEN action = 'updated' THEN 1 ELSE 0 END) as updatedCount,
      SUM(CASE WHEN action = 'deactivated' THEN 1 ELSE 0 END) as deactivatedCount,
      SUM(CASE WHEN action = 'reactivated' THEN 1 ELSE 0 END) as reactivatedCount,
      SUM(CASE WHEN action = 'deleted' THEN 1 ELSE 0 END) as deletedCount,
      SUM(CASE WHEN changedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as recentChanges
    FROM criteria_audit_log
  `);

  const stats: any = Array.isArray(statsResult) && statsResult.length > 0 ? statsResult[0] : {};

  return {
    totalChanges: Number(stats.totalChanges) || 0,
    createdCount: Number(stats.createdCount) || 0,
    updatedCount: Number(stats.updatedCount) || 0,
    deactivatedCount: Number(stats.deactivatedCount) || 0,
    reactivatedCount: Number(stats.reactivatedCount) || 0,
    deletedCount: Number(stats.deletedCount) || 0,
    recentChanges: Number(stats.recentChanges) || 0,
  };
}
