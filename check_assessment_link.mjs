import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Check if assessments table has projectId column
    const [cols] = await connection.execute(`DESCRIBE assessments`);
    const hasProjectId = cols.some(c => c.Field === 'projectId');
    console.log("=== Assessments has projectId column? ===", hasProjectId);
    
    // Check how assessments link to project 8
    const [assessments] = await connection.execute(`
      SELECT a.id, a.assetId, ast.projectId, a.estimatedRepairCost
      FROM assessments a
      INNER JOIN assets ast ON a.assetId = ast.id
      WHERE ast.projectId = 8
    `);
    console.log("\n=== Assessments for Project 8 (via assets) ===");
    console.log("Count:", assessments.length);
    console.log(assessments);
    
    // Calculate total
    const totalCost = assessments.reduce((sum, a) => sum + Number(a.estimatedRepairCost || 0), 0);
    console.log("\n=== Total Repair Cost ===", totalCost);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
