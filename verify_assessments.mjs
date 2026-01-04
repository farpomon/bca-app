import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const PROJECT_ID = 14;

// Overall summary
const [summary] = await connection.execute(`
  SELECT 
    COUNT(*) as totalAssessments,
    SUM(estimatedRepairCost) as totalRepairCost,
    AVG(estimatedRepairCost) as avgRepairCost,
    MIN(estimatedRepairCost) as minRepairCost,
    MAX(estimatedRepairCost) as maxRepairCost
  FROM assessments 
  WHERE projectId = ?
`, [PROJECT_ID]);

console.log('=== ASSESSMENT SUMMARY ===');
console.log('Total Assessments:', summary[0].totalAssessments);
console.log('Total Repair Cost: $' + Number(summary[0].totalRepairCost).toLocaleString());
console.log('Average Repair Cost: $' + Math.round(Number(summary[0].avgRepairCost)).toLocaleString());
console.log('Min Repair Cost: $' + Number(summary[0].minRepairCost).toLocaleString());
console.log('Max Repair Cost: $' + Number(summary[0].maxRepairCost).toLocaleString());

// By condition rating
const [byCondition] = await connection.execute(`
  SELECT 
    conditionRating,
    COUNT(*) as count,
    SUM(estimatedRepairCost) as totalCost
  FROM assessments 
  WHERE projectId = ?
  GROUP BY conditionRating
  ORDER BY conditionRating
`, [PROJECT_ID]);

console.log('\n=== BY CONDITION RATING ===');
for (const row of byCondition) {
  const rating = row.conditionRating;
  const label = {1: 'Critical', 2: 'Poor', 3: 'Fair', 4: 'Good', 5: 'Excellent'}[rating];
  console.log(`Rating ${rating} (${label}): ${row.count} assessments, $${Number(row.totalCost).toLocaleString()} total repair cost`);
}

// By asset
const [byAsset] = await connection.execute(`
  SELECT 
    a.name as assetName,
    COUNT(*) as assessmentCount,
    SUM(ass.estimatedRepairCost) as totalRepairCost,
    AVG(ass.conditionRating) as avgCondition
  FROM assessments ass
  JOIN assets a ON ass.assetId = a.id
  WHERE ass.projectId = ?
  GROUP BY a.id, a.name
  ORDER BY totalRepairCost DESC
  LIMIT 10
`, [PROJECT_ID]);

console.log('\n=== TOP 10 ASSETS BY REPAIR COST ===');
for (const row of byAsset) {
  console.log(`${row.assetName}: ${row.assessmentCount} assessments, $${Number(row.totalRepairCost).toLocaleString()} repair cost, avg condition: ${Number(row.avgCondition).toFixed(1)}`);
}

// By component
const [byComponent] = await connection.execute(`
  SELECT 
    bc.code,
    bc.name as componentName,
    COUNT(*) as assessmentCount,
    SUM(ass.estimatedRepairCost) as totalRepairCost
  FROM assessments ass
  JOIN building_components bc ON ass.componentId = bc.id
  WHERE ass.projectId = ?
  GROUP BY bc.code, bc.name
  ORDER BY totalRepairCost DESC
  LIMIT 10
`, [PROJECT_ID]);

console.log('\n=== TOP 10 COMPONENTS BY REPAIR COST ===');
for (const row of byComponent) {
  console.log(`${row.code} - ${row.componentName}: ${row.assessmentCount} assessments, $${Number(row.totalRepairCost).toLocaleString()}`);
}

// Sample assessment details
const [samples] = await connection.execute(`
  SELECT 
    a.name as assetName,
    bc.code as componentCode,
    bc.name as componentName,
    ass.conditionRating,
    ass.conditionNotes,
    ass.estimatedRepairCost,
    ass.recommendedAction,
    ass.remainingLifeYears
  FROM assessments ass
  JOIN assets a ON ass.assetId = a.id
  JOIN building_components bc ON ass.componentId = bc.id
  WHERE ass.projectId = ?
  ORDER BY ass.estimatedRepairCost DESC
  LIMIT 5
`, [PROJECT_ID]);

console.log('\n=== TOP 5 HIGHEST COST ASSESSMENTS ===');
for (const row of samples) {
  console.log(`\n${row.assetName} - ${row.componentCode} ${row.componentName}`);
  console.log(`  Condition: ${row.conditionRating}/5`);
  console.log(`  Repair Cost: $${Number(row.estimatedRepairCost).toLocaleString()}`);
  console.log(`  Action: ${row.recommendedAction}`);
  console.log(`  Remaining Life: ${row.remainingLifeYears} years`);
}

await connection.end();
