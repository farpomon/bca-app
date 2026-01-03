import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Find projects to keep
const [keepRows] = await connection.execute(
  "SELECT id, name FROM projects WHERE LOWER(name) LIKE '%riverside%' OR LOWER(name) LIKE '%oakville%' OR LOWER(name) LIKE '%burlington%' ORDER BY name"
);
console.log('Projects to KEEP:');
console.log(JSON.stringify(keepRows, null, 2));

// Count total projects
const [countRows] = await connection.execute("SELECT COUNT(*) as total FROM projects");
console.log('\nTotal projects:', countRows[0].total);

await connection.end();
