import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

const result = await db.execute(sql`
  SELECT id, componentCode, componentName, componentLocation, componentId
  FROM assessments 
  WHERE id = 180006
`);

console.log('Assessment 180006:');
console.log(JSON.stringify(result[0], null, 2));

process.exit(0);
