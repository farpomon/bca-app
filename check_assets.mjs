import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Get existing assets with correct columns
const [assets] = await connection.execute(`
  SELECT id, projectId, name, address, assetCode, primaryUse, status
  FROM assets 
  ORDER BY projectId, id
`);

console.log('Existing Assets count:', assets.length);
if (assets.length > 0) {
  console.log(JSON.stringify(assets, null, 2));
}

await connection.end();
