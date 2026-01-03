import { mysqlTable, int, varchar, timestamp, index } from "drizzle-orm/mysql-core";

/**
 * SMS Verification Codes Table
 * Stores temporary SMS codes for MFA verification
 */
export const smsVerificationCodes = mysqlTable("sms_verification_codes", {
  id: int().autoincrement().notNull(),
  userId: int().notNull(),
  code: varchar({ length: 6 }).notNull(), // 6-digit verification code (hashed)
  phoneNumber: varchar({ length: 20 }).notNull(), // E.164 format
  purpose: varchar({ length: 50 }).notNull(), // 'mfa_setup', 'mfa_login', 'phone_verification'
  attempts: int().default(0).notNull(), // Number of verification attempts
  verified: int().default(0).notNull(), // 0 = not verified, 1 = verified
  expiresAt: timestamp({ mode: 'string' }).notNull(), // Code expires after 10 minutes
  createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
  index("idx_user_code").on(table.userId, table.code),
  index("idx_expires").on(table.expiresAt),
]);
