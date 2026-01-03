import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

async function main() {
  const db = drizzle(process.env.DATABASE_URL);
  const projectId = 8;
  
  // Test the exact query as in db.ts
  const assessmentCountResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM assessments a
    INNER JOIN assets ast ON a.assetId = ast.id
    WHERE ast.projectId = ${projectId}
  `);
  
  console.log("=== Full Result ===");
  console.log(assessmentCountResult);
  console.log("\n=== Result[0] ===");
  console.log(assessmentCountResult[0]);
  console.log("\n=== Result[0][0] ===");
  console.log((assessmentCountResult)[0]?.[0]);
  console.log("\n=== Result[0][0]?.count ===");
  console.log((assessmentCountResult)[0]?.[0]?.count);
}

main().catch(console.error);
