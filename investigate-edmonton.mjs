import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

async function investigate() {
  console.log("=== Investigating City of Edmonton Projects ===\n");
  
  const [projects] = await connection.query(
    "SELECT * FROM projects WHERE name LIKE '%Edmonton%'"
  );
  
  console.log(`Found ${projects.length} Edmonton project(s):\n`);
  
  for (const project of projects) {
    console.log(`Project ID: ${project.id}`);
    console.log(`Name: ${project.name}`);
    console.log(`Status: ${project.status}`);
    console.log(`Year Built: ${project.yearBuilt}\n`);
    
    // Count assets (check column name first)
    const [assetRows] = await connection.query(
      "SELECT COUNT(*) as count FROM assets WHERE projectId = ?",
      [project.id]
    );
    console.log(`Assets: ${assetRows[0].count}`);
    
    // Count assessments
    const [assessmentRows] = await connection.query(
      "SELECT COUNT(*) as count FROM assessments WHERE projectId = ?",
      [project.id]
    );
    console.log(`Assessments: ${assessmentRows[0].count}`);
    
    if (assessmentRows[0].count > 0) {
      const [sampleAssessments] = await connection.query(
        "SELECT componentCode, conditionPercentage, assessedAt FROM assessments WHERE projectId = ? LIMIT 5",
        [project.id]
      );
      console.log(`\nSample assessments:`);
      sampleAssessments.forEach(a => {
        console.log(`  - Component: ${a.componentCode}, Condition: ${a.conditionPercentage}%, Date: ${a.assessedAt}`);
      });
    } else {
      console.log(`\n⚠️  NO ASSESSMENTS FOUND - This is why predictions show 0!`);
    }
    
    console.log("\n" + "=".repeat(60) + "\n");
  }
  
  await connection.end();
}

investigate().catch(console.error);
