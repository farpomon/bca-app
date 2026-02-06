import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL!);

async function main() {
  // Check assets and projects
  const assets = await db.execute(sql`
    SELECT a.id, a.name, a.replacementValue, p.currentReplacementValue as pCRV, p.deferredMaintenanceCost as pDMC
    FROM assets a INNER JOIN projects p ON a.projectId = p.id
    WHERE p.deletedAt IS NULL LIMIT 5
  `);
  const rows = Array.isArray(assets[0]) ? assets[0] : assets;
  console.log('=== ASSETS ===');
  for (const r of rows as any[]) {
    console.log(JSON.stringify(r));
  }

  // Check assessments - condition fields
  const assessments = await db.execute(sql`
    SELECT id, assetId, componentName, assessments.condition as cond, conditionRating, conditionPercentage, repairCost, renewCost
    FROM assessments WHERE deletedAt IS NULL AND (hidden = 0 OR hidden IS NULL) LIMIT 10
  `);
  const aRows = Array.isArray(assessments[0]) ? assessments[0] : assessments;
  console.log('\n=== ASSESSMENTS ===');
  for (const r of aRows as any[]) {
    console.log(JSON.stringify(r));
  }

  // Check deficiencies count
  const defCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM deficiencies`);
  const dRows = Array.isArray(defCount[0]) ? defCount[0] : defCount;
  console.log('\n=== DEFICIENCIES ===');
  console.log(JSON.stringify((dRows as any[])[0]));

  // Check assessment condition distribution
  const condDist = await db.execute(sql`
    SELECT assessments.condition as cond, COUNT(*) as cnt 
    FROM assessments 
    WHERE deletedAt IS NULL AND (hidden = 0 OR hidden IS NULL) 
    GROUP BY assessments.condition
  `);
  const cdRows = Array.isArray(condDist[0]) ? condDist[0] : condDist;
  console.log('\n=== CONDITION DISTRIBUTION ===');
  for (const r of cdRows as any[]) {
    console.log(JSON.stringify(r));
  }

  // Check conditionRating distribution
  const crDist = await db.execute(sql`
    SELECT conditionRating, COUNT(*) as cnt 
    FROM assessments 
    WHERE deletedAt IS NULL AND (hidden = 0 OR hidden IS NULL) 
    GROUP BY conditionRating
  `);
  const crRows = Array.isArray(crDist[0]) ? crDist[0] : crDist;
  console.log('\n=== CONDITION RATING DISTRIBUTION ===');
  for (const r of crRows as any[]) {
    console.log(JSON.stringify(r));
  }

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
