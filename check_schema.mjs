import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Check deficiencies table columns
  const [cols] = await connection.execute(
    "SHOW COLUMNS FROM deficiencies"
  );
  console.log("Deficiencies table columns:");
  cols.forEach(r => console.log("  -", r.Field, ":", r.Type));
  
  await connection.end();
}

main().catch(console.error);
