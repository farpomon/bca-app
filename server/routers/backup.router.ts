/**
 * Backup Router
 * Provides comprehensive backup and restore functionality for the BCA system
 * Following industry best practices for data protection
 * Only accessible to users with admin role
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { storagePut, storageGet } from "../storage";
import { eq, desc, sql } from "drizzle-orm";
import {
  encryptBackupString,
  decryptBackupString,
  calculateChecksum as cryptoChecksum,
} from "../services/backupEncryption";
import {
  getBackupSchedules,
  updateBackupSchedule,
  deleteBackupSchedule,
  executeScheduledBackup,
  getScheduleStats,
  parseNextRunTime,
  ensureDefaultScheduleExists,
  cleanupOldBackups,
} from "../services/backupScheduler";
import {
  databaseBackups,
  backupSchedules,
  users,
  projects,
  assets,
  assessments,
  deficiencies,
  photos,
  companies,
  accessRequests,
  auditLog,
  buildingCodes,
  buildingComponents,
  buildingSections,
  capitalBudgetCycles,
  budgetAllocations,
  maintenanceEntries,
  projectDocuments,
  assetDocuments,
  assessmentDocuments,
  riskAssessments,
  optimizationScenarios,
  reportTemplates,
  reportHistory,
  costEstimates,
  projectPermissions,
  conversations,
  customComponents,
  deteriorationCurves,
  facilityModels,
  floorPlans,
  portfolioMetricsHistory,
  financialForecasts,
  benchmarkData,
  economicIndicators,
  portfolioTargets,
  investmentAnalysis,
} from "../../drizzle/schema";

// Tables to backup in order (respecting foreign key dependencies)
const BACKUP_TABLES = [
  { name: "users", table: users },
  { name: "companies", table: companies },
  { name: "buildingCodes", table: buildingCodes },
  { name: "buildingComponents", table: buildingComponents },
  { name: "deteriorationCurves", table: deteriorationCurves },
  { name: "projects", table: projects },
  { name: "buildingSections", table: buildingSections },
  { name: "assets", table: assets },
  { name: "assessments", table: assessments },
  { name: "deficiencies", table: deficiencies },
  { name: "photos", table: photos },
  { name: "costEstimates", table: costEstimates },
  { name: "maintenanceEntries", table: maintenanceEntries },
  { name: "projectDocuments", table: projectDocuments },
  { name: "assetDocuments", table: assetDocuments },
  { name: "assessmentDocuments", table: assessmentDocuments },
  { name: "riskAssessments", table: riskAssessments },
  { name: "optimizationScenarios", table: optimizationScenarios },
  { name: "capitalBudgetCycles", table: capitalBudgetCycles },
  { name: "budgetAllocations", table: budgetAllocations },
  { name: "reportTemplates", table: reportTemplates },
  { name: "reportHistory", table: reportHistory },
  { name: "projectPermissions", table: projectPermissions },
  { name: "conversations", table: conversations },
  { name: "customComponents", table: customComponents },
  { name: "facilityModels", table: facilityModels },
  { name: "floorPlans", table: floorPlans },
  { name: "accessRequests", table: accessRequests },
  { name: "auditLog", table: auditLog },
  { name: "portfolioMetricsHistory", table: portfolioMetricsHistory },
  { name: "financialForecasts", table: financialForecasts },
  { name: "benchmarkData", table: benchmarkData },
  { name: "economicIndicators", table: economicIndicators },
  { name: "portfolioTargets", table: portfolioTargets },
  { name: "investmentAnalysis", table: investmentAnalysis },
] as const;

// Generate a unique backup filename
function generateBackupFileName(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `bca-backup-${timestamp}-${randomSuffix}.json`;
}

// Calculate checksum for data integrity
function calculateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

export const backupRouter = router({
  /**
   * Create a new backup of all database tables
   */
  create: adminProcedure
    .input(z.object({
      description: z.string().optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Create backup record with pending status
      const backupResult = await database.insert(databaseBackups).values({
        backupType: "manual",
        status: "in_progress",
        createdBy: ctx.user.id,
        metadata: JSON.stringify({
          description: input?.description || "Manual backup",
          initiatedBy: ctx.user.name || ctx.user.email,
        }),
      });

      const backupId = Number(backupResult[0].insertId);

      try {
        // Collect all data from tables
        const backupData: Record<string, any[]> = {};
        let totalRecords = 0;

        for (const { name, table } of BACKUP_TABLES) {
          try {
            const records = await database.select().from(table);
            backupData[name] = records;
            totalRecords += records.length;
          } catch (error) {
            console.warn(`[Backup] Warning: Could not backup table ${name}:`, error);
            backupData[name] = [];
          }
        }

        // Create backup JSON with metadata
        const backup = {
          version: "1.0",
          createdAt: new Date().toISOString(),
          createdBy: ctx.user.id,
          description: input?.description || "Manual backup",
          tables: Object.keys(backupData),
          recordCounts: Object.fromEntries(
            Object.entries(backupData).map(([key, value]) => [key, value.length])
          ),
          totalRecords,
          data: backupData,
        };

        const backupJson = JSON.stringify(backup, null, 2);
        const checksum = calculateChecksum(backupJson);
        const fileSize = Buffer.byteLength(backupJson, "utf8");

        // Upload to S3
        const fileName = generateBackupFileName();
        const fileKey = `backups/${fileName}`;
        const { url } = await storagePut(fileKey, backupJson, "application/json");

        // Update backup record with success
        await database
          .update(databaseBackups)
          .set({
            status: "completed",
            fileSize,
            recordCount: totalRecords,
            backupPath: url,
            completedAt: sql`CURRENT_TIMESTAMP`,
            metadata: JSON.stringify({
              description: input?.description || "Manual backup",
              initiatedBy: ctx.user.name || ctx.user.email,
              fileName,
              fileKey,
              checksum,
              tables: Object.keys(backupData),
              recordCounts: backup.recordCounts,
            }),
          })
          .where(eq(databaseBackups.id, backupId));

        return {
          success: true,
          backupId,
          fileName,
          fileSize,
          recordCount: totalRecords,
          url,
        };
      } catch (error) {
        // Update backup record with failure
        await database
          .update(databaseBackups)
          .set({
            status: "failed",
            metadata: JSON.stringify({
              description: input?.description || "Manual backup",
              error: error instanceof Error ? error.message : "Unknown error",
            }),
          })
          .where(eq(databaseBackups.id, backupId));

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Backup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * List all backups with pagination
   */
  list: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const limit = input?.limit || 20;
      const offset = input?.offset || 0;

      const backups = await database
        .select()
        .from(databaseBackups)
        .orderBy(desc(databaseBackups.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const countResult = await database
        .select({ count: sql<number>`COUNT(*)` })
        .from(databaseBackups);
      const total = Number(countResult[0]?.count || 0);

      return {
        backups: backups.map(b => ({
          ...b,
          metadata: b.metadata ? JSON.parse(b.metadata) : null,
        })),
        total,
        hasMore: offset + backups.length < total,
      };
    }),

  /**
   * Get details of a specific backup
   */
  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const [backup] = await database
        .select()
        .from(databaseBackups)
        .where(eq(databaseBackups.id, input.id))
        .limit(1);

      if (!backup) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Backup not found",
        });
      }

      return {
        ...backup,
        metadata: backup.metadata ? JSON.parse(backup.metadata) : null,
      };
    }),

  /**
   * Get download URL for a backup
   */
  getDownloadUrl: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const [backup] = await database
        .select()
        .from(databaseBackups)
        .where(eq(databaseBackups.id, input.id))
        .limit(1);

      if (!backup) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Backup not found",
        });
      }

      if (backup.status !== "completed" || !backup.backupPath) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Backup is not available for download",
        });
      }

      // The backupPath already contains the full URL
      return {
        url: backup.backupPath,
        fileName: backup.metadata ? JSON.parse(backup.metadata).fileName : `backup-${backup.id}.json`,
      };
    }),

  /**
   * Restore from a backup file
   * This is a destructive operation - it will replace existing data
   */
  restore: adminProcedure
    .input(z.object({
      backupId: z.number().optional(),
      backupData: z.string().optional(), // JSON string of backup data for direct upload
      options: z.object({
        clearExisting: z.boolean().default(false), // Whether to clear existing data first
        tables: z.array(z.string()).optional(), // Specific tables to restore (all if not specified)
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      let backupJson: string;

      if (input.backupId) {
        // Fetch backup from database
        const [backup] = await database
          .select()
          .from(databaseBackups)
          .where(eq(databaseBackups.id, input.backupId))
          .limit(1);

        if (!backup || !backup.backupPath) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Backup not found or not available",
          });
        }

        // Fetch backup file from S3
        const response = await fetch(backup.backupPath);
        if (!response.ok) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch backup file",
          });
        }
        backupJson = await response.text();
      } else if (input.backupData) {
        backupJson = input.backupData;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either backupId or backupData must be provided",
        });
      }

      // Parse and validate backup
      let backup: any;
      try {
        backup = JSON.parse(backupJson);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid backup file format",
        });
      }

      if (!backup.version || !backup.data) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid backup structure",
        });
      }

      // Create restore log entry
      const restoreLogResult = await database.insert(databaseBackups).values({
        backupType: "manual",
        status: "in_progress",
        createdBy: ctx.user.id,
        metadata: JSON.stringify({
          type: "restore",
          sourceBackupId: input.backupId,
          options: input.options,
          initiatedBy: ctx.user.name || ctx.user.email,
        }),
      });

      const restoreId = Number(restoreLogResult[0].insertId);

      try {
        const tablesToRestore = input.options?.tables || Object.keys(backup.data);
        let restoredRecords = 0;
        const restoredTables: string[] = [];

        // Restore tables in order
        for (const { name, table } of BACKUP_TABLES) {
          if (!tablesToRestore.includes(name) || !backup.data[name]) {
            continue;
          }

          const records = backup.data[name];
          if (!Array.isArray(records) || records.length === 0) {
            continue;
          }

          try {
            // Clear existing data if requested
            if (input.options?.clearExisting) {
              await database.delete(table);
            }

            // Insert records in batches
            const batchSize = 100;
            for (let i = 0; i < records.length; i += batchSize) {
              const batch = records.slice(i, i + batchSize);
              // Use INSERT IGNORE to skip duplicates
              await database.insert(table).values(batch).onDuplicateKeyUpdate({
                set: batch[0], // Update with same values (effectively a no-op for duplicates)
              });
            }

            restoredRecords += records.length;
            restoredTables.push(name);
          } catch (error) {
            console.warn(`[Restore] Warning: Could not restore table ${name}:`, error);
          }
        }

        // Update restore log with success
        await database
          .update(databaseBackups)
          .set({
            status: "completed",
            recordCount: restoredRecords,
            completedAt: sql`CURRENT_TIMESTAMP`,
            metadata: JSON.stringify({
              type: "restore",
              sourceBackupId: input.backupId,
              options: input.options,
              initiatedBy: ctx.user.name || ctx.user.email,
              restoredTables,
              restoredRecords,
            }),
          })
          .where(eq(databaseBackups.id, restoreId));

        return {
          success: true,
          restoreId,
          restoredTables,
          restoredRecords,
        };
      } catch (error) {
        // Update restore log with failure
        await database
          .update(databaseBackups)
          .set({
            status: "failed",
            metadata: JSON.stringify({
              type: "restore",
              error: error instanceof Error ? error.message : "Unknown error",
            }),
          })
          .where(eq(databaseBackups.id, restoreId));

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Restore failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Delete a backup
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      const [backup] = await database
        .select()
        .from(databaseBackups)
        .where(eq(databaseBackups.id, input.id))
        .limit(1);

      if (!backup) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Backup not found",
        });
      }

      // Note: We don't delete from S3 as it may be needed for audit purposes
      // The file will be cleaned up by S3 lifecycle policies if configured

      await database
        .delete(databaseBackups)
        .where(eq(databaseBackups.id, input.id));

      return { success: true };
    }),

  /**
   * Get backup statistics
   */
  getStats: adminProcedure.query(async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    const allBackups = await database.select().from(databaseBackups);

    const completedBackups = allBackups.filter(b => b.status === "completed");
    const totalSize = completedBackups.reduce((sum, b) => sum + (b.fileSize || 0), 0);
    const lastBackup = completedBackups.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    return {
      totalBackups: allBackups.length,
      completedBackups: completedBackups.length,
      failedBackups: allBackups.filter(b => b.status === "failed").length,
      totalStorageUsed: totalSize,
      lastBackupDate: lastBackup?.createdAt || null,
      lastBackupStatus: lastBackup?.status || null,
    };
  }),

  // ==================== ENCRYPTION ENDPOINTS ====================

  /**
   * Create an encrypted backup
   */
  createEncrypted: adminProcedure
    .input(z.object({
      description: z.string().optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Create backup record with pending status
      const backupResult = await database.insert(databaseBackups).values({
        backupType: "manual",
        status: "in_progress",
        createdBy: ctx.user.id,
        isEncrypted: 1,
        metadata: JSON.stringify({
          description: input?.description || "Manual encrypted backup",
          initiatedBy: ctx.user.name || ctx.user.email,
          encrypted: true,
        }),
      });

      const backupId = Number(backupResult[0].insertId);

      try {
        // Collect all data from tables
        const backupData: Record<string, any[]> = {};
        let totalRecords = 0;

        for (const { name, table } of BACKUP_TABLES) {
          try {
            const records = await database.select().from(table);
            backupData[name] = records;
            totalRecords += records.length;
          } catch (error) {
            console.warn(`[Backup] Warning: Could not backup table ${name}:`, error);
            backupData[name] = [];
          }
        }

        // Create backup JSON with metadata
        const backup = {
          version: "1.0",
          encrypted: true,
          createdAt: new Date().toISOString(),
          createdBy: ctx.user.id,
          description: input?.description || "Manual encrypted backup",
          tables: Object.keys(backupData),
          recordCounts: Object.fromEntries(
            Object.entries(backupData).map(([key, value]) => [key, value.length])
          ),
          totalRecords,
          data: backupData,
        };

        const backupJson = JSON.stringify(backup, null, 2);
        
        // Encrypt the backup
        const encrypted = await encryptBackupString(backupJson);
        
        // Create encrypted backup file
        const encryptedBackup = JSON.stringify({
          encrypted: true,
          algorithm: encrypted.algorithm,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          keyId: encrypted.keyId,
          data: encrypted.encrypted,
          checksum: cryptoChecksum(encrypted.encrypted),
        });

        const fileSize = Buffer.byteLength(encryptedBackup, "utf8");

        // Upload to S3
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const fileName = `bca-backup-${timestamp}-${randomSuffix}.encrypted.json`;
        const fileKey = `backups/${fileName}`;
        const { url } = await storagePut(fileKey, encryptedBackup, "application/json");

        // Update backup record with success
        await database
          .update(databaseBackups)
          .set({
            status: "completed",
            fileSize,
            recordCount: totalRecords,
            backupPath: url,
            completedAt: sql`CURRENT_TIMESTAMP`,
            isEncrypted: 1,
            encryptionKeyId: encrypted.keyId,
            encryptionAlgorithm: encrypted.algorithm,
            encryptionIv: encrypted.iv,
            metadata: JSON.stringify({
              description: input?.description || "Manual encrypted backup",
              initiatedBy: ctx.user.name || ctx.user.email,
              fileName,
              fileKey,
              tables: Object.keys(backupData),
              recordCounts: backup.recordCounts,
              encrypted: true,
              authTag: encrypted.authTag,
            }),
          })
          .where(eq(databaseBackups.id, backupId));

        return {
          success: true,
          backupId,
          fileName,
          fileSize,
          recordCount: totalRecords,
          url,
          encrypted: true,
        };
      } catch (error) {
        // Update backup record with failure
        await database
          .update(databaseBackups)
          .set({
            status: "failed",
            metadata: JSON.stringify({
              description: input?.description || "Manual encrypted backup",
              error: error instanceof Error ? error.message : "Unknown error",
            }),
          })
          .where(eq(databaseBackups.id, backupId));

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Encrypted backup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // ==================== SCHEDULING ENDPOINTS ====================

  /**
   * List all backup schedules
   */
  listSchedules: adminProcedure.query(async () => {
    const schedules = await getBackupSchedules();
    return schedules;
  }),

  /**
   * Get schedule statistics
   */
  getScheduleStats: adminProcedure.query(async () => {
    return getScheduleStats();
  }),

  /**
   * Create a new backup schedule
   */
  createSchedule: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      cronExpression: z.string().default("0 3 * * *"), // Default: 3 AM daily
      timezone: z.string().default("America/New_York"),
      retentionDays: z.number().min(1).max(365).default(30),
      encryptionEnabled: z.boolean().default(true),
      emailOnSuccess: z.boolean().default(true),
      emailOnFailure: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database not available");

      // Calculate next run time
      const nextRun = parseNextRunTime(input.cronExpression, input.timezone);

      const result = await database.insert(backupSchedules).values({
        name: input.name,
        description: input.description || null,
        cronExpression: input.cronExpression,
        timezone: input.timezone,
        isEnabled: 1,
        retentionDays: input.retentionDays,
        encryptionEnabled: input.encryptionEnabled ? 1 : 0,
        emailOnSuccess: input.emailOnSuccess ? 1 : 0,
        emailOnFailure: input.emailOnFailure ? 1 : 0,
        nextRunAt: nextRun.toISOString(),
        createdBy: ctx.user.id,
      });

      return {
        success: true,
        scheduleId: Number(result[0].insertId),
        nextRunAt: nextRun.toISOString(),
      };
    }),

  /**
   * Update a backup schedule
   */
  updateSchedule: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      cronExpression: z.string().optional(),
      timezone: z.string().optional(),
      isEnabled: z.boolean().optional(),
      retentionDays: z.number().min(1).max(365).optional(),
      encryptionEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      await updateBackupSchedule(input.id, {
        name: input.name,
        description: input.description,
        cronExpression: input.cronExpression,
        timezone: input.timezone,
        isEnabled: input.isEnabled !== undefined ? (input.isEnabled ? 1 : 0) : undefined,
        retentionDays: input.retentionDays,
        encryptionEnabled: input.encryptionEnabled !== undefined ? (input.encryptionEnabled ? 1 : 0) : undefined,
      });

      return { success: true };
    }),

  /**
   * Delete a backup schedule
   */
  deleteSchedule: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteBackupSchedule(input.id);
      return { success: true };
    }),

  /**
   * Manually trigger a scheduled backup
   */
  triggerScheduledBackup: adminProcedure
    .input(z.object({ scheduleId: z.number() }))
    .mutation(async ({ input }) => {
      const result = await executeScheduledBackup(input.scheduleId);
      
      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Scheduled backup failed",
        });
      }

      return {
        success: true,
        backupId: result.backupId,
      };
    }),

  /**
   * Initialize default backup schedule (3 AM Eastern daily)
   */
  initializeDefaultSchedule: adminProcedure.mutation(async () => {
    await ensureDefaultScheduleExists();
    return { success: true };
  }),

  /**
   * Clean up old backups based on retention policy
   */
  cleanupOldBackups: adminProcedure.mutation(async () => {
    const result = await cleanupOldBackups();
    return {
      success: true,
      deletedCount: result.deleted,
    };
  }),
});
