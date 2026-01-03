import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { userMfaSettings, trustedDevices, mfaAuditLog } from "../drizzle/schema";
import {
  encryptSecret,
  decryptSecret,
  getMfaEncryptionKey,
  hashBackupCode,
} from "./mfa";

/**
 * MFA Database Operations
 * Handles all database interactions for MFA functionality
 */

/**
 * Get user's MFA settings with decrypted secret
 */
export async function getMfaSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const settings = await db
    .select()
    .from(userMfaSettings)
    .where(eq(userMfaSettings.userId, userId))
    .limit(1);

  if (settings.length === 0) return null;

  const setting = settings[0];
  const encryptionKey = getMfaEncryptionKey();

  try {
    return {
      ...setting,
      secret: setting.secret ? decryptSecret(setting.secret, encryptionKey) : "",
      backupCodes: setting.backupCodes ? JSON.parse(setting.backupCodes) : [],
    };
  } catch (error) {
    // If decryption fails (corrupted data), log error and return null
    // This allows the user to set up MFA again
    console.error("[MFA] Failed to decrypt MFA settings for user", userId, error);
    console.error("[MFA] Corrupted MFA data detected. User will need to set up MFA again.");
    return null;
  }
}

/**
 * Create MFA settings for a user
 */
export async function createMfaSettings(
  userId: number,
  secret: string,
  backupCodes: string[],
  mfaMethod: 'totp' | 'sms' | 'email' = 'totp'
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const encryptionKey = getMfaEncryptionKey();
  const encryptedSecret = secret ? encryptSecret(secret, encryptionKey) : "";
  const hashedCodes = backupCodes.map(hashBackupCode);

  await db.insert(userMfaSettings).values({
    userId,
    secret: encryptedSecret,
    enabled: 0, // Not enabled until first verification
    backupCodes: JSON.stringify(hashedCodes),
    mfaMethod,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Enable MFA for a user
 */
export async function enableMfa(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(userMfaSettings)
    .set({
      enabled: 1,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(userMfaSettings.userId, userId));
}

/**
 * Disable MFA for a user
 */
export async function disableMfa(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete MFA settings
  await db.delete(userMfaSettings).where(eq(userMfaSettings.userId, userId));

  // Delete all trusted devices
  await db.delete(trustedDevices).where(eq(trustedDevices.userId, userId));
}

/**
 * Update backup codes after one is used
 */
export async function updateBackupCodes(
  userId: number,
  remainingCodes: string[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(userMfaSettings)
    .set({
      backupCodes: JSON.stringify(remainingCodes),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(userMfaSettings.userId, userId));
}

/**
 * Update MFA method for a user
 */
export async function updateMfaMethod(
  userId: number,
  mfaMethod: 'totp' | 'sms' | 'email'
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(userMfaSettings)
    .set({
      mfaMethod,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(userMfaSettings.userId, userId));
}

/**
 * Regenerate backup codes for a user
 */
export async function regenerateBackupCodes(
  userId: number,
  newCodes: string[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const hashedCodes = newCodes.map(hashBackupCode);

  await db
    .update(userMfaSettings)
    .set({
      backupCodes: JSON.stringify(hashedCodes),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(userMfaSettings.userId, userId));
}

/**
 * Get all trusted devices for a user
 */
export async function getUserTrustedDevices(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const devices = await db
    .select()
    .from(trustedDevices)
    .where(eq(trustedDevices.userId, userId))
    .orderBy(trustedDevices.lastUsed);

  return devices;
}

/**
 * Remove a trusted device
 */
export async function removeTrustedDevice(deviceId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(trustedDevices)
    .where(
      eq(trustedDevices.id, deviceId)
    );
}

/**
 * Get MFA audit logs for a user
 */
export async function getMfaAuditLogs(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  const logs = await db
    .select()
    .from(mfaAuditLog)
    .where(eq(mfaAuditLog.userId, userId))
    .orderBy(mfaAuditLog.createdAt)
    .limit(limit);

  return logs;
}

/**
 * Check if user has MFA enabled
 */
export async function isMfaEnabled(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const settings = await db
    .select()
    .from(userMfaSettings)
    .where(eq(userMfaSettings.userId, userId))
    .limit(1);

  return settings.length > 0 && settings[0].enabled === 1;
}

/**
 * Clean up expired trusted devices (run periodically)
 */
export async function cleanupExpiredDevices() {
  const db = await getDb();
  if (!db) return;

  const now = new Date().toISOString();

  await db
    .delete(trustedDevices)
    .where(eq(trustedDevices.expiresAt, now));
}

/**
 * Log MFA audit event
 */
export async function logMfaAuditEvent(event: {
  userId: number;
  action: "setup" | "enable" | "disable" | "verify_success" | "verify_fail" | "backup_code_used" | "device_trusted" | "device_removed" | "mfa_reset_by_admin";
  success: boolean;
  ipAddress: string;
  userAgent: string;
  failureReason?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(mfaAuditLog).values({
    userId: event.userId,
    action: event.action,
    success: event.success ? 1 : 0,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    failureReason: event.failureReason || null,
  });
}
