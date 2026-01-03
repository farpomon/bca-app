import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL!);

async function main() {
  // Query users
  const users = await db.execute(sql`
    SELECT id, email, name, company, role, accountStatus 
    FROM users 
    WHERE email LIKE '%faria%' OR email LIKE '%rubio%' OR email LIKE '%Rubio%'
    ORDER BY email
  `);

  console.log("=== Users ===");
  console.log(JSON.stringify(users[0], null, 2));

  // Query projects owned by these users
  const projects = await db.execute(sql`
    SELECT p.id, p.name, p.company, p.userId, u.email as ownerEmail
    FROM projects p
    LEFT JOIN users u ON p.userId = u.id
    WHERE p.company IN (SELECT DISTINCT company FROM users WHERE email LIKE '%faria%' OR email LIKE '%rubio%')
    OR p.userId IN (SELECT id FROM users WHERE email LIKE '%faria%' OR email LIKE '%rubio%')
    ORDER BY p.id
  `);

  console.log("\n=== Projects ===");
  console.log(JSON.stringify(projects[0], null, 2));
  
  process.exit(0);
}

main();
