import { eq, and, desc, asc, sql, like, or, isNull, isNotNull, ne, gte, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users,
  projects,
  assets,
  buildingCodes,
  buildingComponents,
  assessments,
  assessmentDeletionLog,
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
  ciFciSnapshots,
  assessmentDocuments,
  InsertAssessmentDocument,
  projectDocuments,
  companies
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
      values.lastSignedIn = new Date().toISOString();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date().toISOString();
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

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Projects
export async function getUserProjects(
  userId: number, 
  includeDeleted: boolean = false, 
  userCompany?: string | null, 
  isAdmin: boolean = false,
  companyId?: number | null,
  isSuperAdmin: boolean = false
) {
  const db = await getDb();
  if (!db) {
    console.error("[Projects] Database connection not available");
    return [];
  }
  
  console.log(`[getUserProjects] Starting query - userId: ${userId}, isAdmin: ${isAdmin}, isSuperAdmin: ${isSuperAdmin}, companyId: ${companyId}, userCompany: ${userCompany}`);
  
  // Build where conditions with company isolation
  let whereConditions;
  
  if (isAdmin) {
    if (isSuperAdmin) {
      // Super admins can see all projects
      console.log("[getUserProjects] Super admin - fetching all non-deleted projects");
      whereConditions = includeDeleted
        ? undefined
        : ne(projects.status, "deleted");
    } else if (companyId) {
      // Regular admins can only see projects from their assigned company
      const companyResult = await db.select({ name: companies.name }).from(companies).where(eq(companies.id, companyId)).limit(1);
      const companyName = companyResult[0]?.name;
      if (!companyName) {
        console.warn(`[Projects] Admin ${userId} has companyId ${companyId} but company not found`);
        return [];
      }
      whereConditions = includeDeleted
        ? eq(projects.company, companyName)
        : and(eq(projects.company, companyName), ne(projects.status, "deleted"));
    } else if (userCompany) {
      // Fallback to userCompany string if companyId not set
      whereConditions = includeDeleted
        ? eq(projects.company, userCompany)
        : and(eq(projects.company, userCompany), ne(projects.status, "deleted"));
    } else {
      // Admin without company assignment - show no projects
      console.warn(`[Projects] Admin ${userId} has no company assignment`);
      return [];
    }
  } else {
    // Non-admins can only see their company's projects
    if (!userCompany) {
      // If user has no company assigned, they can't see any projects
      return [];
    }
    
    whereConditions = includeDeleted
      ? eq(projects.company, userCompany)
      : and(eq(projects.company, userCompany), ne(projects.status, "deleted"));
  }
  
  const query = db.select().from(projects);
  
  try {
    const result = whereConditions
      ? await query.where(whereConditions).orderBy(desc(projects.updatedAt))
      : await query.orderBy(desc(projects.updatedAt));
    
    console.log(`[getUserProjects] Query returned ${result.length} projects`);
    return result;
  } catch (error) {
    console.error("[getUserProjects] Query error:", error);
    return [];
  }
}

export async function getDeletedProjects(
  userId: number, 
  userCompany?: string | null, 
  isAdmin: boolean = false,
  companyId?: number | null,
  isSuperAdmin: boolean = false
) {
  const db = await getDb();
  if (!db) return [];
  
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const ninetyDaysAgoStr = ninetyDaysAgo.toISOString();
  
  // Build where conditions with company isolation
  let whereConditions;
  
  if (isAdmin) {
    if (isSuperAdmin) {
      // Super admins can see all deleted projects
      whereConditions = and(
        eq(projects.status, "deleted"),
        gte(projects.deletedAt, ninetyDaysAgoStr)
      );
    } else if (companyId) {
      // Regular admins can only see deleted projects from their assigned company
      const companyResult = await db.select({ name: companies.name }).from(companies).where(eq(companies.id, companyId)).limit(1);
      const companyName = companyResult[0]?.name;
      if (!companyName) {
        return [];
      }
      whereConditions = and(
        eq(projects.company, companyName),
        eq(projects.status, "deleted"),
        gte(projects.deletedAt, ninetyDaysAgoStr)
      );
    } else if (userCompany) {
      // Fallback to userCompany string
      whereConditions = and(
        eq(projects.company, userCompany),
        eq(projects.status, "deleted"),
        gte(projects.deletedAt, ninetyDaysAgoStr)
      );
    } else {
      return [];
    }
  } else if (userCompany) {
    whereConditions = and(
      eq(projects.company, userCompany),
      eq(projects.status, "deleted"),
      gte(projects.deletedAt, ninetyDaysAgoStr)
    );
  } else {
    whereConditions = and(
      eq(projects.userId, userId),
      eq(projects.status, "deleted"),
      gte(projects.deletedAt, ninetyDaysAgoStr)
    );
  }
  
  return await db
    .select()
    .from(projects)
    .where(whereConditions)
    .orderBy(desc(projects.deletedAt));
}

export async function getProjectById(
  projectId: number, 
  userId: number, 
  userCompany?: string | null, 
  isAdmin?: boolean,
  companyId?: number | null,
  isSuperAdmin?: boolean
) {
  const db = await getDb();
  if (!db) return undefined;
  
  // Get project first
  const result = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  
  if (result.length === 0) return undefined;
  
  const project = result[0];
  
  // Super admin can see all projects
  if (isSuperAdmin) return project;
  
  // Regular admin - check company assignment
  if (isAdmin) {
    if (companyId) {
      // Get company name from companyId
      const companyResult = await db.select({ name: companies.name }).from(companies).where(eq(companies.id, companyId)).limit(1);
      const companyName = companyResult[0]?.name;
      if (companyName && project.company !== companyName) {
        console.warn(`[Security] Admin ${userId} from company "${companyName}" attempted to access project ${projectId} from company "${project.company}"`);
        return undefined;
      }
    } else if (userCompany && project.company !== userCompany) {
      console.warn(`[Security] Admin ${userId} from company "${userCompany}" attempted to access project ${projectId} from company "${project.company}"`);
      return undefined;
    }
    return project;
  }
  
  // Non-admin users can only see projects from their company
  if (userCompany && project.company !== userCompany) {
    console.warn(`[Security] User ${userId} from company "${userCompany}" attempted to access project ${projectId} from company "${project.company}"`);
    return undefined;
  }
  
  return project;
}

export async function searchProjectByUniqueId(
  uniqueId: string, 
  userId: number, 
  userCompany?: string | null, 
  isAdmin?: boolean,
  companyId?: number | null,
  isSuperAdmin?: boolean
) {
  const db = await getDb();
  if (!db) return undefined;
  
  // Search project by unique ID
  const result = await db
    .select()
    .from(projects)
    .where(eq(projects.uniqueId, uniqueId))
    .limit(1);
  
  if (result.length === 0) return undefined;
  
  const project = result[0];
  
  // Super admin can see all projects
  if (isSuperAdmin) return project;
  
  // Regular admin - check company assignment
  if (isAdmin) {
    if (companyId) {
      const companyResult = await db.select({ name: companies.name }).from(companies).where(eq(companies.id, companyId)).limit(1);
      const companyName = companyResult[0]?.name;
      if (companyName && project.company !== companyName) {
        console.warn(`[Security] Admin ${userId} from company "${companyName}" attempted to access project with uniqueId ${uniqueId} from company "${project.company}"`);
        return undefined;
      }
    } else if (userCompany && project.company !== userCompany) {
      console.warn(`[Security] Admin ${userId} from company "${userCompany}" attempted to access project with uniqueId ${uniqueId} from company "${project.company}"`);
      return undefined;
    }
    return project;
  }
  
  // Non-admin users can only see projects from their company
  if (userCompany && project.company !== userCompany) {
    console.warn(`[Security] User ${userId} from company "${userCompany}" attempted to access project with uniqueId ${uniqueId} from company "${project.company}"`);
    return undefined;
  }
  
  return project;
}

/**
 * Helper function to verify that a project belongs to the user's company.
 * Admins bypass this check unless they have a companyId assigned.
 * Super admins always bypass.
 * Throws an error if access is denied.
 */
export async function verifyProjectAccess(
  projectId: number, 
  userId: number, 
  userCompany?: string | null, 
  isAdmin?: boolean,
  companyId?: number | null,
  isSuperAdmin?: boolean
): Promise<void> {
  const project = await getProjectById(projectId, userId, userCompany, isAdmin, companyId, isSuperAdmin);
  if (!project) {
    throw new Error("Project not found or access denied");
  }
}

export async function createProject(data: InsertProject, userCompany?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Generate unique ID if not provided
  const { generateProjectUniqueId } = await import("./utils/uniqueId.js");
  const uniqueId = data.uniqueId || generateProjectUniqueId();
  
  // Auto-assign user's company to the project
  const projectData = {
    ...data,
    uniqueId,
    company: userCompany || data.company,
  };
  
  const result = await db.insert(projects).values(projectData);
  return result[0].insertId;
}

export async function updateProject(
  projectId: number, 
  userId: number, 
  data: Partial<InsertProject>, 
  userCompany?: string | null, 
  isAdmin?: boolean,
  companyId?: number | null,
  isSuperAdmin?: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify company ownership before update
  // Super admins bypass all checks, regular admins check company
  if (!isSuperAdmin) {
    const project = await getProjectById(projectId, userId, userCompany, isAdmin, companyId, false);
    if (!project) {
      throw new Error("Project not found or access denied");
    }
  }
  
  await db
    .update(projects)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(projects.id, projectId));
}

export async function deleteProject(
  projectId: number, 
  userId: number, 
  userCompany?: string | null, 
  isAdmin?: boolean,
  companyId?: number | null,
  isSuperAdmin?: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify company ownership before delete
  // Super admins bypass all checks, regular admins check company
  if (!isSuperAdmin) {
    const project = await getProjectById(projectId, userId, userCompany, isAdmin, companyId, false);
    if (!project) {
      throw new Error("Project not found or access denied");
    }
  }
  
  // Soft delete: set status to 'deleted' and record deletion time
  await db
    .update(projects)
    .set({
      status: "deleted",
      deletedAt: new Date().toISOString(),
      deletedBy: userId,
    })
    .where(eq(projects.id, projectId));
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
  
  // Use raw SQL to join through assets table since actual DB doesn't have projectId in assessments
  // Include ALL fields needed for predictions: conditionPercentage, reviewYear, observations, etc.
  const results = await db.execute(sql`
    SELECT 
      a.id,
      a.assetId,
      a.componentId,
      bc.code as componentCode,
      COALESCE(a.componentCode, bc.code) as componentCode,
      COALESCE(a.componentName, bc.name) as componentName,
      a.conditionRating,
      CASE 
        WHEN a.conditionRating IN ('1', '2') THEN 'good'
        WHEN a.conditionRating = '3' THEN 'fair'
        WHEN a.conditionRating IN ('4', '5') THEN 'poor'
        ELSE COALESCE(a.condition, 'not_assessed')
      END as condition,
      a.conditionNotes,
      a.conditionPercentage,
      a.observations,
      a.recommendations,
      a.reviewYear,
      a.lastTimeAction,
      a.expectedUsefulLife,
      a.remainingUsefulLife,
      CAST(a.estimatedRepairCost AS SIGNED) as estimatedRepairCost,
      a.replacementValue,
      a.actionYear,
      a.priorityLevel,
      a.remainingLifeYears,
      a.location,
      a.status,
      COALESCE(a.assessedAt, a.assessmentDate) as assessedAt,
      a.createdAt,
      a.updatedAt
    FROM assessments a
    INNER JOIN assets ast ON a.assetId = ast.id
    LEFT JOIN building_components bc ON a.componentId = bc.id
    WHERE ast.projectId = ${projectId}
      AND a.deletedAt IS NULL
    ORDER BY COALESCE(a.assessedAt, a.assessmentDate) DESC
  `);
  
  return (results as any)[0] || [];
}

export async function getAssetAssessments(assetId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Use raw SQL to match actual database schema which differs from Drizzle schema
  // Actual DB has: componentId, conditionRating, assessmentDate
  // Drizzle expects: componentCode, condition, assessedAt
  const results = await db.execute(sql`
    SELECT 
      a.id,
      a.assetId,
      a.componentId,
      bc.code as componentCode,
      COALESCE(a.componentName, bc.name) as componentName,
      a.conditionRating,
      CASE 
        WHEN a.conditionRating IN ('1', '2') THEN 'good'
        WHEN a.conditionRating = '3' THEN 'fair'
        WHEN a.conditionRating IN ('4', '5') THEN 'poor'
        ELSE 'not_assessed'
      END as condition,
      a.conditionNotes as observations,
      CAST(COALESCE(a.estimatedRepairCost, 0) AS SIGNED) as estimatedRepairCost,
      0 as replacementValue,
      a.remainingLifeYears as remainingUsefulLife,
      15 as expectedUsefulLife,
      CASE 
        WHEN a.remainingLifeYears IS NOT NULL AND a.remainingLifeYears > 0 
        THEN YEAR(CURDATE()) + a.remainingLifeYears 
        ELSE NULL 
      END as actionYear,
      a.priorityLevel,
      a.status,
      a.location as componentLocation,
      a.assessmentDate as assessedAt,
      a.createdAt,
      a.updatedAt,
      (SELECT COUNT(*) FROM photos p WHERE p.assessmentId = a.id AND p.deletedAt IS NULL) as photoCount
    FROM assessments a
    LEFT JOIN building_components bc ON a.componentId = bc.id
    WHERE a.assetId = ${assetId}
      AND a.deletedAt IS NULL
    ORDER BY a.createdAt DESC
  `);
  
  return results[0] as any[];
}

export async function getAssessmentByComponent(projectId: number, componentCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  // Use raw SQL with join through assets table
  const results = await db.execute(sql`
    SELECT 
      a.id,
      a.assetId,
      a.componentId,
      a.componentCode,
      a.conditionRating,
      a.conditionNotes,
      a.estimatedRepairCost,
      a.priorityLevel,
      a.remainingLifeYears,
      a.location,
      a.status,
      a.assessmentDate as assessedAt,
      a.createdAt,
      a.updatedAt
    FROM assessments a
    INNER JOIN assets ast ON a.assetId = ast.id
    WHERE ast.projectId = ${projectId}
      AND a.componentCode = ${componentCode}
    LIMIT 1
  `);
  
  const rows = (results as any)[0] || [];
  return rows.length > 0 ? rows[0] : undefined;
}

export async function upsertAssessment(data: InsertAssessment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = data.componentCode ? await getAssessmentByComponent(data.projectId, data.componentCode) : null;
  
  if (existing) {
    await db
      .update(assessments)
      .set({ ...data, updatedAt: new Date().toISOString() })
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

export async function getAssetDeficiencies(assetId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // First get the asset to find its projectId
  const assetResult = await db
    .select({ projectId: assets.projectId })
    .from(assets)
    .where(eq(assets.id, assetId))
    .limit(1);
  
  if (assetResult.length === 0) return [];
  
  const projectId = assetResult[0].projectId;
  
  // Get all assessment IDs for this asset
  const assetAssessments = await db
    .select({ id: assessments.id })
    .from(assessments)
    .where(eq(assessments.assetId, assetId));
  
  const assessmentIds = assetAssessments.map(a => a.id);
  
  // Get deficiencies that are either:
  // 1. Linked to assessments of this asset (via assessmentId)
  // 2. Project-level deficiencies (assessmentId is null) for the same project
  if (assessmentIds.length > 0) {
    return await db
      .select()
      .from(deficiencies)
      .where(
        or(
          inArray(deficiencies.assessmentId, assessmentIds),
          and(
            eq(deficiencies.projectId, projectId),
            isNull(deficiencies.assessmentId)
          )
        )
      )
      .orderBy(desc(deficiencies.createdAt));
  } else {
    // No assessments for this asset, just get project-level deficiencies
    return await db
      .select()
      .from(deficiencies)
      .where(
        and(
          eq(deficiencies.projectId, projectId),
          isNull(deficiencies.assessmentId)
        )
      )
      .orderBy(desc(deficiencies.createdAt));
  }
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
    .set({ ...data, updatedAt: new Date().toISOString() })
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
    .where(
      and(
        eq(photos.projectId, projectId),
        isNull(photos.deletedAt)
      )
    )
    .orderBy(desc(photos.createdAt));
}

export async function getDeficiencyPhotos(deficiencyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(photos)
    .where(
      and(
        eq(photos.deficiencyId, deficiencyId),
        isNull(photos.deletedAt)
      )
    )
    .orderBy(desc(photos.createdAt));
}

export async function getAssessmentPhotos(assessmentId: number) {
  try {
    const db = await getDb();
    if (!db) return [];
    
    return await db
      .select()
      .from(photos)
      .where(
        and(
          eq(photos.assessmentId, assessmentId),
          isNull(photos.deletedAt)
        )
      )
      .orderBy(desc(photos.createdAt));
  } catch (error) {
    console.error('[getAssessmentPhotos] Error fetching photos for assessment', assessmentId, error);
    return [];
  }
}

export async function getAssetPhotos(assetId: number, componentCode?: string) {
  const db = await getDb();
  if (!db) return [];
  
  // Build where conditions
  const conditions = [
    eq(photos.assetId, assetId),
    isNull(photos.deletedAt)
  ];
  
  // If componentCode is provided, filter by it
  if (componentCode) {
    conditions.push(eq(photos.componentCode, componentCode));
  }
  
  return await db
    .select()
    .from(photos)
    .where(and(...conditions))
    .orderBy(desc(photos.createdAt));
}

export async function createPhoto(data: InsertPhoto) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(photos).values(data);
  return Number(result.insertId);
}

export async function getPhotoById(photoId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(photos)
    .where(eq(photos.id, photoId))
    .limit(1);
    
  return result[0] || null;
}

export async function deletePhoto(photoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(photos).where(eq(photos.id, photoId));
}

// Soft delete a photo (set deletedAt timestamp)
export async function softDeletePhoto(photoId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(photos)
    .set({ 
      deletedAt: new Date().toISOString(),
      deletedBy: userId 
    })
    .where(eq(photos.id, photoId));
}

// Bulk soft delete photos
export async function bulkSoftDeletePhotos(photoIds: number[], userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const deletedAt = new Date().toISOString();
  for (const photoId of photoIds) {
    await db.update(photos)
      .set({ deletedAt, deletedBy: userId })
      .where(eq(photos.id, photoId));
  }
}

// Get recently deleted photos (within last 30 days)
export async function getRecentlyDeletedPhotos(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return await db
    .select()
    .from(photos)
    .where(
      and(
        eq(photos.projectId, projectId),
        isNotNull(photos.deletedAt)
      )
    )
    .orderBy(desc(photos.deletedAt));
}

// Get a deleted photo by ID
export async function getDeletedPhotoById(photoId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(photos)
    .where(
      and(
        eq(photos.id, photoId),
        isNotNull(photos.deletedAt)
      )
    )
    .limit(1);
    
  return result[0] || null;
}

// Restore a soft-deleted photo
export async function restorePhoto(photoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(photos)
    .set({ deletedAt: null, deletedBy: null })
    .where(eq(photos.id, photoId));
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
    .set({ ...data, updatedAt: new Date().toISOString() })
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
  
  // Count assessments via assets (assessments don't have projectId directly)
  const assessmentCountResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM assessments a
    INNER JOIN assets ast ON a.assetId = ast.id
    WHERE ast.projectId = ${projectId}
  `);
  const assessmentCount = { count: (assessmentCountResult as any)?.[0]?.[0]?.count || 0 };
  
  // Count photos via assets (photos don't have projectId directly)
  const photoCountResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM photos p
    INNER JOIN assets ast ON p.assetId = ast.id
    WHERE ast.projectId = ${projectId}
  `);
  const photoCount = { count: (photoCountResult as any)?.[0]?.[0]?.count || 0 };
  
  // Calculate total cost from deficiencies
  const [deficiencyCost] = await db
    .select({ total: sql<number>`sum(estimatedCost)` })
    .from(deficiencies)
    .where(eq(deficiencies.projectId, projectId));
  
  // Calculate total repair cost from assessments (via assets linked to project)
  const [assessmentCost] = await db.execute(sql`
    SELECT COALESCE(SUM(a.estimatedRepairCost), 0) as total
    FROM assessments a
    INNER JOIN assets ast ON a.assetId = ast.id
    WHERE ast.projectId = ${projectId}
  `);
  
  // Use assessment repair costs if available, otherwise use deficiency costs
  const assessmentTotal = (assessmentCost as any)?.[0]?.total || 0;
  const deficiencyTotal = deficiencyCost?.total || 0;
  const totalCost = { total: assessmentTotal > 0 ? assessmentTotal : deficiencyTotal };
  
  // Count project documents
  const [documentCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(projectDocuments)
    .where(eq(projectDocuments.projectId, projectId));
  
  // Count assets
  const [assetCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(assets)
    .where(eq(assets.projectId, projectId));
  
  return {
    deficiencies: deficiencyCount?.count || 0,
    assessments: assessmentCount?.count || 0,
    photos: photoCount?.count || 0,
    documents: documentCount?.count || 0,
    assets: assetCount?.count || 0,
    totalEstimatedCost: totalCost?.total || 0,
  };
}

// FCI (Facility Condition Index) calculation
export async function getProjectFCI(projectId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // Use raw SQL to join through assets table since actual DB doesn't have projectId in assessments
  // Also get replacement value from assets table since assessments don't have it
  const results = await db.execute(sql`
    SELECT 
      COALESCE(SUM(CAST(a.estimatedRepairCost AS SIGNED)), 0) as totalRepairCost,
      COALESCE(SUM(CAST(ast.replacementValue AS SIGNED)), 0) as totalReplacementValue
    FROM assessments a
    INNER JOIN assets ast ON a.assetId = ast.id
    WHERE ast.projectId = ${projectId}
  `);
  
  const costSums = (results as any)[0]?.[0];
  
  const totalRepairCost = Number(costSums?.totalRepairCost) || 0;
  const totalReplacementValue = Number(costSums?.totalReplacementValue) || 0;
  
  // FCI = Total Repair Cost / Total Replacement Value
  // FCI ranges: Good (0-0.05), Fair (0.05-0.10), Poor (0.10-0.30), Critical (>0.30)
  // Returns as decimal ratio (0-1 scale), NOT percentage
  const fci = totalReplacementValue > 0 ? totalRepairCost / totalReplacementValue : 0;
  
  let rating: 'good' | 'fair' | 'poor' | 'critical';
  if (fci <= 0.05) {
    rating = 'good';
  } else if (fci <= 0.10) {
    rating = 'fair';
  } else if (fci <= 0.30) {
    rating = 'poor';
  } else {
    rating = 'critical';
  }
  
  return {
    totalRepairCost,
    totalReplacementValue,
    fci: Number(fci.toFixed(4)),
    rating,
  };
}

// Check if any project has multiple assets (for portfolio analytics visibility)
export async function hasMultiAssetProjects(
  userId: number,
  company: string | null,
  isAdmin: boolean
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // Build condition based on user role
  let projectCondition;
  if (isAdmin) {
    projectCondition = company ? eq(projects.company, company) : sql`1=1`;
  } else {
    projectCondition = company
      ? sql`(${projects.userId} = ${userId} OR ${projects.company} = ${company})`
      : eq(projects.userId, userId);
  }
  
  // Query to find any project with more than 1 asset
  const result = await db
    .select({
      projectId: assets.projectId,
      assetCount: sql<number>`count(*)`
    })
    .from(assets)
    .innerJoin(projects, eq(assets.projectId, projects.id))
    .where(projectCondition)
    .groupBy(assets.projectId)
    .having(sql`count(*) > 1`)
    .limit(1);
  
  return result.length > 0;
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

  const result = await db.insert(hierarchyTemplates).values({
    ...template,
    isDefault: template.isDefault ? 1 : 0
  });
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
    .where(eq(hierarchyTemplates.isDefault, 1))
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

  const dbUpdates: any = { ...updates };
  if ('isDefault' in updates) {
    dbUpdates.isDefault = updates.isDefault ? 1 : 0;
  }

  await db
    .update(hierarchyTemplates)
    .set(dbUpdates)
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
    .where(and(eq(ratingScales.type, type as any), eq(ratingScales.isDefault, 1)))
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
    const condition = assessment.condition as keyof typeof conditionValues;
    return sum + (condition ? (conditionValues[condition] || 0) : 0);
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
      updatedAt: new Date().toISOString(),
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

// Assessment status filtering - uses raw SQL to join through assets table
export async function getProjectAssessmentsByStatus(projectId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];

  let query;
  
  if (status && ["initial", "active", "completed"].includes(status)) {
    query = sql`
      SELECT 
        a.id,
        a.assetId,
        a.componentId,
        bc.code as componentCode,
        COALESCE(a.componentName, bc.name) as componentName,
        a.conditionRating,
        CASE 
          WHEN a.conditionRating IN ('1', '2') THEN 'good'
          WHEN a.conditionRating = '3' THEN 'fair'
          WHEN a.conditionRating IN ('4', '5') THEN 'poor'
          ELSE 'not_assessed'
        END as condition,
        a.conditionNotes as observations,
        '' as recommendations,
        CAST(COALESCE(a.estimatedRepairCost, 0) AS SIGNED) as estimatedRepairCost,
        0 as replacementValue,
        a.remainingLifeYears as remainingUsefulLife,
        15 as expectedUsefulLife,
        YEAR(CURDATE()) as reviewYear,
        NULL as lastTimeAction,
        CASE 
          WHEN a.remainingLifeYears IS NOT NULL AND a.remainingLifeYears > 0 
          THEN YEAR(CURDATE()) + a.remainingLifeYears 
          ELSE NULL 
        END as actionYear,
        a.priorityLevel,
        a.location as componentLocation,
        a.status,
        a.assessmentDate as assessedAt,
        a.createdAt,
        a.updatedAt,
        (SELECT COUNT(*) FROM photos p WHERE p.assessmentId = a.id AND p.deletedAt IS NULL) as photoCount
      FROM assessments a
      INNER JOIN assets ast ON a.assetId = ast.id
      LEFT JOIN building_components bc ON a.componentId = bc.id
      WHERE ast.projectId = ${projectId}
        AND a.status = ${status}
      ORDER BY a.updatedAt DESC
    `;
  } else {
    query = sql`
      SELECT 
        a.id,
        a.assetId,
        a.componentId,
        bc.code as componentCode,
        COALESCE(a.componentName, bc.name) as componentName,
        a.conditionRating,
        CASE 
          WHEN a.conditionRating IN ('1', '2') THEN 'good'
          WHEN a.conditionRating = '3' THEN 'fair'
          WHEN a.conditionRating IN ('4', '5') THEN 'poor'
          ELSE 'not_assessed'
        END as condition,
        a.conditionNotes as observations,
        '' as recommendations,
        CAST(COALESCE(a.estimatedRepairCost, 0) AS SIGNED) as estimatedRepairCost,
        0 as replacementValue,
        a.remainingLifeYears as remainingUsefulLife,
        15 as expectedUsefulLife,
        YEAR(CURDATE()) as reviewYear,
        NULL as lastTimeAction,
        CASE 
          WHEN a.remainingLifeYears IS NOT NULL AND a.remainingLifeYears > 0 
          THEN YEAR(CURDATE()) + a.remainingLifeYears 
          ELSE NULL 
        END as actionYear,
        a.priorityLevel,
        a.location as componentLocation,
        a.status,
        a.assessmentDate as assessedAt,
        a.createdAt,
        a.updatedAt,
        (SELECT COUNT(*) FROM photos p WHERE p.assessmentId = a.id AND p.deletedAt IS NULL) as photoCount
      FROM assessments a
      INNER JOIN assets ast ON a.assetId = ast.id
      LEFT JOIN building_components bc ON a.componentId = bc.id
      WHERE ast.projectId = ${projectId}
      ORDER BY a.updatedAt DESC
    `;
  }

  const results = await db.execute(query);
  return (results as any)[0] || [];
}

export async function getAssessmentStatusCounts(projectId: number) {
  const db = await getDb();
  if (!db) return { initial: 0, active: 0, completed: 0 };

  const results = await db.execute(sql`
    SELECT 
      a.status,
      COUNT(*) as count
    FROM assessments a
    INNER JOIN assets ast ON a.assetId = ast.id
    WHERE ast.projectId = ${projectId}
    GROUP BY a.status
  `);

  const rows = (results as any)[0] || [];
  const counts = {
    initial: 0,
    active: 0,
    completed: 0,
  };

  for (const row of rows) {
    if (row.status === 'initial') counts.initial = Number(row.count);
    if (row.status === 'active') counts.active = Number(row.count);
    if (row.status === 'completed') counts.completed = Number(row.count);
  }

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
  await db.update(buildingSections).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(buildingSections.id, sectionId));
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
  
  // FCI as decimal ratio (0-1 scale)
  const fci = totalReplacementValue > 0 ? totalRepairCost / totalReplacementValue : 0;
  
  let rating: 'good' | 'fair' | 'poor' | 'critical';
  if (fci <= 0.05) rating = 'good';
  else if (fci <= 0.10) rating = 'fair';
  else if (fci <= 0.30) rating = 'poor';
  else rating = 'critical';
  
  return {
    totalRepairCost,
    totalReplacementValue,
    fci: Number(fci.toFixed(4)),
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
    reviewedAt: new Date().toISOString(),
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
      finalizedAt: new Date().toISOString(),
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
  
  // Join through assets table since actual DB schema doesn't have projectId in assessments
  return database
    .select({
      id: assessments.id,
      assetId: assessments.assetId,
      componentId: assessments.componentId,
      conditionRating: assessments.conditionRating,
      conditionNotes: assessments.conditionNotes,
      estimatedRepairCost: assessments.estimatedRepairCost,
      priorityLevel: assessments.priorityLevel,
      remainingLifeYears: assessments.remainingLifeYears,
      location: assessments.location,
      status: assessments.status,
      createdAt: assessments.createdAt,
      updatedAt: assessments.updatedAt,
    })
    .from(assessments)
    .innerJoin(assets, eq(assessments.assetId, assets.id))
    .where(and(
      eq(assets.projectId, projectId),
      eq(assessments.hidden, 0)
    ));
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

  // Convert boolean isDefault to number (tinyint)
  const insertData = {
    ...data,
    isDefault: data.isDefault ? 1 : 0,
  };

  const result = await database.insert(deteriorationCurves).values(insertData);
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

export async function getDeteriorationCurveById(id: number) {
  const database = await getDb();
  if (!database) return null;

  const result = await database
    .select()
    .from(deteriorationCurves)
    .where(eq(deteriorationCurves.id, id))
    .limit(1);

  return result[0] || null;
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

  // Get all assessments for this project using raw SQL with join through assets
  const results = await database.execute(sql`
    SELECT DISTINCT a.componentCode
    FROM assessments a
    INNER JOIN assets ast ON a.assetId = ast.id
    WHERE ast.projectId = ${projectId}
      AND a.componentCode IS NOT NULL
  `);

  const rows = (results as any)[0] || [];
  const componentCodes = rows.map((r: any) => r.componentCode).filter(Boolean);

  if (componentCodes.length === 0) return [];

  // Get component details - just return basic info from assessments
  const components = componentCodes.map((code: string) => ({
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  return components;
}

export async function getAssessmentsByComponent(projectId: number, componentCode: string) {
  const database = await getDb();
  if (!database) return [];

  // Use raw SQL with join through assets table
  const results = await database.execute(sql`
    SELECT 
      a.id,
      a.assetId,
      a.componentId,
      a.componentCode,
      a.conditionRating,
      a.conditionNotes,
      a.estimatedRepairCost,
      a.priorityLevel,
      a.remainingLifeYears,
      a.location,
      a.status,
      a.assessmentDate as assessedAt,
      a.createdAt,
      a.updatedAt
    FROM assessments a
    INNER JOIN assets ast ON a.assetId = ast.id
    WHERE ast.projectId = ${projectId}
      AND a.componentCode = ${componentCode}
      AND a.hidden = 0
    ORDER BY a.assessmentDate DESC
  `);

  return (results as any)[0] || [];
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

// ============================================================================
// Assessment Documents Functions
// ============================================================================

export async function createAssessmentDocument(document: InsertAssessmentDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(assessmentDocuments).values(document);
  return result;
}

export async function getAssessmentDocuments(assessmentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(assessmentDocuments)
    .where(eq(assessmentDocuments.assessmentId, assessmentId))
    .orderBy(desc(assessmentDocuments.createdAt));
}

export async function getProjectDocuments(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(assessmentDocuments)
    .where(eq(assessmentDocuments.projectId, projectId))
    .orderBy(desc(assessmentDocuments.createdAt));
}

export async function deleteAssessmentDocument(documentId: number, userId: number, userCompany?: string | null, isAdmin?: boolean, userCompanyId?: number | null, isSuperAdmin?: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify the user owns the document (via project ownership)
  const doc = await db
    .select()
    .from(assessmentDocuments)
    .where(eq(assessmentDocuments.id, documentId))
    .limit(1);
    
  if (!doc[0]) throw new Error("Document not found");
  
  // Check project ownership or company access
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, doc[0].projectId))
    .limit(1);
    
  if (!project[0]) {
    throw new Error("Project not found");
  }
  
  // Allow delete if:
  // 1. User is the direct owner
  // 2. User is super admin
  // 3. User is admin in the same company
  // 4. User is in the same company
  const isOwner = project[0].userId === userId;
  const isSameCompany = userCompany && project[0].company === userCompany;
  const isSameCompanyId = userCompanyId && project[0].companyId === userCompanyId;
  
  if (!isOwner && !isSuperAdmin && !(isAdmin && (isSameCompany || isSameCompanyId)) && !isSameCompany && !isSameCompanyId) {
    throw new Error("Unauthorized");
  }
  
  await db.delete(assessmentDocuments).where(eq(assessmentDocuments.id, documentId));
  return { success: true };
}


// ============================================================================
// Building Codes
// ============================================================================

export async function getAllBuildingCodes() {
  const db = await getDb();
  if (!db) return [];
  
  const allCodes = await db
    .select()
    .from(buildingCodes)
    .where(eq(buildingCodes.isActive, 1))
    .orderBy(buildingCodes.title);
  
  // Deduplicate by title, preferring entries with documentUrl
  const uniqueCodes = new Map<string, typeof allCodes[0]>();
  
  for (const code of allCodes) {
    const existing = uniqueCodes.get(code.title);
    
    // If no existing entry, or existing has no documentUrl but current does, use current
    if (!existing || (!existing.documentUrl && code.documentUrl)) {
      uniqueCodes.set(code.title, code);
    }
  }
  
  return Array.from(uniqueCodes.values()).sort((a, b) => a.title.localeCompare(b.title));
}

export async function getBuildingCodeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(buildingCodes)
    .where(eq(buildingCodes.id, id))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}


export async function updateAssessmentCompliance(
  assessmentId: number,
  complianceData: {
    complianceStatus: string;
    complianceIssues: string;
    complianceRecommendations: string;
    complianceCheckedAt: string;
    complianceCheckedBy: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(assessments)
    .set(complianceData)
    .where(eq(assessments.id, assessmentId));
}


export async function getAssessmentById(assessmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(assessments)
    .where(
      and(
        eq(assessments.id, assessmentId),
        isNull(assessments.deletedAt)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}


// ============================================================================
// User Unit Preference Functions
// ============================================================================

export async function updateUserUnitPreference(userId: number, unitPreference: 'metric' | 'imperial') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(users)
    .set({ unitPreference })
    .where(eq(users.id, userId));
}

export async function getUserUnitPreference(userId: number): Promise<'metric' | 'imperial' | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select({ unitPreference: users.unitPreference })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  return result[0]?.unitPreference || null;
}


// ============================================================================
// Assessment Deletion Functions
// ============================================================================

export interface AssessmentDeletionLogEntry {
  assessmentId: number;
  projectId: number;
  assetId?: number | null;
  componentCode?: string | null;
  componentName?: string | null;
  condition?: string | null;
  estimatedRepairCost?: number | null;
  replacementValue?: number | null;
  deletedBy: number;
  deletedByName: string;
  deletedByEmail: string;
  deletionReason: string;
  assessmentData: string;
}

export async function logAssessmentDeletion(entry: AssessmentDeletionLogEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(assessmentDeletionLog).values({
    assessmentId: entry.assessmentId,
    projectId: entry.projectId,
    assetId: entry.assetId,
    componentCode: entry.componentCode,
    componentName: entry.componentName,
    condition: entry.condition,
    estimatedRepairCost: entry.estimatedRepairCost,
    replacementValue: entry.replacementValue,
    deletedBy: entry.deletedBy,
    deletedByName: entry.deletedByName,
    deletedByEmail: entry.deletedByEmail,
    deletionReason: entry.deletionReason,
    assessmentData: entry.assessmentData,
  });
}

export async function softDeleteAssessment(assessmentId: number, deletedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(assessments)
    .set({ 
      deletedAt: new Date().toISOString(),
      deletedBy: deletedBy,
    })
    .where(eq(assessments.id, assessmentId));
}

export async function bulkDeleteAssessments(
  assessmentIds: number[],
  projectId: number,
  deletedBy: number,
  deletedByName: string,
  deletedByEmail: string,
  reason: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all assessments to be deleted for audit logging
  const assessmentsToDelete = await db
    .select()
    .from(assessments)
    .where(
      and(
        inArray(assessments.id, assessmentIds),
        eq(assessments.projectId, projectId),
        isNull(assessments.deletedAt)
      )
    );

  // Log each deletion
  for (const assessment of assessmentsToDelete) {
    await logAssessmentDeletion({
      assessmentId: assessment.id,
      projectId: assessment.projectId || projectId,
      assetId: assessment.assetId,
      componentCode: assessment.componentCode,
      componentName: assessment.componentName,
      condition: assessment.condition,
      estimatedRepairCost: assessment.estimatedRepairCost,
      replacementValue: assessment.replacementValue,
      deletedBy,
      deletedByName,
      deletedByEmail,
      deletionReason: reason,
      assessmentData: JSON.stringify(assessment),
    });
  }

  // Soft delete all assessments
  await db
    .update(assessments)
    .set({
      deletedAt: new Date().toISOString(),
      deletedBy: deletedBy,
    })
    .where(
      and(
        inArray(assessments.id, assessmentIds),
        eq(assessments.projectId, projectId),
        isNull(assessments.deletedAt)
      )
    );

  return assessmentsToDelete.length;
}

export async function getArchivedAssessments(projectId?: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select({
      id: assessments.id,
      projectId: assessments.projectId,
      assetId: assessments.assetId,
      componentCode: assessments.componentCode,
      componentName: assessments.componentName,
      componentLocation: assessments.componentLocation,
      condition: assessments.condition,
      observations: assessments.observations,
      recommendations: assessments.recommendations,
      estimatedRepairCost: assessments.estimatedRepairCost,
      replacementValue: assessments.replacementValue,
      deletedAt: assessments.deletedAt,
      deletedBy: assessments.deletedBy,
      createdAt: assessments.createdAt,
    })
    .from(assessments)
    .where(isNotNull(assessments.deletedAt))
    .orderBy(desc(assessments.deletedAt))
    .limit(limit);

  if (projectId) {
    query = query.where(
      and(
        isNotNull(assessments.deletedAt),
        eq(assessments.projectId, projectId)
      )
    ) as any;
  }

  return await query;
}

export async function restoreAssessment(assessmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(assessments)
    .set({
      deletedAt: null,
      deletedBy: null,
    })
    .where(eq(assessments.id, assessmentId));
}

export async function getAssessmentDeletionLog(projectId?: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  if (projectId) {
    return await db
      .select()
      .from(assessmentDeletionLog)
      .where(eq(assessmentDeletionLog.projectId, projectId))
      .orderBy(desc(assessmentDeletionLog.deletedAt))
      .limit(limit);
  }

  return await db
    .select()
    .from(assessmentDeletionLog)
    .orderBy(desc(assessmentDeletionLog.deletedAt))
    .limit(limit);
}


// Get all assets for a project
export async function getProjectAssets(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(assets)
    .where(eq(assets.projectId, projectId));
}
