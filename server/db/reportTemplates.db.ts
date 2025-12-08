import { eq, and, or, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  reportTemplates,
  reportSections,
  reportConfigurations,
  reportHistory,
  type InsertReportTemplate,
  type InsertReportSection,
  type InsertReportConfiguration,
  type InsertReportHistory,
} from "../../drizzle/schema";

/**
 * Get all report templates (global + user-specific + project-specific)
 */
export async function getReportTemplates(userId: number, projectId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    eq(reportTemplates.isGlobal, true),
    eq(reportTemplates.userId, userId),
  ];

  if (projectId) {
    conditions.push(eq(reportTemplates.projectId, projectId));
  }

  const result = await db
    .select()
    .from(reportTemplates)
    .where(or(...conditions));

  return result;
}

/**
 * Get report template by ID
 */
export async function getReportTemplate(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(reportTemplates)
    .where(eq(reportTemplates.id, id))
    .limit(1);

  return result[0] || null;
}

/**
 * Create report template
 */
export async function createReportTemplate(data: InsertReportTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(reportTemplates).values(data);
  return result[0].insertId;
}

/**
 * Update report template
 */
export async function updateReportTemplate(id: number, data: Partial<InsertReportTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(reportTemplates)
    .set(data)
    .where(eq(reportTemplates.id, id));

  return true;
}

/**
 * Delete report template
 */
export async function deleteReportTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete related sections and configuration
  await db.delete(reportSections).where(eq(reportSections.templateId, id));
  await db.delete(reportConfigurations).where(eq(reportConfigurations.templateId, id));
  await db.delete(reportTemplates).where(eq(reportTemplates.id, id));

  return true;
}

/**
 * Get report sections for a template
 */
export async function getReportSections(templateId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(reportSections)
    .where(eq(reportSections.templateId, templateId))
    .orderBy(reportSections.orderIndex);

  return result;
}

/**
 * Create report section
 */
export async function createReportSection(data: InsertReportSection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(reportSections).values(data);
  return result[0].insertId;
}

/**
 * Update report section
 */
export async function updateReportSection(id: number, data: Partial<InsertReportSection>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(reportSections)
    .set(data)
    .where(eq(reportSections.id, id));

  return true;
}

/**
 * Delete report section
 */
export async function deleteReportSection(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(reportSections).where(eq(reportSections.id, id));
  return true;
}

/**
 * Reorder report sections
 */
export async function reorderReportSections(sections: { id: number; orderIndex: number }[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const section of sections) {
    await db
      .update(reportSections)
      .set({ orderIndex: section.orderIndex })
      .where(eq(reportSections.id, section.id));
  }

  return true;
}

/**
 * Get report configuration for a template
 */
export async function getReportConfiguration(templateId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(reportConfigurations)
    .where(eq(reportConfigurations.templateId, templateId))
    .limit(1);

  return result[0] || null;
}

/**
 * Upsert report configuration
 */
export async function upsertReportConfiguration(data: InsertReportConfiguration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getReportConfiguration(data.templateId);

  if (existing) {
    await db
      .update(reportConfigurations)
      .set(data)
      .where(eq(reportConfigurations.templateId, data.templateId));
    return existing.id;
  } else {
    const result = await db.insert(reportConfigurations).values(data);
    return result[0].insertId;
  }
}

/**
 * Create report history entry
 */
export async function createReportHistory(data: InsertReportHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(reportHistory).values(data);
  return result[0].insertId;
}

/**
 * Update report history status
 */
export async function updateReportHistoryStatus(
  id: number,
  status: "generating" | "completed" | "failed",
  fileUrl?: string,
  fileSize?: number,
  errorMessage?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(reportHistory)
    .set({
      status,
      fileUrl,
      fileSize,
      errorMessage,
    })
    .where(eq(reportHistory.id, id));

  return true;
}

/**
 * Get report history for a project
 */
export async function getReportHistory(projectId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(reportHistory)
    .where(eq(reportHistory.projectId, projectId))
    .orderBy(sql`${reportHistory.generatedAt} DESC`)
    .limit(limit);

  return result;
}

/**
 * Get report history by ID
 */
export async function getReportHistoryById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(reportHistory)
    .where(eq(reportHistory.id, id))
    .limit(1);

  return result[0] || null;
}
