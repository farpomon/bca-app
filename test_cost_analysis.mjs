import mysql from 'mysql2/promise';

async function testCostAnalysis() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Test the getCostAnalysis query for project 8
  const [rows] = await connection.execute(`
    SELECT 
      SUM(a.estimatedRepairCost) as totalRepair,
      SUM(a.replacementValue) as totalReplacement,
      AVG(a.estimatedRepairCost) as avgRepair,
      AVG(a.replacementValue) as avgReplacement,
      COUNT(*) as count
    FROM assessments a
    INNER JOIN assets ast ON a.assetId = ast.id
    WHERE ast.projectId = 8
  `);
  
  console.log('Cost Analysis for Project 8:');
  console.log('Total Repair Cost:', rows[0].totalRepair);
  console.log('Total Replacement Value:', rows[0].totalReplacement);
  console.log('Avg Repair Cost:', rows[0].avgRepair);
  console.log('Avg Replacement Value:', rows[0].avgReplacement);
  console.log('Assessment Count:', rows[0].count);
  
  await connection.end();
}

testCostAnalysis().catch(console.error);
