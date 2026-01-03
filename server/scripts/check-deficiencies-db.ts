import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

async function check() {
  const db = drizzle(process.env.DATABASE_URL!);
  
  // Check deficiencies for project 3630001
  const result = await db.execute(sql`
    SELECT COUNT(*) as count, projectId 
    FROM deficiencies 
    WHERE projectId = 3630001
    GROUP BY projectId
  `);
  console.log('Deficiencies for project 3630001:', result[0]);
  
  // Check all deficiencies
  const allDef = await db.execute(sql`
    SELECT projectId, COUNT(*) as count 
    FROM deficiencies 
    GROUP BY projectId
    ORDER BY count DESC
    LIMIT 10
  `);
  console.log('All deficiencies by project:', allDef[0]);
  
  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
