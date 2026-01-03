import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Check assets for project ID 8
  console.log('=== Assets for Project ID 8 (Riverside Community Center Assessment) ===');
  const [assets] = await conn.execute("SELECT id, name, projectId FROM assets WHERE projectId = 8");
  console.log(JSON.stringify(assets, null, 2));
  console.log(`Total assets: ${assets.length}`);
  
  // Check all assets and their project IDs
  console.log('\n=== All assets with their project IDs ===');
  const [allAssets] = await conn.execute("SELECT id, name, projectId FROM assets ORDER BY projectId, id");
  const byProject = {};
  allAssets.forEach(a => {
    if (!byProject[a.projectId]) byProject[a.projectId] = [];
    byProject[a.projectId].push(a.name);
  });
  console.log(JSON.stringify(byProject, null, 2));
  
  await conn.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
