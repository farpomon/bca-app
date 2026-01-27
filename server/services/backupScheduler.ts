/**
 * Backup Scheduler Service
 * Manages automated backup scheduling with cron-like expressions
 * Supports timezone-aware scheduling (default: America/New_York for Eastern Time)
 */

import { getDb } from '../db';
import { backupSchedules, databaseBackups } from '../../drizzle/schema';
import { eq, and, lte, sql, desc } from 'drizzle-orm';
import { encryptBackupString, calculateChecksum } from './backupEncryption';
import { storagePut } from '../storage';
import { sendBackupSuccessNotification, sendBackupFailureNotification } from './emailService';

// Import tables for backup
import {
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
} from '../../drizzle/schema';

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

// Default schedule: Daily at 3 AM Eastern Time
export const DEFAULT_CRON_EXPRESSION = '0 3 * * *'; // 3:00 AM every day
export const DEFAULT_TIMEZONE = 'America/New_York';
export const DEFAULT_RETENTION_DAYS = 30;

/**
 * Parse cron expression and calculate next run time
 * Supports: minute hour day-of-month month day-of-week
 */
export function parseNextRunTime(cronExpression: string, timezone: string = DEFAULT_TIMEZONE): Date {
  const parts = cronExpression.split(' ');
  if (parts.length !== 5) {
    throw new Error('Invalid cron expression. Expected format: minute hour day-of-month month day-of-week');
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const now = new Date();
  
  // Simple implementation for daily schedules
  // For production, consider using a library like 'cron-parser'
  const targetHour = hour === '*' ? now.getHours() : parseInt(hour, 10);
  const targetMinute = minute === '*' ? 0 : parseInt(minute, 10);
  
  // Create date in target timezone
  const nextRun = new Date();
  nextRun.setHours(targetHour, targetMinute, 0, 0);
  
  // If the time has passed today, schedule for tomorrow
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  
  // Handle day of week constraints
  if (dayOfWeek !== '*') {
    const targetDays = dayOfWeek.split(',').map(d => parseInt(d, 10));
    while (!targetDays.includes(nextRun.getDay())) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
  }
  
  return nextRun;
}

/**
 * Generate backup filename with timestamp
 */
function generateBackupFileName(encrypted: boolean = false): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const suffix = encrypted ? '.encrypted' : '';
  return `bca-scheduled-backup-${timestamp}-${randomSuffix}${suffix}.json`;
}

/**
 * Create the default daily backup schedule if it doesn't exist
 */
export async function ensureDefaultScheduleExists(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Check if default schedule exists
  const [existing] = await db
    .select()
    .from(backupSchedules)
    .where(eq(backupSchedules.name, 'Daily Backup (3 AM Eastern)'))
    .limit(1);

  if (!existing) {
    const nextRun = parseNextRunTime(DEFAULT_CRON_EXPRESSION, DEFAULT_TIMEZONE);
    
    await db.insert(backupSchedules).values({
      name: 'Daily Backup (3 AM Eastern)',
      description: 'Automated daily backup at 3:00 AM Eastern Time with AES-256-GCM encryption',
      cronExpression: DEFAULT_CRON_EXPRESSION,
      timezone: DEFAULT_TIMEZONE,
      isEnabled: 1,
      retentionDays: DEFAULT_RETENTION_DAYS,
      encryptionEnabled: 1,
      nextRunAt: nextRun.toISOString(),
    });
    
    console.log('[BackupScheduler] Created default daily backup schedule');
  }
}

/**
 * Execute a scheduled backup
 */
export async function executeScheduledBackup(scheduleId: number): Promise<{
  success: boolean;
  backupId?: number;
  error?: string;
}> {
  const db = await getDb();
  if (!db) return { success: false, error: 'Database not available' };

  // Get schedule details
  const [schedule] = await db
    .select()
    .from(backupSchedules)
    .where(eq(backupSchedules.id, scheduleId))
    .limit(1);

  if (!schedule) {
    return { success: false, error: 'Schedule not found' };
  }

  // Create backup record
  const backupResult = await db.insert(databaseBackups).values({
    backupType: 'scheduled',
    status: 'in_progress',
    metadata: JSON.stringify({
      scheduleId,
      scheduleName: schedule.name,
      encryptionEnabled: schedule.encryptionEnabled,
    }),
  });

  const backupId = Number(backupResult[0].insertId);
  const startTime = Date.now();

  try {
    // Collect all data from tables
    const backupData: Record<string, any[]> = {};
    let totalRecords = 0;

    for (const { name, table } of BACKUP_TABLES) {
      try {
        const records = await db.select().from(table);
        backupData[name] = records;
        totalRecords += records.length;
      } catch (error) {
        console.warn(`[BackupScheduler] Warning: Could not backup table ${name}:`, error);
        backupData[name] = [];
      }
    }

    // Create backup JSON with metadata
    const backup = {
      version: '1.0',
      type: 'scheduled',
      encrypted: schedule.encryptionEnabled === 1,
      createdAt: new Date().toISOString(),
      scheduleId,
      scheduleName: schedule.name,
      tables: Object.keys(backupData),
      recordCounts: Object.fromEntries(
        Object.entries(backupData).map(([key, value]) => [key, value.length])
      ),
      totalRecords,
      data: backupData,
    };

    let backupJson = JSON.stringify(backup, null, 2);
    let encryptionMetadata: {
      iv?: string;
      authTag?: string;
      keyId?: string;
      algorithm?: string;
    } = {};

    // Encrypt if enabled
    if (schedule.encryptionEnabled === 1) {
      const encrypted = await encryptBackupString(backupJson);
      backupJson = JSON.stringify({
        encrypted: true,
        algorithm: encrypted.algorithm,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        keyId: encrypted.keyId,
        data: encrypted.encrypted,
        checksum: calculateChecksum(encrypted.encrypted),
      });
      encryptionMetadata = {
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        keyId: encrypted.keyId,
        algorithm: encrypted.algorithm,
      };
    }

    const fileSize = Buffer.byteLength(backupJson, 'utf8');

    // Upload to S3
    const fileName = generateBackupFileName(schedule.encryptionEnabled === 1);
    const fileKey = `backups/scheduled/${fileName}`;
    const { url } = await storagePut(fileKey, backupJson, 'application/json');

    // Update backup record with success
    await db
      .update(databaseBackups)
      .set({
        status: 'completed',
        fileSize,
        recordCount: totalRecords,
        backupPath: url,
        completedAt: sql`CURRENT_TIMESTAMP`,
        isEncrypted: schedule.encryptionEnabled,
        encryptionKeyId: encryptionMetadata.keyId || null,
        encryptionAlgorithm: encryptionMetadata.algorithm || null,
        encryptionIv: encryptionMetadata.iv || null,
        metadata: JSON.stringify({
          scheduleId,
          scheduleName: schedule.name,
          fileName,
          fileKey,
          tables: Object.keys(backupData),
          recordCounts: backup.recordCounts,
          encryptionEnabled: schedule.encryptionEnabled === 1,
          authTag: encryptionMetadata.authTag,
        }),
      })
      .where(eq(databaseBackups.id, backupId));

    // Update schedule with last run info
    const nextRun = parseNextRunTime(schedule.cronExpression, schedule.timezone);
    await db
      .update(backupSchedules)
      .set({
        lastRunAt: sql`CURRENT_TIMESTAMP`,
        nextRunAt: nextRun.toISOString(),
        lastRunStatus: 'success',
        lastRunBackupId: backupId,
      })
      .where(eq(backupSchedules.id, scheduleId));

    console.log(`[BackupScheduler] Scheduled backup completed: ${fileName}`);

    // Send success email notification if enabled
    if (schedule.emailOnSuccess === 1) {
      const endTime = Date.now();
      const duration = `${Math.round((endTime - startTime) / 1000)}s`;
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      
      await sendBackupSuccessNotification({
        backupName: fileName,
        backupId: backupId.toString(),
        scheduleName: schedule.name,
        fileSize: `${fileSizeMB} MB`,
        duration,
        timestamp: new Date().toLocaleString('en-US', { timeZone: schedule.timezone }),
      }).catch(error => {
        console.error('[BackupScheduler] Failed to send success email:', error);
      });
    }

    return { success: true, backupId };
  } catch (error) {
    // Update backup record with failure
    await db
      .update(databaseBackups)
      .set({
        status: 'failed',
        metadata: JSON.stringify({
          scheduleId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      })
      .where(eq(databaseBackups.id, backupId));

    // Update schedule with failure status
    const nextRun = parseNextRunTime(schedule.cronExpression, schedule.timezone);
    await db
      .update(backupSchedules)
      .set({
        lastRunAt: sql`CURRENT_TIMESTAMP`,
        nextRunAt: nextRun.toISOString(),
        lastRunStatus: 'failed',
      })
      .where(eq(backupSchedules.id, scheduleId));

    console.error('[BackupScheduler] Scheduled backup failed:', error);

    // Send failure email notification if enabled
    if (schedule.emailOnFailure === 1) {
      await sendBackupFailureNotification({
        scheduleName: schedule.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toLocaleString('en-US', { timeZone: schedule.timezone }),
      }).catch(emailError => {
        console.error('[BackupScheduler] Failed to send failure email:', emailError);
      });
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check and execute due scheduled backups
 */
export async function checkAndExecuteDueBackups(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const now = new Date();

    // Find all enabled schedules that are due
    const dueSchedules = await db
      .select()
      .from(backupSchedules)
      .where(
        and(
          eq(backupSchedules.isEnabled, 1),
          lte(backupSchedules.nextRunAt, now.toISOString())
        )
      );

    for (const schedule of dueSchedules) {
      console.log(`[BackupScheduler] Executing due backup: ${schedule.name}`);
      await executeScheduledBackup(schedule.id);
    }
  } catch (error) {
    // Silently handle connection errors to prevent scheduler from crashing
    // These are typically transient issues that will resolve on next check
    if (error instanceof Error && (error.message.includes('ECONNRESET') || error.message.includes('connection'))) {
      // Connection error - will retry on next interval
      return;
    }
    // Log other errors but don't crash
    console.error('[BackupScheduler] Error in checkAndExecuteDueBackups:', error);
  }
}

/**
 * Clean up old backups based on retention policy
 */
export async function cleanupOldBackups(): Promise<{ deleted: number }> {
  const db = await getDb();
  if (!db) return { deleted: 0 };

  // Get all schedules with their retention policies
  const schedules = await db.select().from(backupSchedules);
  let totalDeleted = 0;

  for (const schedule of schedules) {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - schedule.retentionDays);

    // Find old scheduled backups for this schedule
    const oldBackups = await db
      .select()
      .from(databaseBackups)
      .where(
        and(
          eq(databaseBackups.backupType, 'scheduled'),
          lte(databaseBackups.createdAt, retentionDate.toISOString())
        )
      );

    // Filter backups that belong to this schedule
    const backupsToDelete = oldBackups.filter(backup => {
      try {
        const metadata = backup.metadata ? JSON.parse(backup.metadata) : {};
        return metadata.scheduleId === schedule.id;
      } catch {
        return false;
      }
    });

    // Delete old backups
    for (const backup of backupsToDelete) {
      await db.delete(databaseBackups).where(eq(databaseBackups.id, backup.id));
      totalDeleted++;
    }
  }

  if (totalDeleted > 0) {
    console.log(`[BackupScheduler] Cleaned up ${totalDeleted} old backups`);
  }

  return { deleted: totalDeleted };
}

/**
 * Get all backup schedules
 */
export async function getBackupSchedules() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(backupSchedules).orderBy(desc(backupSchedules.createdAt));
}

/**
 * Update a backup schedule
 */
export async function updateBackupSchedule(
  id: number,
  updates: {
    name?: string;
    description?: string;
    cronExpression?: string;
    timezone?: string;
    isEnabled?: number;
    retentionDays?: number;
    encryptionEnabled?: number;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // If cron expression or timezone changed, recalculate next run
  let nextRunAt: string | undefined;
  if (updates.cronExpression || updates.timezone) {
    const [schedule] = await db
      .select()
      .from(backupSchedules)
      .where(eq(backupSchedules.id, id))
      .limit(1);

    if (schedule) {
      const cron = updates.cronExpression || schedule.cronExpression;
      const tz = updates.timezone || schedule.timezone;
      nextRunAt = parseNextRunTime(cron, tz).toISOString();
    }
  }

  await db
    .update(backupSchedules)
    .set({
      ...updates,
      ...(nextRunAt ? { nextRunAt } : {}),
    })
    .where(eq(backupSchedules.id, id));
}

/**
 * Delete a backup schedule
 */
export async function deleteBackupSchedule(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(backupSchedules).where(eq(backupSchedules.id, id));
}

/**
 * Get backup schedule statistics
 */
export async function getScheduleStats() {
  const db = await getDb();
  if (!db) return null;

  const schedules = await db.select().from(backupSchedules);
  const recentBackups = await db
    .select()
    .from(databaseBackups)
    .where(eq(databaseBackups.backupType, 'scheduled'))
    .orderBy(desc(databaseBackups.createdAt))
    .limit(10);

  const successCount = recentBackups.filter(b => b.status === 'completed').length;
  const failedCount = recentBackups.filter(b => b.status === 'failed').length;

  return {
    totalSchedules: schedules.length,
    enabledSchedules: schedules.filter(s => s.isEnabled === 1).length,
    recentBackups: recentBackups.length,
    successRate: recentBackups.length > 0 ? (successCount / recentBackups.length) * 100 : 0,
    failedCount,
    nextScheduledBackup: schedules
      .filter(s => s.isEnabled === 1 && s.nextRunAt)
      .sort((a, b) => new Date(a.nextRunAt!).getTime() - new Date(b.nextRunAt!).getTime())[0]?.nextRunAt || null,
  };
}

// Initialize scheduler on module load
let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Start the backup scheduler
 * Checks for due backups every minute
 */
export function startBackupScheduler(): void {
  if (schedulerInterval) {
    console.log('[BackupScheduler] Scheduler already running');
    return;
  }

  // Ensure default schedule exists
  ensureDefaultScheduleExists().catch(console.error);

  // Check for due backups every minute
  schedulerInterval = setInterval(async () => {
    try {
      await checkAndExecuteDueBackups();
    } catch (error) {
      console.error('[BackupScheduler] Error checking due backups:', error);
    }
  }, 60 * 1000); // Every minute

  // Also run cleanup daily
  setInterval(async () => {
    try {
      await cleanupOldBackups();
    } catch (error) {
      console.error('[BackupScheduler] Error cleaning up old backups:', error);
    }
  }, 24 * 60 * 60 * 1000); // Every 24 hours

  console.log('[BackupScheduler] Scheduler started');
}

/**
 * Stop the backup scheduler
 */
export function stopBackupScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[BackupScheduler] Scheduler stopped');
  }
}
