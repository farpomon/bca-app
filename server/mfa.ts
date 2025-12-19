import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { userMfaSettings, trustedDevices, mfaAuditLog } from "../drizzle/schema";

/**
 * MFA Service
 * Handles TOTP (Time-based One-Time Password) generation, verification, and management
 */

const APP_NAME = "BCA System";
const BACKUP_CODE_COUNT = 10;
const DEVICE_TRUST_DAYS = 30;

/**
 * Generate a new TOTP secret for a user
 */
export function generateTOTPSecret(userEmail: string): {
  secret: string;
  otpauth_url: string;
} {
  const secret = speakeasy.generateSecret({
    name: `${APP_NAME} (${userEmail})`,
    issuer: APP_NAME,
    length: 32,
  });

  return {
    secret: secret.base32,
    otpauth_url: secret.otpauth_url || "",
  };
}

/**
 * Generate QR code data URL from otpauth URL
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  } catch (error) {
    console.error("[MFA] Failed to generate QR code:", error);
    throw new Error("Failed to generate QR code");
  }
}

/**
 * Verify a TOTP token against a secret
 */
export function verifyTOTPToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1, // Allow ±30 seconds time drift
  });
}

/**
 * Generate backup codes for account recovery
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Hash a backup code for storage
 */
export function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Verify a backup code against stored hashed codes
 */
export function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): { valid: boolean; remainingCodes: string[] } {
  const hashedInput = hashBackupCode(code);
  const index = hashedCodes.indexOf(hashedInput);

  if (index === -1) {
    return { valid: false, remainingCodes: hashedCodes };
  }

  // Remove the used code
  const remainingCodes = hashedCodes.filter((_, i) => i !== index);
  return { valid: true, remainingCodes };
}

/**
 * Generate a device fingerprint from request metadata
 */
export function generateDeviceFingerprint(
  userAgent: string,
  ipAddress: string
): string {
  const data = `${userAgent}|${ipAddress}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Check if a device is trusted
 */
export async function isDeviceTrusted(
  userId: number,
  deviceFingerprint: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const now = new Date();
  const devices = await db
    .select()
    .from(trustedDevices)
    .where(
      and(
        eq(trustedDevices.userId, userId),
        eq(trustedDevices.deviceFingerprint, deviceFingerprint)
      )
    )
    .limit(1);

  if (devices.length === 0) return false;

  const device = devices[0];
  const expiresAt = new Date(device.expiresAt);

  // Check if device trust has expired
  if (expiresAt < now) {
    // Remove expired device
    await db
      .delete(trustedDevices)
      .where(eq(trustedDevices.id, device.id));
    return false;
  }

  // Update last used timestamp
  await db
    .update(trustedDevices)
    .set({ lastUsed: now.toISOString() })
    .where(eq(trustedDevices.id, device.id));

  return true;
}

/**
 * Trust a device for the user
 */
export async function trustDevice(
  userId: number,
  deviceFingerprint: string,
  deviceName: string,
  userAgent: string,
  ipAddress: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEVICE_TRUST_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(trustedDevices).values({
    userId,
    deviceFingerprint,
    deviceName,
    userAgent,
    ipAddress,
    lastUsed: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  });
}

/**
 * Get user's MFA settings
 */
export async function getUserMfaSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const settings = await db
    .select()
    .from(userMfaSettings)
    .where(eq(userMfaSettings.userId, userId))
    .limit(1);

  return settings.length > 0 ? settings[0] : null;
}

/**
 * Log MFA audit event
 */
export async function logMfaAudit(params: {
  userId: number;
  action:
    | "setup"
    | "enable"
    | "disable"
    | "verify_success"
    | "verify_fail"
    | "backup_code_used"
    | "device_trusted"
    | "device_removed"
    | "email_sent"
    | "email_verified"
    | "sms_sent"
    | "sms_verified"
    | "mfa_reset_by_admin";
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  failureReason?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(mfaAuditLog).values({
    userId: params.userId,
    action: params.action,
    success: params.success ? 1 : 0,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    deviceFingerprint: params.deviceFingerprint,
    failureReason: params.failureReason,
    createdAt: new Date(),
  });
}

/**
 * Encrypt MFA secret before storing in database
 * Uses AES-256-GCM encryption
 */
export function encryptSecret(secret: string, encryptionKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(encryptionKey, "hex"),
    iv
  );

  let encrypted = cipher.update(secret, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Return IV + AuthTag + Encrypted data (all hex encoded)
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt MFA secret from database
 */
export function decryptSecret(
  encryptedData: string,
  encryptionKey: string
): string {
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(parts[0]!, "hex");
  const authTag = Buffer.from(parts[1]!, "hex");
  const encrypted = parts[2]!;

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(encryptionKey, "hex"),
    iv
  );
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Get or generate encryption key for MFA secrets
 * In production, this should come from environment variables
 */
export function getMfaEncryptionKey(): string {
  // Use JWT_SECRET as base for encryption key (32 bytes = 64 hex chars)
  const jwtSecret = process.env.JWT_SECRET || "default-secret-key";
  return crypto.createHash("sha256").update(jwtSecret).digest("hex");
}
