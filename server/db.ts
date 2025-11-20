import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  projects, 
  buildingComponents,
  assessments,
  deficiencies,
  photos,
  costEstimates,
  InsertProject,
  InsertAssessment,
  InsertDeficiency,
  InsertPhoto,
  InsertCostEstimate
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


