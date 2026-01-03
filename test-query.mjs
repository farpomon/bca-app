import { drizzle } from 'drizzle-orm/mysql2';
import { ne, desc } from 'drizzle-orm';
import mysql from 'mysql2/promise';
import { projects } from './drizzle/schema.ts';

async function main() {
  console.log('Connecting to database...');
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(conn);
  
  console.log('Testing drizzle query with ne(status, deleted)...');
  try {
    const result = await db.select().from(projects).where(ne(projects.status, 'deleted')).orderBy(desc(projects.updatedAt));
    console.log('Results:', result.length);
    result.forEach(r => console.log('  -', r.id, r.name, r.status));
  } catch (err) {
    console.error('Query error:', err);
  }
  
  await conn.end();
}
main().catch(console.error);
