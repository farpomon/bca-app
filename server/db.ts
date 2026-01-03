import { eq, sql, desc, and, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, municipalities, projects, assets, 
  assessments, assessmentComponents, assetCategories 
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
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

// ============ Municipalities ============

export async function getMunicipalities() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(municipalities).orderBy(municipalities.name);
}

export async function getMunicipalityById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(municipalities).where(eq(municipalities.id, id)).limit(1);
  return result[0] || null;
}

// ============ Projects ============

export async function getProjects(municipalityId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  if (municipalityId) {
    return db.select().from(projects)
      .where(eq(projects.municipalityId, municipalityId))
      .orderBy(desc(projects.createdAt));
  }
  
  return db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0] || null;
}

export async function getProjectWithMunicipality(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select({
    project: projects,
    municipality: municipalities
  })
  .from(projects)
  .leftJoin(municipalities, eq(projects.municipalityId, municipalities.id))
  .where(eq(projects.id, id))
  .limit(1);
  
  return result[0] || null;
}

// ============ Assets ============

export async function getAssets(projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  if (projectId) {
    return db.select({
      asset: assets,
      category: assetCategories
    })
    .from(assets)
    .leftJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
    .where(eq(assets.projectId, projectId))
    .orderBy(assets.name);
  }
  
  return db.select({
    asset: assets,
    category: assetCategories
  })
  .from(assets)
  .leftJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
  .orderBy(assets.name);
}

export async function getAssetById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select({
    asset: assets,
    category: assetCategories,
    project: projects
  })
  .from(assets)
  .leftJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
  .leftJoin(projects, eq(assets.projectId, projects.id))
  .where(eq(assets.id, id))
  .limit(1);
  
  return result[0] || null;
}

// ============ Assessments ============

export async function getAssessmentsByAssetId(assetId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    assessment: assessments,
    component: assessmentComponents
  })
  .from(assessments)
  .leftJoin(assessmentComponents, eq(assessments.componentId, assessmentComponents.id))
  .where(eq(assessments.assetId, assetId))
  .orderBy(desc(assessments.assessmentDate));
}

export async function getAssessmentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select({
    assessment: assessments,
    component: assessmentComponents,
    asset: assets
  })
  .from(assessments)
  .leftJoin(assessmentComponents, eq(assessments.componentId, assessmentComponents.id))
  .leftJoin(assets, eq(assessments.assetId, assets.id))
  .where(eq(assessments.id, id))
  .limit(1);
  
  return result[0] || null;
}

// ============ Dashboard Stats ============

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;
  
  const [municipalityCount] = await db.select({ count: count() }).from(municipalities);
  const [projectCount] = await db.select({ count: count() }).from(projects);
  const [assetCount] = await db.select({ count: count() }).from(assets);
  const [assessmentCount] = await db.select({ count: count() }).from(assessments);
  
  // Get condition distribution
  const conditionDist = await db.select({
    condition: assets.overallCondition,
    count: count()
  })
  .from(assets)
  .groupBy(assets.overallCondition);
  
  // Get project status distribution
  const statusDist = await db.select({
    status: projects.status,
    count: count()
  })
  .from(projects)
  .groupBy(projects.status);
  
  return {
    totalMunicipalities: municipalityCount?.count || 0,
    totalProjects: projectCount?.count || 0,
    totalAssets: assetCount?.count || 0,
    totalAssessments: assessmentCount?.count || 0,
    conditionDistribution: conditionDist,
    projectStatusDistribution: statusDist
  };
}

// ============ Asset Categories ============

export async function getAssetCategories() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(assetCategories).orderBy(assetCategories.name);
}

// ============ Assessment Components ============

export async function getAssessmentComponents() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(assessmentComponents).orderBy(assessmentComponents.sortOrder);
}
