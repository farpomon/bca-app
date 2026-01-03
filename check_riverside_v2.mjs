import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Find Riverside Community Center (asset id 89)
    const assetId = 89;
    const projectId = 8;
    
    console.log("=== Checking Asset ID:", assetId, "Project ID:", projectId, "===");
    
    // Get assessments for this asset
    const [assessmentData] = await connection.execute(`
      SELECT id, assetId, componentId, conditionRating, estimatedRepairCost, deficiencyDescription
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
    const totalRepairCost = assessmentData.reduce((sum, a) => sum + parseFloat(a.estimatedRepairCost || 0), 0);
    console.log("\n=== Total Repair Cost from Assessments ===", totalRepairCost);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
