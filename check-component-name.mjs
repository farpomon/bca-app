import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

const result = await db.execute(sql`
  SELECT id, componentCode, componentName, componentLocation, componentId
  FROM assessments 
  WHERE id = 30003
`);

console.log('Assessment 30003:');
console.log(JSON.stringify(result[0], null, 2));

const assessment = result[0][0];
if (assessment.componentId) {
  const bcResult = await db.execute(sql`
    SELECT id, code, name 
    FROM building_components 
    WHERE id = ${assessment.componentId}
  `);
  console.log('\nBuilding Component:');
  console.log(JSON.stringify(bcResult[0], null, 2));
}

// Also check what getAssetAssessments would return
const listResult = await db.execute(sql`
  SELECT 
    a.id,
    a.componentCode,
    a.componentName as rawComponentName,
    bc.name as bcName,
    COALESCE(a.componentName, bc.name) as displayName
  FROM assessments a
  LEFT JOIN building_components bc ON a.componentId = bc.id
  WHERE a.id = 30003
`);
console.log('\nWhat getAssetAssessments returns:');
console.log(JSON.stringify(listResult[0], null, 2));

process.exit(0);
