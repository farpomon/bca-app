import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Helper to generate random number in range
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to pick random item from array
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Asset types for variety
const assetTypes = [
  'Municipal Office', 'Fire Station', 'Police Station', 'Library', 'Community Center',
  'Recreation Center', 'Water Treatment Plant', 'Wastewater Facility', 'Public Works Garage',
  'Parks Maintenance Building', 'Senior Center', 'Youth Center', 'Health Clinic',
  'Emergency Services Building', 'Transit Facility', 'Parking Structure', 'Storage Facility',
  'Administrative Building', 'Court House', 'Town Hall'
];

const constructionTypes = [
  'Steel Frame', 'Concrete', 'Wood Frame', 'Masonry', 'Pre-Engineered Metal',
  'Reinforced Concrete', 'Steel and Masonry', 'Wood and Steel'
];

const propertyTypes = [
  'Government', 'Public Safety', 'Recreation', 'Utilities', 'Administrative',
  'Healthcare', 'Education', 'Transportation'
];

const conditions = ['good', 'fair', 'poor', 'not_assessed'];
const statuses = ['active', 'inactive'];
const projectStatuses = ['draft', 'in_progress', 'completed'];

// Building components for assessments (UNIFORMAT II classification)
const buildingComponents = [
  { code: 'A10', name: 'Foundations' },
  { code: 'A20', name: 'Basement Construction' },
  { code: 'B10', name: 'Superstructure' },
  { code: 'B20', name: 'Exterior Enclosure' },
  { code: 'B30', name: 'Roofing' },
  { code: 'C10', name: 'Interior Construction' },
  { code: 'C20', name: 'Stairs' },
  { code: 'C30', name: 'Interior Finishes' },
  { code: 'D10', name: 'Conveying' },
  { code: 'D20', name: 'Plumbing' },
  { code: 'D30', name: 'HVAC' },
  { code: 'D40', name: 'Fire Protection' },
  { code: 'D50', name: 'Electrical' },
  { code: 'E10', name: 'Equipment' },
  { code: 'E20', name: 'Furnishings' },
  { code: 'F10', name: 'Special Construction' },
  { code: 'G10', name: 'Site Preparation' },
  { code: 'G20', name: 'Site Improvements' },
  { code: 'G30', name: 'Site Mechanical Utilities' },
  { code: 'G40', name: 'Site Electrical Utilities' }
];

// Municipality data - 3 different municipalities with different asset counts
const municipalities = [
  {
    name: 'City of Riverside',
    code: 'RIVERSIDE',
    state: 'California',
    population: 314998,
    city: 'Riverside',
    province: 'CA',
    assetCount: 10
  },
  {
    name: 'Town of Oakville',
    code: 'OAKVILLE',
    state: 'Ontario',
    population: 211382,
    city: 'Oakville',
    province: 'ON',
    assetCount: 25
  },
  {
    name: 'City of Burlington',
    code: 'BURLINGTON',
    state: 'Ontario',
    population: 186948,
    city: 'Burlington',
    province: 'ON',
    assetCount: 50
  }
];

// Street names for addresses
const streetNames = [
  'Main Street', 'Oak Avenue', 'Maple Drive', 'Cedar Lane', 'Pine Road',
  'Elm Street', 'Birch Boulevard', 'Willow Way', 'Cherry Circle', 'Spruce Court',
  'Lakeshore Road', 'Highway 5', 'Queen Street', 'King Street', 'Victoria Avenue',
  'Wellington Street', 'Dundas Street', 'Bloor Street', 'Yonge Street', 'Bay Street'
];

// Component locations
const componentLocations = [
  'Ground Floor', 'Second Floor', 'Third Floor', 'Roof Level', 'Basement', 
  'Exterior - North', 'Exterior - South', 'Exterior - East', 'Exterior - West',
  'All Floors', 'Mechanical Room', 'Electrical Room', 'Main Entrance', 'Loading Dock'
];

async function seedData() {
  console.log('Starting seed process...');
  console.log('Creating 3 mock projects:');
  console.log('  1. City of Riverside - 10 assets');
  console.log('  2. Town of Oakville - 25 assets');
  console.log('  3. City of Burlington - 50 assets');
  console.log('');

  try {
    // First, ensure building components exist
    console.log('Checking building components...');
    const [existingComponents] = await connection.execute('SELECT code FROM building_components');
    const existingCodes = new Set(existingComponents.map(c => c.code));
    
    for (const comp of buildingComponents) {
      if (!existingCodes.has(comp.code)) {
        await connection.execute(
          'INSERT INTO building_components (code, level, name, description) VALUES (?, ?, ?, ?)',
          [comp.code, 2, comp.name, `${comp.name} system components`]
        );
        console.log(`  Added component: ${comp.code} - ${comp.name}`);
      }
    }

    // Get a user ID (use first user or create mock)
    const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
    const userId = users.length > 0 ? users[0].id : 1;

    const createdProjects = [];

    // Create projects for each municipality
    for (const muni of municipalities) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Creating project for ${muni.name} with ${muni.assetCount} assets...`);
      console.log(`${'='.repeat(60)}`);

      // Create the project
      const projectUniqueId = `PROJ-${muni.code}-${Date.now()}`;
      const [projectResult] = await connection.execute(
        `INSERT INTO projects (
          userId, name, address, clientName, propertyType, constructionType,
          yearBuilt, numberOfUnits, numberOfStories, status, city, province,
          holdingDepartment, propertyManager, managerEmail, managerPhone,
          facilityType, occupancyStatus, criticalityLevel, uniqueId,
          designLife, currentReplacementValue, deferredMaintenanceCost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          `${muni.name} Building Condition Assessment`,
          `${rand(100, 999)} ${pick(streetNames)}, ${muni.city}, ${muni.province}`,
          muni.name,
          pick(propertyTypes),
          pick(constructionTypes),
          rand(1970, 2010),
          rand(1, 20),
          rand(1, 5),
          pick(projectStatuses),
          muni.city,
          muni.province,
          'Facilities Management',
          'John Smith',
          `facilities@${muni.code.toLowerCase()}.gov`,
          `555-${rand(100, 999)}-${rand(1000, 9999)}`,
          'Municipal',
          pick(['occupied', 'partial', 'vacant']),
          pick(['critical', 'important', 'standard']),
          projectUniqueId,
          rand(30, 75),
          rand(5000000, 50000000),
          rand(100000, 5000000)
        ]
      );

      const projectId = projectResult.insertId;
      console.log(`  Created project ID: ${projectId}`);

      let totalAssessments = 0;

      // Create assets for this project
      for (let i = 1; i <= muni.assetCount; i++) {
        const assetType = pick(assetTypes);
        const yearBuilt = rand(1950, 2020);
        const grossFloorArea = rand(5000, 100000);
        const currentReplacementValue = grossFloorArea * rand(150, 400);
        const assetUniqueId = `ASSET-${muni.code}-${projectId}-${i}`;

        const [assetResult] = await connection.execute(
          `INSERT INTO assets (
            projectId, name, description, assetType, address,
            yearBuilt, grossFloorArea, numberOfStories, constructionType,
            currentReplacementValue, status, streetNumber, streetAddress,
            city, postalCode, province, latitude, longitude, uniqueId
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            projectId,
            `${muni.city} ${assetType} ${i}`,
            `${assetType} facility serving the ${muni.city} community. Built in ${yearBuilt}. This facility provides essential services to residents and is part of the municipal infrastructure portfolio.`,
            assetType,
            `${rand(100, 9999)} ${pick(streetNames)}, ${muni.city}, ${muni.province}`,
            yearBuilt,
            grossFloorArea,
            rand(1, 4),
            pick(constructionTypes),
            currentReplacementValue,
            pick(statuses),
            `${rand(100, 9999)}`,
            pick(streetNames),
            muni.city,
            muni.province === 'CA' ? `${rand(90000, 99999)}` : `L${String.fromCharCode(rand(65, 90))}${rand(1, 9)} ${rand(1, 9)}${String.fromCharCode(rand(65, 90))}${rand(1, 9)}`,
            muni.province,
            muni.province === 'CA' ? 33.9 + Math.random() * 0.2 : 43.3 + Math.random() * 0.3,
            muni.province === 'CA' ? -117.4 - Math.random() * 0.2 : -79.8 - Math.random() * 0.3,
            assetUniqueId
          ]
        );

        const assetId = assetResult.insertId;

        // Create assessments for each asset (random selection of components)
        const numAssessments = rand(8, 18);
        const selectedComponents = buildingComponents
          .sort(() => Math.random() - 0.5)
          .slice(0, numAssessments);

        for (const comp of selectedComponents) {
          const condition = pick(conditions);
          const conditionScore = condition === 'good' ? rand(70, 100) : 
                                condition === 'fair' ? rand(40, 69) :
                                condition === 'poor' ? rand(1, 39) : null;
          
          const estimatedServiceLife = rand(15, 50);
          const age = new Date().getFullYear() - yearBuilt;
          const remainingUsefulLife = Math.max(0, estimatedServiceLife - age + rand(-5, 10));
          const replacementValue = rand(10000, 500000);
          const estimatedRepairCost = condition === 'poor' ? rand(50000, 200000) :
                                      condition === 'fair' ? rand(10000, 50000) :
                                      rand(0, 10000);

          // Generate detailed observations based on condition
          let observations = '';
          if (condition === 'good') {
            observations = `${comp.name} system inspection completed. Component is in good working condition with normal wear consistent with age. Regular maintenance schedule is being followed. No immediate action required. Estimated remaining service life: ${remainingUsefulLife} years.`;
          } else if (condition === 'fair') {
            observations = `${comp.name} system shows moderate deterioration. Some components require attention within the next 2-5 years. Minor repairs recommended to prevent further degradation. Consider scheduling preventive maintenance. Current condition score: ${conditionScore}%.`;
          } else if (condition === 'poor') {
            observations = `${comp.name} system requires immediate attention. Significant deterioration observed. Safety concerns may exist. Recommend priority replacement or major repair within 12 months. Estimated repair cost: $${estimatedRepairCost.toLocaleString()}. Current condition score: ${conditionScore}%.`;
          } else {
            observations = `${comp.name} assessment pending. Component requires detailed inspection to determine current condition and remaining useful life.`;
          }

          // Generate recommendations
          let recommendations = '';
          if (condition === 'poor') {
            recommendations = `PRIORITY 1: Immediate replacement or major repair required. Budget allocation recommended for fiscal year ${new Date().getFullYear() + 1}. Consider temporary measures to ensure safety until permanent solution implemented.`;
          } else if (condition === 'fair') {
            recommendations = `PRIORITY 2: Schedule preventive maintenance within 2-3 years. Include in capital planning for years ${new Date().getFullYear() + 2}-${new Date().getFullYear() + 5}. Monitor condition annually.`;
          } else if (condition === 'good') {
            recommendations = `PRIORITY 3: Continue regular maintenance schedule. No capital expenditure required in near term. Re-assess in ${rand(3, 5)} years.`;
          } else {
            recommendations = `Complete detailed assessment to determine maintenance requirements and capital planning needs.`;
          }

          await connection.execute(
            `INSERT INTO assessments (
              projectId, assetId, componentCode, condition, observations,
              remainingUsefulLife, expectedUsefulLife, estimatedServiceLife,
              conditionPercentage, reviewYear, estimatedRepairCost, replacementValue,
              actionYear, recommendations, conditionScore, status,
              componentName, componentLocation
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              projectId,
              assetId,
              comp.code,
              condition,
              observations,
              remainingUsefulLife,
              estimatedServiceLife,
              estimatedServiceLife,
              conditionScore ? `${conditionScore}%` : null,
              new Date().getFullYear(),
              estimatedRepairCost,
              replacementValue,
              condition === 'poor' ? new Date().getFullYear() + 1 :
              condition === 'fair' ? new Date().getFullYear() + rand(2, 5) :
              new Date().getFullYear() + rand(5, 15),
              recommendations,
              conditionScore,
              pick(['initial', 'active', 'completed']),
              comp.name,
              pick(componentLocations)
            ]
          );
          totalAssessments++;
        }

        if (i % 10 === 0 || i === muni.assetCount) {
          console.log(`    Created ${i}/${muni.assetCount} assets...`);
        }
      }

      createdProjects.push({
        id: projectId,
        name: `${muni.name} Building Condition Assessment`,
        city: muni.city,
        assetCount: muni.assetCount,
        assessmentCount: totalAssessments
      });

      console.log(`  ✓ Completed: ${muni.assetCount} assets with ${totalAssessments} assessments`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SEED SUMMARY');
    console.log('='.repeat(60));
    
    console.log('\nCreated Projects:');
    console.log('-'.repeat(60));
    for (const p of createdProjects) {
      console.log(`  Project ID: ${p.id}`);
      console.log(`  Name: ${p.name}`);
      console.log(`  City: ${p.city}`);
      console.log(`  Assets: ${p.assetCount}`);
      console.log(`  Assessments: ${p.assessmentCount}`);
      console.log('-'.repeat(60));
    }

    const totalAssets = createdProjects.reduce((sum, p) => sum + p.assetCount, 0);
    const totalAssessments = createdProjects.reduce((sum, p) => sum + p.assessmentCount, 0);

    console.log(`\nTotals:`);
    console.log(`  Projects Created: ${createdProjects.length}`);
    console.log(`  Total Assets: ${totalAssets}`);
    console.log(`  Total Assessments: ${totalAssessments}`);

  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seedData().then(() => {
  console.log('\n✓ Seed completed successfully!');
  process.exit(0);
}).catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
