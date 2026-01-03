import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL!);

async function main() {
  // Query all projects with their owner info
  const projects = await db.execute(sql`
    SELECT p.id, p.name, p.company, p.userId, p.status, u.email as ownerEmail, u.company as ownerCompany
    FROM projects p
    LEFT JOIN users u ON p.userId = u.id
    WHERE p.status != 'deleted'
    ORDER BY p.id DESC
    LIMIT 20
  `);

  console.log("=== Recent Projects ===");
  console.log(JSON.stringify(projects[0], null, 2));
  
  // Check specific projects from the screenshot (Metro Vancouver, Downtown Commercial)
  const specificProjects = await db.execute(sql`
    SELECT p.id, p.name, p.company, p.userId, p.status, u.email as ownerEmail, u.company as ownerCompany
    FROM projects p
    LEFT JOIN users u ON p.userId = u.id
    WHERE p.name LIKE '%Metro Vancouver%' OR p.name LIKE '%Downtown Commercial%'
    ORDER BY p.id
  `);

  console.log("\n=== Specific Projects from Screenshot ===");
  console.log(JSON.stringify(specificProjects[0], null, 2));
  
  process.exit(0);
}

main();
