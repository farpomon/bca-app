import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL!);

async function main() {
  // Query user with ID 1
  const user1 = await db.execute(sql`
    SELECT id, email, name, company, role, accountStatus 
    FROM users 
    WHERE id = 1
  `);

  console.log("=== User ID 1 ===");
  console.log(JSON.stringify(user1[0], null, 2));
  
  // Check all admin users
  const admins = await db.execute(sql`
    SELECT id, email, name, company, role, accountStatus 
    FROM users 
    WHERE role = 'admin'
    ORDER BY id
  `);

  console.log("\n=== All Admin Users ===");
  console.log(JSON.stringify(admins[0], null, 2));
  
  process.exit(0);
}

main();
