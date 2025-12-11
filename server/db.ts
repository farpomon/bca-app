import { eq, and, desc, asc, sql, like, or, isNull, ne, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users,
  projects,
  buildingComponents,
  assessments,
  deficiencies,
  photos,
  costEstimates,
  hierarchyTemplates,
  projectHierarchyConfig,
  ratingScales,
  projectRatingConfig,
  buildingSections,
  auditLog, InsertAuditLog,
  assessmentVersions, InsertAssessmentVersion,
  deficiencyVersions, InsertDeficiencyVersion,
  projectVersions, InsertProjectVersion,
  InsertProject,
  InsertAssessment,
  InsertDeficiency,
  InsertPhoto,
  InsertCostEstimate,
  InsertRatingScale,
  InsertProjectRatingConfig,
  validationRules,
  validationOverrides,
  componentHistory,
  consultantSubmissions,
  submissionItems,
  submissionPhotos,
  deteriorationCurves,
  componentDeteriorationConfig,
  predictionHistory,
  ciFciSnapshots
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Projects
export async function getUserProjects(userId: number, includeDeleted: boolean = false) {
  const db = await getDb();
  if (!db) return [];
  
  // Exclude deleted projects by default
  const whereConditions = includeDeleted
    ? eq(projects.userId, userId)
    : and(eq(projects.userId, userId), ne(projects.status, "deleted"));
  
  return await db
    .select()
    .from(projects)
    .where(whereConditions)
    .orderBy(desc(projects.updatedAt));
}

export async function getDeletedProjects(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  return await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        eq(projects.status, "deleted"),
        gte(projects.deletedAt, ninetyDaysAgo)
      )
    )
    .orderBy(desc(projects.deletedAt));
}

export async function getProjectById(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function createProject(data: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(projects).values(data);
  return result[0].insertId;
}

export async function updateProject(projectId: number, userId: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
}

export async function deleteProject(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Soft delete: set status to 'deleted' and record deletion time
  await db
    .update(projects)
    .set({
      status: "deleted",
      deletedAt: new Date(),
      deletedBy: userId,
    })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
}

export async function restoreProject(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Restore: set status back to draft and clear deletion fields
  await db
    .update(projects)
    .set({
      status: "draft",
      deletedAt: null,
      deletedBy: null,
    })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
}

export async function permanentlyDeleteProject(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Hard delete: actually remove from database
  await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
}

// Building Components
export async function getAllBuildingComponents() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(buildingComponents).orderBy(buildingComponents.code);
}

export async function getBuildingComponentsByLevel(level: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(buildingComponents)
    .where(eq(buildingComponents.level, level))
    .orderBy(buildingComponents.code);
}

export async function getBuildingComponentByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(buildingComponents)
    .where(eq(buildingComponents.code, code))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

// Assessments
export async function getProjectAssessments(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(assessments)
    .where(eq(assessments.projectId, projectId))
    .orderBy(desc(assessments.assessedAt));
}

export async function getAssessmentByComponent(projectId: number, componentCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(assessments)
    .where(and(
      eq(assessments.projectId, projectId),
      eq(assessments.componentCode, componentCode)
    ))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertAssessment(data: InsertAssessment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = data.componentCode ? await getAssessmentByComponent(data.projectId, data.componentCode) : null;
  
  if (existing) {
    await db
      .update(assessments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(assessments.id, existing.id));
    return existing.id;
  } else {
    const result = await db.insert(assessments).values(data);
    return result[0].insertId;
  }
}

// Deficiencies
export async function getProjectDeficiencies(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(deficiencies)
    .where(eq(deficiencies.projectId, projectId))
    .orderBy(desc(deficiencies.createdAt));
}

export async function getDeficiencyById(deficiencyId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(deficiencies)
    .where(eq(deficiencies.id, deficiencyId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function createDeficiency(data: InsertDeficiency) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(deficiencies).values(data);
  return result[0].insertId;
}

export async function updateDeficiency(deficiencyId: number, data: Partial<InsertDeficiency>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(deficiencies)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(deficiencies.id, deficiencyId));
}

export async function deleteDeficiency(deficiencyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(deficiencies).where(eq(deficiencies.id, deficiencyId));
}

// Photos
export async function getProjectPhotos(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(photos)
    .where(eq(photos.projectId, projectId))
    .orderBy(desc(photos.createdAt));
}

export async function getDeficiencyPhotos(deficiencyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(photos)
    .where(eq(photos.deficiencyId, deficiencyId))
    .orderBy(desc(photos.createdAt));
}

export async function getAssessmentPhotos(assessmentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(photos)
    .where(eq(photos.assessmentId, assessmentId))
    .orderBy(desc(photos.createdAt));
}

export async function createPhoto(data: InsertPhoto) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(photos).values(data);
  return Number(result.insertId);
}

export async function deletePhoto(photoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(photos).where(eq(photos.id, photoId));
}

// Cost Estimates
export async function getDeficiencyCostEstimates(deficiencyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(costEstimates)
    .where(eq(costEstimates.deficiencyId, deficiencyId))
    .orderBy(desc(costEstimates.createdAt));
}

export async function getProjectCostEstimates(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(costEstimates)
    .where(eq(costEstimates.projectId, projectId))
    .orderBy(desc(costEstimates.createdAt));
}

export async function createCostEstimate(data: InsertCostEstimate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(costEstimates).values(data);
  return result[0].insertId;
}

export async function updateCostEstimate(costEstimateId: number, data: Partial<InsertCostEstimate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(costEstimates)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(costEstimates.id, costEstimateId));
}

export async function deleteCostEstimate(costEstimateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(costEstimates).where(eq(costEstimates.id, costEstimateId));
}

// Dashboard statistics
export async function getProjectStats(projectId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [deficiencyCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(deficiencies)
    .where(eq(deficiencies.projectId, projectId));
  
  const [assessmentCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(assessments)
    .where(eq(assessments.projectId, projectId));
  
  const [photoCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(photos)
    .where(eq(photos.projectId, projectId));
  
  const [totalCost] = await db
    .select({ total: sql<number>`sum(estimatedCost)` })
    .from(deficiencies)
    .where(eq(deficiencies.projectId, projectId));
  
  return {
    deficiencies: deficiencyCount?.count || 0,
    assessments: assessmentCount?.count || 0,
    photos: photoCount?.count || 0,
    totalEstimatedCost: totalCost?.total || 0,
  };
}

// FCI (Facility Condition Index) calculation
export async function getProjectFCI(projectId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // Get total repair costs and replacement values from assessments
  const [costSums] = await db
    .select({
      totalRepairCost: sql<number>`COALESCE(SUM(estimatedRepairCost), 0)`,
      totalReplacementValue: sql<number>`COALESCE(SUM(replacementValue), 0)`,
    })
    .from(assessments)
    .where(eq(assessments.projectId, projectId));
  
  const totalRepairCost = Number(costSums?.totalRepairCost) || 0;
  const totalReplacementValue = Number(costSums?.totalReplacementValue) || 0;
  
  // FCI = Total Repair Cost / Total Replacement Value
  // FCI ranges: Good (0-5%), Fair (5-10%), Poor (10-30%), Critical (>30%)
  const fci = totalReplacementValue > 0 ? (totalRepairCost / totalReplacementValue) * 100 : 0;
  
  let rating: 'good' | 'fair' | 'poor' | 'critical';
  if (fci <= 5) {
    rating = 'good';
  } else if (fci <= 10) {
    rating = 'fair';
  } else if (fci <= 30) {
    rating = 'poor';
  } else {
    rating = 'critical';
  }
  
  return {
    totalRepairCost,
    totalReplacementValue,
    fci: Number(fci.toFixed(2)),
    rating,
  };
}



// ==================== Hierarchy Management ====================

export async function createHierarchyTemplate(template: {
  name: string;
  description?: string;
  isDefault?: boolean;
  config: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(hierarchyTemplates).values(template);
  return result;
}

export async function getHierarchyTemplates() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(hierarchyTemplates);
}

export async function getDefaultHierarchyTemplate() {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(hierarchyTemplates)
    .where(eq(hierarchyTemplates.isDefault, true))
    .limit(1);

  return result[0] || null;
}

export async function updateHierarchyTemplate(
  id: number,
  updates: Partial<{
    name: string;
    description: string;
    isDefault: boolean;
    config: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(hierarchyTemplates)
    .set(updates)
    .where(eq(hierarchyTemplates.id, id));
}

export async function deleteHierarchyTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(hierarchyTemplates).where(eq(hierarchyTemplates.id, id));
}

export async function getProjectHierarchyConfig(projectId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(projectHierarchyConfig)
    .where(eq(projectHierarchyConfig.projectId, projectId))
    .limit(1);

  return result[0] || null;
}

export async function upsertProjectHierarchyConfig(config: {
  projectId: number;
  templateId?: number;
  maxDepth?: number;
  componentWeights?: string;
  componentPriorities?: string;
  enabledComponents?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getProjectHierarchyConfig(config.projectId);

  if (existing) {
    await db
      .update(projectHierarchyConfig)
      .set(config)
      .where(eq(projectHierarchyConfig.projectId, config.projectId));
  } else {
    await db.insert(projectHierarchyConfig).values(config);
  }
}

export async function deleteProjectHierarchyConfig(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(projectHierarchyConfig)
    .where(eq(projectHierarchyConfig.projectId, projectId));
}

// ============================================================================
// Rating Scales
// ============================================================================

export async function createRatingScale(scale: InsertRatingScale) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(ratingScales).values(scale);
  return result[0].insertId;
}

export async function getAllRatingScales() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(ratingScales);
}

export async function getRatingScaleById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(ratingScales).where(eq(ratingScales.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getRatingScalesByType(type: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(ratingScales).where(eq(ratingScales.type, type as any));
}

export async function getDefaultRatingScale(type: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(ratingScales)
    .where(and(eq(ratingScales.type, type as any), eq(ratingScales.isDefault, true)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateRatingScale(id: number, updates: Partial<InsertRatingScale>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(ratingScales).set(updates).where(eq(ratingScales.id, id));
}

export async function deleteRatingScale(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(ratingScales).where(eq(ratingScales.id, id));
}

// ============================================================================
// Project Rating Configuration
// ============================================================================

export async function getProjectRatingConfig(projectId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(projectRatingConfig)
    .where(eq(projectRatingConfig.projectId, projectId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertProjectRatingConfig(config: InsertProjectRatingConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getProjectRatingConfig(config.projectId);
  
  if (existing) {
    await db
      .update(projectRatingConfig)
      .set(config)
      .where(eq(projectRatingConfig.projectId, config.projectId));
  } else {
    await db.insert(projectRatingConfig).values(config);
  }
}

export async function deleteProjectRatingConfig(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(projectRatingConfig).where(eq(projectRatingConfig.projectId, projectId));
}

// ============================================================================
// Overall Building Condition Calculation
// ============================================================================

export async function calculateOverallBuildingCondition(projectId: number) {
  const db = await getDb();
  if (!db) return null;

  // Get all assessments for the project
  const projectAssessments = await getProjectAssessments(projectId);
  
  if (projectAssessments.length === 0) {
    return {
      overallConditionScore: null,
      overallFciScore: null,
      overallConditionRating: "Not Assessed",
      assessmentCount: 0,
    };
  }

  // Calculate average condition score
  // Map condition to numerical values: good=3, fair=2, poor=1, not_assessed=0
  const conditionValues = {
    good: 3,
    fair: 2,
    poor: 1,
    not_assessed: 0,
  };

  const assessedComponents = projectAssessments.filter(a => a.condition !== "not_assessed");
  
  if (assessedComponents.length === 0) {
    return {
      overallConditionScore: null,
      overallFciScore: null,
      overallConditionRating: "Not Assessed",
      assessmentCount: 0,
    };
  }

  const totalScore = assessedComponents.reduce((sum, assessment) => {
    return sum + (assessment.condition ? conditionValues[assessment.condition] : 0);
  }, 0);

  const avgScore = totalScore / assessedComponents.length;

  // Determine overall rating based on average score
  let overallRating: string;
  if (avgScore >= 2.5) {
    overallRating = "Good";
  } else if (avgScore >= 1.5) {
    overallRating = "Fair";
  } else {
    overallRating = "Poor";
  }

  // Calculate FCI (Facility Condition Index)
  const fciData = await getProjectFCI(projectId);
  const fciScore = fciData?.fci || null;

  // Update project with calculated values
  await db
    .update(projects)
    .set({
      overallConditionScore: Math.round(avgScore * 100) / 100,
      overallFciScore: fciScore ? Math.round(fciScore) : null,
      overallConditionRating: overallRating,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  return {
    overallConditionScore: Math.round(avgScore * 100) / 100,
    overallFciScore: fciScore ? Math.round(fciScore) : null,
    overallConditionRating: overallRating,
    assessmentCount: assessedComponents.length,
  };
}

// ============================================================================
// Audit Trail and Version Control
// ============================================================================

export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(auditLog).values(log);
}

export async function getAuditLogs(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.entityType, entityType), eq(auditLog.entityId, entityId)))
    .orderBy(desc(auditLog.createdAt));
}

export async function getAllAuditLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

// Assessment Versions
export async function createAssessmentVersion(version: InsertAssessmentVersion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(assessmentVersions).values(version);
}

export async function getAssessmentVersions(assessmentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(assessmentVersions)
    .where(eq(assessmentVersions.assessmentId, assessmentId))
    .orderBy(desc(assessmentVersions.versionNumber));
}

export async function getLatestAssessmentVersion(assessmentId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(assessmentVersions)
    .where(eq(assessmentVersions.assessmentId, assessmentId))
    .orderBy(desc(assessmentVersions.versionNumber))
    .limit(1);
  
  return result[0] || null;
}

// Deficiency Versions
export async function createDeficiencyVersion(version: InsertDeficiencyVersion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(deficiencyVersions).values(version);
}

export async function getDeficiencyVersions(deficiencyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(deficiencyVersions)
    .where(eq(deficiencyVersions.deficiencyId, deficiencyId))
    .orderBy(desc(deficiencyVersions.versionNumber));
}

// Project Versions
export async function createProjectVersion(version: InsertProjectVersion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(projectVersions).values(version);
}

export async function getProjectVersions(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(projectVersions)
    .where(eq(projectVersions.projectId, projectId))
    .orderBy(desc(projectVersions.versionNumber));
}

// Helper function to create audit log and version snapshot
export async function auditChange<T extends Record<string, any>>(
  userId: number,
  entityType: string,
  entityId: number,
  action: "create" | "update" | "delete",
  before: T | null,
  after: T | null,
  changeDescription?: string
) {
  const db = await getDb();
  if (!db) return;

  // Create audit log entry
  await createAuditLog({
    userId,
    entityType,
    entityId,
    action,
    changes: JSON.stringify({ before, after }),
    metadata: JSON.stringify({
      timestamp: new Date().toISOString(),
      changeDescription,
    }),
  });

  // Create version snapshot based on entity type
  if (action !== "delete" && after) {
    const versions = 
      entityType === "assessment" ? await getAssessmentVersions(entityId) :
      entityType === "deficiency" ? await getDeficiencyVersions(entityId) :
      entityType === "project" ? await getProjectVersions(entityId) : [];

    const nextVersion = versions.length > 0 ? versions[0].versionNumber + 1 : 1;

    if (entityType === "assessment") {
      await createAssessmentVersion({
        assessmentId: entityId,
        versionNumber: nextVersion,
        data: JSON.stringify(after),
        changedBy: userId,
        changeDescription,
      });
    } else if (entityType === "deficiency") {
      await createDeficiencyVersion({
        deficiencyId: entityId,
        versionNumber: nextVersion,
        data: JSON.stringify(after),
        changedBy: userId,
        changeDescription,
      });
    } else if (entityType === "project") {
      await createProjectVersion({
        projectId: entityId,
        versionNumber: nextVersion,
        data: JSON.stringify(after),
        changedBy: userId,
        changeDescription,
      });
    }
  }
}

// Assessment status filtering
export async function getProjectAssessmentsByStatus(projectId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];

  if (status && ["initial", "active", "completed"].includes(status)) {
    return await db
      .select()
      .from(assessments)
      .where(and(
        eq(assessments.projectId, projectId),
        eq(assessments.status, status as "initial" | "active" | "completed")
      ))
      .orderBy(desc(assessments.updatedAt));
  }

  return await db
    .select()
    .from(assessments)
    .where(eq(assessments.projectId, projectId))
    .orderBy(desc(assessments.updatedAt));
}

export async function getAssessmentStatusCounts(projectId: number) {
  const db = await getDb();
  if (!db) return { initial: 0, active: 0, completed: 0 };

  const allAssessments = await db
    .select()
    .from(assessments)
    .where(eq(assessments.projectId, projectId));

  const counts = {
    initial: allAssessments.filter(a => a.status === "initial").length,
    active: allAssessments.filter(a => a.status === "active").length,
    completed: allAssessments.filter(a => a.status === "completed").length,
  };

  return counts;
}

export async function bulkUpdateAssessmentStatus(
  assessmentIds: number[],
  status: "initial" | "active" | "completed"
) {
  const db = await getDb();
  if (!db) return null;

  await db
    .update(assessments)
    .set({ status })
    .where(sql`${assessments.id} IN (${sql.join(assessmentIds.map(id => sql`${id}`), sql`, `)})`);

  return { success: true };
}


// ============================================================================
// Building Sections
// ============================================================================

export async function getBuildingSections(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { buildingSections } = await import("../drizzle/schema");
  return await db.select().from(buildingSections).where(eq(buildingSections.projectId, projectId));
}

export async function getBuildingSectionById(sectionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const { buildingSections } = await import("../drizzle/schema");
  const result = await db.select().from(buildingSections).where(eq(buildingSections.id, sectionId)).limit(1);
  return result[0];
}

export async function createBuildingSection(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { buildingSections } = await import("../drizzle/schema");
  const values = {
    ...data,
    installDate: data.installDate ? new Date(data.installDate) : undefined,
  };
  const result = await db.insert(buildingSections).values(values);
  return result[0].insertId;
}

export async function updateBuildingSection(sectionId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { buildingSections } = await import("../drizzle/schema");
  await db.update(buildingSections).set({ ...data, updatedAt: new Date() }).where(eq(buildingSections.id, sectionId));
}

export async function deleteBuildingSection(sectionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { buildingSections } = await import("../drizzle/schema");
  await db.delete(buildingSections).where(eq(buildingSections.id, sectionId));
}

export async function getSectionAssessmentStats(sectionId: number) {
  const db = await getDb();
  if (!db) return { total: 0, good: 0, fair: 0, poor: 0 };
  
  const results = await db.select().from(assessments).where(eq(assessments.sectionId, sectionId));
  
  return {
    total: results.length,
    good: results.filter(a => a.condition === "good").length,
    fair: results.filter(a => a.condition === "fair").length,
    poor: results.filter(a => a.condition === "poor").length,
  };
}

export async function getSectionFCI(sectionId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [costSums] = await db
    .select({
      totalRepairCost: sql<number>`COALESCE(SUM(estimatedRepairCost), 0)`,
      totalReplacementValue: sql<number>`COALESCE(SUM(replacementValue), 0)`,
    })
    .from(assessments)
    .where(eq(assessments.sectionId, sectionId));
  
  const totalRepairCost = Number(costSums?.totalRepairCost) || 0;
  const totalReplacementValue = Number(costSums?.totalReplacementValue) || 0;
  
  const fci = totalReplacementValue > 0 ? (totalRepairCost / totalReplacementValue) * 100 : 0;
  
  let rating: 'good' | 'fair' | 'poor' | 'critical';
  if (fci <= 5) rating = 'good';
  else if (fci <= 10) rating = 'fair';
  else if (fci <= 30) rating = 'poor';
  else rating = 'critical';
  
  return {
    totalRepairCost,
    totalReplacementValue,
    fci: Number(fci.toFixed(2)),
    rating,
  };
}

// ============================================================================
// Validation Rules
// ============================================================================

export async function getValidationRules(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db
    .select()
    .from(validationRules)
    .where(
      sql`(projectId = ${projectId} OR projectId IS NULL) AND isActive = 1`
    )
    .orderBy(desc(sql`severity`), sql`createdAt ASC`);
  
  return results;
}

export async function getAllValidationRules() {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db
    .select()
    .from(validationRules)
    .orderBy(desc(validationRules.createdAt));
  
  return results;
}

export async function getValidationRuleById(ruleId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db
    .select()
    .from(validationRules)
    .where(eq(validationRules.id, ruleId))
    .limit(1);
  
  return results[0] || null;
}

export async function createValidationRule(rule: {
  name: string;
  description?: string;
  ruleType: string;
  severity: string;
  field: string;
  condition: string;
  message: string;
  isActive?: number;
  projectId?: number;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.execute(sql`
    INSERT INTO validation_rules 
    (name, description, ruleType, severity, field, \`condition\`, message, isActive, projectId, createdBy)
    VALUES (${rule.name}, ${rule.description || null}, ${rule.ruleType}, ${rule.severity}, 
            ${rule.field}, ${rule.condition}, ${rule.message}, ${rule.isActive !== undefined ? rule.isActive : 1}, 
            ${rule.projectId || null}, ${rule.createdBy})
  `);
  
  return result[0].insertId;
}

export async function updateValidationRule(
  ruleId: number,
  updates: {
    name?: string;
    description?: string;
    ruleType?: string;
    severity?: string;
    field?: string;
    condition?: string;
    message?: string;
    isActive?: number;
    projectId?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const setParts: any[] = [];

  if (updates.name !== undefined) {
    setParts.push(sql`name = ${updates.name}`);
  }
  if (updates.description !== undefined) {
    setParts.push(sql`description = ${updates.description}`);
  }
  if (updates.ruleType !== undefined) {
    setParts.push(sql`ruleType = ${updates.ruleType}`);
  }
  if (updates.severity !== undefined) {
    setParts.push(sql`severity = ${updates.severity}`);
  }
  if (updates.field !== undefined) {
    setParts.push(sql`field = ${updates.field}`);
  }
  if (updates.condition !== undefined) {
    setParts.push(sql`\`condition\` = ${updates.condition}`);
  }
  if (updates.message !== undefined) {
    setParts.push(sql`message = ${updates.message}`);
  }
  if (updates.isActive !== undefined) {
    setParts.push(sql`isActive = ${updates.isActive}`);
  }
  if (updates.projectId !== undefined) {
    setParts.push(sql`projectId = ${updates.projectId}`);
  }

  if (setParts.length === 0) return;

  await db.execute(sql`UPDATE validation_rules SET ${sql.join(setParts, sql`, `)} WHERE id = ${ruleId}`);
}

export async function deleteValidationRule(ruleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.execute(sql`DELETE FROM validation_rules WHERE id = ${ruleId}`);
}

// Validation Overrides
export async function createValidationOverride(override: {
  ruleId: number;
  assessmentId?: number;
  deficiencyId?: number;
  projectId: number;
  fieldName: string;
  originalValue: string;
  overriddenValue: string;
  justification?: string;
  overriddenBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.execute(sql`
    INSERT INTO validation_overrides 
    (ruleId, assessmentId, deficiencyId, projectId, fieldName, originalValue, overriddenValue, justification, overriddenBy)
    VALUES (${override.ruleId}, ${override.assessmentId || null}, ${override.deficiencyId || null}, 
            ${override.projectId}, ${override.fieldName}, ${override.originalValue}, 
            ${override.overriddenValue}, ${override.justification || null}, ${override.overriddenBy})
  `);
  
  return result[0].insertId;
}

export async function getValidationOverrides(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.execute(sql`
    SELECT vo.*, vr.name as ruleName, vr.message as ruleMessage
    FROM validation_overrides vo
    LEFT JOIN validation_rules vr ON vo.ruleId = vr.id
    WHERE vo.projectId = ${projectId}
    ORDER BY vo.overriddenAt DESC
  `);
  
  return (Array.isArray(results[0]) ? results[0] : []) as any[];
}

export async function getAssessmentValidationOverrides(assessmentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.execute(sql`
    SELECT vo.*, vr.name as ruleName, vr.message as ruleMessage
    FROM validation_overrides vo
    LEFT JOIN validation_rules vr ON vo.ruleId = vr.id
    WHERE vo.assessmentId = ${assessmentId}
    ORDER BY vo.overriddenAt DESC
  `);
  
  return (Array.isArray(results[0]) ? results[0] : []) as any[];
}


// ============================================================================
// Component History
// ============================================================================

export async function createComponentHistory(history: {
  projectId: number;
  componentCode: string;
  componentName?: string;
  changeType: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  richTextContent?: string;
  assessmentId?: number;
  deficiencyId?: number;
  userId: number;
  userName?: string;
  summary?: string;
  tags?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(componentHistory).values(history as any);
  return Number(result[0].insertId);
}

export async function getComponentHistory(projectId: number, componentCode: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(componentHistory)
    .where(
      and(
        eq(componentHistory.projectId, projectId),
        eq(componentHistory.componentCode, componentCode)
      )
    )
    .orderBy(desc(componentHistory.timestamp));
}

export async function getProjectHistory(projectId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(componentHistory)
    .where(eq(componentHistory.projectId, projectId))
    .orderBy(desc(componentHistory.timestamp))
    .limit(limit);
}

export async function searchComponentHistory(params: {
  projectId: number;
  searchTerm?: string;
  changeType?: string;
  userId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(componentHistory.projectId, params.projectId)];

  if (params.changeType) {
    conditions.push(sql`changeType = ${params.changeType}`);
  }

  if (params.userId) {
    conditions.push(eq(componentHistory.userId, params.userId));
  }

  if (params.startDate) {
    conditions.push(sql`timestamp >= ${params.startDate.toISOString()}`);
  }

  if (params.endDate) {
    conditions.push(sql`timestamp <= ${params.endDate.toISOString()}`);
  }

  if (params.searchTerm) {
    conditions.push(
      sql`(summary LIKE ${`%${params.searchTerm}%`} OR richTextContent LIKE ${`%${params.searchTerm}%`} OR newValue LIKE ${`%${params.searchTerm}%`})`
    );
  }

  return await db
    .select()
    .from(componentHistory)
    .where(and(...conditions))
    .orderBy(desc(componentHistory.timestamp))
    .limit(params.limit || 100);
}

export async function getHistoryByAssessment(assessmentId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(componentHistory)
    .where(eq(componentHistory.assessmentId, assessmentId))
    .orderBy(desc(componentHistory.timestamp));
}

export async function getHistoryByDeficiency(deficiencyId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(componentHistory)
    .where(eq(componentHistory.deficiencyId, deficiencyId))
    .orderBy(desc(componentHistory.timestamp));
}


// ============================================================================
// Consultant Submissions
// ============================================================================

export async function createConsultantSubmission(submission: {
  projectId: number;
  submissionId: string;
  submittedBy: number;
  consultantName?: string;
  consultantEmail?: string;
  dataType: string;
  fileName?: string;
  totalItems: number;
  validItems: number;
  invalidItems: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(consultantSubmissions).values(submission as any);
  return Number(result[0].insertId);
}

export async function getConsultantSubmission(submissionId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(consultantSubmissions)
    .where(eq(consultantSubmissions.id, submissionId))
    .limit(1);

  return result[0] || null;
}

export async function getConsultantSubmissionsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(consultantSubmissions)
    .where(eq(consultantSubmissions.projectId, projectId))
    .orderBy(desc(consultantSubmissions.submittedAt));
}

export async function getConsultantSubmissionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(consultantSubmissions)
    .where(eq(consultantSubmissions.submittedBy, userId))
    .orderBy(desc(consultantSubmissions.submittedAt));
}

export async function getPendingSubmissions() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(consultantSubmissions)
    .where(eq(consultantSubmissions.status, "pending_review"))
    .orderBy(desc(consultantSubmissions.submittedAt));
}

export async function updateSubmissionStatus(submissionId: number, status: string, reviewedBy?: number, reviewNotes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updates: any = {
    status,
    reviewedAt: new Date(),
  };

  if (reviewedBy) {
    updates.reviewedBy = reviewedBy;
  }

  if (reviewNotes) {
    updates.reviewNotes = reviewNotes;
  }

  await db
    .update(consultantSubmissions)
    .set(updates)
    .where(eq(consultantSubmissions.id, submissionId));
}

export async function finalizeSubmission(submissionId: number, finalizedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(consultantSubmissions)
    .set({
      status: "finalized",
      finalizedAt: new Date(),
      finalizedBy,
    })
    .where(eq(consultantSubmissions.id, submissionId));
}

// ============================================================================
// Submission Items
// ============================================================================

export async function createSubmissionItem(item: {
  submissionId: number;
  projectId: number;
  itemType: string;
  rowNumber?: number;
  data: string;
  validationStatus: string;
  validationErrors?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(submissionItems).values(item as any);
  return Number(result[0].insertId);
}

export async function getSubmissionItems(submissionId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(submissionItems)
    .where(eq(submissionItems.submissionId, submissionId))
    .orderBy(submissionItems.rowNumber);
}

export async function updateSubmissionItemStatus(
  itemId: number,
  itemStatus: string,
  reviewNotes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updates: any = { itemStatus };
  if (reviewNotes) {
    updates.reviewNotes = reviewNotes;
  }

  await db
    .update(submissionItems)
    .set(updates)
    .where(eq(submissionItems.id, itemId));
}

export async function linkSubmissionItemToFinalizedRecord(
  itemId: number,
  itemType: "assessment" | "deficiency",
  finalizedId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updates: any = {};
  if (itemType === "assessment") {
    updates.finalizedAssessmentId = finalizedId;
  } else {
    updates.finalizedDeficiencyId = finalizedId;
  }

  await db
    .update(submissionItems)
    .set(updates)
    .where(eq(submissionItems.id, itemId));
}

// ============================================================================
// Submission Photos
// ============================================================================

export async function createSubmissionPhoto(photo: {
  submissionId: number;
  submissionItemId?: number;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  fileKey: string;
  url: string;
  thumbnailUrl?: string;
  componentCode?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(submissionPhotos).values(photo as any);
  return Number(result[0].insertId);
}

export async function getSubmissionPhotos(submissionId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(submissionPhotos)
    .where(eq(submissionPhotos.submissionId, submissionId));
}

export async function updateSubmissionPhotoStatus(photoId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(submissionPhotos)
    .set({ status: status as any })
    .where(eq(submissionPhotos.id, photoId));
}

export async function linkSubmissionPhotoToFinalizedRecord(photoId: number, finalizedPhotoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(submissionPhotos)
    .set({ finalizedPhotoId })
    .where(eq(submissionPhotos.id, photoId));
}

export async function getAssessmentsByProject(projectId: number) {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(assessments).where(eq(assessments.projectId, projectId));
}

export async function getDeficienciesByProject(projectId: number) {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(deficiencies).where(eq(deficiencies.projectId, projectId));
}


// ========================================
// Deterioration Curves & Predictions
// ========================================

export async function getDeteriorationCurves(projectId?: number, componentType?: string) {
  const database = await getDb();
  if (!database) return [];

  let query = database.select().from(deteriorationCurves);

  if (projectId !== undefined && componentType) {
    return database
      .select()
      .from(deteriorationCurves)
      .where(
        and(
          or(eq(deteriorationCurves.projectId, projectId), isNull(deteriorationCurves.projectId)),
          or(eq(deteriorationCurves.componentType, componentType), isNull(deteriorationCurves.componentType))
        )
      );
  } else if (projectId !== undefined) {
    return database
      .select()
      .from(deteriorationCurves)
      .where(or(eq(deteriorationCurves.projectId, projectId), isNull(deteriorationCurves.projectId)));
  } else if (componentType) {
    return database
      .select()
      .from(deteriorationCurves)
      .where(or(eq(deteriorationCurves.componentType, componentType), isNull(deteriorationCurves.componentType)));
  }

  return database.select().from(deteriorationCurves);
}

export async function getDeteriorationCurve(id: number) {
  const database = await getDb();
  if (!database) return null;

  const result = await database
    .select()
    .from(deteriorationCurves)
    .where(eq(deteriorationCurves.id, id))
    .limit(1);

  return result[0] || null;
}

export async function createDeteriorationCurve(data: {
  name: string;
  curveType: "best" | "design" | "worst";
  componentType?: string;
  param1: number;
  param2: number;
  param3: number;
  param4: number;
  param5: number;
  param6: number;
  description?: string;
  isDefault?: boolean;
  interpolationType?: "linear" | "polynomial" | "exponential";
  createdBy?: number;
  projectId?: number;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const result = await database.insert(deteriorationCurves).values(data);
  return result[0].insertId;
}

export async function updateDeteriorationCurve(
  id: number,
  data: Partial<{
    name: string;
    param1: number;
    param2: number;
    param3: number;
    param4: number;
    param5: number;
    param6: number;
    description: string;
    interpolationType: "linear" | "polynomial" | "exponential";
  }>
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  await database.update(deteriorationCurves).set(data).where(eq(deteriorationCurves.id, id));
}

export async function deleteDeteriorationCurve(id: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  await database.delete(deteriorationCurves).where(eq(deteriorationCurves.id, id));
}

export async function getComponentDeteriorationConfig(projectId: number, componentCode: string) {
  const database = await getDb();
  if (!database) return null;

  const result = await database
    .select()
    .from(componentDeteriorationConfig)
    .where(
      and(
        eq(componentDeteriorationConfig.projectId, projectId),
        eq(componentDeteriorationConfig.componentCode, componentCode)
      )
    )
    .limit(1);

  return result[0] || null;
}

export async function upsertComponentDeteriorationConfig(data: {
  projectId: number;
  componentCode: string;
  bestCaseCurveId?: number;
  designCaseCurveId?: number;
  worstCaseCurveId?: number;
  activeCurve?: "best" | "design" | "worst";
  customParam1?: number;
  customParam2?: number;
  customParam3?: number;
  customParam4?: number;
  customParam5?: number;
  customParam6?: number;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  await database
    .insert(componentDeteriorationConfig)
    .values(data)
    .onDuplicateKeyUpdate({ set: data });
}

export async function savePredictionHistory(data: {
  projectId: number;
  componentCode: string;
  assessmentId?: number;
  predictedFailureYear: number;
  predictedRemainingLife: number;
  predictedCondition: number;
  confidenceScore: number;
  predictionMethod: "curve_based" | "ml_model" | "historical_trend" | "hybrid";
  modelVersion?: string;
  curveUsed?: "best" | "design" | "worst";
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const result = await database.insert(predictionHistory).values({
    ...data,
    confidenceScore: data.confidenceScore.toString(),
  });
  return result[0].insertId;
}

export async function getPredictionHistory(projectId: number, componentCode: string) {
  const database = await getDb();
  if (!database) return [];

  return database
    .select()
    .from(predictionHistory)
    .where(
      and(
        eq(predictionHistory.projectId, projectId),
        eq(predictionHistory.componentCode, componentCode)
      )
    )
    .orderBy(desc(predictionHistory.predictionDate));
}


export async function getComponentByCode(componentCode: string) {
  const database = await getDb();
  if (!database) return null;

  const result = await database
    .select()
    .from(buildingComponents)
    .where(eq(buildingComponents.code, componentCode))
    .limit(1);

  return result[0] || null;
}

export async function getProjectComponents(projectId: number) {
  const database = await getDb();
  if (!database) return [];

  // Get all assessments for this project to find which components have been assessed
  const projectAssessments = await database
    .select()
    .from(assessments)
    .where(eq(assessments.projectId, projectId));

  const componentCodesSet = new Set<string>();
  projectAssessments.forEach(a => { if (a.componentCode) componentCodesSet.add(a.componentCode); });
  const componentCodes = Array.from(componentCodesSet);

  if (componentCodes.length === 0) return [];

  // Get component details - just return basic info from assessments
  const components = componentCodes.map(code => ({
    id: 0,
    componentCode: code,
    name: code,
    category: '',
    uniformatCode: code,
    description: null,
    quantity: null,
    unit: null,
    installYear: null,
    expectedServiceLife: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  return components;
}

export async function getAssessmentsByComponent(projectId: number, componentCode: string) {
  const database = await getDb();
  if (!database) return [];

  return database
    .select()
    .from(assessments)
    .where(
      and(
        eq(assessments.projectId, projectId),
        eq(assessments.componentCode, componentCode)
      )
    )
    .orderBy(desc(assessments.assessedAt));
}


// ============================================================================
// CI/FCI Snapshot Functions
// ============================================================================

export async function saveCiFciSnapshot(snapshot: {
  projectId: number;
  level: "component" | "system" | "building" | "portfolio";
  entityId: string;
  ci: string;
  fci: string;
  deferredMaintenanceCost: string;
  currentReplacementValue: string;
  calculationMethod: string;
}) {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(ciFciSnapshots).values({
    projectId: snapshot.projectId,
    level: snapshot.level,
    entityId: snapshot.entityId,
    ci: snapshot.ci,
    fci: snapshot.fci,
    deferredMaintenanceCost: snapshot.deferredMaintenanceCost,
    currentReplacementValue: snapshot.currentReplacementValue,
    calculationMethod: snapshot.calculationMethod,
  });
}

export async function getCiFciSnapshots(projectId: number, level?: string) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(ciFciSnapshots.projectId, projectId)];
  if (level) {
    conditions.push(eq(ciFciSnapshots.level, level as any));
  }
  
  return await db
    .select()
    .from(ciFciSnapshots)
    .where(and(...conditions))
    .orderBy(desc(ciFciSnapshots.calculatedAt));
}
