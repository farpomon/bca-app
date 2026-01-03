import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('=== Assets table structure ===');
  const [columns] = await conn.execute("DESCRIBE assets");
  columns.forEach(c => console.log(`  ${c.Field}: ${c.Type} ${c.Null === 'NO' ? 'NOT NULL' : ''} ${c.Key}`));
  
  console.log('\n=== Testing query directly ===');
  const [assets] = await conn.execute("SELECT * FROM assets WHERE projectId = 8 LIMIT 3");
  console.log(`Found ${assets.length} assets`);
  if (assets.length > 0) {
    console.log('First asset:', JSON.stringify(assets[0], null, 2));
  }
  
  await conn.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
