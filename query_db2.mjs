import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Check assets table structure
const [columns] = await connection.execute(`DESCRIBE assets`);
console.log('Assets table columns:');
columns.forEach(c => console.log(`  ${c.Field}: ${c.Type}`));

// Get existing assets
const [assets] = await connection.execute(`
  SELECT id, projectId, name, city, province, assetType, address
  FROM assets 
  ORDER BY projectId, id
`);

console.log('\nExisting Assets:');
console.log(JSON.stringify(assets, null, 2));

await connection.end();
