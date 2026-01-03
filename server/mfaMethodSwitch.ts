/**
 * MFA Method Switching Service
 * Handles switching between TOTP and email MFA methods without disabling MFA
 */

import { eq, and, lt, sql } from "drizzle-orm";
import { getDb } from "./db";
import { mfaMethodSwitchRequests, userMfaSettings } from "../drizzle/schema";
import crypto from "crypto";

const SWITCH_REQUEST_EXPIRY_MINUTES = 30;

/**
 * Create a new method switch request
 */
export async function createMethodSwitchRequest(
  userId: number,
  currentMethod: "totp" | "sms" | "email",
  newMethod: "totp" | "sms" | "email",
  newMethodSecret?: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Cancel any pending requests
  await db
    .update(mfaMethodSwitchRequests)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(mfaMethodSwitchRequests.userId, userId),
        eq(mfaMethodSwitchRequests.status, "pending")
      )
    );

  // Create new request
  const expiresAt = new Date(Date.now() + SWITCH_REQUEST_EXPIRY_MINUTES * 60 * 1000);
  const result = await db.insert(mfaMethodSwitchRequests).values({
    userId,
    currentMethod,
    newMethod,
    newMethodSecret: newMethodSecret || null,
    newMethodVerified: 0,
    status: "pending",
    expiresAt: expiresAt.toISOString().slice(0, 19).replace('T', ' '),
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
  });

  return Number(result[0].insertId);
}

/**
 * Get pending switch request for user
 */
export async function getPendingSwitchRequest(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(mfaMethodSwitchRequests)
    .where(
      and(
        eq(mfaMethodSwitchRequests.userId, userId),
        eq(mfaMethodSwitchRequests.status, "pending"),
        sql`${mfaMethodSwitchRequests.expiresAt} > NOW()`
      )
    )
    .limit(1);

  return results.length > 0 ? results[0] : null;
}

/**
 * Mark new method as verified
 */
export async function markNewMethodVerified(requestId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(mfaMethodSwitchRequests)
    .set({ newMethodVerified: 1 })
    .where(eq(mfaMethodSwitchRequests.id, requestId));
}

/**
 * Complete the method switch
 */
export async function completeMethodSwitch(
  requestId: number,
  userId: number,
  newMethod: "totp" | "sms" | "email",
  newSecret?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update user's MFA settings
  await db
    .update(userMfaSettings)
    .set({
      mfaMethod: newMethod,
      secret: newSecret || undefined,
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    .where(eq(userMfaSettings.userId, userId));

  // Mark request as completed
  await db
    .update(mfaMethodSwitchRequests)
    .set({
      status: "completed",
      completedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    .where(eq(mfaMethodSwitchRequests.id, requestId));
}

/**
 * Cancel a switch request
 */
export async function cancelSwitchRequest(requestId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(mfaMethodSwitchRequests)
    .set({ status: "cancelled" })
    .where(eq(mfaMethodSwitchRequests.id, requestId));
}

/**
 * Expire old switch requests
 */
export async function expireOldSwitchRequests(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(mfaMethodSwitchRequests)
    .set({ status: "expired" })
    .where(
      and(
        eq(mfaMethodSwitchRequests.status, "pending"),
        sql`${mfaMethodSwitchRequests.expiresAt} < NOW()`
      )
    );
}
