import { eq, and, lt } from "drizzle-orm";
import { getDb } from "../db";
import {
  bulkOperationHistory,
  bulkOperationSnapshots,
  users,
  companies,
  accessRequests,
  type BulkOperationHistory,
  type InsertBulkOperationHistory,
  type InsertBulkOperationSnapshot,
} from "../../drizzle/schema";

const UNDO_WINDOW_MINUTES = 30;

export interface CaptureSnapshotOptions {
  operationType: BulkOperationHistory["operationType"];
  performedBy: number;
  recordType: "user" | "company" | "access_request";
  recordIds: number[];
}

export interface UndoOperationResult {
  success: boolean;
  restoredCount: number;
  message: string;
}

/**
 * Capture snapshots of records before a bulk operation
 */
export async function captureSnapshot(options: CaptureSnapshotOptions): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { operationType, performedBy, recordType, recordIds } = options;

  // Create history record
  const expiresAt = new Date(Date.now() + UNDO_WINDOW_MINUTES * 60 * 1000);
  const historyRecord: InsertBulkOperationHistory = {
    operationType,
    performedBy,
    expiresAt: expiresAt.toISOString().slice(0, 19).replace('T', ' '),
    affectedCount: recordIds.length,
    metadata: JSON.stringify({ recordIds }),
    status: "active",
  };

  const [historyResult] = await db.insert(bulkOperationHistory).values(historyRecord);
  const operationId = historyResult.insertId;

  // Fetch and snapshot each record
  const snapshots: InsertBulkOperationSnapshot[] = [];

  for (const recordId of recordIds) {
    let recordData: any = null;

    if (recordType === "user") {
      const [user] = await db.select().from(users).where(eq(users.id, recordId)).limit(1);
      recordData = user;
    } else if (recordType === "company") {
      const [company] = await db.select().from(companies).where(eq(companies.id, recordId)).limit(1);
      recordData = company;
    } else if (recordType === "access_request") {
      const [request] = await db.select().from(accessRequests).where(eq(accessRequests.id, recordId)).limit(1);
      recordData = request;
    }

    if (recordData) {
      snapshots.push({
        operationId,
        recordType,
        recordId,
        snapshotData: JSON.stringify(recordData),
      });
    }
  }

  if (snapshots.length > 0) {
    await db.insert(bulkOperationSnapshots).values(snapshots);
  }

  return operationId;
}

/**
 * Undo a bulk operation by restoring from snapshots
 */
export async function undoOperation(operationId: number, undoneBy: number): Promise<UndoOperationResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get operation history
  const [operation] = await db
    .select()
    .from(bulkOperationHistory)
    .where(eq(bulkOperationHistory.id, operationId))
    .limit(1);

  if (!operation) {
    return { success: false, restoredCount: 0, message: "Operation not found" };
  }

  if (operation.status === "undone") {
    return { success: false, restoredCount: 0, message: "Operation already undone" };
  }

  if (operation.status === "expired") {
    return { success: false, restoredCount: 0, message: "Operation has expired" };
  }

  // Check if still within undo window
  const expiresAt = new Date(operation.expiresAt);
  if (new Date() > expiresAt) {
    // Mark as expired
    await db
      .update(bulkOperationHistory)
      .set({ status: "expired" })
      .where(eq(bulkOperationHistory.id, operationId));
    return { success: false, restoredCount: 0, message: "Undo window has expired" };
  }

  // Get all snapshots for this operation
  const snapshots = await db
    .select()
    .from(bulkOperationSnapshots)
    .where(eq(bulkOperationSnapshots.operationId, operationId));

  let restoredCount = 0;

  // Restore each record
  for (const snapshot of snapshots) {
    try {
      const originalData = JSON.parse(snapshot.snapshotData);

      if (snapshot.recordType === "user") {
        // Check if record exists
        const [existing] = await db.select().from(users).where(eq(users.id, snapshot.recordId)).limit(1);
        
        if (existing) {
          // Update existing record
          await db
            .update(users)
            .set(originalData)
            .where(eq(users.id, snapshot.recordId));
        } else {
          // Re-insert deleted record
          await db.insert(users).values(originalData);
        }
        restoredCount++;
      } else if (snapshot.recordType === "company") {
        const [existing] = await db.select().from(companies).where(eq(companies.id, snapshot.recordId)).limit(1);
        
        if (existing) {
          await db
            .update(companies)
            .set(originalData)
            .where(eq(companies.id, snapshot.recordId));
        } else {
          await db.insert(companies).values(originalData);
        }
        restoredCount++;
      } else if (snapshot.recordType === "access_request") {
        const [existing] = await db.select().from(accessRequests).where(eq(accessRequests.id, snapshot.recordId)).limit(1);
        
        if (existing) {
          await db
            .update(accessRequests)
            .set(originalData)
            .where(eq(accessRequests.id, snapshot.recordId));
        } else {
          await db.insert(accessRequests).values(originalData);
        }
        restoredCount++;
      }
    } catch (error) {
      console.error(`Failed to restore record ${snapshot.recordId}:`, error);
    }
  }

  // Mark operation as undone
  await db
    .update(bulkOperationHistory)
    .set({
      status: "undone",
      undoneAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      undoneBy,
    })
    .where(eq(bulkOperationHistory.id, operationId));

  return {
    success: true,
    restoredCount,
    message: `Successfully restored ${restoredCount} record(s)`,
  };
}

/**
 * Get list of undoable operations for a user
 */
export async function getUndoableOperations(performedBy: number) {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const operations = await db
    .select()
    .from(bulkOperationHistory)
    .where(
      and(
        eq(bulkOperationHistory.performedBy, performedBy),
        eq(bulkOperationHistory.status, "active")
      )
    )
    .orderBy(bulkOperationHistory.performedAt);

  // Filter out expired operations and calculate time remaining
  return operations
    .map((op) => {
      const expiresAt = new Date(op.expiresAt);
      const timeRemaining = Math.max(0, expiresAt.getTime() - now.getTime());
      return {
        ...op,
        timeRemainingMs: timeRemaining,
        isExpired: timeRemaining === 0,
      };
    })
    .filter((op) => !op.isExpired);
}

/**
 * Clean up expired undo records
 */
export async function cleanupExpiredOperations() {
  const db = await getDb();
  if (!db) return;

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // Mark expired operations
  await db
    .update(bulkOperationHistory)
    .set({ status: "expired" })
    .where(
      and(
        eq(bulkOperationHistory.status, "active"),
        lt(bulkOperationHistory.expiresAt, now)
      )
    );

  // Optionally delete old snapshots (older than 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

  const expiredOperations = await db
    .select({ id: bulkOperationHistory.id })
    .from(bulkOperationHistory)
    .where(
      and(
        eq(bulkOperationHistory.status, "expired"),
        lt(bulkOperationHistory.performedAt, sevenDaysAgo)
      )
    );

  for (const op of expiredOperations) {
    await db.delete(bulkOperationSnapshots).where(eq(bulkOperationSnapshots.operationId, op.id));
    await db.delete(bulkOperationHistory).where(eq(bulkOperationHistory.id, op.id));
  }
}
