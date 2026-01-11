import { getDb } from "./db";
import { cleanupReports, users, type InsertCleanupReport } from "../drizzle/schema";
import { runAllIntegrityChecks, type IntegrityCheckResult } from "./dataIntegrity";
import { eq } from "drizzle-orm";
import { sendEmail } from "./_core/email";

/**
 * Cleanup mode
 */
export type CleanupMode = 'read_only' | 'auto_fix';

/**
 * Cleanup job result
 */
export interface CleanupJobResult {
  reportId: number;
  duration: number;
  status: 'completed' | 'failed' | 'partial';
  criticalIssuesCount: number;
  warningIssuesCount: number;
  infoIssuesCount: number;
  totalIssuesCount: number;
  affectedRecords: any[];
  recommendations: string[];
  errorLog?: string;
}

/**
 * Run cleanup job and generate report
 */
export async function runCleanupJob(mode: CleanupMode = 'read_only'): Promise<CleanupJobResult> {
  const startTime = Date.now();
  const db = await getDb();
  
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    // Create initial report entry
    const reportEntry: InsertCleanupReport = {
      runTimestamp: new Date().toISOString(),
      completedAt: null,
      duration: null,
      status: 'running',
      mode,
      criticalIssuesCount: 0,
      warningIssuesCount: 0,
      infoIssuesCount: 0,
      orphanedRecordsCount: 0,
      duplicateRecordsCount: 0,
      staleComputationsCount: 0,
      invalidWeightsCount: 0,
      brokenReferencesCount: 0,
      missingDependenciesCount: 0,
      recordsArchived: 0,
      recordsDeleted: 0,
      recordsFixed: 0,
      calculationsRerun: 0,
      affectedRecords: null,
      recommendations: null,
      errorLog: null,
      notificationSent: 0,
      notificationSentAt: null,
      notificationError: null,
    };

    const insertResult = await db.insert(cleanupReports).values(reportEntry);
    const reportId = insertResult[0]?.insertId;

    if (!reportId) {
      throw new Error("Failed to create cleanup report");
    }

    // Run all integrity checks
    const integrityResults = await runAllIntegrityChecks();

    // Aggregate results
    let criticalCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    let orphanedCount = 0;
    let duplicateCount = 0;
    let brokenReferencesCount = 0;

    const affectedRecords: any[] = [];
    const recommendations: string[] = [];

    for (const result of integrityResults) {
      if (result.severity === 'critical') criticalCount++;
      else if (result.severity === 'warning') warningCount++;
      else infoCount++;

      if (result.metricType === 'orphaned_records') {
        orphanedCount += result.metricValue;
      } else if (result.metricType === 'duplicate_records') {
        duplicateCount += result.metricValue;
      } else if (result.metricType === 'broken_references') {
        brokenReferencesCount += result.metricValue;
      }

      // Collect affected records
      for (const id of result.affectedRecordIds) {
        affectedRecords.push({
          type: result.entityType,
          id,
          issue: result.description,
          severity: result.severity,
          action: mode === 'auto_fix' ? 'to_be_fixed' : 'manual_review_required',
        });
      }

      // Collect recommendations
      if (result.recommendation) {
        recommendations.push(result.recommendation);
      }
    }

    // If auto_fix mode, perform automated fixes (placeholder for now)
    let recordsArchived = 0;
    let recordsDeleted = 0;
    let recordsFixed = 0;

    if (mode === 'auto_fix') {
      // TODO: Implement auto-fix logic
      // For now, just log that auto-fix would be applied
      console.log('[CleanupJob] Auto-fix mode enabled, but no fixes implemented yet');
    }

    // Calculate duration
    const duration = Math.floor((Date.now() - startTime) / 1000);

    // Update report with results
    await db.update(cleanupReports)
      .set({
        completedAt: new Date().toISOString(),
        duration,
        status: 'completed',
        criticalIssuesCount: criticalCount,
        warningIssuesCount: warningCount,
        infoIssuesCount: infoCount,
        orphanedRecordsCount: orphanedCount,
        duplicateRecordsCount: duplicateCount,
        brokenReferencesCount,
        recordsArchived,
        recordsDeleted,
        recordsFixed,
        affectedRecords: JSON.stringify(affectedRecords),
        recommendations: JSON.stringify(recommendations),
      })
      .where(eq(cleanupReports.id, reportId));

    return {
      reportId,
      duration,
      status: 'completed',
      criticalIssuesCount: criticalCount,
      warningIssuesCount: warningCount,
      infoIssuesCount: infoCount,
      totalIssuesCount: criticalCount + warningCount + infoCount,
      affectedRecords,
      recommendations,
    };

  } catch (error) {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error('[CleanupJob] Job failed:', errorMessage);

    // Try to update report with error
    try {
      // Find the most recent running report
      const runningReports = await db.select()
        .from(cleanupReports)
        .where(eq(cleanupReports.status, 'running'))
        .orderBy(cleanupReports.runTimestamp)
        .limit(1);

      if (runningReports.length > 0) {
        await db.update(cleanupReports)
          .set({
            completedAt: new Date().toISOString(),
            duration,
            status: 'failed',
            errorLog: errorMessage,
          })
          .where(eq(cleanupReports.id, runningReports[0].id));
      }
    } catch (updateError) {
      console.error('[CleanupJob] Failed to update report with error:', updateError);
    }

    throw error;
  }
}

/**
 * Send cleanup report notification email to admins
 */
export async function sendCleanupReportNotification(reportId: number): Promise<void> {
  const db = await getDb();
  
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    // Get the report
    const reports = await db.select()
      .from(cleanupReports)
      .where(eq(cleanupReports.id, reportId))
      .limit(1);

    if (reports.length === 0) {
      throw new Error("Cleanup report not found");
    }

    const report = reports[0];

    // Get all admin users
    const adminUsers = await db.select()
      .from(users)
      .where(eq(users.role, 'admin'));

    if (adminUsers.length === 0) {
      console.warn('[CleanupJob] No admin users found to send notification');
      return;
    }

    // Build email content
    const subject = `Weekly Data Integrity Report - ${report.criticalIssuesCount} Critical Issues`;
    
    const htmlContent = `
      <h2>Weekly Data Integrity Report</h2>
      <p>The automated weekly cleanup job has completed. Here's a summary of the findings:</p>
      
      <h3>Summary</h3>
      <ul>
        <li><strong>Critical Issues:</strong> ${report.criticalIssuesCount}</li>
        <li><strong>Warnings:</strong> ${report.warningIssuesCount}</li>
        <li><strong>Info:</strong> ${report.infoIssuesCount}</li>
      </ul>

      <h3>Details</h3>
      <ul>
        <li><strong>Orphaned Records:</strong> ${report.orphanedRecordsCount}</li>
        <li><strong>Duplicate Records:</strong> ${report.duplicateRecordsCount}</li>
        <li><strong>Broken References:</strong> ${report.brokenReferencesCount}</li>
        <li><strong>Invalid Weights:</strong> ${report.invalidWeightsCount}</li>
      </ul>

      ${report.mode === 'auto_fix' ? `
        <h3>Actions Taken</h3>
        <ul>
          <li><strong>Records Archived:</strong> ${report.recordsArchived}</li>
          <li><strong>Records Deleted:</strong> ${report.recordsDeleted}</li>
          <li><strong>Records Fixed:</strong> ${report.recordsFixed}</li>
        </ul>
      ` : ''}

      <p><strong>Status:</strong> ${report.status}</p>
      <p><strong>Duration:</strong> ${report.duration} seconds</p>
      
      ${report.criticalIssuesCount > 0 ? `
        <p style="color: red; font-weight: bold;">
          ⚠️ Critical issues require immediate attention. Please review the Admin Dashboard for details.
        </p>
      ` : ''}

      <p>
        <a href="${process.env.VITE_FRONTEND_FORGE_API_URL || 'https://app.manus.space'}/admin/cleanup-reports">
          View Full Report in Admin Dashboard
        </a>
      </p>

      <hr>
      <p style="font-size: 12px; color: #666;">
        This is an automated notification from the BCA App Data Integrity System.
      </p>
    `;

    // Send email to each admin
    for (const admin of adminUsers) {
      if (!admin.email) {
        console.warn(`[CleanupJob] Admin user ${admin.id} has no email address`);
        continue;
      }

      try {
        await sendEmail({
          to: admin.email,
          subject,
          html: htmlContent,
        });
      } catch (emailError) {
        console.error(`[CleanupJob] Failed to send email to ${admin.email}:`, emailError);
      }
    }

    // Update report to mark notification as sent
    await db.update(cleanupReports)
      .set({
        notificationSent: 1,
        notificationSentAt: new Date().toISOString(),
      })
      .where(eq(cleanupReports.id, reportId));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error('[CleanupJob] Failed to send notification:', errorMessage);

    // Update report with notification error
    try {
      await db.update(cleanupReports)
        .set({
          notificationError: errorMessage,
        })
        .where(eq(cleanupReports.id, reportId));
    } catch (updateError) {
      console.error('[CleanupJob] Failed to update report with notification error:', updateError);
    }

    throw error;
  }
}

/**
 * Run cleanup job and send notification
 * This is the main entry point for scheduled jobs
 */
export async function runScheduledCleanupJob(mode: CleanupMode = 'read_only'): Promise<void> {
  console.log(`[CleanupJob] Starting scheduled cleanup job in ${mode} mode`);

  try {
    const result = await runCleanupJob(mode);
    
    console.log(`[CleanupJob] Job completed successfully:`, {
      reportId: result.reportId,
      duration: result.duration,
      critical: result.criticalIssuesCount,
      warning: result.warningIssuesCount,
      info: result.infoIssuesCount,
    });

    // Send notification
    await sendCleanupReportNotification(result.reportId);
    
    console.log(`[CleanupJob] Notification sent successfully`);

  } catch (error) {
    console.error('[CleanupJob] Scheduled job failed:', error);
    
    // Try to send failure notification
    try {
      const db = await getDb();
      if (db) {
        const adminUsers = await db.select()
          .from(users)
          .where(eq(users.role, 'admin'));

        for (const admin of adminUsers) {
          if (admin.email) {
            await sendEmail({
              to: admin.email,
              subject: 'Weekly Data Integrity Job Failed',
              html: `
                <h2>Weekly Data Integrity Job Failed</h2>
                <p>The automated weekly cleanup job encountered an error and could not complete.</p>
                <p><strong>Error:</strong> ${error instanceof Error ? error.message : String(error)}</p>
                <p>Please check the system logs for more details.</p>
              `,
            });
          }
        }
      }
    } catch (notificationError) {
      console.error('[CleanupJob] Failed to send failure notification:', notificationError);
    }
  }
}
