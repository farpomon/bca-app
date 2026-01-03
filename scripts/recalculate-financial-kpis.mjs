/**
 * Recalculate Financial KPIs for All Projects
 * 
 * This script recalculates CI, FCI, Deferred Maintenance Cost, and Current Replacement Value
 * for all projects that have assessments but are missing these financial KPIs.
 */

import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== Recalculating Financial KPIs for All Projects ===\n');

// Get all projects with assessments
const [projects] = await conn.execute(`
  SELECT DISTINCT p.id, p.name
  FROM projects p
  JOIN assets ast ON ast.projectId = p.id
  JOIN assessments a ON a.assetId = ast.id
  WHERE p.deletedAt IS NULL
  ORDER BY p.id
`);

console.log(`Found ${projects.length} projects with assessments\n`);

for (const project of projects) {
  console.log(`\nProcessing Project ${project.id}: ${project.name}`);
  
  // Calculate Deferred Maintenance Cost from deficiencies
  const [deficiencyResult] = await conn.execute(`
    SELECT COALESCE(SUM(d.estimatedCost), 0) as deficiencyCost
    FROM deficiencies d
    JOIN assessments a ON d.assessmentId = a.id
    JOIN assets ast ON a.assetId = ast.id
    WHERE ast.projectId = ?
  `, [project.id]);
  
  const deficiencyCost = parseFloat(deficiencyResult[0].deficiencyCost) || 0;
  
  // Calculate repair costs from assessments (poor/critical conditions)
  const [assessmentResult] = await conn.execute(`
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN a.conditionRating IN ('4', '5') THEN COALESCE(a.estimatedRepairCost, 0)
          WHEN a.conditionRating = '3' THEN COALESCE(a.estimatedRepairCost, 0) * 0.5
          ELSE 0
        END
      ), 0) as assessmentRepairCost
    FROM assessments a
    JOIN assets ast ON a.assetId = ast.id
    WHERE ast.projectId = ?
  `, [project.id]);
  
  const assessmentRepairCost = parseFloat(assessmentResult[0].assessmentRepairCost) || 0;
  const deferredMaintenanceCost = deficiencyCost + assessmentRepairCost;
  
  console.log(`  Deficiency Cost: $${deficiencyCost.toLocaleString()}`);
  console.log(`  Assessment Repair Cost: $${assessmentRepairCost.toLocaleString()}`);
  console.log(`  Total Deferred Maintenance: $${deferredMaintenanceCost.toLocaleString()}`);
  
  // Calculate Current Replacement Value from assets
  const [assetCrvResult] = await conn.execute(`
    SELECT COALESCE(SUM(COALESCE(ast.replacementValue, 0)), 0) as assetCrv
    FROM assets ast
    WHERE ast.projectId = ?
  `, [project.id]);
  
  let currentReplacementValue = parseFloat(assetCrvResult[0].assetCrv) || 0;
  
  // If no asset CRV, estimate from assessments (3x repair cost as approximation)
  if (currentReplacementValue === 0) {
    const [assessmentCrvResult] = await conn.execute(`
      SELECT COALESCE(SUM(COALESCE(a.replacementValue, COALESCE(a.estimatedRepairCost, 0) * 3)), 0) as estimatedCrv
      FROM assessments a
      JOIN assets ast ON a.assetId = ast.id
      WHERE ast.projectId = ?
    `, [project.id]);
    
    currentReplacementValue = parseFloat(assessmentCrvResult[0].estimatedCrv) || 0;
    console.log(`  CRV (estimated from assessments): $${currentReplacementValue.toLocaleString()}`);
  } else {
    console.log(`  CRV (from assets): $${currentReplacementValue.toLocaleString()}`);
  }
  
  // Calculate FCI (as decimal, not percentage)
  const fci = currentReplacementValue > 0 
    ? deferredMaintenanceCost / currentReplacementValue
    : 0;
  
  console.log(`  FCI: ${(fci * 100).toFixed(4)}%`);
  
  // Calculate CI (Condition Index) - weighted average of condition ratings
  const [ciResult] = await conn.execute(`
    SELECT 
      AVG(
        CASE a.conditionRating
          WHEN '1' THEN 100
          WHEN '2' THEN 80
          WHEN '3' THEN 60
          WHEN '4' THEN 40
          WHEN '5' THEN 20
          ELSE NULL
        END
      ) as ci
    FROM assessments a
    JOIN assets ast ON a.assetId = ast.id
    WHERE ast.projectId = ?
      AND a.conditionRating IS NOT NULL
  `, [project.id]);
  
  const ci = parseFloat(ciResult[0].ci) || 0;
  console.log(`  CI: ${ci.toFixed(2)}`);
  
  // Update project with calculated values
  const now = new Date().toISOString();
  await conn.execute(`
    UPDATE projects 
    SET 
      ci = ?,
      fci = ?,
      deferredMaintenanceCost = ?,
      currentReplacementValue = ?,
      lastCalculatedAt = ?
    WHERE id = ?
  `, [
    ci.toFixed(2),
    (fci * 100).toFixed(4),  // Store as percentage
    deferredMaintenanceCost.toFixed(2),
    currentReplacementValue.toFixed(2),
    now,
    project.id
  ]);
  
  console.log(`  ✓ Updated project ${project.id}`);
}

console.log('\n=== Recalculation Complete ===\n');

// Verify the updates
const [updatedProjects] = await conn.execute(`
  SELECT 
    p.id,
    p.name,
    p.ci,
    p.fci,
    p.deferredMaintenanceCost,
    p.currentReplacementValue,
    p.lastCalculatedAt
  FROM projects p
  WHERE p.id IN (
    SELECT DISTINCT ast.projectId 
    FROM assessments a 
    JOIN assets ast ON a.assetId = ast.id
  )
  ORDER BY p.id
`);

console.log('=== Updated Projects ===\n');
for (const p of updatedProjects) {
  console.log(`Project ${p.id}: ${p.name}`);
  console.log(`  CI: ${p.ci}`);
  console.log(`  FCI: ${p.fci}%`);
  console.log(`  Deferred Maintenance: $${parseFloat(p.deferredMaintenanceCost || 0).toLocaleString()}`);
  console.log(`  CRV: $${parseFloat(p.currentReplacementValue || 0).toLocaleString()}`);
  console.log('');
}

await conn.end();
console.log('Done!');
