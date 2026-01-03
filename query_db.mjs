import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [projects] = await connection.execute(`
  SELECT id, uniqueId, name, clientName, propertyType, city, province, status 
  FROM projects 
  WHERE status != 'deleted' 
  ORDER BY id DESC
`);

console.log('Projects:');
console.log(JSON.stringify(projects, null, 2));

const [assets] = await connection.execute(`
  SELECT id, uniqueId, projectId, name, city, province, assetType 
  FROM assets 
  ORDER BY projectId, id
`);

console.log('\nExisting Assets:');
console.log(JSON.stringify(assets, null, 2));

await connection.end();
