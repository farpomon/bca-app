import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log('Disabling foreign key checks...');
  await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
  
  const tablesToDrop = [
    'assessmentComponents',
    'assessments', 
    'assetCategories',
    'assets',
    'capitalProjects',
    'comments',
    'documents',
    'municipalities',
    'photos',
    'projects',
    'building_sections',
    'floor_plans',
    'activityLog',
    '__drizzle_migrations'
  ];
  
  for (const table of tablesToDrop) {
    try {
      await connection.execute(`DROP TABLE IF EXISTS \`${table}\``);
      console.log(`Dropped table: ${table}`);
    } catch (err) {
      console.log(`Could not drop ${table}: ${err.message}`);
    }
  }
  
  console.log('Re-enabling foreign key checks...');
  await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
  
  await connection.end();
  console.log('Done!');
}

main().catch(console.error);
