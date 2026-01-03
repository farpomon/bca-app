import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Check deficiencies table columns
  const [cols] = await connection.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'deficiencies' ORDER BY ORDINAL_POSITION"
  );
  console.log("Deficiencies table columns:");
  cols.forEach(r => console.log("  -", r.COLUMN_NAME));
  
  // Check sample data
  const [data] = await connection.execute(
    "SELECT id, projectId, assetId, priority, estimatedCost FROM deficiencies LIMIT 5"
  );
  console.log("\nSample deficiency data:");
  console.log(data);
  
  await connection.end();
}

main().catch(console.error);
