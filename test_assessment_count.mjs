import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const projectId = 8;
    
    // Test the assessment count query
    const [result] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM assessments a
      INNER JOIN assets ast ON a.assetId = ast.id
      WHERE ast.projectId = ?
    `, [projectId]);
    
    console.log("=== Assessment Count Result ===");
    console.log(result);
    console.log("=== Count ===", result[0]?.count);
    console.log("=== Type ===", typeof result[0]?.count);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
