import { drizzle } from "drizzle-orm/mysql2";
import { projects, assets, assessments, deficiencies } from "../../drizzle/schema";
import { eq, sql, desc } from "drizzle-orm";

async function verify() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  
  const db = drizzle(process.env.DATABASE_URL);
  
  // Get the 3 most recent projects
  const recentProjects = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.id))
    .limit(5);
  
  console.log("\n=== Recent Projects in Database ===\n");
  
  for (const project of recentProjects) {
    const assetCount = await db
      .select({ count: sql`count(*)` })
      .from(assets)
      .where(eq(assets.projectId, project.id));
    
    const assessmentCount = await db
      .select({ count: sql`count(*)` })
      .from(assessments)
      .where(eq(assessments.projectId, project.id));
    
    const deficiencyCount = await db
      .select({ count: sql`count(*)` })
      .from(deficiencies)
      .where(eq(deficiencies.projectId, project.id));
    
    console.log(`Project: ${project.name}`);
    console.log(`  ID: ${project.id}`);
    console.log(`  Unique ID: ${project.uniqueId}`);
    console.log(`  Client: ${project.clientName}`);
    console.log(`  Location: ${project.city}, ${project.province}`);
    console.log(`  Assets: ${assetCount[0].count}`);
    console.log(`  Assessments: ${assessmentCount[0].count}`);
    console.log(`  Deficiencies: ${deficiencyCount[0].count}`);
    console.log("");
  }
  
  process.exit(0);
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
});
