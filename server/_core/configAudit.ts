import { getDb } from "../db";
import { auditLog } from "../../drizzle/schema";

/**
 * System Configuration Audit Logging Service
 * 
 * Logs all system configuration changes for security audits and compliance:
 * - User role changes
 * - Permission changes
 * - System settings changes
 * - SAML configuration changes
 * - Data retention policy changes
 * - Encryption key rotation
 * - Backup/restore operations
 */

export interface ConfigAuditEvent {
  userId: number;
  action: "role_change" | "permission_change" | "setting_change" | "saml_config" | "retention_policy" | "encryption_key" | "backup" | "restore";
  entityType: string;
  entityId: number;
  changes: {
    before?: any;
    after?: any;
    field?: string;
    oldValue?: any;
    newValue?: any;
  };
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log system configuration change to audit trail
 */
export async function logConfigChange(event: ConfigAuditEvent) {
  const db = await getDb();
  if (!db) {
    console.warn("[ConfigAudit] Cannot log config change: database not available");
    return;
  }

  try {
    // Create audit log entry
    await db.insert(auditLog).values({
      userId: event.userId,
      entityType: event.entityType,
      entityId: event.entityId,
      action: "update", // Configuration changes are updates
      changes: JSON.stringify({
        action: event.action,
        ...event.changes,
      }),
      metadata: JSON.stringify({
        ...event.metadata,
        timestamp: new Date().toISOString(),
      }),
      ipAddress: event.ipAddress || "system",
      userAgent: event.userAgent || "system",
      dataClassification: "confidential", // Config changes are confidential
      complianceTags: JSON.stringify(["FOIP", "Security", "Configuration"]),
      retentionPolicy: "7_years",
    });

    console.log(`[ConfigAudit] ${event.action} logged:`, {
      userId: event.userId,
      entityType: event.entityType,
      entityId: event.entityId,
    });
  } catch (error) {
    console.error("[ConfigAudit] Failed to log config change:", error);
  }
}

/**
 * Log user role change
 */
export async function logRoleChange(
  adminUserId: number,
  targetUserId: number,
  oldRole: string,
  newRole: string,
  ipAddress?: string,
  userAgent?: string
) {
  await logConfigChange({
    userId: adminUserId,
    action: "role_change",
    entityType: "user",
    entityId: targetUserId,
    changes: {
      field: "role",
      oldValue: oldRole,
      newValue: newRole,
    },
    metadata: {
      targetUserId,
      description: `User role changed from ${oldRole} to ${newRole}`,
    },
    ipAddress,
    userAgent,
  });
}

/**
 * Log permission change
 */
export async function logPermissionChange(
  adminUserId: number,
  targetUserId: number,
  resource: string,
  action: string,
  granted: boolean,
  ipAddress?: string,
  userAgent?: string
) {
  await logConfigChange({
    userId: adminUserId,
    action: "permission_change",
    entityType: "permission",
    entityId: targetUserId,
    changes: {
      field: `${resource}.${action}`,
      oldValue: !granted,
      newValue: granted,
    },
    metadata: {
      targetUserId,
      resource,
      action,
      granted,
      description: `Permission ${granted ? "granted" : "revoked"}: ${resource}.${action}`,
    },
    ipAddress,
    userAgent,
  });
}

/**
 * Log system setting change
 */
export async function logSettingChange(
  userId: number,
  settingName: string,
  oldValue: any,
  newValue: any,
  ipAddress?: string,
  userAgent?: string
) {
  await logConfigChange({
    userId,
    action: "setting_change",
    entityType: "system_setting",
    entityId: 0,
    changes: {
      field: settingName,
      oldValue,
      newValue,
    },
    metadata: {
      settingName,
      description: `System setting '${settingName}' changed`,
    },
    ipAddress,
    userAgent,
  });
}

/**
 * Log SAML configuration change
 */
export async function logSamlConfigChange(
  userId: number,
  field: string,
  oldValue: any,
  newValue: any,
  ipAddress?: string,
  userAgent?: string
) {
  await logConfigChange({
    userId,
    action: "saml_config",
    entityType: "saml_config",
    entityId: 0,
    changes: {
      field,
      oldValue,
      newValue,
    },
    metadata: {
      description: `SAML configuration '${field}' changed`,
      securitySensitive: true,
    },
    ipAddress,
    userAgent,
  });
}

/**
 * Log data retention policy change
 */
export async function logRetentionPolicyChange(
  userId: number,
  policyId: number,
  dataType: string,
  oldYears: number,
  newYears: number,
  ipAddress?: string,
  userAgent?: string
) {
  await logConfigChange({
    userId,
    action: "retention_policy",
    entityType: "retention_policy",
    entityId: policyId,
    changes: {
      field: "retentionPeriodYears",
      oldValue: oldYears,
      newValue: newYears,
    },
    metadata: {
      dataType,
      description: `Retention policy for ${dataType} changed from ${oldYears} to ${newYears} years`,
    },
    ipAddress,
    userAgent,
  });
}

/**
 * Log encryption key rotation
 */
export async function logEncryptionKeyRotation(
  userId: number,
  keyId: number,
  keyType: string,
  ipAddress?: string,
  userAgent?: string
) {
  await logConfigChange({
    userId,
    action: "encryption_key",
    entityType: "encryption_key",
    entityId: keyId,
    changes: {
      field: "key_rotation",
      oldValue: "previous_key",
      newValue: "new_key",
    },
    metadata: {
      keyType,
      description: `Encryption key rotated for ${keyType}`,
      securitySensitive: true,
    },
    ipAddress,
    userAgent,
  });
}

/**
 * Log backup operation
 */
export async function logBackupOperation(
  userId: number,
  backupType: string,
  backupSize: number,
  ipAddress?: string,
  userAgent?: string
) {
  await logConfigChange({
    userId,
    action: "backup",
    entityType: "backup",
    entityId: 0,
    changes: {
      field: "backup_created",
      newValue: backupType,
    },
    metadata: {
      backupType,
      backupSize,
      description: `Backup created: ${backupType} (${backupSize} bytes)`,
    },
    ipAddress,
    userAgent,
  });
}

/**
 * Log restore operation
 */
export async function logRestoreOperation(
  userId: number,
  backupId: number,
  backupType: string,
  ipAddress?: string,
  userAgent?: string
) {
  await logConfigChange({
    userId,
    action: "restore",
    entityType: "backup",
    entityId: backupId,
    changes: {
      field: "backup_restored",
      newValue: backupType,
    },
    metadata: {
      backupId,
      backupType,
      description: `System restored from backup: ${backupType}`,
      securitySensitive: true,
    },
    ipAddress,
    userAgent,
  });
}
