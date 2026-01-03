import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Run the same query as getAssetAssessments
    const [results] = await connection.execute(`
      SELECT 
        a.id,
        a.assetId,
        a.componentId,
        bc.code as componentCode,
        bc.name as componentName,
        a.conditionRating,
        CASE 
          WHEN a.conditionRating IN ('1', '2') THEN 'good'
          WHEN a.conditionRating = '3' THEN 'fair'
          WHEN a.conditionRating IN ('4', '5') THEN 'poor'
          ELSE 'not_assessed'
        END as \`condition\`,
        CAST(COALESCE(a.estimatedRepairCost, 0) AS SIGNED) as estimatedRepairCost
      FROM assessments a
      LEFT JOIN building_components bc ON a.componentId = bc.id
      WHERE a.assetId = 89
      ORDER BY a.createdAt DESC
    `);
    
    console.log("=== Assessments for Asset 89 ===");
    console.log("Count:", results.length);
    console.log(JSON.stringify(results, null, 2));
    
    // Calculate total
    const totalRepairCost = results.reduce((sum, a) => sum + Number(a.estimatedRepairCost || 0), 0);
    console.log("\n=== Total Repair Cost ===", totalRepairCost);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
