import { eq, and, sql, desc, asc, or } from "drizzle-orm";
import { getDb } from "../db";
import {
  maintenanceEntries,
  type InsertMaintenanceEntry,
  type MaintenanceEntry,
} from "../../drizzle/schema";

/**
 * Get maintenance entries with optional filtering
 */
export async function getMaintenanceEntries(filters: {
  projectId?: number;
  assessmentId?: number;
  componentName?: string;
  entryType?: "identified" | "executed";
  status?: string;
  isRecurring?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters.projectId) {
    conditions.push(eq(maintenanceEntries.projectId, filters.projectId));
  }
  if (filters.assessmentId) {
    conditions.push(eq(maintenanceEntries.assessmentId, filters.assessmentId));
  }
  if (filters.componentName) {
    conditions.push(eq(maintenanceEntries.componentName, filters.componentName));
  }
  if (filters.entryType) {
    conditions.push(eq(maintenanceEntries.entryType, filters.entryType));
  }
  if (filters.status) {
    conditions.push(eq(maintenanceEntries.status, filters.status as any));
  }
  if (filters.isRecurring !== undefined) {
    conditions.push(eq(maintenanceEntries.isRecurring, filters.isRecurring ? 1 : 0));
  }

  const query = db.select().from(maintenanceEntries);

  if (conditions.length > 0) {
    const result = await query.where(and(...conditions)).orderBy(desc(maintenanceEntries.dateIdentified));
    return result;
  }

  const result = await query.orderBy(desc(maintenanceEntries.dateIdentified));
  return result;
}

/**
 * Get maintenance entry by ID
 */
export async function getMaintenanceEntry(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(maintenanceEntries)
    .where(eq(maintenanceEntries.id, id))
    .limit(1);

  return result[0] || null;
}

/**
 * Create maintenance entry
 */
export async function createMaintenanceEntry(data: InsertMaintenanceEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Calculate cost variance if both costs are provided
  let costVariance = null;
  let costVariancePercent = null;
  if (data.estimatedCost && data.actualCost) {
    const estimated = typeof data.estimatedCost === 'string' ? parseFloat(data.estimatedCost) : data.estimatedCost;
    const actual = typeof data.actualCost === 'string' ? parseFloat(data.actualCost) : data.actualCost;
    costVariance = actual - estimated;
    costVariancePercent = (costVariance / estimated) * 100;
  }

  const result = await db.insert(maintenanceEntries).values({
    ...data,
    costVariance: costVariance?.toString(),
    costVariancePercent: costVariancePercent?.toString(),
  });

  return result[0].insertId;
}

/**
 * Update maintenance entry
 */
export async function updateMaintenanceEntry(id: number, data: Partial<InsertMaintenanceEntry>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Recalculate cost variance if costs are updated
  if (data.estimatedCost !== undefined || data.actualCost !== undefined) {
    const existing = await getMaintenanceEntry(id);
    if (existing) {
      const estimated = data.estimatedCost !== undefined 
        ? (typeof data.estimatedCost === 'string' ? parseFloat(data.estimatedCost) : data.estimatedCost)
        : (existing.estimatedCost ? parseFloat(existing.estimatedCost) : null);
      const actual = data.actualCost !== undefined
        ? (typeof data.actualCost === 'string' ? parseFloat(data.actualCost) : data.actualCost)
        : (existing.actualCost ? parseFloat(existing.actualCost) : null);

      if (estimated && actual) {
        const variance = actual - estimated;
        data.costVariance = variance.toString();
        data.costVariancePercent = ((variance / estimated) * 100).toString();
      }
    }
  }

  await db
    .update(maintenanceEntries)
    .set(data)
    .where(eq(maintenanceEntries.id, id));

  return true;
}

/**
 * Delete maintenance entry
 */
export async function deleteMaintenanceEntry(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(maintenanceEntries).where(eq(maintenanceEntries.id, id));
  return true;
}

/**
 * Get maintenance history for a component (chronological timeline)
 */
export async function getMaintenanceHistory(projectId: number, componentName: string) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(maintenanceEntries)
    .where(
      and(
        eq(maintenanceEntries.projectId, projectId),
        eq(maintenanceEntries.componentName, componentName)
      )
    )
    .orderBy(asc(maintenanceEntries.dateIdentified));

  return result;
}

/**
 * Get maintenance cost summary
 */
export async function getMaintenanceCostSummary(projectId: number, componentName?: string) {
  const db = await getDb();
  if (!db) return null;

  const conditions = [eq(maintenanceEntries.projectId, projectId)];
  if (componentName) {
    conditions.push(eq(maintenanceEntries.componentName, componentName));
  }

  const result = await db
    .select({
      totalEstimated: sql<number>`SUM(CASE WHEN ${maintenanceEntries.entryType} = 'identified' THEN COALESCE(${maintenanceEntries.estimatedCost}, 0) ELSE 0 END)`,
      totalActual: sql<number>`SUM(CASE WHEN ${maintenanceEntries.entryType} = 'executed' THEN COALESCE(${maintenanceEntries.actualCost}, 0) ELSE 0 END)`,
      totalVariance: sql<number>`SUM(COALESCE(${maintenanceEntries.costVariance}, 0))`,
      identifiedCount: sql<number>`COUNT(CASE WHEN ${maintenanceEntries.entryType} = 'identified' THEN 1 END)`,
      executedCount: sql<number>`COUNT(CASE WHEN ${maintenanceEntries.entryType} = 'executed' THEN 1 END)`,
      completedCount: sql<number>`COUNT(CASE WHEN ${maintenanceEntries.status} = 'completed' THEN 1 END)`,
    })
    .from(maintenanceEntries)
    .where(and(...conditions));

  return result[0] || null;
}

/**
 * Get recurring maintenance entries
 */
export async function getRecurringMaintenance(projectId: number, dueSoon?: boolean) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    eq(maintenanceEntries.projectId, projectId),
    eq(maintenanceEntries.isRecurring, 1),
  ];

  if (dueSoon) {
    // Due within next 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    conditions.push(
      sql`${maintenanceEntries.nextDueDate} <= ${thirtyDaysFromNow.toISOString()}`
    );
  }

  const result = await db
    .select()
    .from(maintenanceEntries)
    .where(and(...conditions))
    .orderBy(asc(maintenanceEntries.nextDueDate));

  return result;
}

/**
 * Update cumulative cost for a component
 */
export async function updateCumulativeCost(projectId: number, componentName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Calculate total actual costs for completed entries
  const result = await db
    .select({
      total: sql<number>`SUM(COALESCE(${maintenanceEntries.actualCost}, 0))`,
    })
    .from(maintenanceEntries)
    .where(
      and(
        eq(maintenanceEntries.projectId, projectId),
        eq(maintenanceEntries.componentName, componentName),
        eq(maintenanceEntries.status, "completed")
      )
    );

  const cumulativeCost = result[0]?.total || 0;

  // Update all entries for this component
  await db
    .update(maintenanceEntries)
    .set({ cumulativeCost: cumulativeCost.toString() })
    .where(
      and(
        eq(maintenanceEntries.projectId, projectId),
        eq(maintenanceEntries.componentName, componentName)
      )
    );

  return cumulativeCost;
}

/**
 * Get maintenance entries grouped by component
 */
export async function getMaintenanceByComponent(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      componentName: maintenanceEntries.componentName,
      identifiedCount: sql<number>`COUNT(CASE WHEN ${maintenanceEntries.entryType} = 'identified' THEN 1 END)`,
      executedCount: sql<number>`COUNT(CASE WHEN ${maintenanceEntries.entryType} = 'executed' THEN 1 END)`,
      totalEstimated: sql<number>`SUM(CASE WHEN ${maintenanceEntries.entryType} = 'identified' THEN COALESCE(${maintenanceEntries.estimatedCost}, 0) ELSE 0 END)`,
      totalActual: sql<number>`SUM(CASE WHEN ${maintenanceEntries.entryType} = 'executed' THEN COALESCE(${maintenanceEntries.actualCost}, 0) ELSE 0 END)`,
      lastMaintenance: sql<Date>`MAX(${maintenanceEntries.dateCompleted})`,
    })
    .from(maintenanceEntries)
    .where(eq(maintenanceEntries.projectId, projectId))
    .groupBy(maintenanceEntries.componentName);

  return result;
}
