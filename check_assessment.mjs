import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL);

const result = await db.execute(`SELECT id, componentCode, componentName, componentLocation, conditionRating, updatedAt FROM assessments WHERE id = 30007`);
console.log(JSON.stringify(result[0], null, 2));
process.exit(0);
