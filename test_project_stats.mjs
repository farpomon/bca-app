import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const projectId = 8;
    
    // Test the assessment count query
    const [assessmentCount] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM assessments a
      INNER JOIN assets ast ON a.assetId = ast.id
      WHERE ast.projectId = ?
    `, [projectId]);
    console.log("=== Assessment Count ===", assessmentCount);
    
    // Test the assessment cost query
    const [assessmentCost] = await connection.execute(`
      SELECT COALESCE(SUM(a.estimatedRepairCost), 0) as total
      FROM assessments a
      INNER JOIN assets ast ON a.assetId = ast.id
      WHERE ast.projectId = ?
    `, [projectId]);
    console.log("=== Assessment Cost ===", assessmentCost);
    
    // Test deficiency count
    const [deficiencyCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM deficiencies WHERE projectId = ?
    `, [projectId]);
    console.log("=== Deficiency Count ===", deficiencyCount);
    
    // Test photo count
    const [photoCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM photos WHERE projectId = ?
    `, [projectId]);
    console.log("=== Photo Count ===", photoCount);
    
    // Test asset count
    const [assetCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM assets WHERE projectId = ?
    `, [projectId]);
    console.log("=== Asset Count ===", assetCount);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
