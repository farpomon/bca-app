import { eq, and, isNull, sql, desc, asc, inArray } from "drizzle-orm";
import { getDb } from "../db";
import {
  buildingTypeTemplates,
  templateSystems,
  designServiceLifeValues,
  bulkServiceLifeUpdates,
  bulkUpdateAffectedItems,
  assessments,
  projects,
  InsertBuildingTypeTemplate,
  InsertTemplateSystem,
  InsertDesignServiceLifeValue,
  InsertBulkServiceLifeUpdate,
  InsertBulkUpdateAffectedItem,
} from "../../drizzle/schema";

// ============================================
// Building Type Templates
// ============================================

export async function getBuildingTypeTemplates(companyId?: number | null) {
  const db = await getDb();
  if (!db) return [];

  // Get global templates and company-specific templates
  const conditions = companyId
    ? sql`(${buildingTypeTemplates.companyId} IS NULL OR ${buildingTypeTemplates.companyId} = ${companyId}) AND ${buildingTypeTemplates.isActive} = 1`
    : sql`${buildingTypeTemplates.companyId} IS NULL AND ${buildingTypeTemplates.isActive} = 1`;

  const result = await db
    .select()
    .from(buildingTypeTemplates)
    .where(conditions)
    .orderBy(asc(buildingTypeTemplates.propertyType), asc(buildingTypeTemplates.name));

  return result;
}

export async function getBuildingTypeTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(buildingTypeTemplates)
    .where(eq(buildingTypeTemplates.id, id))
    .limit(1);

  return result[0] || null;
}

export async function createBuildingTypeTemplate(data: InsertBuildingTypeTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(buildingTypeTemplates).values(data);
  return result[0].insertId;
}

export async function updateBuildingTypeTemplate(
  id: number,
  data: Partial<InsertBuildingTypeTemplate>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(buildingTypeTemplates)
    .set(data)
    .where(eq(buildingTypeTemplates.id, id));
}

export async function deleteBuildingTypeTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Soft delete by setting isActive to 0
  await db
    .update(buildingTypeTemplates)
    .set({ isActive: 0 })
    .where(eq(buildingTypeTemplates.id, id));
}

// ============================================
// Template Systems
// ============================================

export async function getTemplateSystems(templateId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(templateSystems)
    .where(eq(templateSystems.templateId, templateId))
    .orderBy(asc(templateSystems.priority), asc(templateSystems.componentCode));

  return result;
}

export async function createTemplateSystem(data: InsertTemplateSystem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(templateSystems).values(data);
  return result[0].insertId;
}

export async function createTemplateSystemsBatch(systems: InsertTemplateSystem[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (systems.length === 0) return [];

  await db.insert(templateSystems).values(systems);
  return systems;
}

export async function updateTemplateSystem(
  id: number,
  data: Partial<InsertTemplateSystem>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(templateSystems)
    .set(data)
    .where(eq(templateSystems.id, id));
}

export async function deleteTemplateSystem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(templateSystems).where(eq(templateSystems.id, id));
}

export async function deleteTemplateSystemsByTemplateId(templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(templateSystems).where(eq(templateSystems.templateId, templateId));
}

// ============================================
// Design Service Life Values
// ============================================

export async function getDesignServiceLifeValues(
  companyId?: number | null,
  filters?: {
    componentCode?: string;
    buildingClass?: 'class_a' | 'class_b' | 'class_c' | 'all';
    propertyType?: string;
  }
) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(designServiceLifeValues);
  
  const conditions = [];
  
  // Include global values and company-specific values
  if (companyId) {
    conditions.push(
      sql`(${designServiceLifeValues.companyId} IS NULL OR ${designServiceLifeValues.companyId} = ${companyId})`
    );
  } else {
    conditions.push(isNull(designServiceLifeValues.companyId));
  }
  
  conditions.push(eq(designServiceLifeValues.isActive, 1));
  
  if (filters?.componentCode) {
    conditions.push(eq(designServiceLifeValues.componentCode, filters.componentCode));
  }
  
  if (filters?.buildingClass) {
    conditions.push(
      sql`(${designServiceLifeValues.buildingClass} = ${filters.buildingClass} OR ${designServiceLifeValues.buildingClass} = 'all')`
    );
  }
  
  if (filters?.propertyType) {
    conditions.push(
      sql`(${designServiceLifeValues.propertyType} IS NULL OR ${designServiceLifeValues.propertyType} = ${filters.propertyType})`
    );
  }

  const result = await db
    .select()
    .from(designServiceLifeValues)
    .where(and(...conditions))
    .orderBy(asc(designServiceLifeValues.componentCode), asc(designServiceLifeValues.buildingClass));

  return result;
}

export async function getDesignServiceLifeValueById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(designServiceLifeValues)
    .where(eq(designServiceLifeValues.id, id))
    .limit(1);

  return result[0] || null;
}

export async function createDesignServiceLifeValue(data: InsertDesignServiceLifeValue) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(designServiceLifeValues).values(data);
  return result[0].insertId;
}

export async function createDesignServiceLifeValuesBatch(values: InsertDesignServiceLifeValue[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (values.length === 0) return [];

  await db.insert(designServiceLifeValues).values(values);
  return values;
}

export async function updateDesignServiceLifeValue(
  id: number,
  data: Partial<InsertDesignServiceLifeValue>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(designServiceLifeValues)
    .set(data)
    .where(eq(designServiceLifeValues.id, id));
}

export async function deleteDesignServiceLifeValue(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Soft delete
  await db
    .update(designServiceLifeValues)
    .set({ isActive: 0 })
    .where(eq(designServiceLifeValues.id, id));
}

// ============================================
// Bulk Service Life Updates
// ============================================

export async function getBulkServiceLifeUpdates(companyId?: number | null) {
  const db = await getDb();
  if (!db) return [];

  const conditions = companyId
    ? eq(bulkServiceLifeUpdates.companyId, companyId)
    : isNull(bulkServiceLifeUpdates.companyId);

  const result = await db
    .select()
    .from(bulkServiceLifeUpdates)
    .where(conditions)
    .orderBy(desc(bulkServiceLifeUpdates.createdAt));

  return result;
}

export async function getBulkServiceLifeUpdateById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(bulkServiceLifeUpdates)
    .where(eq(bulkServiceLifeUpdates.id, id))
    .limit(1);

  return result[0] || null;
}

export async function createBulkServiceLifeUpdate(data: InsertBulkServiceLifeUpdate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(bulkServiceLifeUpdates).values(data);
  return result[0].insertId;
}

export async function updateBulkServiceLifeUpdate(
  id: number,
  data: Partial<InsertBulkServiceLifeUpdate>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(bulkServiceLifeUpdates)
    .set(data)
    .where(eq(bulkServiceLifeUpdates.id, id));
}

// ============================================
// Bulk Update Affected Items
// ============================================

export async function createBulkUpdateAffectedItems(items: InsertBulkUpdateAffectedItem[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (items.length === 0) return;

  await db.insert(bulkUpdateAffectedItems).values(items);
}

export async function getBulkUpdateAffectedItems(bulkUpdateId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(bulkUpdateAffectedItems)
    .where(eq(bulkUpdateAffectedItems.bulkUpdateId, bulkUpdateId));

  return result;
}

// ============================================
// Bulk Update Execution
// ============================================

export async function executeBulkServiceLifeUpdate(
  updateId: number,
  userId: number,
  companyId?: number | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the bulk update record
  const bulkUpdate = await getBulkServiceLifeUpdateById(updateId);
  if (!bulkUpdate) throw new Error("Bulk update not found");

  // Mark as in progress
  await updateBulkServiceLifeUpdate(updateId, { status: 'in_progress' });

  try {
    // Build conditions for finding affected assessments
    const conditions = [];
    
    if (bulkUpdate.componentCode) {
      conditions.push(eq(assessments.componentCode, bulkUpdate.componentCode));
    }

    // Get all affected assessments
    const affectedAssessments = await db
      .select({
        id: assessments.id,
        projectId: assessments.projectId,
        componentCode: assessments.componentCode,
        estimatedServiceLife: assessments.estimatedServiceLife,
      })
      .from(assessments)
      .innerJoin(projects, eq(assessments.projectId, projects.id))
      .where(
        and(
          isNull(assessments.deletedAt),
          bulkUpdate.componentCode ? eq(assessments.componentCode, bulkUpdate.componentCode) : sql`1=1`,
          bulkUpdate.propertyType ? eq(projects.propertyType, bulkUpdate.propertyType) : sql`1=1`
        )
      );

    // Record affected items for rollback capability
    const affectedItems: InsertBulkUpdateAffectedItem[] = affectedAssessments.map((a) => ({
      bulkUpdateId: updateId,
      assessmentId: a.id,
      projectId: a.projectId,
      componentCode: a.componentCode || '',
      previousServiceLife: a.estimatedServiceLife,
      newServiceLife: bulkUpdate.newServiceLife,
    }));

    await createBulkUpdateAffectedItems(affectedItems);

    // Update all affected assessments
    const assessmentIds = affectedAssessments.map((a) => a.id);
    if (assessmentIds.length > 0) {
      await db
        .update(assessments)
        .set({ estimatedServiceLife: bulkUpdate.newServiceLife })
        .where(inArray(assessments.id, assessmentIds));
    }

    // Get unique project count
    const uniqueProjects = new Set(affectedAssessments.map((a) => a.projectId));

    // Mark as completed
    await updateBulkServiceLifeUpdate(updateId, {
      status: 'completed',
      appliedAt: new Date().toISOString(),
      appliedBy: userId,
      affectedAssessmentsCount: affectedAssessments.length,
      affectedProjectsCount: uniqueProjects.size,
    });

    return {
      success: true,
      affectedAssessments: affectedAssessments.length,
      affectedProjects: uniqueProjects.size,
    };
  } catch (error) {
    // Mark as failed
    await updateBulkServiceLifeUpdate(updateId, { status: 'failed' });
    throw error;
  }
}

export async function rollbackBulkServiceLifeUpdate(updateId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the bulk update record
  const bulkUpdate = await getBulkServiceLifeUpdateById(updateId);
  if (!bulkUpdate) throw new Error("Bulk update not found");
  if (bulkUpdate.status !== 'completed') {
    throw new Error("Can only rollback completed updates");
  }

  // Get affected items
  const affectedItems = await getBulkUpdateAffectedItems(updateId);

  // Rollback each assessment
  for (const item of affectedItems) {
    if (item.previousServiceLife !== null) {
      await db
        .update(assessments)
        .set({ estimatedServiceLife: item.previousServiceLife })
        .where(eq(assessments.id, item.assessmentId));
    }
  }

  // Mark as rolled back
  await updateBulkServiceLifeUpdate(updateId, {
    status: 'rolled_back',
    rolledBackAt: new Date().toISOString(),
    rolledBackBy: userId,
  });

  return { success: true, rolledBackCount: affectedItems.length };
}

// ============================================
// Template Application
// ============================================

export async function getTemplateWithSystems(templateId: number) {
  const db = await getDb();
  if (!db) return null;

  const template = await getBuildingTypeTemplateById(templateId);
  if (!template) return null;

  const systems = await getTemplateSystems(templateId);

  return {
    ...template,
    systems,
  };
}

export async function getServiceLifeForComponent(
  componentCode: string,
  buildingClass?: 'class_a' | 'class_b' | 'class_c',
  propertyType?: string,
  companyId?: number | null
) {
  const db = await getDb();
  if (!db) return null;

  // Try to find the most specific match first
  const values = await getDesignServiceLifeValues(companyId, {
    componentCode,
    buildingClass,
    propertyType,
  });

  if (values.length === 0) return null;

  // Prioritize company-specific over global, and specific building class over 'all'
  const sorted = values.sort((a, b) => {
    // Company-specific first
    if (a.companyId && !b.companyId) return -1;
    if (!a.companyId && b.companyId) return 1;
    // Specific building class over 'all'
    if (a.buildingClass !== 'all' && b.buildingClass === 'all') return -1;
    if (a.buildingClass === 'all' && b.buildingClass !== 'all') return 1;
    // Specific property type over null
    if (a.propertyType && !b.propertyType) return -1;
    if (!a.propertyType && b.propertyType) return 1;
    return 0;
  });

  return sorted[0];
}
