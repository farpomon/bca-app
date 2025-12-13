import crypto from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { getDb } from "./db";
import { smsVerificationCodes } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";

/**
 * Email MFA Service
 * Handles email-based MFA code generation, verification, and delivery
 */

const CODE_LENGTH = 6;
const CODE_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 3;

/**
 * Generate a 6-digit verification code
 */
export function generateEmailCode(): string {
  const code = crypto.randomInt(100000, 999999).toString();
  return code;
}

/**
 * Hash a verification code for storage
 */
export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Send verification code via email using Manus notification API
 */
export async function sendEmailCode(
  userEmail: string,
  code: string,
  purpose: "mfa_setup" | "mfa_login" | "email_verification"
): Promise<boolean> {
  try {
    const purposeText = {
      mfa_setup: "set up email-based MFA",
      mfa_login: "verify your identity",
      email_verification: "verify your email address",
    };

    const message = `Your BCA System verification code is: ${code}

This code will expire in ${CODE_EXPIRY_MINUTES} minutes.

Purpose: ${purposeText[purpose]}

If you didn't request this code, please ignore this email.`;

    // Use Manus notification API to send email
    const success = await notifyOwner({
      title: `BCA System - Verification Code for ${userEmail}`,
      content: message,
    });

    return success;
  } catch (error) {
    console.error("[Email MFA] Failed to send email code:", error);
    return false;
  }
}

/**
 * Create and store a verification code in the database
 */
export async function createVerificationCode(
  userId: number,
  userEmail: string,
  purpose: "mfa_setup" | "mfa_login" | "email_verification"
): Promise<{ success: boolean; code?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // Generate code
    const code = generateEmailCode();
    const hashedCode = hashCode(code);

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRY_MINUTES);

    // Store in database (reusing sms_verification_codes table with email in phoneNumber field)
    await db.insert(smsVerificationCodes).values({
      userId,
      code: hashedCode,
      phoneNumber: userEmail, // Store email in phoneNumber field for email MFA
      purpose,
      attempts: 0,
      verified: 0,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    });

    // Send email
    const emailSent = await sendEmailCode(userEmail, code, purpose);

    if (!emailSent) {
      console.error("[Email MFA] Failed to send email");
      return { success: false };
    }

    return { success: true, code }; // Return code for testing purposes
  } catch (error) {
    console.error("[Email MFA] Failed to create verification code:", error);
    return { success: false };
  }
}

/**
 * Verify an email verification code
 */
export async function verifyEmailCode(
  userId: number,
  userEmail: string,
  code: string,
  purpose: "mfa_setup" | "mfa_login" | "email_verification"
): Promise<{ valid: boolean; error?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const hashedCode = hashCode(code);
    const now = new Date().toISOString();

    // Find the most recent non-verified code for this user and purpose
    const results = await db
      .select()
      .from(smsVerificationCodes)
      .where(
        and(
          eq(smsVerificationCodes.userId, userId),
          eq(smsVerificationCodes.phoneNumber, userEmail),
          eq(smsVerificationCodes.purpose, purpose),
          eq(smsVerificationCodes.verified, 0),
          gt(smsVerificationCodes.expiresAt, now)
        )
      )
      .orderBy(smsVerificationCodes.createdAt)
      .limit(1);

    if (results.length === 0) {
      return { valid: false, error: "No valid verification code found or code expired" };
    }

    const record = results[0];

    // Check if max attempts exceeded
    if (record.attempts >= MAX_ATTEMPTS) {
      return { valid: false, error: "Maximum verification attempts exceeded" };
    }

    // Verify code
    if (record.code !== hashedCode) {
      // Increment attempts
      await db
        .update(smsVerificationCodes)
        .set({ attempts: record.attempts + 1 })
        .where(eq(smsVerificationCodes.id, record.id));

      return { valid: false, error: "Invalid verification code" };
    }

    // Mark as verified
    await db
      .update(smsVerificationCodes)
      .set({ verified: 1 })
      .where(eq(smsVerificationCodes.id, record.id));

    return { valid: true };
  } catch (error) {
    console.error("[Email MFA] Failed to verify code:", error);
    return { valid: false, error: "Verification failed" };
  }
}

/**
 * Clean up expired verification codes
 */
export async function cleanupExpiredCodes(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      return;
    }

    const now = new Date().toISOString();

    // Delete codes that expired more than 1 hour ago
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    await db
      .delete(smsVerificationCodes)
      .where(gt(smsVerificationCodes.expiresAt, oneHourAgo.toISOString()));
  } catch (error) {
    console.error("[Email MFA] Failed to cleanup expired codes:", error);
  }
}
