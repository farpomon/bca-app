// Test script to directly call getComponentAssessmentsForPDF
import { createRequire } from 'module';
import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

const require = createRequire(import.meta.url);
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

async function testQuery() {
  console.log('Connecting to database...');
  const db = drizzle(DATABASE_URL);
  
  console.log('Running simplified query...');
  const result = await db.execute(sql`
    SELECT 
      ass.id,
      ass.assetId,
      a.name as assetName,
      COALESCE(ass.componentCode, '') as uniformatCode,
      COALESCE(ass.componentName, 'Unknown Component') as componentName,
      ass.observations,
      ass.recommendations,
      CAST(ass.repairCost AS DECIMAL(15,2)) as repairCost,
      CAST(ass.renewCost AS DECIMAL(15,2)) as replacementCost
    FROM assessments ass
    INNER JOIN assets a ON ass.assetId = a.id
    INNER JOIN projects p ON a.projectId = p.id
    WHERE p.deletedAt IS NULL
      AND ass.deletedAt IS NULL
      AND (ass.hidden = 0 OR ass.hidden IS NULL)
    ORDER BY ass.componentCode ASC
    LIMIT 5
  `);
  
  console.log('Raw result type:', typeof result, Array.isArray(result) ? 'isArray' : 'notArray');
  console.log('Result[0] type:', typeof result[0], Array.isArray(result[0]) ? 'isArray' : 'notArray');
  
  // Extract rows
  let rows;
  if (Array.isArray(result) && Array.isArray(result[0])) {
    rows = result[0];
  } else {
    rows = result;
  }
  
  console.log('Extracted rows count:', rows.length);
  if (rows.length > 0) {
    console.log('First row:', JSON.stringify(rows[0], null, 2));
  }
  
  process.exit(0);
}

testQuery().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
