import mysql from 'mysql2/promise';

async function checkCols() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await connection.execute("DESCRIBE assessments");
  console.log('Assessments table columns:');
  rows.forEach(r => console.log(`  ${r.Field}: ${r.Type}`));
  
  // Also check if there's a separate replacement value somewhere
  const [assetCols] = await connection.execute("DESCRIBE assets");
  console.log('\nAssets table columns:');
  assetCols.forEach(r => console.log(`  ${r.Field}: ${r.Type}`));
  
  await connection.end();
}

checkCols().catch(console.error);
