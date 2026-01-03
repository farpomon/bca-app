import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await connection.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'assessments' ORDER BY ORDINAL_POSITION"
  );
  console.log("Assessments table columns:");
  rows.forEach(r => console.log("  -", r.COLUMN_NAME));
  
  // Also check for any data with remainingLifeYears
  const [data] = await connection.execute(
    "SELECT id, assetId, componentId, remainingLifeYears, estimatedRepairCost FROM assessments WHERE assetId IS NOT NULL LIMIT 5"
  );
  console.log("\nSample assessment data:");
  console.log(data);
  
  await connection.end();
}

main().catch(console.error);
