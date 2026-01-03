import mysql from 'mysql2/promise';

async function fixAssessmentsSchema() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // First check if column exists
    const [cols] = await conn.execute('DESCRIBE assessments');
    const hasProjectId = cols.some(c => c.Field === 'projectId');
    
    if (hasProjectId) {
      console.log('projectId column already exists');
      await conn.end();
      return;
    }
    
    console.log('Adding projectId column to assessments table...');
    await conn.execute('ALTER TABLE assessments ADD COLUMN projectId INT');
    console.log('Column added successfully');
    
    // Populate from assets
    console.log('Populating projectId from assets...');
    await conn.execute(`
      UPDATE assessments a
      INNER JOIN assets ast ON a.assetId = ast.id
      SET a.projectId = ast.projectId
    `);
    console.log('projectId populated successfully');
    
    // Verify
    const [count] = await conn.execute('SELECT COUNT(*) as cnt FROM assessments WHERE projectId IS NOT NULL');
    console.log('Assessments with projectId:', count[0].cnt);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  await conn.end();
}

fixAssessmentsSchema();
