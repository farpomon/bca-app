/**
 * MFA Recovery Service
 * Handles MFA recovery requests with admin approval
 */

import { eq, and, sql } from "drizzle-orm";
import { getDb } from "./db";
import { mfaRecoveryRequests, userMfaSettings } from "../drizzle/schema";
import crypto from "crypto";

const RECOVERY_CODE_EXPIRY_HOURS = 24;

/**
 * Create a new MFA recovery request
 */
export async function createRecoveryRequest(
  userId: number,
  reason: string,
  identityVerification: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Cancel any pending requests
  await db
    .update(mfaRecoveryRequests)
    .set({ status: "expired" })
    .where(
      and(
        eq(mfaRecoveryRequests.userId, userId),
        eq(mfaRecoveryRequests.status, "pending")
      )
    );

  // Create new request
  const result = await db.insert(mfaRecoveryRequests).values({
    userId,
    reason,
    identityVerification: JSON.stringify(identityVerification),
    status: "pending",
    submittedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
  });

  return Number(result[0].insertId);
}

/**
 * Get recovery request by ID
 */
export async function getRecoveryRequest(requestId: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(mfaRecoveryRequests)
    .where(eq(mfaRecoveryRequests.id, requestId))
    .limit(1);

  return results.length > 0 ? results[0] : null;
}

/**
 * Get user's pending recovery request
 */
export async function getUserPendingRecoveryRequest(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(mfaRecoveryRequests)
    .where(
      and(
        eq(mfaRecoveryRequests.userId, userId),
        eq(mfaRecoveryRequests.status, "pending")
      )
    )
    .limit(1);

  return results.length > 0 ? results[0] : null;
}

/**
 * Get all pending recovery requests (admin)
 */
export async function getAllPendingRecoveryRequests() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(mfaRecoveryRequests)
    .where(eq(mfaRecoveryRequests.status, "pending"))
    .orderBy(mfaRecoveryRequests.submittedAt);
}

/**
 * Approve recovery request and generate recovery code
 */
export async function approveRecoveryRequest(
  requestId: number,
  adminUserId: number,
  adminNotes?: string
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate recovery code
  const recoveryCode = crypto.randomBytes(16).toString("hex").toUpperCase();
  const hashedCode = crypto.createHash("sha256").update(recoveryCode).digest("hex");

  const expiresAt = new Date(Date.now() + RECOVERY_CODE_EXPIRY_HOURS * 60 * 60 * 1000);

  // Update request
  await db
    .update(mfaRecoveryRequests)
    .set({
      status: "approved",
      recoveryCode: hashedCode,
      recoveryCodeExpiresAt: expiresAt.toISOString().slice(0, 19).replace('T', ' '),
      reviewedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      reviewedBy: adminUserId,
      adminNotes: adminNotes || null,
    })
    .where(eq(mfaRecoveryRequests.id, requestId));

  return recoveryCode; // Return unhashed code to send to user
}

/**
 * Reject recovery request
 */
export async function rejectRecoveryRequest(
  requestId: number,
  adminUserId: number,
  rejectionReason: string,
  adminNotes?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(mfaRecoveryRequests)
    .set({
      status: "rejected",
      reviewedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      reviewedBy: adminUserId,
      rejectionReason,
      adminNotes: adminNotes || null,
    })
    .where(eq(mfaRecoveryRequests.id, requestId));
}

/**
 * Verify recovery code and disable MFA
 */
export async function verifyRecoveryCodeAndDisableMFA(
  userId: number,
  recoveryCode: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const hashedCode = crypto.createHash("sha256").update(recoveryCode).digest("hex");

  // Find approved request with matching code
  const results = await db
    .select()
    .from(mfaRecoveryRequests)
    .where(
      and(
        eq(mfaRecoveryRequests.userId, userId),
        eq(mfaRecoveryRequests.status, "approved"),
        eq(mfaRecoveryRequests.recoveryCode, hashedCode),
        sql`${mfaRecoveryRequests.recoveryCodeExpiresAt} > NOW()`
      )
    )
    .limit(1);

  if (results.length === 0) {
    return false;
  }

  const request = results[0];

  // Disable MFA
  await db
    .update(userMfaSettings)
    .set({
      enabled: 0,
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    .where(eq(userMfaSettings.userId, userId));

  // Mark request as completed
  await db
    .update(mfaRecoveryRequests)
    .set({
      status: "completed",
      completedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    .where(eq(mfaRecoveryRequests.id, request.id));

  return true;
}

/**
 * Expire old recovery codes
 */
export async function expireOldRecoveryCodes(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(mfaRecoveryRequests)
    .set({ status: "expired" })
    .where(
      and(
        eq(mfaRecoveryRequests.status, "approved"),
        sql`${mfaRecoveryRequests.recoveryCodeExpiresAt} < NOW()`
      )
    );
}

/**
 * Get recovery request count for admin badge
 */
export async function getPendingRecoveryRequestCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(mfaRecoveryRequests)
    .where(eq(mfaRecoveryRequests.status, "pending"));

  return result[0]?.count || 0;
}
