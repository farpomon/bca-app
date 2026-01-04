import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Find Edmonton projects
const [projects] = await connection.execute(`
  SELECT p.id, p.name, p.status, p.uniqueId
  FROM projects p 
  WHERE p.name LIKE '%Edmonton%'
`);

console.log("Edmonton Projects:");
console.log(JSON.stringify(projects, null, 2));

if (projects.length > 0) {
  const projectId = projects[0].id;
  
  // Get assets for this project
  const [assets] = await connection.execute(`
    SELECT a.id, a.name, a.assetCode, a.address
    FROM assets a 
    WHERE a.projectId = ?
    LIMIT 20
  `, [projectId]);
  
  console.log("\nAssets in project:");
  console.log(JSON.stringify(assets, null, 2));
  
  // Check existing assessments
  const [assessments] = await connection.execute(`
    SELECT COUNT(*) as count FROM assessments WHERE projectId = ?
  `, [projectId]);
  
  console.log("\nExisting assessments count:", assessments[0].count);
}

await connection.end();
