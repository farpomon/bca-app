import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Count total projects
const [countRows] = await connection.execute("SELECT COUNT(*) as total FROM projects");
console.log('Total projects:', countRows[0].total);

// List all remaining projects
const [projects] = await connection.execute("SELECT id, name FROM projects ORDER BY name");
console.log('\nRemaining projects:');
projects.forEach(p => console.log(`  ID ${p.id}: ${p.name}`));

await connection.end();
