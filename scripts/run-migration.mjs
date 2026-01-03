import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // Read the migration file
  const migrationPath = path.join(process.cwd(), 'drizzle/0001_create_tables.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  // Split by statement breakpoint
  const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
  
  console.log(`Running ${statements.length} statements...`);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await connection.execute(stmt);
      console.log(`✓ Statement ${i + 1} executed`);
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log(`⊘ Statement ${i + 1} skipped (table exists)`);
      } else {
        console.error(`✗ Statement ${i + 1} failed:`, err.message);
      }
    }
  }
  
  // Create drizzle migrations table and mark as done
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hash VARCHAR(255) NOT NULL,
        created_at BIGINT NOT NULL
      )
    `);
    await connection.execute(`
      INSERT INTO __drizzle_migrations (hash, created_at) 
      VALUES ('0000_married_hawkeye', ${Date.now()})
      ON DUPLICATE KEY UPDATE created_at = created_at
    `);
    console.log('✓ Migration tracking updated');
  } catch (err) {
    console.log('Migration tracking:', err.message);
  }
  
  await connection.end();
  console.log('Done!');
}

main().catch(console.error);
