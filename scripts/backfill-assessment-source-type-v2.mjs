import mysql from 'mysql2/promise';
import 'dotenv/config';

async function backfillAssessmentSourceType() {
  console.log('[Backfill] Starting assessment source type backfill (v2)...');
  
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Get all assessments that need backfilling
    const [assessments] = await conn.execute(`
      SELECT 
        a.id,
        a.componentId,
        a.componentCode,
        a.componentName,
        a.sourceType,
        a.uniformatId,
        bc.code as bcCode,
        bc.name as bcName,
        bc.level as bcLevel
      FROM assessments a
      LEFT JOIN building_components bc ON a.componentId = bc.id
      WHERE a.deletedAt IS NULL
        AND (a.sourceType IS NULL OR a.sourceType = '')
    `);
    
    console.log(`[Backfill] Found ${assessments.length} assessments to process`);
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const assessment of assessments) {
      try {
        // If assessment has componentId and a matching building_component
        if (assessment.componentId && assessment.bcCode) {
          // Extract group code from UNIFORMAT code (first letter)
          const groupCode = assessment.bcCode.charAt(0).toUpperCase();
          const groupNames = {
            'A': 'A - Substructure',
            'B': 'B - Shell',
            'C': 'C - Interiors',
            'D': 'D - Services',
            'E': 'E - Equipment & Furnishings',
            'F': 'F - Special Construction & Demolition',
            'G': 'G - Building Sitework'
          };
          const groupName = groupNames[groupCode] || groupCode;
          
          // Update assessment with uniformat metadata and sourceType
          await conn.execute(`
            UPDATE assessments
            SET 
              componentCode = ?,
              componentName = ?,
              uniformatId = ?,
              uniformatLevel = ?,
              uniformatGroup = ?,
              sourceType = 'UNIFORMAT'
            WHERE id = ?
          `, [
            assessment.bcCode,
            assessment.bcName,
            assessment.componentId,
            assessment.bcLevel,
            groupName,
            assessment.id
          ]);
          
          console.log(`[Update] Assessment ${assessment.id}: ${assessment.bcCode} (${assessment.bcName}) → UNIFORMAT`);
          updated++;
        } else {
          // This is a true custom component
          await conn.execute(`
            UPDATE assessments
            SET sourceType = 'CUSTOM'
            WHERE id = ?
          `, [assessment.id]);
          
          console.log(`[Custom] Assessment ${assessment.id}: ${assessment.componentCode || assessment.componentName} → CUSTOM`);
          updated++;
        }
      } catch (error) {
        console.error(`[Error] Assessment ${assessment.id}:`, error.message);
        errors++;
      }
    }
    
    console.log('[Backfill] Complete!');
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors: ${errors}`);
    
  } catch (error) {
    console.error('[Backfill] Fatal error:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

backfillAssessmentSourceType()
  .then(() => {
    console.log('[Backfill] Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Backfill] Script failed:', error);
    process.exit(1);
  });
