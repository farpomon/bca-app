import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const projectId = 8;
    
    // Test the assessment cost query exactly as in db.ts
    const [result] = await connection.execute(`
      SELECT COALESCE(SUM(a.estimatedRepairCost), 0) as total
      FROM assessments a
      INNER JOIN assets ast ON a.assetId = ast.id
      WHERE ast.projectId = ?
    `, [projectId]);
    
    console.log("=== Raw Result ===");
    console.log(result);
    console.log("=== Total ===", result[0]?.total);
    console.log("=== Type ===", typeof result[0]?.total);
    console.log("=== Parsed ===", Number(result[0]?.total));
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
