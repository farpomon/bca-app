import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Check projects table structure
const [projCols] = await connection.execute(`DESCRIBE projects`);
console.log('Projects table columns:');
projCols.forEach(c => console.log(`  ${c.Field}: ${c.Type}`));

// Check assets table structure
const [assetCols] = await connection.execute(`DESCRIBE assets`);
console.log('\nAssets table columns:');
assetCols.forEach(c => console.log(`  ${c.Field}: ${c.Type}`));

// Get existing assets with only columns that exist
const [assets] = await connection.execute(`
  SELECT id, projectId, name, city, province, assetType, address
  FROM assets 
  ORDER BY projectId, id
`);

console.log('\nExisting Assets count:', assets.length);
if (assets.length > 0) {
  console.log(JSON.stringify(assets, null, 2));
}

await connection.end();
