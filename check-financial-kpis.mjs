import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get projects with assessments and their financial KPIs
const [projects] = await conn.execute(`
  SELECT 
    p.id,
    p.name,
    p.ci,
    p.fci,
    p.deferredMaintenanceCost,
    p.currentReplacementValue,
    p.lastCalculatedAt,
    (SELECT COUNT(*) FROM assessments a JOIN assets ast ON a.assetId = ast.id WHERE ast.projectId = p.id) as assessmentCount
  FROM projects p
  WHERE p.id IN (
    SELECT DISTINCT ast.projectId 
    FROM assessments a 
    JOIN assets ast ON a.assetId = ast.id
  )
  ORDER BY p.id
  LIMIT 20
`);

console.log('\n=== Projects with Assessments and Financial KPIs ===\n');
for (const p of projects) {
  console.log(`Project ${p.id}: ${p.name}`);
  console.log(`  Assessments: ${p.assessmentCount}`);
  console.log(`  CI: ${p.ci || 'null'}`);
  console.log(`  FCI: ${p.fci || 'null'}`);
  console.log(`  Deferred Maintenance: ${p.deferredMaintenanceCost || 'null'}`);
  console.log(`  Current Replacement Value: ${p.currentReplacementValue || 'null'}`);
  console.log(`  Last Calculated: ${p.lastCalculatedAt || 'null'}`);
  console.log('');
}

// Check for projects with assessments but missing financial KPIs
const [missingKpis] = await conn.execute(`
  SELECT 
    p.id,
    p.name,
    (SELECT COUNT(*) FROM assessments a JOIN assets ast ON a.assetId = ast.id WHERE ast.projectId = p.id) as assessmentCount
  FROM projects p
  WHERE p.id IN (
    SELECT DISTINCT ast.projectId 
    FROM assessments a 
    JOIN assets ast ON a.assetId = ast.id
  )
  AND (p.fci IS NULL OR p.deferredMaintenanceCost IS NULL OR p.currentReplacementValue IS NULL)
`);

if (missingKpis.length > 0) {
  console.log('\n=== Projects with Assessments but Missing Financial KPIs ===\n');
  for (const p of missingKpis) {
    console.log(`Project ${p.id}: ${p.name} (${p.assessmentCount} assessments)`);
  }
}

await conn.end();
