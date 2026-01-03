import { getDb } from "./server/db";
import { assets, assessments, deficiencies } from "./drizzle/schema";
import { eq, sql, and, inArray, isNull, or } from "drizzle-orm";

async function checkRiverside() {
  const db = await getDb();
  if (!db) {
    console.log("Database not available");
    return;
  }

  // Find Riverside Community Center
  const riversideAssets = await db.execute(sql`
    SELECT a.id, a.name, a.projectId, p.name as projectName
    FROM assets a
    JOIN projects p ON a.projectId = p.id
    WHERE a.name LIKE '%Riverside%' OR a.name LIKE '%Community Center%'
    LIMIT 5
  `);
  
  console.log("=== Riverside Assets Found ===");
  console.log(JSON.stringify(riversideAssets, null, 2));
  
  if (riversideAssets && (riversideAssets as any[]).length > 0) {
    const assetId = (riversideAssets as any[])[0].id;
    const projectId = (riversideAssets as any[])[0].projectId;
    
    console.log("\n=== Checking Asset ID:", assetId, "Project ID:", projectId, "===");
    
    // Get assessments for this asset
    const assetAssessments = await db.execute(sql`
      SELECT id, componentCode, componentName, condition, estimatedRepairCost, replacementValue
      FROM assessments
      WHERE assetId = ${assetId}
    `);
    console.log("\n=== Assessments for Asset ===");
    console.log("Count:", (assetAssessments as any[]).length);
    console.log(JSON.stringify(assetAssessments, null, 2));
    
    // Get deficiencies linked to these assessments
    const assessmentIds = (assetAssessments as any[]).map((a: any) => a.id);
    console.log("\n=== Assessment IDs ===", assessmentIds);
    
    // Get deficiencies for the project
    const projectDeficiencies = await db.execute(sql`
      SELECT id, assessmentId, projectId, componentCode, title, estimatedCost, severity, priority
      FROM deficiencies
      WHERE projectId = ${projectId}
    `);
    console.log("\n=== All Deficiencies for Project ===");
    console.log("Count:", (projectDeficiencies as any[]).length);
    console.log(JSON.stringify(projectDeficiencies, null, 2));
    
    // Check if deficiencies are linked to assessments
    if (assessmentIds.length > 0) {
      const linkedDeficiencies = await db.execute(sql`
        SELECT id, assessmentId, componentCode, title, estimatedCost
        FROM deficiencies
        WHERE assessmentId IN (${sql.join(assessmentIds.map(id => sql`${id}`), sql`, `)})
      `);
      console.log("\n=== Deficiencies Linked to Asset's Assessments ===");
      console.log("Count:", (linkedDeficiencies as any[]).length);
      console.log(JSON.stringify(linkedDeficiencies, null, 2));
    }
    
    // Calculate total repair cost from assessments
    const totalRepairCost = (assetAssessments as any[]).reduce((sum: number, a: any) => sum + (a.estimatedRepairCost || 0), 0);
    console.log("\n=== Total Repair Cost from Assessments ===", totalRepairCost);
  }
}

checkRiverside().catch(console.error);
