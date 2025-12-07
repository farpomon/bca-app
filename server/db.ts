import { and, desc, eq } from "drizzle-orm";
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
  InsertProjectRatingConfig
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
export async function getUserProjects(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt));
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
  
  const existing = await getAssessmentByComponent(data.projectId, data.componentCode);
  
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
    return sum + conditionValues[assessment.condition];
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
