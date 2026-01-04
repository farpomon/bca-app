import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Check building_components table structure
const [columns] = await connection.execute(`
  DESCRIBE building_components
`);

console.log("Building components table structure:");
console.log(JSON.stringify(columns, null, 2));

// Get building components
const [components] = await connection.execute(`
  SELECT id, code, name, level
  FROM building_components
  WHERE level <= 2
  ORDER BY code
  LIMIT 50
`);

console.log("\nBuilding components (Level 1-2):");
console.log(JSON.stringify(components, null, 2));

await connection.end();
