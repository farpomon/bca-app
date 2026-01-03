import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Find the Riverside Community Center project
    const [projects] = await connection.execute(`
      SELECT id, name, status FROM projects WHERE name LIKE '%Riverside%'
    `);
    console.log("=== Riverside Projects ===");
    console.log(projects);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
