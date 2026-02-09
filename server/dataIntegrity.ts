import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { dataIntegrityMetrics, type InsertDataIntegrityMetric } from "../drizzle/schema";

/**
 * Metric types for data integrity monitoring
 */
export type IntegrityMetricType =
  | 'orphaned_records'
  | 'duplicate_records'
  | 'missing_dependencies'
  | 'stale_computations'
  | 'invalid_weights'
  | 'broken_references'
  | 'esg_ratings_stale'
  | 'last_cleanup_success'
  | 'last_cleanup_failure'
  | 'recurring_errors';

/**
 * Severity levels for metrics
 */
export type IntegritySeverity = 'info' | 'warning' | 'critical';

/**
 * Integrity check result
 */
export interface IntegrityCheckResult {
  metricType: IntegrityMetricType;
  metricCategory?: string;
  entityType?: string;
  metricValue: number;
  severity: IntegritySeverity;
  affectedRecordIds: number[];
  description: string;
  recommendation: string;
  metadata?: any;
}

/**
 * Calculate severity based on metric value and thresholds
 */
function calculateSeverity(value: number, warningThreshold: number, criticalThreshold: number): IntegritySeverity {
  if (value >= criticalThreshold) return 'critical';
  if (value >= warningThreshold) return 'warning';
  return 'info';
}

/**
 * Store integrity metric in database
 */
async function storeIntegrityMetric(result: IntegrityCheckResult): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[DataIntegrity] Database not available, skipping metric storage");
    return;
  }

  const metric: InsertDataIntegrityMetric = {
    calculatedAt: new Date().toISOString(),
    metricType: result.metricType,
    metricCategory: result.metricCategory ?? null,
    entityType: result.entityType ?? null,
    metricValue: result.metricValue,
    metricValueDecimal: null,
    severity: result.severity,
    threshold: null,
    affectedRecordIds: JSON.stringify(result.affectedRecordIds),
    affectedRecordCount: result.affectedRecordIds.length,
    previousValue: null,
    changePercent: null,
    trendDirection: null,
    description: result.description,
    recommendation: result.recommendation,
    metadata: result.metadata ? JSON.stringify(result.metadata) : null,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hour TTL
  };

  await db.insert(dataIntegrityMetrics).values(metric);
}

/**
 * Check for orphaned assessment records (assessments without valid asset)
 */
export async function checkOrphanedAssessments(): Promise<IntegrityCheckResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.execute(sql`
    SELECT a.id
    FROM assessments a
    LEFT JOIN assets ast ON a.assetId = ast.id
    WHERE ast.id IS NULL
    LIMIT 1000
  `);

  const rows = Array.isArray(result) ? result[0] : (result.rows ?? result);
  const orphanedIds = (rows as any[]).map((row: any) => row.id);
  const count = orphanedIds.length;

  return {
    metricType: 'orphaned_records',
    metricCategory: 'assessments',
    entityType: 'assessment',
    metricValue: count,
    severity: calculateSeverity(count, 10, 50),
    affectedRecordIds: orphanedIds,
    description: `Found ${count} assessment records without valid assets`,
    recommendation: count > 0 
      ? 'Review and delete orphaned assessments or restore missing asset references'
      : 'No orphaned assessments found',
  };
}

/**
 * Check for orphaned deficiency records (deficiencies without valid assessment)
 */
export async function checkOrphanedDeficiencies(): Promise<IntegrityCheckResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.execute(sql`
    SELECT d.id
    FROM deficiencies d
    LEFT JOIN assessments a ON d.assessmentId = a.id
    WHERE a.id IS NULL
    LIMIT 1000
  `);

  const rows = Array.isArray(result) ? result[0] : (result.rows ?? result);
  const orphanedIds = (rows as any[]).map((row: any) => row.id);
  const count = orphanedIds.length;

  return {
    metricType: 'orphaned_records',
    metricCategory: 'deficiencies',
    entityType: 'deficiency',
    metricValue: count,
    severity: calculateSeverity(count, 10, 50),
    affectedRecordIds: orphanedIds,
    description: `Found ${count} deficiency records without valid assessments`,
    recommendation: count > 0
      ? 'Review and delete orphaned deficiencies or restore missing assessment references'
      : 'No orphaned deficiencies found',
  };
}

/**
 * Check for orphaned photos (photos without valid assessment)
 */
export async function checkOrphanedPhotos(): Promise<IntegrityCheckResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.execute(sql`
    SELECT p.id
    FROM photos p
    LEFT JOIN assessments a ON p.assessmentId = a.id
    WHERE a.id IS NULL
    LIMIT 1000
  `);

  const rows = Array.isArray(result) ? result[0] : (result.rows ?? result);
  const orphanedIds = (rows as any[]).map((row: any) => row.id);
  const count = orphanedIds.length;

  return {
    metricType: 'orphaned_records',
    metricCategory: 'photos',
    entityType: 'photo',
    metricValue: count,
    severity: calculateSeverity(count, 50, 200),
    affectedRecordIds: orphanedIds,
    description: `Found ${count} photo records without valid assessments`,
    recommendation: count > 0
      ? 'Review and delete orphaned photos to free up storage space'
      : 'No orphaned photos found',
  };
}

/**
 * Check for duplicate projects (same name and location)
 */
export async function checkDuplicateProjects(): Promise<IntegrityCheckResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.execute(sql`
    SELECT 
      p1.id,
      p1.name,
      p1.address
    FROM projects p1
    INNER JOIN projects p2 ON 
      LOWER(TRIM(p1.name)) = LOWER(TRIM(p2.name)) AND
      LOWER(TRIM(COALESCE(p1.address, ''))) = LOWER(TRIM(COALESCE(p2.address, ''))) AND
      p1.id < p2.id
    LIMIT 1000
  `);

  const rows = Array.isArray(result) ? result[0] : (result.rows ?? result);
  const duplicateIds = (rows as any[]).map((row: any) => row.id);
  const count = duplicateIds.length;

  return {
    metricType: 'duplicate_records',
    metricCategory: 'projects',
    entityType: 'project',
    metricValue: count,
    severity: calculateSeverity(count, 5, 20),
    affectedRecordIds: duplicateIds,
    description: `Found ${count} potential duplicate projects with same name and location`,
    recommendation: count > 0
      ? 'Review duplicate projects and merge or delete as appropriate'
      : 'No duplicate projects found',
  };
}

/**
 * Check for duplicate assets (same name within same project)
 */
export async function checkDuplicateAssets(): Promise<IntegrityCheckResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.execute(sql`
    SELECT 
      a1.id,
      a1.name,
      a1.projectId
    FROM assets a1
    INNER JOIN assets a2 ON 
      a1.projectId = a2.projectId AND
      LOWER(TRIM(a1.name)) = LOWER(TRIM(a2.name)) AND
      a1.id < a2.id
    LIMIT 1000
  `);

  const rows = Array.isArray(result) ? result[0] : (result.rows ?? result);
  const duplicateIds = (rows as any[]).map((row: any) => row.id);
  const count = duplicateIds.length;

  return {
    metricType: 'duplicate_records',
    metricCategory: 'assets',
    entityType: 'asset',
    metricValue: count,
    severity: calculateSeverity(count, 10, 50),
    affectedRecordIds: duplicateIds,
    description: `Found ${count} potential duplicate assets with same name within projects`,
    recommendation: count > 0
      ? 'Review duplicate assets and merge or rename as appropriate'
      : 'No duplicate assets found',
  };
}

/**
 * Check for broken references (assets without valid project)
 */
export async function checkBrokenAssetReferences(): Promise<IntegrityCheckResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.execute(sql`
    SELECT a.id
    FROM assets a
    LEFT JOIN projects p ON a.projectId = p.id
    WHERE p.id IS NULL
    LIMIT 1000
  `);

  const rows = Array.isArray(result) ? result[0] : (result.rows ?? result);
  const brokenIds = (rows as any[]).map((row: any) => row.id);
  const count = brokenIds.length;

  return {
    metricType: 'broken_references',
    metricCategory: 'assets',
    entityType: 'asset',
    metricValue: count,
    severity: calculateSeverity(count, 5, 20),
    affectedRecordIds: brokenIds,
    description: `Found ${count} assets referencing non-existent projects`,
    recommendation: count > 0
      ? 'Critical: Fix broken project references or delete orphaned assets'
      : 'No broken asset references found',
  };
}

/**
 * Check for assessments with missing component references
 */
export async function checkMissingComponentReferences(): Promise<IntegrityCheckResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.execute(sql`
    SELECT a.id
    FROM assessments a
    LEFT JOIN building_components bc ON a.componentId = bc.id
    WHERE a.componentId IS NOT NULL AND bc.id IS NULL
    LIMIT 1000
  `);

  const rows = Array.isArray(result) ? result[0] : (result.rows ?? result);
  const missingIds = (rows as any[]).map((row: any) => row.id);
  const count = missingIds.length;

  return {
    metricType: 'broken_references',
    metricCategory: 'assessments',
    entityType: 'assessment',
    metricValue: count,
    severity: calculateSeverity(count, 10, 50),
    affectedRecordIds: missingIds,
    description: `Found ${count} assessments referencing non-existent building components`,
    recommendation: count > 0
      ? 'Review and fix component references or set to null'
      : 'No missing component references found',
  };
}

/**
 * Run all integrity checks and store results
 */
export async function runAllIntegrityChecks(): Promise<IntegrityCheckResult[]> {
  const checks = [
    checkOrphanedAssessments,
    checkOrphanedDeficiencies,
    checkOrphanedPhotos,
    checkDuplicateProjects,
    checkDuplicateAssets,
    checkBrokenAssetReferences,
    checkMissingComponentReferences,
  ];

  const results: IntegrityCheckResult[] = [];

  for (const check of checks) {
    try {
      const result = await check();
      results.push(result);
      await storeIntegrityMetric(result);
    } catch (error) {
      console.error(`[DataIntegrity] Check failed:`, error);
    }
  }

  return results;
}

/**
 * Get current integrity metrics summary
 */
export async function getIntegrityMetricsSummary() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get latest metrics (within last 24 hours)
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const metrics = await db.execute(sql`
    SELECT 
      metricType,
      metricCategory,
      entityType,
      metricValue,
      severity,
      affectedRecordCount,
      description,
      recommendation,
      calculatedAt
    FROM data_integrity_metrics
    WHERE calculatedAt > ${cutoffTime}
    ORDER BY calculatedAt DESC, severity DESC
  `);

  // Group by metric type and category
  const summary: Record<string, any> = {
    critical: 0,
    warning: 0,
    info: 0,
    metrics: Array.isArray(metrics) ? metrics[0] : (metrics.rows ?? metrics),
  };

  const metricRows = Array.isArray(metrics) ? metrics[0] : (metrics.rows ?? metrics);
  for (const metric of metricRows as any[]) {
    if (metric.severity === 'critical') summary.critical++;
    else if (metric.severity === 'warning') summary.warning++;
    else summary.info++;
  }

  return summary;
}
