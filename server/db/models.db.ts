import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db";
import {
  facilityModels,
  modelAnnotations,
  modelViewpoints,
  InsertFacilityModel,
  InsertModelAnnotation,
  InsertModelViewpoint,
} from "../../drizzle/schema";

export async function createFacilityModel(model: InsertFacilityModel) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(facilityModels).values(model);
  return result;
}

export async function getFacilityModel(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(facilityModels)
    .where(eq(facilityModels.id, id))
    .limit(1);

  return result[0];
}

export async function getProjectModels(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(facilityModels)
    .where(eq(facilityModels.projectId, projectId))
    .orderBy(desc(facilityModels.uploadedAt));

  return result;
}

export async function getActiveProjectModel(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(facilityModels)
    .where(
      and(
        eq(facilityModels.projectId, projectId),
        eq(facilityModels.isActive, 1)
      )
    )
    .orderBy(desc(facilityModels.version))
    .limit(1);

  return result[0];
}

export async function updateFacilityModel(id: number, updates: Partial<InsertFacilityModel>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(facilityModels)
    .set(updates)
    .where(eq(facilityModels.id, id));
}

export async function deleteFacilityModel(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(facilityModels).where(eq(facilityModels.id, id));
}

// Model Annotations
export async function createModelAnnotation(annotation: InsertModelAnnotation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(modelAnnotations).values(annotation);
  return result;
}

export async function getModelAnnotations(modelId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(modelAnnotations)
    .where(eq(modelAnnotations.modelId, modelId))
    .orderBy(desc(modelAnnotations.createdAt));

  return result;
}

export async function getModelAnnotation(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(modelAnnotations)
    .where(eq(modelAnnotations.id, id))
    .limit(1);

  return result[0];
}

export async function updateModelAnnotation(
  id: number,
  updates: Partial<InsertModelAnnotation>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(modelAnnotations)
    .set(updates)
    .where(eq(modelAnnotations.id, id));
}

export async function deleteModelAnnotation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(modelAnnotations).where(eq(modelAnnotations.id, id));
}

// Model Viewpoints
export async function createModelViewpoint(viewpoint: InsertModelViewpoint) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(modelViewpoints).values(viewpoint);
  return result;
}

export async function getModelViewpoints(modelId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(modelViewpoints)
    .where(eq(modelViewpoints.modelId, modelId))
    .orderBy(desc(modelViewpoints.createdAt));

  return result;
}

export async function getModelViewpoint(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(modelViewpoints)
    .where(eq(modelViewpoints.id, id))
    .limit(1);

  return result[0];
}

export async function deleteModelViewpoint(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(modelViewpoints).where(eq(modelViewpoints.id, id));
}


// APS (Autodesk Platform Services) related functions

export interface ApsModelData {
  apsObjectKey?: string | null;
  apsBucketKey?: string | null;
  apsUrn?: string | null;
  apsTranslationStatus?: 'pending' | 'in_progress' | 'success' | 'failed' | 'timeout' | null;
  apsTranslationProgress?: number | null;
  apsTranslationMessage?: string | null;
  apsDerivativeUrn?: string | null;
  apsUploadedAt?: string | null;
  apsTranslationStartedAt?: string | null;
  apsTranslationCompletedAt?: string | null;
}

export async function updateFacilityModelApsData(id: number, apsData: ApsModelData) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(facilityModels)
    .set(apsData)
    .where(eq(facilityModels.id, id));
}

export async function getModelsWithPendingTranslation() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(facilityModels)
    .where(eq(facilityModels.apsTranslationStatus, 'in_progress'));

  return result;
}

export async function getModelByApsUrn(apsUrn: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(facilityModels)
    .where(eq(facilityModels.apsUrn, apsUrn))
    .limit(1);

  return result[0];
}
