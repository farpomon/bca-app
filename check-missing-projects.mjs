import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check projects 1, 2, 7 specifically
const projectIds = [1, 2, 7];

for (const projectId of projectIds) {
  console.log(`\n=== Project ${projectId} ===`);
  
  // Check project exists
  const [project] = await conn.execute(`SELECT id, name, deletedAt FROM projects WHERE id = ?`, [projectId]);
  console.log('Project:', project[0] || 'NOT FOUND');
  
  // Check assets
  const [assets] = await conn.execute(`SELECT COUNT(*) as count FROM assets WHERE projectId = ?`, [projectId]);
  console.log('Assets:', assets[0].count);
  
  // Check assessments via assets
  const [assessments] = await conn.execute(`
    SELECT COUNT(*) as count 
    FROM assessments a 
    JOIN assets ast ON a.assetId = ast.id 
    WHERE ast.projectId = ?
  `, [projectId]);
  console.log('Assessments (via assets):', assessments[0].count);
  
  // Check if there are assessments with direct projectId (old schema)
  const [directAssessments] = await conn.execute(`
    SELECT COUNT(*) as count 
    FROM assessments 
    WHERE projectId = ?
  `, [projectId]);
  console.log('Assessments (direct projectId):', directAssessments[0].count);
}

await conn.end();
