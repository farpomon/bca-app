import mysql from 'mysql2/promise';

/**
 * Backfill script to fix existing assessments that should be marked as UNIFORMAT
 * but are currently showing as "Custom" because uniformat metadata is missing.
 * 
 * This script:
 * 1. Finds assessments with componentCode but missing uniformat metadata
 * 2. Looks up the component in building_components table
 * 3. Populates uniformatId, uniformatLevel, uniformatGroup, and sourceType
 */

async function backfillAssessmentSourceType() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('[Backfill] Starting assessment source type backfill...\n');
    
    // Step 1: Find assessments with componentCode but missing uniformat metadata
    const [assessments] = await conn.execute(`
      SELECT 
        a.id,
        a.componentCode,
        a.componentName,
        a.uniformatId,
        a.uniformatLevel,
        a.uniformatGroup,
        a.sourceType
      FROM assessments a
      WHERE a.componentCode IS NOT NULL
        AND a.componentCode != ''
        AND (
          a.uniformatId IS NULL 
          OR a.uniformatLevel IS NULL 
          OR a.uniformatGroup IS NULL
          OR a.sourceType IS NULL
        )
      LIMIT 1000
    `);
    
    console.log(`[Backfill] Found ${assessments.length} assessments to process\n`);
    
    if (assessments.length === 0) {
      console.log('[Backfill] No assessments need backfilling. Done!');
      return;
    }
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Step 2: Process each assessment
    for (const assessment of assessments) {
      try {
        // Look up component in building_components table
        const [components] = await conn.execute(`
          SELECT id, code, name, level
          FROM building_components
          WHERE code = ?
          LIMIT 1
        `, [assessment.componentCode]);
        
        if (components.length === 0) {
          console.log(`[Skip] Assessment ${assessment.id}: No matching component found for code "${assessment.componentCode}"`);
          skipped++;
          continue;
        }
        
        const component = components[0];
        
        // Extract group code from the first letter of the code (e.g., "D" from "D30")
        const groupCode = component.code.charAt(0).toUpperCase();
        const groupNames = {
          'A': 'A - Substructure',
          'B': 'B - Shell',
          'C': 'C - Interiors',
          'D': 'D - Services',
          'E': 'E - Equipment & Furnishings',
          'F': 'F - Special Construction',
          'G': 'G - Building Sitework'
        };
        const groupName = groupNames[groupCode] || groupCode;
        
        // Update assessment with uniformat metadata and sourceType
        await conn.execute(`
          UPDATE assessments
          SET 
            uniformatId = ?,
            uniformatLevel = ?,
            uniformatGroup = ?,
            sourceType = 'UNIFORMAT'
          WHERE id = ?
        `, [component.id, component.level, groupName, assessment.id]);
        
        console.log(`[Update] Assessment ${assessment.id}: ${assessment.componentCode} (${assessment.componentName}) → UNIFORMAT`);
        updated++;
        
      } catch (error) {
        console.error(`[Error] Assessment ${assessment.id}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n[Backfill] Complete!`);
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

// Run the backfill
backfillAssessmentSourceType()
  .then(() => {
    console.log('\n[Backfill] Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n[Backfill] Script failed:', error);
    process.exit(1);
  });
