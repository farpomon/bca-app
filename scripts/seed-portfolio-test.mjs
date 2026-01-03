/**
 * Seed script to create test portfolio data for testing the Portfolio Report feature
 * Run with: node scripts/seed-portfolio-test.mjs
 */

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function seedPortfolioTestData() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    console.log('🚀 Starting portfolio test data seed...\n');
    
    // Get the first admin user (userId = 1)
    const [users] = await connection.execute('SELECT id FROM users WHERE role = "admin" LIMIT 1');
    const userId = users[0]?.id || 1;
    console.log(`Using userId: ${userId}`);
    
    // Generate unique ID for the project
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const projectUniqueId = `PROJ-${dateStr}-${randomSuffix}`;
    
    // 1. Create a test project
    console.log('\n📁 Creating test project...');
    const [projectResult] = await connection.execute(`
      INSERT INTO projects (
        uniqueId, userId, name, address, clientName, propertyType, 
        constructionType, yearBuilt, numberOfUnits, numberOfStories, 
        status, city, province
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      projectUniqueId,
      userId,
      'Portfolio Test - Downtown Office Complex',
      '123 Main Street, Toronto, ON M5V 2K7',
      'ABC Property Management Inc.',
      'Commercial Office',
      'Steel Frame',
      1985,
      null,
      12,
      'in_progress',
      'Toronto',
      'Ontario'
    ]);
    
    const projectId = projectResult.insertId;
    console.log(`✅ Created project ID: ${projectId} (${projectUniqueId})`);
    
    // 2. Create multiple assets with varying conditions
    console.log('\n🏢 Creating test assets...');
    
    const assets = [
      {
        name: 'Tower A - Main Office Building',
        description: 'Primary 12-story office tower with retail at ground level',
        assetType: 'Office Building',
        yearBuilt: 1985,
        grossFloorArea: 150000,
        numberOfStories: 12,
        constructionType: 'Steel Frame',
        currentReplacementValue: 45000000,
        city: 'Toronto',
        province: 'Ontario'
      },
      {
        name: 'Tower B - Annex Building',
        description: 'Secondary 8-story office building connected via skybridge',
        assetType: 'Office Building',
        yearBuilt: 1992,
        grossFloorArea: 85000,
        numberOfStories: 8,
        constructionType: 'Concrete Frame',
        currentReplacementValue: 25000000,
        city: 'Toronto',
        province: 'Ontario'
      },
      {
        name: 'Parking Structure',
        description: 'Underground parking garage with 500 spaces',
        assetType: 'Parking Structure',
        yearBuilt: 1985,
        grossFloorArea: 200000,
        numberOfStories: 3,
        constructionType: 'Reinforced Concrete',
        currentReplacementValue: 15000000,
        city: 'Toronto',
        province: 'Ontario'
      },
      {
        name: 'Central Plant Building',
        description: 'Mechanical plant housing HVAC and electrical systems',
        assetType: 'Utility Building',
        yearBuilt: 1985,
        grossFloorArea: 10000,
        numberOfStories: 2,
        constructionType: 'Concrete Block',
        currentReplacementValue: 8000000,
        city: 'Toronto',
        province: 'Ontario'
      }
    ];
    
    const assetIds = [];
    for (const asset of assets) {
      const assetUniqueId = `ASSET-${dateStr}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const [result] = await connection.execute(`
        INSERT INTO assets (
          uniqueId, projectId, name, description, assetType, yearBuilt, 
          grossFloorArea, numberOfStories, constructionType, 
          currentReplacementValue, status, city, province
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `, [
        assetUniqueId,
        projectId,
        asset.name,
        asset.description,
        asset.assetType,
        asset.yearBuilt,
        asset.grossFloorArea,
        asset.numberOfStories,
        asset.constructionType,
        asset.currentReplacementValue,
        asset.city,
        asset.province
      ]);
      assetIds.push(result.insertId);
      console.log(`  ✅ Created asset: ${asset.name} (ID: ${result.insertId})`);
    }
    
    // 3. Create assessments for each asset with UNIFORMAT II components
    console.log('\n📋 Creating assessments...');
    
    const assessmentData = [
      // Tower A assessments
      { assetIdx: 0, componentCode: 'B1010', componentName: 'Floor Construction', condition: 'good', repairCost: 50000, replacementValue: 2500000, rul: 25 },
      { assetIdx: 0, componentCode: 'B2010', componentName: 'Exterior Walls', condition: 'fair', repairCost: 350000, replacementValue: 4000000, rul: 15 },
      { assetIdx: 0, componentCode: 'B2020', componentName: 'Exterior Windows', condition: 'poor', repairCost: 800000, replacementValue: 3000000, rul: 5 },
      { assetIdx: 0, componentCode: 'B3010', componentName: 'Roof Coverings', condition: 'fair', repairCost: 200000, replacementValue: 1500000, rul: 10 },
      { assetIdx: 0, componentCode: 'D2010', componentName: 'Plumbing Fixtures', condition: 'good', repairCost: 75000, replacementValue: 800000, rul: 20 },
      { assetIdx: 0, componentCode: 'D3050', componentName: 'HVAC Distribution', condition: 'poor', repairCost: 1200000, replacementValue: 5000000, rul: 3 },
      { assetIdx: 0, componentCode: 'D5010', componentName: 'Electrical Service', condition: 'fair', repairCost: 250000, replacementValue: 2000000, rul: 12 },
      { assetIdx: 0, componentCode: 'D5020', componentName: 'Lighting', condition: 'good', repairCost: 100000, replacementValue: 1200000, rul: 18 },
      
      // Tower B assessments
      { assetIdx: 1, componentCode: 'B1010', componentName: 'Floor Construction', condition: 'good', repairCost: 30000, replacementValue: 1500000, rul: 30 },
      { assetIdx: 1, componentCode: 'B2010', componentName: 'Exterior Walls', condition: 'good', repairCost: 100000, replacementValue: 2500000, rul: 25 },
      { assetIdx: 1, componentCode: 'B2020', componentName: 'Exterior Windows', condition: 'fair', repairCost: 300000, replacementValue: 2000000, rul: 12 },
      { assetIdx: 1, componentCode: 'B3010', componentName: 'Roof Coverings', condition: 'poor', repairCost: 450000, replacementValue: 1000000, rul: 2 },
      { assetIdx: 1, componentCode: 'D3050', componentName: 'HVAC Distribution', condition: 'fair', repairCost: 400000, replacementValue: 3000000, rul: 15 },
      { assetIdx: 1, componentCode: 'D5010', componentName: 'Electrical Service', condition: 'good', repairCost: 50000, replacementValue: 1500000, rul: 22 },
      
      // Parking Structure assessments
      { assetIdx: 2, componentCode: 'A1030', componentName: 'Slab on Grade', condition: 'poor', repairCost: 600000, replacementValue: 3000000, rul: 5 },
      { assetIdx: 2, componentCode: 'B1010', componentName: 'Floor Construction', condition: 'fair', repairCost: 400000, replacementValue: 4000000, rul: 10 },
      { assetIdx: 2, componentCode: 'B2010', componentName: 'Exterior Walls', condition: 'fair', repairCost: 200000, replacementValue: 2000000, rul: 15 },
      { assetIdx: 2, componentCode: 'D5020', componentName: 'Lighting', condition: 'poor', repairCost: 150000, replacementValue: 500000, rul: 3 },
      { assetIdx: 2, componentCode: 'G2020', componentName: 'Parking Lots', condition: 'poor', repairCost: 350000, replacementValue: 1500000, rul: 4 },
      
      // Central Plant assessments
      { assetIdx: 3, componentCode: 'D3020', componentName: 'Heat Generating Systems', condition: 'poor', repairCost: 800000, replacementValue: 2500000, rul: 2 },
      { assetIdx: 3, componentCode: 'D3030', componentName: 'Cooling Generating Systems', condition: 'fair', repairCost: 350000, replacementValue: 2000000, rul: 8 },
      { assetIdx: 3, componentCode: 'D5010', componentName: 'Electrical Service', condition: 'fair', repairCost: 200000, replacementValue: 1500000, rul: 10 },
      { assetIdx: 3, componentCode: 'D5030', componentName: 'Communications', condition: 'good', repairCost: 50000, replacementValue: 500000, rul: 20 }
    ];
    
    const assessmentIds = [];
    for (const assessment of assessmentData) {
      const [result] = await connection.execute(`
        INSERT INTO assessments (
          projectId, assetId, componentCode, componentName, condition, 
          estimatedRepairCost, replacementValue, remainingUsefulLife,
          expectedUsefulLife, observations, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `, [
        projectId,
        assetIds[assessment.assetIdx],
        assessment.componentCode,
        assessment.componentName,
        assessment.condition,
        assessment.repairCost,
        assessment.replacementValue,
        assessment.rul,
        assessment.rul + 10,
        `Assessment of ${assessment.componentName} - ${assessment.condition} condition observed`
      ]);
      assessmentIds.push({ id: result.insertId, ...assessment });
    }
    console.log(`  ✅ Created ${assessmentIds.length} assessments`);
    
    // 4. Create deficiencies linked to assessments
    console.log('\n⚠️ Creating deficiencies...');
    
    const deficiencies = [
      // Immediate priority (0-1 year)
      { assessmentIdx: 5, title: 'HVAC System Failure Risk', description: 'Main air handling units showing signs of imminent failure. Bearings worn, motors overheating.', severity: 'critical', priority: 'immediate', cost: 450000 },
      { assessmentIdx: 19, title: 'Boiler Replacement Required', description: 'Primary boiler has exceeded useful life and is operating at reduced efficiency. Risk of failure during heating season.', severity: 'critical', priority: 'immediate', cost: 600000 },
      { assessmentIdx: 14, title: 'Structural Slab Deterioration', description: 'Significant spalling and rebar exposure on parking deck levels 2 and 3. Safety concern for vehicles and pedestrians.', severity: 'high', priority: 'immediate', cost: 400000 },
      
      // Short-term priority (1-3 years)
      { assessmentIdx: 2, title: 'Window Seal Failures', description: 'Multiple window units showing seal failures with visible condensation. Energy loss and water infiltration risk.', severity: 'high', priority: 'short_term', cost: 350000 },
      { assessmentIdx: 11, title: 'Roof Membrane End of Life', description: 'Tower B roof membrane showing extensive cracking and ponding. Replacement recommended within 2 years.', severity: 'high', priority: 'short_term', cost: 400000 },
      { assessmentIdx: 17, title: 'Parking Lighting Upgrade', description: 'Existing HID lighting inefficient and failing. LED upgrade recommended for safety and energy savings.', severity: 'medium', priority: 'short_term', cost: 120000 },
      { assessmentIdx: 18, title: 'Parking Surface Repairs', description: 'Asphalt surface showing extensive cracking and potholes. Resurfacing required.', severity: 'medium', priority: 'short_term', cost: 250000 },
      
      // Medium-term priority (3-5 years)
      { assessmentIdx: 1, title: 'Exterior Wall Repointing', description: 'Masonry joints showing deterioration. Comprehensive repointing program recommended.', severity: 'medium', priority: 'medium_term', cost: 200000 },
      { assessmentIdx: 3, title: 'Roof Coating Application', description: 'Preventive coating application recommended to extend roof life.', severity: 'low', priority: 'medium_term', cost: 150000 },
      { assessmentIdx: 6, title: 'Electrical Panel Upgrade', description: 'Main electrical panels approaching end of useful life. Upgrade recommended for reliability.', severity: 'medium', priority: 'medium_term', cost: 180000 },
      { assessmentIdx: 12, title: 'HVAC Controls Modernization', description: 'Building automation system outdated. Modern controls would improve efficiency.', severity: 'medium', priority: 'medium_term', cost: 300000 },
      
      // Long-term priority (5+ years)
      { assessmentIdx: 7, title: 'Lighting System Replacement', description: 'Plan for comprehensive LED lighting upgrade across all floors.', severity: 'low', priority: 'long_term', cost: 400000 },
      { assessmentIdx: 4, title: 'Plumbing Fixture Refresh', description: 'Restroom fixtures aging but functional. Plan for phased replacement.', severity: 'low', priority: 'long_term', cost: 200000 },
      { assessmentIdx: 20, title: 'Cooling Tower Replacement', description: 'Cooling towers functional but will need replacement in 5-7 years.', severity: 'low', priority: 'long_term', cost: 350000 },
      { assessmentIdx: 15, title: 'Parking Deck Waterproofing', description: 'Long-term waterproofing membrane replacement for parking structure.', severity: 'low', priority: 'long_term', cost: 500000 }
    ];
    
    for (const deficiency of deficiencies) {
      const assessment = assessmentIds[deficiency.assessmentIdx];
      await connection.execute(`
        INSERT INTO deficiencies (
          assessmentId, projectId, componentCode, title, description,
          severity, priority, estimatedCost, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')
      `, [
        assessment.id,
        projectId,
        assessment.componentCode,
        deficiency.title,
        deficiency.description,
        deficiency.severity,
        deficiency.priority,
        deficiency.cost
      ]);
    }
    console.log(`  ✅ Created ${deficiencies.length} deficiencies`);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 PORTFOLIO TEST DATA SUMMARY');
    console.log('='.repeat(60));
    console.log(`Project: Portfolio Test - Downtown Office Complex`);
    console.log(`Project ID: ${projectId}`);
    console.log(`Unique ID: ${projectUniqueId}`);
    console.log(`Assets: ${assetIds.length}`);
    console.log(`Assessments: ${assessmentIds.length}`);
    console.log(`Deficiencies: ${deficiencies.length}`);
    console.log('\nTotal Replacement Value: $93,000,000');
    console.log('Total Deferred Maintenance: ~$4,850,000');
    console.log('Expected Portfolio FCI: ~5.2% (Fair condition)');
    console.log('='.repeat(60));
    console.log('\n✅ Portfolio test data seeded successfully!');
    console.log('\n📝 To test the Portfolio Report:');
    console.log('   1. Go to the Projects page');
    console.log('   2. Find "Portfolio Test - Downtown Office Complex"');
    console.log('   3. Click on the project to open it');
    console.log('   4. Click "Portfolio Report" button');
    console.log('   5. Review the generated report with FCI, assets, categories, etc.');
    
  } catch (error) {
    console.error('❌ Error seeding portfolio test data:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seedPortfolioTestData().catch(console.error);
