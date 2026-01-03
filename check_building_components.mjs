import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const [cols] = await connection.execute(`DESCRIBE building_components`);
    console.log("=== Building Components Table Columns ===");
    cols.forEach(col => console.log(`${col.Field}: ${col.Type}`));
    
    // Get sample data
    const [data] = await connection.execute(`SELECT * FROM building_components LIMIT 5`);
    console.log("\n=== Sample Data ===");
    console.log(JSON.stringify(data, null, 2));
    
    // Check if componentId 1 and 14 exist
    const [comp1] = await connection.execute(`SELECT * FROM building_components WHERE id IN (1, 14)`);
    console.log("\n=== Components 1 and 14 ===");
    console.log(JSON.stringify(comp1, null, 2));
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
