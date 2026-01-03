/**
 * Seed Script: Financial Metrics Demo Project
 * Creates a demo project with 5 assets showcasing all financial metrics
 * 
 * Run with: node scripts/seed-financial-demo.mjs
 */

import mysql from 'mysql2/promise';

// Database connection
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

// Parse DATABASE_URL
const url = new URL(DATABASE_URL);
const dbConfig = {
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false }
};

// Component mapping (code -> id in assessmentComponents table)
const componentMap = {
  'FOUND': 1,      // Foundation - structural
  'FRAME': 2,      // Structural Frame - structural
  'EXTWALL': 3,    // Exterior Walls - exterior
  'WIN': 4,        // Windows - exterior
  'DOOR': 5,       // Doors - exterior
  'ROOF': 6,       // Roof Covering - roofing
  'ROOFSTR': 7,    // Roof Structure - roofing
  'PLUMBFIX': 8,   // Plumbing Fixtures - plumbing
  'PLUMBPIPE': 9,  // Plumbing Piping - plumbing
  'ELECDIST': 10,  // Electrical Distribution - electrical
  'LIGHT': 11,     // Lighting - electrical
  'HVACEQ': 12,    // HVAC Equipment - hvac
  'HVACDIST': 13,  // HVAC Distribution - hvac
  'INTFIN': 14,    // Interior Finishes - interior
  'FIREALM': 15,   // Fire Alarm - fire_safety
  'FIRESUPP': 16,  // Fire Suppression - fire_safety
  'ADA': 17,       // ADA Compliance - accessibility
  'SITEPAVE': 18,  // Site Paving - site
  'SITEUTIL': 19,  // Site Utilities - site
  'LANDSCAPE': 20, // Landscaping - site
};

// Demo project data
const demoProject = {
  name: "Financial Metrics Demo Portfolio",
  address: "100 Financial District Way, Toronto, ON M5X 1A1",
  clientName: "Demo Financial Corp",
  propertyType: "Mixed-Use Commercial",
  constructionType: "Steel Frame",
  yearBuilt: 2005,
  numberOfUnits: 150,
  numberOfStories: 25,
  status: "in_progress",
  streetNumber: "100",
  streetAddress: "Financial District Way",
  city: "Toronto",
  province: "Ontario",
  postalCode: "M5X 1A1",
  latitude: 43.6485,
  longitude: -79.3812,
  designLife: 50,
  holdingDepartment: "Corporate Real Estate",
  propertyManager: "Sarah Chen",
  managerEmail: "sarah.chen@demo.com",
  managerPhone: "416-555-0100",
  facilityType: "Class A Office",
  occupancyStatus: "occupied",
  criticalityLevel: "critical"
};

// 5 Demo assets with comprehensive financial data
const demoAssets = [
  {
    name: "Tower A - Main Office Building",
    assetCode: "ASSET-FD-001",
    description: "25-story Class A office tower with retail podium",
    yearBuilt: 2005,
    squareFootage: 450000,
    numberOfFloors: 25,
    numberOfUnits: 100,
    occupancyType: "occupied",
    ownershipType: "private",
    constructionType: "Steel Frame with Curtain Wall",
    primaryUse: "Office",
    secondaryUse: "Retail",
    replacementValue: 125000000, // $125M
    insuranceValue: 110000000,
    annualMaintenanceCost: 2500000,
    status: "active",
    overallCondition: "fair",
    address: "100 Financial District Way, Toronto, Ontario M5X 1A1",
    latitude: 43.6485,
    longitude: -79.3812,
    assessments: [
      { componentId: 'FRAME', conditionRating: '2', estimatedRepairCost: 150000, remainingLifeYears: 35, location: 'All floors', conditionNotes: 'Minor wear on high-traffic areas', recommendedAction: 'preventive_maintenance', deficiencyDescription: null, deficiencySeverity: null, priorityLevel: '3' },
      { componentId: 'EXTWALL', conditionRating: '3', estimatedRepairCost: 850000, remainingLifeYears: 20, location: 'All facades', conditionNotes: 'Sealant deterioration at curtain wall joints', recommendedAction: 'repair', deficiencyDescription: 'Sealant deterioration requiring full replacement', deficiencySeverity: 'moderate', priorityLevel: '2' },
      { componentId: 'WIN', conditionRating: '3', estimatedRepairCost: 1200000, remainingLifeYears: 15, location: 'Floors 15-20', conditionNotes: 'IGU seal failures on south facade', recommendedAction: 'replace', deficiencyDescription: 'IGU seal failures causing fogging', deficiencySeverity: 'moderate', priorityLevel: '2' },
      { componentId: 'ROOF', conditionRating: '4', estimatedRepairCost: 450000, remainingLifeYears: 5, location: 'Main roof', conditionNotes: 'Multiple leak points, membrane degradation', recommendedAction: 'immediate_action', deficiencyDescription: 'Active leaks in northwest corner', deficiencySeverity: 'critical', priorityLevel: '1' },
      { componentId: 'PLUMBFIX', conditionRating: '2', estimatedRepairCost: 75000, remainingLifeYears: 25, location: 'All floors', conditionNotes: 'Fixtures in good condition', recommendedAction: 'preventive_maintenance', deficiencyDescription: null, deficiencySeverity: null, priorityLevel: '4' },
      { componentId: 'HVACDIST', conditionRating: '3', estimatedRepairCost: 680000, remainingLifeYears: 12, location: 'Mechanical rooms', conditionNotes: 'VAV boxes showing wear, controls outdated', recommendedAction: 'repair', deficiencyDescription: '12 VAV boxes with failed actuators', deficiencySeverity: 'moderate', priorityLevel: '2' },
      { componentId: 'HVACEQ', conditionRating: '3', estimatedRepairCost: 520000, remainingLifeYears: 10, location: 'Central plant', conditionNotes: 'Chillers approaching end of life', recommendedAction: 'replace', deficiencyDescription: 'Chiller efficiency declining', deficiencySeverity: 'moderate', priorityLevel: '2' },
      { componentId: 'ELECDIST', conditionRating: '2', estimatedRepairCost: 125000, remainingLifeYears: 30, location: 'Electrical rooms', conditionNotes: 'Main switchgear in good condition', recommendedAction: 'monitor', deficiencyDescription: null, deficiencySeverity: null, priorityLevel: '4' },
      { componentId: 'LIGHT', conditionRating: '3', estimatedRepairCost: 380000, remainingLifeYears: 8, location: 'All floors', conditionNotes: 'T8 fluorescent throughout, high energy use', recommendedAction: 'replace', deficiencyDescription: 'Outdated lighting technology', deficiencySeverity: 'minor', priorityLevel: '3' },
    ]
  },
  {
    name: "Tower B - Corporate Headquarters",
    assetCode: "ASSET-FD-002",
    description: "20-story corporate headquarters with executive floors",
    yearBuilt: 2008,
    squareFootage: 380000,
    numberOfFloors: 20,
    numberOfUnits: 80,
    occupancyType: "occupied",
    ownershipType: "private",
    constructionType: "Concrete Frame",
    primaryUse: "Office",
    secondaryUse: "Conference Center",
    replacementValue: 98000000, // $98M
    insuranceValue: 88000000,
    annualMaintenanceCost: 1900000,
    status: "active",
    overallCondition: "good",
    address: "110 Financial District Way, Toronto, Ontario M5X 1A2",
    latitude: 43.6488,
    longitude: -79.3815,
    assessments: [
      { componentId: 'FRAME', conditionRating: '2', estimatedRepairCost: 85000, remainingLifeYears: 40, location: 'All floors', conditionNotes: 'Excellent condition throughout', recommendedAction: 'monitor', deficiencyDescription: null, deficiencySeverity: null, priorityLevel: '5' },
      { componentId: 'EXTWALL', conditionRating: '2', estimatedRepairCost: 220000, remainingLifeYears: 30, location: 'All facades', conditionNotes: 'Minor caulking repairs needed', recommendedAction: 'preventive_maintenance', deficiencyDescription: null, deficiencySeverity: null, priorityLevel: '4' },
      { componentId: 'WIN', conditionRating: '2', estimatedRepairCost: 180000, remainingLifeYears: 25, location: 'All floors', conditionNotes: 'Windows in good condition', recommendedAction: 'monitor', deficiencyDescription: null, deficiencySeverity: null, priorityLevel: '4' },
      { componentId: 'ROOF', conditionRating: '3', estimatedRepairCost: 280000, remainingLifeYears: 10, location: 'Main roof', conditionNotes: 'Membrane showing age, no active leaks', recommendedAction: 'repair', deficiencyDescription: 'Roof drain blockage', deficiencySeverity: 'minor', priorityLevel: '3' },
      { componentId: 'PLUMBFIX', conditionRating: '2', estimatedRepairCost: 45000, remainingLifeYears: 28, location: 'Executive floors', conditionNotes: 'Recently upgraded executive floors', recommendedAction: 'monitor', deficiencyDescription: null, deficiencySeverity: null, priorityLevel: '5' },
      { componentId: 'HVACDIST', conditionRating: '2', estimatedRepairCost: 320000, remainingLifeYears: 18, location: 'All floors', conditionNotes: 'System performing well', recommendedAction: 'preventive_maintenance', deficiencyDescription: null, deficiencySeverity: null, priorityLevel: '4' },
      { componentId: 'HVACEQ', conditionRating: '2', estimatedRepairCost: 280000, remainingLifeYears: 15, location: 'Central plant', conditionNotes: 'Chillers well maintained', recommendedAction: 'preventive_maintenance', deficiencyDescription: null, deficiencySeverity: null, priorityLevel: '4' },
      { componentId: 'ELECDIST', conditionRating: '2', estimatedRepairCost: 95000, remainingLifeYears: 35, location: 'Electrical rooms', conditionNotes: 'Excellent condition', recommendedAction: 'monitor', deficiencyDescription: null, deficiencySeverity: null, priorityLevel: '5' },
      { componentId: 'LIGHT', conditionRating: '2', estimatedRepairCost: 120000, remainingLifeYears: 12, location: 'Common areas', conditionNotes: 'LED retrofit 60% complete', recommendedAction: 'repair', deficiencyDescription: 'Parking garage lighting inadequate', deficiencySeverity: 'minor', priorityLevel: '3' },
    ]
  },
  {
    name: "Retail Podium",
    assetCode: "ASSET-FD-003",
    description: "3-story retail podium connecting both towers",
    yearBuilt: 2005,
    squareFootage: 85000,
    numberOfFloors: 3,
    numberOfUnits: 25,
    occupancyType: "occupied",
    ownershipType: "private",
    constructionType: "Concrete Frame",
    primaryUse: "Retail",
    secondaryUse: "Food Court",
    replacementValue: 28000000, // $28M
    insuranceValue: 25000000,
    annualMaintenanceCost: 680000,
    status: "active",
    overallCondition: "fair",
    address: "100 Financial District Way, Toronto, Ontario M5X 1A1",
    latitude: 43.6483,
    longitude: -79.3810,
    assessments: [
      { componentId: 'FRAME', conditionRating: '3', estimatedRepairCost: 180000, remainingLifeYears: 15, location: 'Food court area', conditionNotes: 'Heavy wear in food court area', recommendedAction: 'repair', deficiencyDescription: 'Floor tile damage in seating area', deficiencySeverity: 'minor', priorityLevel: '3' },
      { componentId: 'EXTWALL', conditionRating: '3', estimatedRepairCost: 95000, remainingLifeYears: 20, location: 'Storefronts', conditionNotes: 'Storefront systems need resealing', recommendedAction: 'repair', deficiencyDescription: null, deficiencySeverity: null, priorityLevel: '3' },
      { componentId: 'WIN', conditionRating: '3', estimatedRepairCost: 120000, remainingLifeYears: 18, location: 'Street level', conditionNotes: 'Some scratched glazing at street level', recommendedAction: 'repair', deficiencyDescription: null, deficiencySeverity: null, priorityLevel: '3' },
      { componentId: 'INTFIN', conditionRating: '3', estimatedRepairCost: 85000, remainingLifeYears: 12, location: 'Tenant spaces', conditionNotes: 'Tenant demising walls need updates', recommendedAction: 'repair', deficiencyDescription: 'Fire separation gaps at demising walls', deficiencySeverity: 'critical', priorityLevel: '1' },
      { componentId: 'PLUMBFIX', conditionRating: '3', estimatedRepairCost: 65000, remainingLifeYears: 10, location: 'Food court', conditionNotes: 'Food court fixtures heavily used', recommendedAction: 'replace', deficiencyDescription: null, deficiencySeverity: null, priorityLevel: '3' },
      { componentId: 'HVACDIST', conditionRating: '3', estimatedRepairCost: 145000, remainingLifeYears: 12, location: 'Kitchen areas', conditionNotes: 'Kitchen exhaust systems need attention', recommendedAction: 'repair', deficiencyDescription: '3 kitchen exhaust fans below capacity', deficiencySeverity: 'moderate', priorityLevel: '2' },
      { componentId: 'LIGHT', conditionRating: '4', estimatedRepairCost: 220000, remainingLifeYears: 3, location: 'All retail areas', conditionNotes: 'Original T12 fixtures, very inefficient', recommendedAction: 'immediate_action', deficiencyDescription: 'T12 fluorescent throughout, 40% higher energy costs', deficiencySeverity: 'major', priorityLevel: '1' },
    ]
  },
  {
    name: "Parking Structure",
    assetCode: "ASSET-FD-004",
    description: "6-level underground parking with 800 spaces",
    yearBuilt: 2005,
    squareFootage: 240000,
    numberOfFloors: 6,
    numberOfUnits: 800,
    occupancyType: "occupied",
    ownershipType: "private",
    constructionType: "Cast-in-Place Concrete",
    primaryUse: "Parking",
    secondaryUse: "Storage",
    replacementValue: 42000000, // $42M
    insuranceValue: 38000000,
    annualMaintenanceCost: 520000,
    status: "active",
    overallCondition: "poor",
    address: "100 Financial District Way, Toronto, Ontario M5X 1A1",
    latitude: 43.6484,
    longitude: -79.3811,
    assessments: [
      { componentId: 'FOUND', conditionRating: '3', estimatedRepairCost: 180000, remainingLifeYears: 35, location: 'Foundation', conditionNotes: 'Minor settlement cracks, monitoring in place', recommendedAction: 'monitor', deficiencyDescription: null, deficiencySeverity: null, priorityLevel: '3' },
      { componentId: 'FRAME', conditionRating: '4', estimatedRepairCost: 1850000, remainingLifeYears: 8, location: 'All levels', conditionNotes: 'Significant concrete deterioration from salt exposure', recommendedAction: 'immediate_action', deficiencyDescription: 'Extensive spalling on P1 ceiling, rebar exposed', deficiencySeverity: 'critical', priorityLevel: '1' },
      { componentId: 'ROOFSTR', conditionRating: '4', estimatedRepairCost: 680000, remainingLifeYears: 5, location: 'Plaza deck', conditionNotes: 'Plaza deck waterproofing failing', recommendedAction: 'immediate_action', deficiencyDescription: 'Water infiltration at plaza deck', deficiencySeverity: 'critical', priorityLevel: '1' },
      { componentId: 'PLUMBFIX', conditionRating: '3', estimatedRepairCost: 35000, remainingLifeYears: 15, location: 'Floor drains', conditionNotes: 'Floor drains functional', recommendedAction: 'preventive_maintenance', deficiencyDescription: null, deficiencySeverity: null, priorityLevel: '4' },
      { componentId: 'ELECDIST', conditionRating: '3', estimatedRepairCost: 85000, remainingLifeYears: 20, location: 'Electrical rooms', conditionNotes: 'Adequate capacity', recommendedAction: 'monitor', deficiencyDescription: null, deficiencySeverity: null, priorityLevel: '4' },
      { componentId: 'LIGHT', conditionRating: '3', estimatedRepairCost: 165000, remainingLifeYears: 8, location: 'All levels', conditionNotes: 'HID fixtures, high energy use', recommendedAction: 'replace', deficiencyDescription: '25% of garage lighting non-functional', deficiencySeverity: 'moderate', priorityLevel: '2' },
      { componentId: 'SITEPAVE', conditionRating: '4', estimatedRepairCost: 320000, remainingLifeYears: 5, location: 'Drive aisles', conditionNotes: 'Surface deterioration throughout', recommendedAction: 'immediate_action', deficiencyDescription: '15 potholes creating vehicle hazard', deficiencySeverity: 'major', priorityLevel: '1' },
    ]
  },
  {
    name: "Central Plant",
    assetCode: "ASSET-FD-005",
    description: "Central utility plant serving entire complex",
    yearBuilt: 2005,
    squareFootage: 15000,
    numberOfFloors: 2,
    numberOfUnits: 1,
    occupancyType: "occupied",
    ownershipType: "private",
    constructionType: "Concrete Block",
    primaryUse: "Mechanical",
    secondaryUse: "Electrical",
    replacementValue: 35000000, // $35M (high value equipment)
    insuranceValue: 32000000,
    annualMaintenanceCost: 850000,
    status: "active",
    overallCondition: "fair",
    address: "100 Financial District Way, Toronto, Ontario M5X 1A1",
    latitude: 43.6482,
    longitude: -79.3808,
    assessments: [
      { componentId: 'FOUND', conditionRating: '2', estimatedRepairCost: 25000, remainingLifeYears: 50, location: 'Foundation', conditionNotes: 'No issues observed', recommendedAction: 'monitor', deficiencyDescription: null, deficiencySeverity: null, priorityLevel: '5' },
      { componentId: 'FRAME', conditionRating: '2', estimatedRepairCost: 35000, remainingLifeYears: 40, location: 'Building structure', conditionNotes: 'Industrial flooring in good condition', recommendedAction: 'monitor', deficiencyDescription: null, deficiencySeverity: null, priorityLevel: '5' },
      { componentId: 'HVACEQ', conditionRating: '4', estimatedRepairCost: 1250000, remainingLifeYears: 8, location: 'Chiller room', conditionNotes: '2 of 4 chillers approaching end of life', recommendedAction: 'immediate_action', deficiencyDescription: 'Chiller #1 compressor failed, unit offline', deficiencySeverity: 'critical', priorityLevel: '1' },
      { componentId: 'HVACDIST', conditionRating: '3', estimatedRepairCost: 380000, remainingLifeYears: 12, location: 'Boiler room', conditionNotes: 'Boilers functional but inefficient', recommendedAction: 'replace', deficiencyDescription: 'Chiller #2 operating at 65% efficiency', deficiencySeverity: 'major', priorityLevel: '2' },
      { componentId: 'ELECDIST', conditionRating: '2', estimatedRepairCost: 150000, remainingLifeYears: 25, location: 'Main distribution', conditionNotes: 'Main distribution in good condition', recommendedAction: 'preventive_maintenance', deficiencyDescription: null, deficiencySeverity: null, priorityLevel: '4' },
      { componentId: 'FIRESUPP', conditionRating: '3', estimatedRepairCost: 280000, remainingLifeYears: 10, location: 'Generator room', conditionNotes: 'Generators functional, controls dated', recommendedAction: 'repair', deficiencyDescription: 'Outdated generator controls causing transfer delays', deficiencySeverity: 'moderate', priorityLevel: '2' },
      { componentId: 'PLUMBPIPE', conditionRating: '3', estimatedRepairCost: 420000, remainingLifeYears: 10, location: 'Pump room', conditionNotes: 'Pumps and VFDs showing wear', recommendedAction: 'replace', deficiencyDescription: 'Excessive vibration on primary pump #2', deficiencySeverity: 'moderate', priorityLevel: '2' },
    ]
  }
];

async function seedFinancialDemo() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('🚀 Starting Financial Metrics Demo Seeding...\n');
    
    // Get the owner user ID (first admin user)
    const [users] = await connection.execute(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );
    
    if (!users || users.length === 0) {
      console.error('❌ No admin user found. Please create an admin user first.');
      process.exit(1);
    }
    
    const userId = users[0].id;
    console.log(`✅ Using admin user ID: ${userId}`);
    
    // Create the demo project
    console.log('\n📁 Creating demo project...');
    const projectNumber = `FIN-DEMO-${Date.now()}`;
    const [projectResult] = await connection.execute(
      `INSERT INTO projects (
        userId, name, address, clientName, propertyType, constructionType,
        yearBuilt, numberOfUnits, numberOfStories, status,
        streetNumber, streetAddress, city, province, postalCode,
        latitude, longitude, designLife, holdingDepartment,
        propertyManager, managerEmail, managerPhone, facilityType,
        occupancyStatus, criticalityLevel, municipalityId, projectNumber, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        userId, demoProject.name, demoProject.address, demoProject.clientName,
        demoProject.propertyType, demoProject.constructionType, demoProject.yearBuilt,
        demoProject.numberOfUnits, demoProject.numberOfStories, demoProject.status,
        demoProject.streetNumber, demoProject.streetAddress, demoProject.city,
        demoProject.province, demoProject.postalCode, demoProject.latitude,
        demoProject.longitude, demoProject.designLife, demoProject.holdingDepartment,
        demoProject.propertyManager, demoProject.managerEmail, demoProject.managerPhone,
        demoProject.facilityType, demoProject.occupancyStatus, demoProject.criticalityLevel,
        1, projectNumber
      ]
    );
    
    const projectId = projectResult.insertId;
    console.log(`✅ Created project: ${demoProject.name} (ID: ${projectId})`);
    
    // Track totals for summary
    let totalAssets = 0;
    let totalAssessments = 0;
    let totalDeficiencies = 0;
    let totalRepairCost = 0;
    let totalReplacementValue = 0;
    
    // Create assets with assessments
    for (const asset of demoAssets) {
      console.log(`\n🏢 Creating asset: ${asset.name}...`);
      
      const [assetResult] = await connection.execute(
        `INSERT INTO assets (
          projectId, name, assetCode, description, yearBuilt, squareFootage,
          numberOfFloors, numberOfUnits, occupancyType, ownershipType,
          constructionType, primaryUse, secondaryUse, replacementValue,
          insuranceValue, annualMaintenanceCost, status, overallCondition,
          address, latitude, longitude, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          projectId, asset.name, asset.assetCode, asset.description,
          asset.yearBuilt, asset.squareFootage, asset.numberOfFloors,
          asset.numberOfUnits, asset.occupancyType, asset.ownershipType,
          asset.constructionType, asset.primaryUse, asset.secondaryUse,
          asset.replacementValue, asset.insuranceValue, asset.annualMaintenanceCost,
          asset.status, asset.overallCondition, asset.address,
          asset.latitude, asset.longitude
        ]
      );
      
      const assetId = assetResult.insertId;
      totalAssets++;
      totalReplacementValue += asset.replacementValue;
      console.log(`  ✅ Asset created (ID: ${assetId})`);
      
      // Create assessments for this asset
      console.log(`  📋 Creating ${asset.assessments.length} assessments...`);
      for (const assessment of asset.assessments) {
        const componentId = componentMap[assessment.componentId];
        if (!componentId) {
          console.log(`    ⚠️ Skipping unknown component: ${assessment.componentId}`);
          continue;
        }
        
        await connection.execute(
          `INSERT INTO assessments (
            assetId, componentId, assessorId, assessmentDate, conditionRating,
            conditionNotes, deficiencyDescription, deficiencySeverity,
            recommendedAction, estimatedRepairCost, priorityLevel,
            remainingLifeYears, location, status, createdAt, updatedAt
          ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', NOW(), NOW())`,
          [
            assetId, componentId, userId, assessment.conditionRating,
            assessment.conditionNotes, assessment.deficiencyDescription,
            assessment.deficiencySeverity, assessment.recommendedAction,
            assessment.estimatedRepairCost, assessment.priorityLevel,
            assessment.remainingLifeYears, assessment.location
          ]
        );
        totalAssessments++;
        totalRepairCost += assessment.estimatedRepairCost || 0;
        
        // Count deficiencies (assessments with deficiency info)
        if (assessment.deficiencyDescription) {
          totalDeficiencies++;
        }
      }
      console.log(`  ✅ ${asset.assessments.length} assessments created`);
    }
    
    // Calculate and update project-level FCI
    const fci = totalReplacementValue > 0 
      ? (totalRepairCost / totalReplacementValue) * 100 
      : 0;
    
    await connection.execute(
      `UPDATE projects SET 
        deferredMaintenanceCost = ?,
        currentReplacementValue = ?,
        fci = ?,
        lastCalculatedAt = NOW()
      WHERE id = ?`,
      [totalRepairCost, totalReplacementValue, fci.toFixed(4), projectId]
    );
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINANCIAL METRICS DEMO SUMMARY');
    console.log('='.repeat(60));
    console.log(`Project ID: ${projectId}`);
    console.log(`Project Number: ${projectNumber}`);
    console.log(`Project Name: ${demoProject.name}`);
    console.log(`Total Assets: ${totalAssets}`);
    console.log(`Total Assessments: ${totalAssessments}`);
    console.log(`Total Deficiencies: ${totalDeficiencies}`);
    console.log(`Total Deferred Maintenance: $${totalRepairCost.toLocaleString()}`);
    console.log(`Total Replacement Value: $${totalReplacementValue.toLocaleString()}`);
    console.log(`Portfolio FCI: ${fci.toFixed(2)}%`);
    console.log('='.repeat(60));
    console.log('\n✅ Financial Metrics Demo seeding completed successfully!');
    console.log(`\n🔗 View the project at: /projects/${projectId}`);
    
  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run the seeder
seedFinancialDemo().catch(console.error);
