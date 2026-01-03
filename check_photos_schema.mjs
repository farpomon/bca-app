import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const [cols] = await connection.execute(`DESCRIBE photos`);
    console.log("=== Photos Table Columns ===");
    cols.forEach(col => console.log(`${col.Field}: ${col.Type}`));
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
