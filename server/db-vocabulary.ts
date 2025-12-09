import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import { customVocabulary, type CustomVocabulary, type InsertCustomVocabulary } from "../drizzle/schema";

/**
 * Get all vocabulary terms for a user
 */
export async function getUserVocabulary(userId: number): Promise<CustomVocabulary[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(customVocabulary)
    .where(eq(customVocabulary.userId, userId))
    .orderBy(desc(customVocabulary.createdAt));
}

/**
 * Add a new vocabulary term
 */
export async function addVocabularyTerm(data: InsertCustomVocabulary): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(customVocabulary).values(data);
  return Number((result as any).insertId || 0);
}

/**
 * Update a vocabulary term
 */
export async function updateVocabularyTerm(
  id: number,
  userId: number,
  data: Partial<Omit<InsertCustomVocabulary, "userId">>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(customVocabulary)
    .set(data)
    .where(and(eq(customVocabulary.id, id), eq(customVocabulary.userId, userId)));
}

/**
 * Delete a vocabulary term
 */
export async function deleteVocabularyTerm(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(customVocabulary)
    .where(and(eq(customVocabulary.id, id), eq(customVocabulary.userId, userId)));
}

/**
 * Get vocabulary terms as a formatted prompt string for transcription
 */
export async function getVocabularyPrompt(userId: number): Promise<string> {
  const terms = await getUserVocabulary(userId);
  
  if (terms.length === 0) return "";

  // Format terms for transcription API
  const termsList = terms
    .map(t => {
      if (t.pronunciation) {
        return `${t.term} (pronounced: ${t.pronunciation})`;
      }
      return t.term;
    })
    .join(", ");

  return `Technical terms to recognize: ${termsList}`;
}
