import { eq, desc, and, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  riskAssessments,
  pofFactors,
  cofFactors,
  criticalEquipment,
  riskMitigationActions,
  type InsertRiskAssessment,
  type InsertPofFactor,
  type InsertCofFactor,
  type InsertCriticalEquipment,
  type InsertRiskMitigationAction,
} from "../../drizzle/schema";

/**
 * Create a new risk assessment
 */
export async function createRiskAssessment(data: InsertRiskAssessment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(riskAssessments).values(data);
  return result[0].insertId;
}

/**
 * Get risk assessment by ID
 */
export async function getRiskAssessmentById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(riskAssessments)
    .where(eq(riskAssessments.id, id))
    .limit(1);

  return result[0];
}

/**
 * Get risk assessment by assessment ID
 */
export async function getRiskAssessmentByAssessmentId(assessmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(riskAssessments)
    .where(eq(riskAssessments.assessmentId, assessmentId))
    .orderBy(desc(riskAssessments.createdAt))
    .limit(1);

  return result[0];
}

/**
 * List all risk assessments with optional filters
 */
export async function listRiskAssessments(filters?: {
  riskLevel?: string;
  status?: string;
  projectId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let query = db.select().from(riskAssessments);

  // Apply filters
  const conditions = [];
  if (filters?.riskLevel) {
    conditions.push(eq(riskAssessments.riskLevel, filters.riskLevel as any));
  }
  if (filters?.status) {
    conditions.push(eq(riskAssessments.status, filters.status as any));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const result = await query.orderBy(desc(riskAssessments.riskScore));
  return result;
}

/**
 * Update risk assessment
 */
export async function updateRiskAssessment(
  id: number,
  data: Partial<InsertRiskAssessment>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(riskAssessments).set(data).where(eq(riskAssessments.id, id));
}

/**
 * Delete risk assessment
 */
export async function deleteRiskAssessment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(riskAssessments).where(eq(riskAssessments.id, id));
}

// ============================================
// PoF Factors
// ============================================

/**
 * Create PoF factors
 */
export async function createPofFactors(data: InsertPofFactor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(pofFactors).values(data);
  return result[0].insertId;
}

/**
 * Get PoF factors by risk assessment ID
 */
export async function getPofFactorsByRiskAssessmentId(riskAssessmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(pofFactors)
    .where(eq(pofFactors.riskAssessmentId, riskAssessmentId))
    .limit(1);

  return result[0];
}

/**
 * Update PoF factors
 */
export async function updatePofFactors(
  riskAssessmentId: number,
  data: Partial<InsertPofFactor>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(pofFactors)
    .set(data)
    .where(eq(pofFactors.riskAssessmentId, riskAssessmentId));
}

// ============================================
// CoF Factors
// ============================================

/**
 * Create CoF factors
 */
export async function createCofFactors(data: InsertCofFactor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(cofFactors).values(data);
  return result[0].insertId;
}

/**
 * Get CoF factors by risk assessment ID
 */
export async function getCofFactorsByRiskAssessmentId(riskAssessmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(cofFactors)
    .where(eq(cofFactors.riskAssessmentId, riskAssessmentId))
    .limit(1);

  return result[0];
}

/**
 * Update CoF factors
 */
export async function updateCofFactors(
  riskAssessmentId: number,
  data: Partial<InsertCofFactor>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(cofFactors)
    .set(data)
    .where(eq(cofFactors.riskAssessmentId, riskAssessmentId));
}

// ============================================
// Critical Equipment
// ============================================

/**
 * Create critical equipment entry
 */
export async function createCriticalEquipment(data: InsertCriticalEquipment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(criticalEquipment).values(data);
  return result[0].insertId;
}

/**
 * Get critical equipment by assessment ID
 */
export async function getCriticalEquipmentByAssessmentId(assessmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(criticalEquipment)
    .where(eq(criticalEquipment.assessmentId, assessmentId))
    .limit(1);

  return result[0];
}

/**
 * List all critical equipment
 */
export async function listCriticalEquipment(criticalityLevel?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let query = db.select().from(criticalEquipment);

  if (criticalityLevel) {
    query = query.where(
      eq(criticalEquipment.criticalityLevel, criticalityLevel as any)
    ) as any;
  }

  const result = await query.orderBy(desc(criticalEquipment.createdAt));
  return result;
}

/**
 * Update critical equipment
 */
export async function updateCriticalEquipment(
  assessmentId: number,
  data: Partial<InsertCriticalEquipment>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(criticalEquipment)
    .set(data)
    .where(eq(criticalEquipment.assessmentId, assessmentId));
}

/**
 * Delete critical equipment entry
 */
export async function deleteCriticalEquipment(assessmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(criticalEquipment)
    .where(eq(criticalEquipment.assessmentId, assessmentId));
}

// ============================================
// Risk Mitigation Actions
// ============================================

/**
 * Create mitigation action
 */
export async function createMitigationAction(data: InsertRiskMitigationAction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(riskMitigationActions).values(data);
  return result[0].insertId;
}

/**
 * Get mitigation actions by risk assessment ID
 */
export async function getMitigationActionsByRiskAssessmentId(
  riskAssessmentId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(riskMitigationActions)
    .where(eq(riskMitigationActions.riskAssessmentId, riskAssessmentId))
    .orderBy(desc(riskMitigationActions.priority));

  return result;
}

/**
 * Update mitigation action
 */
export async function updateMitigationAction(
  id: number,
  data: Partial<InsertRiskMitigationAction>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(riskMitigationActions)
    .set(data)
    .where(eq(riskMitigationActions.id, id));
}

/**
 * Delete mitigation action
 */
export async function deleteMitigationAction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(riskMitigationActions)
    .where(eq(riskMitigationActions.id, id));
}

/**
 * Get portfolio risk metrics
 */
export async function getPortfolioRiskMetrics() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(sql`
    SELECT 
      COUNT(*) as totalAssessments,
      AVG(riskScore) as averageRiskScore,
      MAX(riskScore) as highestRiskScore,
      SUM(CASE WHEN riskLevel = 'critical' THEN 1 ELSE 0 END) as criticalCount,
      SUM(CASE WHEN riskLevel = 'high' THEN 1 ELSE 0 END) as highCount,
      SUM(CASE WHEN riskLevel = 'medium' THEN 1 ELSE 0 END) as mediumCount,
      SUM(CASE WHEN riskLevel = 'low' THEN 1 ELSE 0 END) as lowCount,
      SUM(CASE WHEN riskLevel = 'very_low' THEN 1 ELSE 0 END) as veryLowCount
    FROM risk_assessments
    WHERE status = 'approved'
  `);

  const row = Array.isArray(result[0]) && result[0].length > 0 ? result[0][0] : null;

  if (!row) {
    return {
      totalAssessments: 0,
      averageRiskScore: 0,
      highestRiskScore: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      veryLowCount: 0,
    };
  }

  return {
    totalAssessments: Number(row.totalAssessments) || 0,
    averageRiskScore: Number(row.averageRiskScore) || 0,
    highestRiskScore: Number(row.highestRiskScore) || 0,
    criticalCount: Number(row.criticalCount) || 0,
    highCount: Number(row.highCount) || 0,
    mediumCount: Number(row.mediumCount) || 0,
    lowCount: Number(row.lowCount) || 0,
    veryLowCount: Number(row.veryLowCount) || 0,
  };
}
