import type { Request } from "express";
import { getDb } from "../db";
import { auditLog } from "../../drizzle/schema";

/**
 * Authentication Audit Logging Service
 * 
 * Logs all authentication events for security audits and compliance:
 * - Successful/unsuccessful login attempts
 * - SAML authentication events
 * - Logout events
 * - Session timeout events
 * - Account lockout events
 */

export interface AuthAuditEvent {
  userId?: number;
  username?: string;
  email?: string;
  action: "login_success" | "login_failure" | "saml_auth" | "saml_error" | "logout" | "session_timeout" | "account_lockout";
  method: "saml" | "oauth" | "password" | "api_key";
  success: boolean;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

/**
 * Extract request metadata for audit logging
 */
function extractRequestMetadata(req: Request) {
  const ipAddress = 
    req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
    req.headers["x-real-ip"]?.toString() ||
    req.socket.remoteAddress ||
    "unknown";

  const userAgent = req.headers["user-agent"] || "unknown";
  const sessionId = (req as any).sessionID || req.headers["x-session-id"]?.toString();

  return { ipAddress, userAgent, sessionId };
}

/**
 * Log authentication event to audit trail
 */
export async function logAuthEvent(event: AuthAuditEvent, req?: Request) {
  const db = await getDb();
  if (!db) {
    console.warn("[AuthAudit] Cannot log auth event: database not available");
    return;
  }

  try {
    // Extract request metadata if available
    const requestMetadata = req ? extractRequestMetadata(req) : { ipAddress: "unknown", userAgent: "unknown", sessionId: undefined };
    
    // Merge metadata
    const metadata = {
      ...requestMetadata,
      ...event.metadata,
      timestamp: new Date().toISOString(),
    };

    // Create audit log entry
    await db.insert(auditLog).values({
      userId: event.userId || 0, // 0 for failed login attempts
      entityType: "authentication",
      entityId: event.userId || 0,
      action: event.success ? "view" : "create", // Map to existing enum
      changes: JSON.stringify({
        action: event.action,
        method: event.method,
        success: event.success,
        reason: event.reason,
        username: event.username,
        email: event.email,
      }),
      metadata: JSON.stringify(metadata),
      ipAddress: event.ipAddress || requestMetadata.ipAddress || "unknown",
      userAgent: event.userAgent || requestMetadata.userAgent || "unknown",
      sessionId: event.sessionId || requestMetadata.sessionId || undefined,
      dataClassification: "confidential", // Authentication logs are confidential
      complianceTags: JSON.stringify(["FOIP", "Security", "Authentication"]),
      retentionPolicy: "7_years",
    });

    console.log(`[AuthAudit] ${event.action} logged:`, {
      userId: event.userId,
      username: event.username,
      success: event.success,
      method: event.method,
      ip: event.ipAddress || requestMetadata.ipAddress,
    });
  } catch (error) {
    console.error("[AuthAudit] Failed to log auth event:", error);
  }
}

/**
 * Log successful login
 */
export async function logLoginSuccess(
  userId: number,
  username: string,
  method: "saml" | "oauth",
  req: Request
) {
  await logAuthEvent({
    userId,
    username,
    action: "login_success",
    method,
    success: true,
  }, req);
}

/**
 * Log failed login attempt
 */
export async function logLoginFailure(
  username: string,
  reason: string,
  method: "saml" | "oauth",
  req: Request
) {
  await logAuthEvent({
    username,
    action: "login_failure",
    method,
    success: false,
    reason,
  }, req);
}

/**
 * Log SAML authentication event
 */
export async function logSamlAuth(
  userId: number,
  email: string,
  success: boolean,
  reason?: string,
  req?: Request
) {
  await logAuthEvent({
    userId,
    email,
    action: success ? "saml_auth" : "saml_error",
    method: "saml",
    success,
    reason,
  }, req);
}

/**
 * Log logout event
 */
export async function logLogout(
  userId: number,
  username: string,
  sessionDuration?: number,
  req?: Request
) {
  await logAuthEvent({
    userId,
    username,
    action: "logout",
    method: "oauth", // Method doesn't matter for logout
    success: true,
    metadata: {
      sessionDuration: sessionDuration ? `${sessionDuration}ms` : undefined,
    },
  }, req);
}

/**
 * Log session timeout event
 */
export async function logSessionTimeout(
  userId: number,
  username: string,
  sessionDuration: number
) {
  await logAuthEvent({
    userId,
    username,
    action: "session_timeout",
    method: "oauth",
    success: true,
    metadata: {
      sessionDuration: `${sessionDuration}ms`,
    },
  });
}

/**
 * Log account lockout event
 */
export async function logAccountLockout(
  username: string,
  reason: string,
  req: Request
) {
  await logAuthEvent({
    username,
    action: "account_lockout",
    method: "oauth",
    success: false,
    reason,
  }, req);
}

/**
 * Get authentication audit logs with filters
 */
export async function getAuthAuditLogs(filters: {
  userId?: number;
  username?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    const { eq } = await import("drizzle-orm");
    
    // Build query with proper Drizzle syntax
    const logs = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityType, "authentication"))
      .limit(filters.limit || 100)
      .offset(filters.offset || 0);

    return logs;
  } catch (error) {
    console.error("[AuthAudit] Failed to retrieve auth logs:", error);
    return [];
  }
}
