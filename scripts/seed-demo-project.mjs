/**
 * Demo Project Seed Script
 * Creates a comprehensive demo project with 10 diverse assets to showcase all BCA features
 * 
 * Run with: node scripts/seed-demo-project.mjs
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in environment');
  process.exit(1);
}

// Parse the DATABASE_URL
const url = new URL(DATABASE_URL);
const config = {
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true }
};

async function seedDemoProject() {
  const connection = await mysql.createConnection(config);
  
  try {
    console.log('🚀 Starting demo project seed...\n');
    
    // Get admin user (first user with admin role)
    const [users] = await connection.execute(
      'SELECT id FROM users WHERE role = "admin" LIMIT 1'
    );
    
    if (users.length === 0) {
      console.error('No admin user found. Please create an admin user first.');
      process.exit(1);
    }
    
    const adminUserId = users[0].id;
    console.log(`Using admin user ID: ${adminUserId}`);
    
    // Generate unique project ID
    const projectUniqueId = `PROJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-DEMO`;
    
    // Create the demo project
    const [projectResult] = await connection.execute(
      `INSERT INTO projects (
        uniqueId, userId, name, address, clientName, propertyType, constructionType,
        yearBuilt, numberOfUnits, numberOfStories, status, 
        streetNumber, streetAddress, city, postalCode, province,
        latitude, longitude, holdingDepartment, propertyManager, managerEmail, managerPhone,
        facilityType, occupancyStatus, criticalityLevel, designLife
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectUniqueId,
        adminUserId,
        'City of Vancouver Municipal Complex',
        '453 West 12th Avenue, Vancouver, BC V5Y 1V4',
        'City of Vancouver',
        'Municipal/Government',
        'Mixed (Concrete/Steel/Wood)',
        1985,
        10,
        6,
        'in_progress',
        '453',
        'West 12th Avenue',
        'Vancouver',
        'V5Y 1V4',
        'British Columbia',
        49.2612,
        -123.1139,
        'Facilities Management',
        'Sarah Chen',
        'sarah.chen@vancouver.ca',
        '604-555-0123',
        'Government Office',
        'occupied',
        'critical',
        75
      ]
    );
    
    const projectId = projectResult.insertId;
    console.log(`✅ Created project: City of Vancouver Municipal Complex (ID: ${projectId})`);
    
    // Define 10 diverse assets
    const assets = [
      {
        name: 'City Hall Main Building',
        description: 'Primary administrative building housing council chambers, mayor\'s office, and main public services. Heritage-designated structure with significant architectural value.',
        assetType: 'Office Building',
        yearBuilt: 1936,
        grossFloorArea: 45000,
        numberOfStories: 4,
        constructionType: 'Reinforced Concrete',
        currentReplacementValue: 125000000,
        streetNumber: '453',
        streetAddress: 'West 12th Avenue',
        city: 'Vancouver',
        postalCode: 'V5Y 1V4',
        province: 'British Columbia',
        latitude: 49.2612,
        longitude: -123.1139
      },
      {
        name: 'Public Works Maintenance Facility',
        description: 'Industrial facility for city vehicle maintenance, equipment storage, and public works operations. Includes vehicle bays, workshops, and hazardous material storage.',
        assetType: 'Industrial/Maintenance',
        yearBuilt: 1978,
        grossFloorArea: 28000,
        numberOfStories: 2,
        constructionType: 'Steel Frame',
        currentReplacementValue: 35000000,
        streetNumber: '1100',
        streetAddress: 'Terminal Avenue',
        city: 'Vancouver',
        postalCode: 'V6A 4G1',
        province: 'British Columbia',
        latitude: 49.2738,
        longitude: -123.0892
      },
      {
        name: 'Community Recreation Centre',
        description: 'Multi-purpose recreation facility with swimming pool, gymnasium, fitness center, and community meeting rooms. High public usage facility.',
        assetType: 'Recreation',
        yearBuilt: 1992,
        grossFloorArea: 52000,
        numberOfStories: 2,
        constructionType: 'Concrete/Steel',
        currentReplacementValue: 85000000,
        streetNumber: '2901',
        streetAddress: 'Commercial Drive',
        city: 'Vancouver',
        postalCode: 'V5N 4C8',
        province: 'British Columbia',
        latitude: 49.2589,
        longitude: -123.0695
      },
      {
        name: 'Central Fire Station #1',
        description: 'Primary fire station serving downtown core. Houses emergency vehicles, living quarters, training facilities, and emergency operations center.',
        assetType: 'Emergency Services',
        yearBuilt: 2005,
        grossFloorArea: 18500,
        numberOfStories: 3,
        constructionType: 'Concrete',
        currentReplacementValue: 42000000,
        streetNumber: '900',
        streetAddress: 'Heatley Avenue',
        city: 'Vancouver',
        postalCode: 'V6A 3S7',
        province: 'British Columbia',
        latitude: 49.2805,
        longitude: -123.0875
      },
      {
        name: 'Main Branch Library',
        description: 'Central public library with extensive collections, reading rooms, computer labs, and community programming spaces. Architecturally significant building.',
        assetType: 'Library/Cultural',
        yearBuilt: 1995,
        grossFloorArea: 38000,
        numberOfStories: 7,
        constructionType: 'Reinforced Concrete',
        currentReplacementValue: 95000000,
        streetNumber: '350',
        streetAddress: 'West Georgia Street',
        city: 'Vancouver',
        postalCode: 'V6B 6B1',
        province: 'British Columbia',
        latitude: 49.2796,
        longitude: -123.1156
      },
      {
        name: 'Underground Parkade - City Centre',
        description: 'Multi-level underground parking structure serving city hall and adjacent facilities. Includes EV charging stations and bicycle storage.',
        assetType: 'Parking Structure',
        yearBuilt: 1988,
        grossFloorArea: 65000,
        numberOfStories: 4,
        constructionType: 'Post-Tensioned Concrete',
        currentReplacementValue: 28000000,
        streetNumber: '455',
        streetAddress: 'West 12th Avenue',
        city: 'Vancouver',
        postalCode: 'V5Y 1V4',
        province: 'British Columbia',
        latitude: 49.2610,
        longitude: -123.1142
      },
      {
        name: 'Water Treatment Plant - East',
        description: 'Critical infrastructure facility for water treatment and distribution. Includes chemical storage, filtration systems, and control room.',
        assetType: 'Utility/Infrastructure',
        yearBuilt: 1972,
        grossFloorArea: 12000,
        numberOfStories: 1,
        constructionType: 'Concrete',
        currentReplacementValue: 180000000,
        streetNumber: '4500',
        streetAddress: 'Boundary Road',
        city: 'Vancouver',
        postalCode: 'V5R 2N8',
        province: 'British Columbia',
        latitude: 49.2445,
        longitude: -123.0234
      },
      {
        name: 'Senior Citizens Centre',
        description: 'Community facility providing programs and services for seniors. Includes dining hall, activity rooms, health services, and accessible design throughout.',
        assetType: 'Community Services',
        yearBuilt: 1985,
        grossFloorArea: 8500,
        numberOfStories: 1,
        constructionType: 'Wood Frame',
        currentReplacementValue: 12000000,
        streetNumber: '2120',
        streetAddress: 'East Hastings Street',
        city: 'Vancouver',
        postalCode: 'V5L 1T9',
        province: 'British Columbia',
        latitude: 49.2815,
        longitude: -123.0612
      },
      {
        name: 'Police Substation - West End',
        description: 'Neighborhood police facility with holding cells, interview rooms, evidence storage, and community liaison offices.',
        assetType: 'Emergency Services',
        yearBuilt: 2010,
        grossFloorArea: 6200,
        numberOfStories: 2,
        constructionType: 'Concrete/Steel',
        currentReplacementValue: 18000000,
        streetNumber: '1234',
        streetAddress: 'Davie Street',
        city: 'Vancouver',
        postalCode: 'V6E 1N4',
        province: 'British Columbia',
        latitude: 49.2862,
        longitude: -123.1298
      },
      {
        name: 'Parks Operations Depot',
        description: 'Facility for parks maintenance equipment, nursery operations, and seasonal storage. Includes greenhouses, workshops, and staff facilities.',
        assetType: 'Industrial/Maintenance',
        yearBuilt: 1968,
        grossFloorArea: 15000,
        numberOfStories: 1,
        constructionType: 'Steel Frame/Wood',
        currentReplacementValue: 8500000,
        streetNumber: '3800',
        streetAddress: 'Oak Street',
        city: 'Vancouver',
        postalCode: 'V6H 2M5',
        province: 'British Columbia',
        latitude: 49.2512,
        longitude: -123.1278
      }
    ];
    
    // Insert assets
    const assetIds = [];
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const assetUniqueId = `ASSET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`;
      
      const [assetResult] = await connection.execute(
        `INSERT INTO assets (
          uniqueId, projectId, name, description, assetType, yearBuilt, grossFloorArea,
          numberOfStories, constructionType, currentReplacementValue, status,
          streetNumber, streetAddress, city, postalCode, province, latitude, longitude
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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
          'active',
          asset.streetNumber,
          asset.streetAddress,
          asset.city,
          asset.postalCode,
          asset.province,
          asset.latitude,
          asset.longitude
        ]
      );
      
      assetIds.push(assetResult.insertId);
      console.log(`✅ Created asset: ${asset.name} (ID: ${assetResult.insertId})`);
    }
    
    // UNIFORMAT II Components for assessments
    const uniformatComponents = [
      { code: 'A10', name: 'Foundations', level: 2 },
      { code: 'A1010', name: 'Standard Foundations', level: 3 },
      { code: 'A1020', name: 'Special Foundations', level: 3 },
      { code: 'A20', name: 'Basement Construction', level: 2 },
      { code: 'B10', name: 'Superstructure', level: 2 },
      { code: 'B1010', name: 'Floor Construction', level: 3 },
      { code: 'B1020', name: 'Roof Construction', level: 3 },
      { code: 'B20', name: 'Exterior Enclosure', level: 2 },
      { code: 'B2010', name: 'Exterior Walls', level: 3 },
      { code: 'B2020', name: 'Exterior Windows', level: 3 },
      { code: 'B2030', name: 'Exterior Doors', level: 3 },
      { code: 'B30', name: 'Roofing', level: 2 },
      { code: 'B3010', name: 'Roof Coverings', level: 3 },
      { code: 'B3020', name: 'Roof Openings', level: 3 },
      { code: 'C10', name: 'Interior Construction', level: 2 },
      { code: 'C1010', name: 'Partitions', level: 3 },
      { code: 'C1020', name: 'Interior Doors', level: 3 },
      { code: 'C1030', name: 'Fittings', level: 3 },
      { code: 'C20', name: 'Stairs', level: 2 },
      { code: 'C30', name: 'Interior Finishes', level: 2 },
      { code: 'C3010', name: 'Wall Finishes', level: 3 },
      { code: 'C3020', name: 'Floor Finishes', level: 3 },
      { code: 'C3030', name: 'Ceiling Finishes', level: 3 },
      { code: 'D10', name: 'Conveying', level: 2 },
      { code: 'D1010', name: 'Elevators & Lifts', level: 3 },
      { code: 'D20', name: 'Plumbing', level: 2 },
      { code: 'D2010', name: 'Plumbing Fixtures', level: 3 },
      { code: 'D2020', name: 'Domestic Water Distribution', level: 3 },
      { code: 'D2030', name: 'Sanitary Waste', level: 3 },
      { code: 'D2040', name: 'Rain Water Drainage', level: 3 },
      { code: 'D30', name: 'HVAC', level: 2 },
      { code: 'D3010', name: 'Energy Supply', level: 3 },
      { code: 'D3020', name: 'Heat Generating Systems', level: 3 },
      { code: 'D3030', name: 'Cooling Generating Systems', level: 3 },
      { code: 'D3040', name: 'Distribution Systems', level: 3 },
      { code: 'D3050', name: 'Terminal & Package Units', level: 3 },
      { code: 'D3060', name: 'Controls & Instrumentation', level: 3 },
      { code: 'D40', name: 'Fire Protection', level: 2 },
      { code: 'D4010', name: 'Sprinklers', level: 3 },
      { code: 'D4020', name: 'Standpipes', level: 3 },
      { code: 'D4030', name: 'Fire Protection Specialties', level: 3 },
      { code: 'D50', name: 'Electrical', level: 2 },
      { code: 'D5010', name: 'Electrical Service & Distribution', level: 3 },
      { code: 'D5020', name: 'Lighting & Branch Wiring', level: 3 },
      { code: 'D5030', name: 'Communications & Security', level: 3 },
      { code: 'E10', name: 'Equipment', level: 2 },
      { code: 'E1010', name: 'Commercial Equipment', level: 3 },
      { code: 'E1090', name: 'Other Equipment', level: 3 },
      { code: 'E20', name: 'Furnishings', level: 2 },
      { code: 'F10', name: 'Special Construction', level: 2 },
      { code: 'G10', name: 'Site Preparation', level: 2 },
      { code: 'G20', name: 'Site Improvements', level: 2 },
      { code: 'G2010', name: 'Roadways', level: 3 },
      { code: 'G2020', name: 'Parking Lots', level: 3 },
      { code: 'G2030', name: 'Pedestrian Paving', level: 3 },
      { code: 'G2040', name: 'Site Development', level: 3 },
      { code: 'G2050', name: 'Landscaping', level: 3 },
      { code: 'G30', name: 'Site Mechanical Utilities', level: 2 },
      { code: 'G40', name: 'Site Electrical Utilities', level: 2 }
    ];
    
    // Create assessments for each asset with varying conditions
    const conditions = ['good', 'fair', 'poor', 'not_assessed'];
    const assessmentStatuses = ['initial', 'active', 'completed'];
    
    console.log('\n📋 Creating assessments for each asset...\n');
    
    for (let assetIndex = 0; assetIndex < assetIds.length; assetIndex++) {
      const assetId = assetIds[assetIndex];
      const assetName = assets[assetIndex].name;
      const assetAge = 2024 - assets[assetIndex].yearBuilt;
      
      // Select components based on asset type
      let selectedComponents;
      
      if (assets[assetIndex].assetType === 'Parking Structure') {
        // Parking structures have specific components
        selectedComponents = uniformatComponents.filter(c => 
          ['A10', 'A1010', 'B10', 'B1010', 'B20', 'B2010', 'D20', 'D2040', 'D40', 'D4010', 'D50', 'D5010', 'D5020', 'G20', 'G2020'].includes(c.code)
        );
      } else if (assets[assetIndex].assetType === 'Utility/Infrastructure') {
        // Utility facilities have specialized components
        selectedComponents = uniformatComponents.filter(c => 
          ['A10', 'A1010', 'B10', 'B20', 'B30', 'D20', 'D2010', 'D2020', 'D30', 'D3010', 'D3020', 'D3060', 'D40', 'D50', 'D5010', 'E10', 'E1010', 'G30'].includes(c.code)
        );
      } else {
        // Standard buildings get a broader set of components
        selectedComponents = uniformatComponents.filter(c => c.level === 3).slice(0, 20);
      }
      
      // Add some level 2 components
      const level2Components = uniformatComponents.filter(c => c.level === 2).slice(0, 5);
      selectedComponents = [...selectedComponents, ...level2Components];
      
      let assessmentCount = 0;
      
      for (const component of selectedComponents) {
        // Determine condition based on asset age and component type
        let condition;
        let conditionScore;
        let remainingLife;
        let expectedLife;
        let estimatedRepairCost;
        let replacementValue;
        
        // Older assets have worse conditions
        const ageModifier = Math.min(assetAge / 50, 1); // 0 to 1 based on age
        const randomFactor = Math.random();
        
        // Mechanical/electrical components deteriorate faster
        const isMechanicalElectrical = component.code.startsWith('D');
        const deteriorationRate = isMechanicalElectrical ? 1.3 : 1.0;
        
        const conditionValue = randomFactor * (1 - ageModifier * deteriorationRate * 0.5);
        
        if (conditionValue > 0.7) {
          condition = 'good';
          conditionScore = Math.floor(80 + Math.random() * 20);
          remainingLife = Math.floor(15 + Math.random() * 15);
          expectedLife = Math.floor(25 + Math.random() * 25);
          estimatedRepairCost = Math.floor(Math.random() * 10000);
        } else if (conditionValue > 0.4) {
          condition = 'fair';
          conditionScore = Math.floor(50 + Math.random() * 30);
          remainingLife = Math.floor(5 + Math.random() * 15);
          expectedLife = Math.floor(20 + Math.random() * 20);
          estimatedRepairCost = Math.floor(10000 + Math.random() * 50000);
        } else if (conditionValue > 0.15) {
          condition = 'poor';
          conditionScore = Math.floor(20 + Math.random() * 30);
          remainingLife = Math.floor(1 + Math.random() * 5);
          expectedLife = Math.floor(15 + Math.random() * 15);
          estimatedRepairCost = Math.floor(50000 + Math.random() * 200000);
        } else {
          condition = 'not_assessed';
          conditionScore = null;
          remainingLife = null;
          expectedLife = null;
          estimatedRepairCost = 0;
        }
        
        // Calculate replacement value based on component and building size
        const baseReplacementValue = assets[assetIndex].grossFloorArea * (isMechanicalElectrical ? 50 : 30);
        replacementValue = Math.floor(baseReplacementValue * (0.5 + Math.random() * 0.5));
        
        // Generate observations
        const observations = generateObservations(component.name, condition, assetAge);
        const recommendations = generateRecommendations(component.name, condition);
        
        // Calculate CI and FCI scores
        const ciScore = conditionScore || 50;
        const fciScore = estimatedRepairCost > 0 && replacementValue > 0 
          ? Math.min(Math.round((estimatedRepairCost / replacementValue) * 10000), 10000)
          : 0;
        
        await connection.execute(
          `INSERT INTO assessments (
            projectId, assetId, componentCode, componentName, condition, conditionScore,
            observations, recommendations, remainingUsefulLife, expectedUsefulLife,
            estimatedRepairCost, replacementValue, ciScore, fciScore, status,
            assessedAt, reviewYear, actionYear
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
          [
            projectId,
            assetId,
            component.code,
            component.name,
            condition,
            conditionScore,
            observations,
            recommendations,
            remainingLife,
            expectedLife,
            estimatedRepairCost,
            replacementValue,
            ciScore,
            fciScore,
            assessmentStatuses[Math.floor(Math.random() * assessmentStatuses.length)],
            2024,
            remainingLife ? 2024 + remainingLife : null
          ]
        );
        
        assessmentCount++;
      }
      
      console.log(`  ✅ Created ${assessmentCount} assessments for ${assetName}`);
    }
    
    // Create deficiencies for assets with poor conditions
    console.log('\n🔧 Creating deficiencies...\n');
    
    const deficiencyTemplates = [
      {
        title: 'Structural Cracking',
        description: 'Visible cracks observed in concrete elements requiring structural assessment and repair.',
        severity: 'high',
        priority: 'short_term',
        recommendedAction: 'Engage structural engineer for assessment. Implement crack repair program.',
        componentCode: 'A10'
      },
      {
        title: 'Roof Membrane Deterioration',
        description: 'Roof membrane showing signs of aging with multiple areas of ponding water and potential leak points.',
        severity: 'medium',
        priority: 'short_term',
        recommendedAction: 'Schedule roof replacement within 2-3 years. Implement temporary repairs for leak areas.',
        componentCode: 'B3010'
      },
      {
        title: 'HVAC System End of Life',
        description: 'Heating and cooling equipment has exceeded expected service life. Frequent breakdowns and inefficient operation.',
        severity: 'high',
        priority: 'immediate',
        recommendedAction: 'Plan for complete HVAC system replacement. Budget for phased replacement approach.',
        componentCode: 'D30'
      },
      {
        title: 'Electrical Panel Obsolescence',
        description: 'Main electrical panels are outdated and do not meet current code requirements. Replacement parts difficult to source.',
        severity: 'critical',
        priority: 'immediate',
        recommendedAction: 'Immediate electrical system upgrade required. Engage electrical engineer for design.',
        componentCode: 'D5010'
      },
      {
        title: 'Window Seal Failure',
        description: 'Multiple window units showing seal failure with condensation between panes and air infiltration.',
        severity: 'medium',
        priority: 'medium_term',
        recommendedAction: 'Develop window replacement program. Prioritize units with worst seal failure.',
        componentCode: 'B2020'
      },
      {
        title: 'Fire Suppression System Deficiency',
        description: 'Sprinkler system requires upgrades to meet current fire code. Some heads are painted over or obstructed.',
        severity: 'critical',
        priority: 'immediate',
        recommendedAction: 'Immediate fire suppression system inspection and remediation required.',
        componentCode: 'D4010'
      },
      {
        title: 'Elevator Modernization Required',
        description: 'Elevator equipment is obsolete with increasing maintenance costs and reliability issues.',
        severity: 'high',
        priority: 'short_term',
        recommendedAction: 'Plan elevator modernization project. Consider full replacement vs. component upgrades.',
        componentCode: 'D1010'
      },
      {
        title: 'Parking Structure Concrete Spalling',
        description: 'Concrete spalling observed on multiple levels with exposed reinforcing steel showing corrosion.',
        severity: 'high',
        priority: 'short_term',
        recommendedAction: 'Engage structural engineer for condition survey. Implement concrete repair program.',
        componentCode: 'B1010'
      },
      {
        title: 'Accessibility Compliance Gap',
        description: 'Building does not meet current accessibility standards. Barriers identified at entrances and washrooms.',
        severity: 'medium',
        priority: 'medium_term',
        recommendedAction: 'Develop accessibility improvement plan. Prioritize main entrance and public areas.',
        componentCode: 'C10'
      },
      {
        title: 'Plumbing System Corrosion',
        description: 'Galvanized piping showing significant corrosion with reduced water flow and water quality concerns.',
        severity: 'medium',
        priority: 'short_term',
        recommendedAction: 'Plan phased pipe replacement program. Start with most corroded sections.',
        componentCode: 'D2020'
      }
    ];
    
    let deficiencyCount = 0;
    
    for (let i = 0; i < assetIds.length; i++) {
      const assetId = assetIds[i];
      const assetAge = 2024 - assets[i].yearBuilt;
      
      // Older assets get more deficiencies
      const numDeficiencies = Math.min(Math.floor(assetAge / 10) + 1, 5);
      
      // Select random deficiencies for this asset
      const shuffled = [...deficiencyTemplates].sort(() => 0.5 - Math.random());
      const selectedDeficiencies = shuffled.slice(0, numDeficiencies);
      
      for (const deficiency of selectedDeficiencies) {
        const estimatedCost = Math.floor(25000 + Math.random() * 475000);
        
        await connection.execute(
          `INSERT INTO deficiencies (
            projectId, componentCode, title, description, location, severity, priority,
            recommendedAction, estimatedCost, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            projectId,
            deficiency.componentCode,
            deficiency.title,
            deficiency.description,
            assets[i].name,
            deficiency.severity,
            deficiency.priority,
            deficiency.recommendedAction,
            estimatedCost,
            'open'
          ]
        );
        
        deficiencyCount++;
      }
      
      console.log(`  ✅ Created ${numDeficiencies} deficiencies for ${assets[i].name}`);
    }
    
    // Update project with calculated values
    const [assessmentStats] = await connection.execute(
      `SELECT 
        COUNT(*) as totalAssessments,
        SUM(estimatedRepairCost) as totalDeferredMaintenance,
        SUM(replacementValue) as totalReplacementValue,
        AVG(ciScore) as avgCiScore
      FROM assessments WHERE projectId = ?`,
      [projectId]
    );
    
    const stats = assessmentStats[0];
    const fci = stats.totalReplacementValue > 0 
      ? (stats.totalDeferredMaintenance / stats.totalReplacementValue)
      : 0;
    
    await connection.execute(
      `UPDATE projects SET 
        ci = ?,
        fci = ?,
        deferredMaintenanceCost = ?,
        currentReplacementValue = ?,
        lastCalculatedAt = NOW(),
        overallConditionScore = ?
      WHERE id = ?`,
      [
        Math.round(stats.avgCiScore || 50),
        fci.toFixed(4),
        stats.totalDeferredMaintenance || 0,
        stats.totalReplacementValue || 0,
        Math.round(stats.avgCiScore || 50),
        projectId
      ]
    );
    
    console.log('\n📊 Summary:');
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Unique ID: ${projectUniqueId}`);
    console.log(`   Assets: ${assetIds.length}`);
    console.log(`   Total Assessments: ${stats.totalAssessments}`);
    console.log(`   Total Deficiencies: ${deficiencyCount}`);
    console.log(`   Deferred Maintenance: $${Number(stats.totalDeferredMaintenance || 0).toLocaleString()}`);
    console.log(`   Replacement Value: $${Number(stats.totalReplacementValue || 0).toLocaleString()}`);
    console.log(`   FCI: ${(fci * 100).toFixed(2)}%`);
    console.log(`   Average CI Score: ${Math.round(stats.avgCiScore || 50)}`);
    
    console.log('\n✅ Demo project seed completed successfully!');
    
  } catch (error) {
    console.error('Error seeding demo project:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

function generateObservations(componentName, condition, assetAge) {
  const observations = {
    good: [
      `${componentName} is in good condition with normal wear for age.`,
      `No significant deficiencies observed. Regular maintenance being performed.`,
      `Component is functioning as designed with expected remaining service life.`
    ],
    fair: [
      `${componentName} shows moderate wear consistent with ${assetAge} years of service.`,
      `Some deterioration observed but component remains functional.`,
      `Minor repairs recommended to extend service life.`
    ],
    poor: [
      `${componentName} exhibits significant deterioration requiring attention.`,
      `Multiple deficiencies observed affecting performance and reliability.`,
      `Component approaching end of useful life. Replacement planning recommended.`
    ],
    not_assessed: [
      `${componentName} was not accessible for assessment during site visit.`,
      `Further investigation required to determine condition.`
    ]
  };
  
  const templates = observations[condition] || observations.not_assessed;
  return templates.join(' ');
}

function generateRecommendations(componentName, condition) {
  const recommendations = {
    good: [
      'Continue routine maintenance program.',
      'Monitor condition annually.',
      'No immediate action required.'
    ],
    fair: [
      'Increase inspection frequency.',
      'Budget for repairs within 3-5 years.',
      'Address minor deficiencies to prevent further deterioration.'
    ],
    poor: [
      'Prioritize for replacement in capital plan.',
      'Implement interim repairs to maintain safety.',
      'Engage specialist consultant for detailed assessment.'
    ],
    not_assessed: [
      'Schedule follow-up inspection.',
      'Provide access for complete assessment.'
    ]
  };
  
  const templates = recommendations[condition] || recommendations.not_assessed;
  return templates.join(' ');
}

// Run the seed
seedDemoProject().catch(console.error);
