import mysql from 'mysql2/promise';

async function main() {
  console.log('Connecting to database...');
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Find Riverside project
  console.log('=== Finding Riverside Projects ===');
  const [projects] = await conn.execute("SELECT id, name FROM projects WHERE name LIKE '%Riverside%'");
  console.log(JSON.stringify(projects, null, 2));
  
  if (projects.length > 0) {
    const projectId = projects[0].id;
    console.log(`\n=== Assets for project ID ${projectId} ===`);
    const [assets] = await conn.execute("SELECT id, name, projectId FROM assets WHERE projectId = ?", [projectId]);
    console.log(JSON.stringify(assets, null, 2));
    console.log(`Total assets: ${assets.length}`);
    
    // Also check if there's a different project ID being used
    console.log('\n=== All projects ===');
    const [allProjects] = await conn.execute("SELECT id, name FROM projects ORDER BY id");
    console.log(JSON.stringify(allProjects, null, 2));
  }
  
  await conn.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
