import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Count assets per project
const [counts] = await connection.execute(`
  SELECT p.id, p.name as projectName, COUNT(a.id) as assetCount
  FROM projects p
  LEFT JOIN assets a ON p.id = a.projectId
  WHERE p.status != 'deleted' AND p.status != 'archived'
  GROUP BY p.id, p.name
  ORDER BY p.id
`);

console.log('Assets per project:');
counts.forEach(c => console.log(`  Project ${c.id} (${c.projectName}): ${c.assetCount} assets`));

await connection.end();
