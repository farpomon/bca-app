import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Check assets for project ID 8 with all columns
  console.log('=== Assets for Project ID 8 with status ===');
  const [assets] = await conn.execute("SELECT id, name, projectId, status FROM assets WHERE projectId = 8");
  console.log(JSON.stringify(assets, null, 2));
  
  // Check if there's any filtering happening
  console.log('\n=== Assets table columns ===');
  const [columns] = await conn.execute("DESCRIBE assets");
  console.log(columns.map(c => c.Field).join(', '));
  
  await conn.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
