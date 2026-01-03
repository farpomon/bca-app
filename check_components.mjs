import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Check if components table exists
    const [tables] = await connection.execute(`SHOW TABLES LIKE 'components%'`);
    console.log("=== Component-related Tables ===");
    console.log(tables);
    
    // Check uniformat_components table
    const [uniformat] = await connection.execute(`SHOW TABLES LIKE 'uniformat%'`);
    console.log("\n=== Uniformat Tables ===");
    console.log(uniformat);
    
    // Get sample data from assessments with componentId
    const [assessments] = await connection.execute(`
      SELECT id, assetId, componentId, conditionRating, estimatedRepairCost
      FROM assessments
      WHERE assetId = 89
      LIMIT 5
    `);
    console.log("\n=== Sample Assessments for Asset 89 ===");
    console.log(assessments);
    
    // Check if there's a components table and describe it
    try {
      const [compCols] = await connection.execute(`DESCRIBE components`);
      console.log("\n=== Components Table Columns ===");
      compCols.forEach(col => console.log(`${col.Field}: ${col.Type}`));
    } catch (e) {
      console.log("\n=== No 'components' table found ===");
    }
    
    // Check uniformat_components
    try {
      const [uniformatCols] = await connection.execute(`DESCRIBE uniformat_components`);
      console.log("\n=== Uniformat Components Table Columns ===");
      uniformatCols.forEach(col => console.log(`${col.Field}: ${col.Type}`));
    } catch (e) {
      console.log("\n=== No 'uniformat_components' table found ===");
    }
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
