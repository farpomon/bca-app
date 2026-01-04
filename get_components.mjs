import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Get all assets for the in_progress Edmonton project (id: 14)
const [assets] = await connection.execute(`
  SELECT a.id, a.name, a.assetCode, a.yearBuilt, a.squareFootage, a.replacementValue
  FROM assets a 
  WHERE a.projectId = 14
`);

console.log("All assets (count:", assets.length, "):");
console.log(JSON.stringify(assets, null, 2));

// Get building components (UNIFORMAT II)
const [components] = await connection.execute(`
  SELECT id, code, name, level, parentId
  FROM building_components
  WHERE level <= 2
  ORDER BY code
  LIMIT 50
`);

console.log("\nBuilding components (Level 1-2):");
console.log(JSON.stringify(components, null, 2));

await connection.end();
