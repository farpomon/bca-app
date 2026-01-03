import { drizzle } from 'drizzle-orm/mysql2';
import { facilityModels } from './drizzle/schema';
import { isNotNull, desc, sql } from 'drizzle-orm';

async function main() {
  const db = drizzle(process.env.DATABASE_URL!);
  
  // Check all models with APS data
  const models = await db.select({
    id: facilityModels.id,
    name: facilityModels.name,
    format: facilityModels.format,
    projectId: facilityModels.projectId,
    apsUrn: facilityModels.apsUrn,
    apsTranslationStatus: facilityModels.apsTranslationStatus,
    apsTranslationProgress: facilityModels.apsTranslationProgress,
    apsTranslationMessage: facilityModels.apsTranslationMessage,
    apsUploadedAt: facilityModels.apsUploadedAt,
    apsTranslationStartedAt: facilityModels.apsTranslationStartedAt,
    apsTranslationCompletedAt: facilityModels.apsTranslationCompletedAt,
    createdAt: facilityModels.createdAt,
  })
  .from(facilityModels)
  .where(isNotNull(facilityModels.apsUrn))
  .orderBy(desc(facilityModels.createdAt))
  .limit(20);

  console.log('=== Models with APS Translation ===\n');
  for (const model of models) {
    console.log(`Model ID: ${model.id}`);
    console.log(`  Name: ${model.name}`);
    console.log(`  Format: ${model.format}`);
    console.log(`  Project ID: ${model.projectId}`);
    console.log(`  APS URN: ${model.apsUrn?.substring(0, 50)}...`);
    console.log(`  Translation Status: ${model.apsTranslationStatus}`);
    console.log(`  Progress: ${model.apsTranslationProgress}%`);
    console.log(`  Message: ${model.apsTranslationMessage || 'N/A'}`);
    console.log(`  Started At: ${model.apsTranslationStartedAt}`);
    console.log(`  Completed At: ${model.apsTranslationCompletedAt || 'Not completed'}`);
    console.log('---');
  }

  // Count by status
  const statusCounts = await db.select({
    status: facilityModels.apsTranslationStatus,
    count: sql<number>`COUNT(*)`,
  })
  .from(facilityModels)
  .where(isNotNull(facilityModels.apsUrn))
  .groupBy(facilityModels.apsTranslationStatus);

  console.log('\n=== Status Summary ===');
  for (const row of statusCounts) {
    console.log(`${row.status}: ${row.count}`);
  }

  process.exit(0);
}

main().catch(console.error);
