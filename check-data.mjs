import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.log('DATABASE_URL not set');
  process.exit(1);
}

const connection = await mysql.createConnection(dbUrl);

// Check total repair cost for project 12
const [repairSum] = await connection.execute(
  `SELECT SUM(estimatedRepairCost) as totalRepair, COUNT(*) as count 
   FROM assessments a 
   JOIN assets ast ON a.assetId = ast.id 
   WHERE ast.projectId = 12`
);
console.log('Total Repair Cost for Project 12:', repairSum[0]);

// Check assets replacement values for project 12
const [assetValues] = await connection.execute(
  `SELECT id, name, replacementValue FROM assets WHERE projectId = 12`
);
console.log('\nAssets for Project 12:');
assetValues.forEach(a => console.log(`  ${a.id}: ${a.name} - $${a.replacementValue}`));

// Sum of replacement values
const [replSum] = await connection.execute(
  `SELECT SUM(replacementValue) as totalReplacement FROM assets WHERE projectId = 12`
);
console.log('\nTotal Replacement Value:', replSum[0]);

// Check deficiencies
const [deficiencies] = await connection.execute(
  `SELECT COUNT(*) as count, SUM(estimatedCost) as totalCost FROM deficiencies WHERE projectId = 12`
);
console.log('\nDeficiencies for Project 12:', deficiencies[0]);

// Check deficiency breakdown by priority
const [defBreakdown] = await connection.execute(
  `SELECT priority, COUNT(*) as count, SUM(estimatedCost) as totalCost 
   FROM deficiencies WHERE projectId = 12 GROUP BY priority`
);
console.log('\nDeficiency Breakdown by Priority:');
defBreakdown.forEach(d => console.log(`  ${d.priority}: ${d.count} items, $${d.totalCost}`));

await connection.end();
