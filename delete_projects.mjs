import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// IDs to keep
const keepIds = [3780824, 3780825, 3780826, 3780827];

console.log('Starting deletion of projects...');
console.log('Keeping project IDs:', keepIds);

// First, delete related data in child tables
// Check what tables reference projects
const [tables] = await connection.execute(`
  SELECT TABLE_NAME, COLUMN_NAME 
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE REFERENCED_TABLE_NAME = 'projects' 
  AND TABLE_SCHEMA = DATABASE()
`);

console.log('\nTables referencing projects:', tables);

// Delete from child tables first (in order of dependencies)
const childTables = ['assessments', 'buildings', 'project_users'];

for (const table of childTables) {
  try {
    const [result] = await connection.execute(
      `DELETE FROM ${table} WHERE projectId NOT IN (${keepIds.join(',')})`
    );
    console.log(`Deleted ${result.affectedRows} rows from ${table}`);
  } catch (e) {
    console.log(`Table ${table} error:`, e.message);
  }
}

// Now delete from projects table
const [result] = await connection.execute(
  `DELETE FROM projects WHERE id NOT IN (${keepIds.join(',')})`
);
console.log(`\nDeleted ${result.affectedRows} projects`);

// Verify remaining count
const [countRows] = await connection.execute("SELECT COUNT(*) as total FROM projects");
console.log('Remaining projects:', countRows[0].total);

await connection.end();
console.log('\nDeletion complete!');
