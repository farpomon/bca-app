import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== Active Projects with Financial KPIs ===\n');

const [projects] = await conn.execute(`
  SELECT 
    p.id,
    p.name,
    p.ci,
    p.fci,
    p.deferredMaintenanceCost,
    p.currentReplacementValue,
    p.lastCalculatedAt,
    p.deletedAt,
    (SELECT COUNT(*) FROM assets ast WHERE ast.projectId = p.id) as assetCount,
    (SELECT COUNT(*) FROM assessments a JOIN assets ast ON a.assetId = ast.id WHERE ast.projectId = p.id) as assessmentCount
  FROM projects p
  WHERE p.deletedAt IS NULL
  ORDER BY p.id
`);

for (const p of projects) {
  const hasKpis = p.ci !== null || p.fci !== null;
  const status = hasKpis ? '✓' : '✗';
  
  console.log(`${status} Project ${p.id}: ${p.name}`);
  console.log(`  Assets: ${p.assetCount}, Assessments: ${p.assessmentCount}`);
  console.log(`  CI: ${p.ci || 'null'}`);
  console.log(`  FCI: ${p.fci || 'null'}%`);
  console.log(`  Deferred Maintenance: $${p.deferredMaintenanceCost ? parseFloat(p.deferredMaintenanceCost).toLocaleString() : '0'}`);
  console.log(`  CRV: $${p.currentReplacementValue ? parseFloat(p.currentReplacementValue).toLocaleString() : '0'}`);
  console.log(`  Last Calculated: ${p.lastCalculatedAt || 'never'}`);
  console.log('');
}

// Summary
const withKpis = projects.filter(p => p.ci !== null || p.fci !== null).length;
const withAssessments = projects.filter(p => p.assessmentCount > 0).length;
const missingKpis = projects.filter(p => p.assessmentCount > 0 && (p.ci === null && p.fci === null)).length;

console.log('=== Summary ===');
console.log(`Total active projects: ${projects.length}`);
console.log(`Projects with assessments: ${withAssessments}`);
console.log(`Projects with financial KPIs: ${withKpis}`);
console.log(`Projects missing KPIs (with assessments): ${missingKpis}`);

await conn.end();
