import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL);

async function testQuery() {
  console.log('Testing component assessment query...');
  
  // Test 1: Simple query with no conditions
  console.log('\n=== Test 1: Simple query ===');
  const result1 = await db.execute(sql`
    SELECT 
      ass.id,
      ass.assetId,
      a.name as assetName,
      ass.observations,
      ass.recommendations
    FROM assessments ass
    INNER JOIN assets a ON ass.assetId = a.id
    INNER JOIN projects p ON a.projectId = p.id
    WHERE p.deletedAt IS NULL
      AND ass.deletedAt IS NULL
    LIMIT 5
  `);
  
  console.log('Result type:', typeof result1);
  console.log('Is array:', Array.isArray(result1));
  if (Array.isArray(result1)) {
    console.log('Result length:', result1.length);
    console.log('Result[0] type:', typeof result1[0]);
    console.log('Result[0] is array:', Array.isArray(result1[0]));
    if (Array.isArray(result1[0])) {
      console.log('Result[0] length:', result1[0].length);
      console.log('Sample data:', JSON.stringify(result1[0].slice(0, 2), null, 2));
    }
  }
  
  // Test 2: Full query matching the function
  console.log('\n=== Test 2: Full query with all fields ===');
  const result2 = await db.execute(sql`
    SELECT 
      ass.id,
      ass.assetId,
      a.name as assetName,
      COALESCE(a.address, p.address, '') as assetAddress,
      COALESCE(ass.componentCode, '') as uniformatCode,
      COALESCE(SUBSTRING(ass.componentCode, 1, 1), 'Z') as uniformatLevel1,
      CASE 
        WHEN LENGTH(ass.componentCode) >= 3 THEN SUBSTRING(ass.componentCode, 1, 3)
        ELSE NULL 
      END as uniformatLevel2,
      CASE 
        WHEN LENGTH(ass.componentCode) >= 5 THEN SUBSTRING(ass.componentCode, 1, 5)
        ELSE NULL 
      END as uniformatLevel3,
      COALESCE(ass.uniformatGroup, '') as uniformatGroup,
      COALESCE(ass.componentName, 'Unknown Component') as componentName,
      ass.componentLocation,
      COALESCE(ass.condition, 'not_assessed') as conditionRating,
      CAST(ass.conditionPercentage AS DECIMAL(5,2)) as conditionPercentage,
      ass.estimatedServiceLife,
      ass.remainingUsefulLife,
      ass.reviewYear,
      ass.lastTimeAction,
      CAST(ass.repairCost AS DECIMAL(15,2)) as repairCost,
      CAST(ass.renewCost AS DECIMAL(15,2)) as replacementCost,
      CAST(COALESCE(ass.repairCost, 0) + COALESCE(ass.renewCost, 0) AS DECIMAL(15,2)) as totalCost,
      COALESCE(ass.recommendedAction, 'monitor') as actionType,
      ass.actionYear,
      ass.actionDescription,
      COALESCE(
        CASE ass.priorityLevel
          WHEN '1' THEN 'immediate'
          WHEN '2' THEN 'short_term'
          WHEN '3' THEN 'medium_term'
          WHEN '4' THEN 'long_term'
          WHEN '5' THEN 'long_term'
          ELSE 'medium_term'
        END,
        'medium_term'
      ) as priority,
      COALESCE(ass.assessmentDate, ass.createdAt) as assessmentDate,
      u.name as assessorName,
      ass.observations,
      ass.recommendations
    FROM assessments ass
    INNER JOIN assets a ON ass.assetId = a.id
    INNER JOIN projects p ON a.projectId = p.id
    LEFT JOIN users u ON ass.assessorId = u.id
    WHERE p.deletedAt IS NULL
      AND ass.deletedAt IS NULL
      AND (ass.hidden = 0 OR ass.hidden IS NULL)
    ORDER BY ass.componentCode ASC, a.name ASC
    LIMIT 10
  `);
  
  console.log('Result type:', typeof result2);
  console.log('Is array:', Array.isArray(result2));
  if (Array.isArray(result2)) {
    console.log('Result length:', result2.length);
    console.log('Result[0] type:', typeof result2[0]);
    console.log('Result[0] is array:', Array.isArray(result2[0]));
    if (Array.isArray(result2[0])) {
      console.log('Result[0] length:', result2[0].length);
      if (result2[0].length > 0) {
        console.log('First row:', JSON.stringify(result2[0][0], null, 2));
      }
    }
  }
  
  process.exit(0);
}

testQuery().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
