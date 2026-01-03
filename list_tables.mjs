import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const [tables] = await connection.execute(`SHOW TABLES`);
    console.log("=== All Tables ===");
    tables.forEach(t => console.log(Object.values(t)[0]));
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
