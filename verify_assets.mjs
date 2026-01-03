import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Get all assets for projects 7, 8, 9
const [assets] = await connection.execute(`
  SELECT id, projectId, name, assetCode, address, primaryUse, 
         overallCondition, fciScore, replacementValue, status
  FROM assets 
  WHERE projectId IN (7, 8, 9)
  ORDER BY projectId, id
`);

console.log('Mock Assets Summary:\n');

let currentProject = null;
for (const asset of assets) {
  if (currentProject !== asset.projectId) {
    currentProject = asset.projectId;
    console.log(`\n=== Project ${asset.projectId} ===`);
  }
  console.log(`  ${asset.assetCode}: ${asset.name}`);
  console.log(`    Address: ${asset.address}`);
  console.log(`    Primary Use: ${asset.primaryUse}`);
  console.log(`    Condition: ${asset.overallCondition} (FCI: ${asset.fciScore})`);
  console.log(`    Replacement Value: $${Number(asset.replacementValue).toLocaleString()}`);
}

await connection.end();
