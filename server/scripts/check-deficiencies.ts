import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

async function main() {
  const db = drizzle(process.env.DATABASE_URL!);
  
  // Get deficiency counts per project
  const [rows] = await db.execute(sql`
    SELECT d.projectId, p.name as projectName, COUNT(*) as deficiencyCount 
    FROM deficiencies d 
    LEFT JOIN projects p ON d.projectId = p.id 
    GROUP BY d.projectId, p.name 
    ORDER BY deficiencyCount DESC
  `);
  
  console.log('Deficiency counts per project:');
  console.log(rows);
  
  // Check if deficiencies have assessmentId set
  const [assessmentCheck] = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN assessmentId IS NULL THEN 1 ELSE 0 END) as nullAssessmentId,
      SUM(CASE WHEN assessmentId IS NOT NULL THEN 1 ELSE 0 END) as hasAssessmentId
    FROM deficiencies
  `);
  
  console.log('\nAssessment ID check:');
  console.log(assessmentCheck);
  
  // Get project IDs
  const [projectIds] = await db.execute(sql`SELECT id, name FROM projects ORDER BY id`);
  console.log('\nAll projects:');
  console.log(projectIds);
  
  process.exit(0);
}

main().catch(console.error);
