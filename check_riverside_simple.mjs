import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Find Riverside Community Center
    const [assets] = await connection.execute(`
      SELECT a.id, a.name, a.projectId, p.name as projectName
      FROM assets a
      JOIN projects p ON a.projectId = p.id
      WHERE a.name LIKE '%Riverside%' OR a.name LIKE '%Community Center%'
      LIMIT 5
    `);
    
    console.log("=== Riverside Assets Found ===");
    console.log(JSON.stringify(assets, null, 2));
    
    if (assets.length > 0) {
      const assetId = assets[0].id;
      const projectId = assets[0].projectId;
      
      console.log("\n=== Checking Asset ID:", assetId, "Project ID:", projectId, "===");
      
      // Get assessments for this asset
      const [assessmentData] = await connection.execute(`
        SELECT id, componentCode, componentName, \`condition\`, estimatedRepairCost, replacementValue
        FROM assessments
        WHERE assetId = ?
      `, [assetId]);
      console.log("\n=== Assessments for Asset ===");
      console.log("Count:", assessmentData.length);
      console.log(JSON.stringify(assessmentData, null, 2));
      
      // Get deficiencies for the project
      const [deficiencyData] = await connection.execute(`
        SELECT id, assessmentId, projectId, componentCode, title, estimatedCost, severity, priority
        FROM deficiencies
        WHERE projectId = ?
      `, [projectId]);
      console.log("\n=== All Deficiencies for Project ===");
      console.log("Count:", deficiencyData.length);
      console.log(JSON.stringify(deficiencyData, null, 2));
      
      // Calculate total repair cost from assessments
      const totalRepairCost = assessmentData.reduce((sum, a) => sum + (a.estimatedRepairCost || 0), 0);
      console.log("\n=== Total Repair Cost from Assessments ===", totalRepairCost);
    }
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
