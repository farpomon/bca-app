import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  utilityConsumption,
  wasteTracking,
  emissionsData,
  sustainabilityGoals,
  greenUpgrades,
  esgScores,
  type InsertUtilityConsumption,
  type InsertWasteTracking,
  type InsertEmissionsData,
  type InsertSustainabilityGoal,
  type InsertGreenUpgrade,
  type InsertEsgScore,
} from "../../drizzle/schema";

export async function recordUtilityConsumption(data: InsertUtilityConsumption) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(utilityConsumption).values(data);
  return result;
}

export async function getUtilityConsumption(
  projectId: number,
  startDate?: Date,
  endDate?: Date
) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(utilityConsumption.projectId, projectId)];
  if (startDate) conditions.push(gte(utilityConsumption.recordDate, startDate.toISOString()));
  if (endDate) conditions.push(lte(utilityConsumption.recordDate, endDate.toISOString()));
  
  return db.select().from(utilityConsumption).where(and(...conditions)).orderBy(desc(utilityConsumption.recordDate));
}

export async function recordWaste(data: InsertWasteTracking) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(wasteTracking).values(data);
  return result;
}

export async function getWasteTracking(
  projectId: number,
  startDate?: Date,
  endDate?: Date
) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(wasteTracking.projectId, projectId)];
  if (startDate) conditions.push(gte(wasteTracking.recordDate, startDate.toISOString()));
  if (endDate) conditions.push(lte(wasteTracking.recordDate, endDate.toISOString()));
  
  return db.select().from(wasteTracking).where(and(...conditions)).orderBy(desc(wasteTracking.recordDate));
}

export async function recordEmissions(data: InsertEmissionsData) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(emissionsData).values(data);
  return result;
}

export async function getEmissionsData(
  projectId: number,
  startDate?: Date,
  endDate?: Date
) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(emissionsData.projectId, projectId)];
  if (startDate) conditions.push(gte(emissionsData.recordDate, startDate.toISOString()));
  if (endDate) conditions.push(lte(emissionsData.recordDate, endDate.toISOString()));
  
  return db.select().from(emissionsData).where(and(...conditions)).orderBy(desc(emissionsData.recordDate));
}

export async function createGoal(data: InsertSustainabilityGoal) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(sustainabilityGoals).values(data);
  return result;
}

export async function getGoals(projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  if (projectId) {
    return db.select().from(sustainabilityGoals).where(eq(sustainabilityGoals.projectId, projectId));
  }
  
  return db.select().from(sustainabilityGoals);
}

export async function updateGoalStatus(
  goalId: number,
  status: "active" | "achieved" | "missed" | "cancelled"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(sustainabilityGoals)
    .set({ status })
    .where(eq(sustainabilityGoals.id, goalId));
}

export async function recordGreenUpgrade(data: InsertGreenUpgrade) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(greenUpgrades).values(data);
  return result;
}

export async function getGreenUpgrades(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(greenUpgrades).where(eq(greenUpgrades.projectId, projectId)).orderBy(desc(greenUpgrades.createdAt));
}

export async function updateGreenUpgrade(
  upgradeId: number,
  data: Partial<InsertGreenUpgrade>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(greenUpgrades)
    .set(data)
    .where(eq(greenUpgrades.id, upgradeId));
}

export async function recordESGScore(data: InsertEsgScore) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(esgScores).values(data);
  return result;
}

export async function getESGScores(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(esgScores).where(eq(esgScores.projectId, projectId)).orderBy(desc(esgScores.scoreDate));
}

export async function getLatestESGScore(projectId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(esgScores)
    .where(eq(esgScores.projectId, projectId))
    .orderBy(desc(esgScores.scoreDate))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}
