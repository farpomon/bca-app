import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Check assessments table columns
    const [columns] = await connection.execute(`DESCRIBE assessments`);
    console.log("=== Assessments Table Columns ===");
    columns.forEach(col => console.log(col.Field, col.Type));
    
    // Check deficiencies table columns
    const [defCols] = await connection.execute(`DESCRIBE deficiencies`);
    console.log("\n=== Deficiencies Table Columns ===");
    defCols.forEach(col => console.log(col.Field, col.Type));
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
