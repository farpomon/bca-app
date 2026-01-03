/**
 * Seed Script: City of Edmonton Mock-up Project
 * Creates a comprehensive demo project with 20 municipal assets
 * Includes various asset types, conditions, costs, and ESG readings
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

async function seed() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    console.log('🏙️ Starting City of Edmonton mock-up project seed...\n');

    // Get the owner user ID (first admin user)
    const [users] = await connection.execute(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    );
    
    let userId = 1;
    if (users.length > 0) {
      userId = users[0].id;
    }
    console.log(`Using user ID: ${userId}`);

    // Check if Edmonton municipality exists, get existing or use existing
    let municipalityId;
    const [existingMunicipality] = await connection.execute(
      `SELECT id FROM municipalities WHERE name LIKE '%Edmonton%' LIMIT 1`
    );
    
    if (existingMunicipality.length > 0) {
      municipalityId = existingMunicipality[0].id;
      console.log(`Found existing Edmonton municipality (ID: ${municipalityId})`);
    } else {
      // Use first available municipality
      const [firstMunicipality] = await connection.execute(
        `SELECT id, name FROM municipalities LIMIT 1`
      );
      if (firstMunicipality.length > 0) {
        municipalityId = firstMunicipality[0].id;
        console.log(`Using municipality: ${firstMunicipality[0].name} (ID: ${municipalityId})`);
      } else {
        throw new Error('No municipalities found in database');
      }
    }

    // Generate unique project number
    const projectNumber = `COE-${Date.now().toString().slice(-8)}`;

    // Create the main project
    const projectData = {
      uniqueId: `COE-BCA-${Date.now()}`,
      userId: userId,
      municipalityId: municipalityId,
      projectNumber: projectNumber,
      name: 'City of Edmonton - Municipal Building Portfolio',
      address: 'Edmonton, Alberta, Canada',
      clientName: 'City of Edmonton',
      propertyType: 'Municipal Portfolio',
      constructionType: 'Mixed',
      yearBuilt: 1970,
      numberOfUnits: 20,
      numberOfStories: null,
      status: 'in_progress',
      overallConditionScore: 68,
      overallConditionRating: 'Fair',
      ci: 68.50,
      fci: 0.1850,
      deferredMaintenanceCost: 45750000.00,
      currentReplacementValue: 247500000.00,
      designLife: 50,
      holdingDepartment: 'Integrated Infrastructure Services',
      propertyManager: 'Sarah Mitchell',
      managerEmail: 'sarah.mitchell@edmonton.ca',
      managerPhone: '780-496-8200',
      facilityType: 'Municipal Portfolio',
      occupancyStatus: 'occupied',
      criticalityLevel: 'critical',
      company: 'City of Edmonton',
      streetAddress: '1 Sir Winston Churchill Square',
      city: 'Edmonton',
      postalCode: 'T5J 2R7',
      province: 'Alberta',
      latitude: 53.5461,
      longitude: -113.4938
    };

    const [projectResult] = await connection.execute(
      `INSERT INTO projects (uniqueId, userId, municipalityId, projectNumber, name, address, clientName, propertyType, constructionType, 
        yearBuilt, numberOfUnits, status, overallConditionScore, overallConditionRating, ci, fci,
        deferredMaintenanceCost, currentReplacementValue, designLife, holdingDepartment, propertyManager,
        managerEmail, managerPhone, facilityType, occupancyStatus, criticalityLevel, company,
        streetAddress, city, postalCode, province, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectData.uniqueId, projectData.userId, projectData.municipalityId, projectData.projectNumber,
        projectData.name, projectData.address,
        projectData.clientName, projectData.propertyType, projectData.constructionType,
        projectData.yearBuilt, projectData.numberOfUnits, projectData.status,
        projectData.overallConditionScore, projectData.overallConditionRating, projectData.ci, projectData.fci,
        projectData.deferredMaintenanceCost, projectData.currentReplacementValue, projectData.designLife,
        projectData.holdingDepartment, projectData.propertyManager, projectData.managerEmail,
        projectData.managerPhone, projectData.facilityType, projectData.occupancyStatus,
        projectData.criticalityLevel, projectData.company, projectData.streetAddress,
        projectData.city, projectData.postalCode, projectData.province, projectData.latitude, projectData.longitude
      ]
    );

    const projectId = projectResult.insertId;
    console.log(`✅ Created project: ${projectData.name} (ID: ${projectId})\n`);

    // Define 20 Edmonton municipal assets
    const assets = [
      {
        name: 'Commonwealth Recreation Centre',
        assetCode: 'COE-REC-001',
        description: 'Major multi-sport recreation facility with aquatic centre, fitness areas, and ice rinks. One of Edmonton\'s flagship recreation facilities serving the southeast community.',
        address: '11000 Stadium Road NW, Edmonton, AB T5H 4E2',
        latitude: 53.5577,
        longitude: -113.4652,
        yearBuilt: 2014,
        squareFootage: 430000,
        numberOfFloors: 3,
        occupancyType: 'occupied',
        ownershipType: 'municipal',
        constructionType: 'Steel Frame with Concrete',
        primaryUse: 'Recreation Centre',
        replacementValue: 150000000,
        insuranceValue: 145000000,
        annualMaintenanceCost: 2800000,
        overallCondition: 'excellent',
        fciScore: 0.0350
      },
      {
        name: 'Stanley A. Milner Library',
        assetCode: 'COE-LIB-001',
        description: 'Edmonton\'s main downtown library branch, recently renovated with modern amenities, maker spaces, and community programming areas.',
        address: '7 Sir Winston Churchill Square, Edmonton, AB T5J 2V4',
        latitude: 53.5448,
        longitude: -113.4900,
        yearBuilt: 1967,
        yearRenovated: 2020,
        squareFootage: 185000,
        numberOfFloors: 6,
        occupancyType: 'occupied',
        ownershipType: 'municipal',
        constructionType: 'Reinforced Concrete',
        primaryUse: 'Library',
        replacementValue: 95000000,
        insuranceValue: 90000000,
        annualMaintenanceCost: 1200000,
        overallCondition: 'good',
        fciScore: 0.0850
      },
      {
        name: 'Fire Station No. 1',
        assetCode: 'COE-FIRE-001',
        description: 'Downtown fire station serving the central business district. Houses ladder truck, pumper, and rescue units with 24/7 staffing.',
        address: '10322 83 Avenue NW, Edmonton, AB T6E 2C6',
        latitude: 53.5189,
        longitude: -113.4950,
        yearBuilt: 1954,
        yearRenovated: 2008,
        squareFootage: 18500,
        numberOfFloors: 2,
        occupancyType: 'occupied',
        ownershipType: 'municipal',
        constructionType: 'Masonry',
        primaryUse: 'Fire Station',
        replacementValue: 12500000,
        insuranceValue: 12000000,
        annualMaintenanceCost: 185000,
        overallCondition: 'fair',
        fciScore: 0.2150
      },
      {
        name: 'Clareview Recreation Centre',
        assetCode: 'COE-REC-002',
        description: 'Community recreation centre with swimming pool, gymnasium, fitness centre, and multi-purpose rooms serving northeast Edmonton.',
        address: '3804 139 Avenue NW, Edmonton, AB T5Y 3J5',
        latitude: 53.6183,
        longitude: -113.4567,
        yearBuilt: 2009,
        squareFootage: 165000,
        numberOfFloors: 2,
        occupancyType: 'occupied',
        ownershipType: 'municipal',
        constructionType: 'Steel Frame',
        primaryUse: 'Recreation Centre',
        replacementValue: 75000000,
        insuranceValue: 72000000,
        annualMaintenanceCost: 1100000,
        overallCondition: 'good',
        fciScore: 0.0950
      },
      {
        name: 'E.L. Smith Water Treatment Plant',
        assetCode: 'COE-WTP-001',
        description: 'Major water treatment facility providing potable water to Edmonton. Critical infrastructure with advanced filtration and treatment systems.',
        address: '17303 Ellerslie Road SW, Edmonton, AB T6W 1A2',
        latitude: 53.4283,
        longitude: -113.5567,
        yearBuilt: 1976,
        yearRenovated: 2015,
        squareFootage: 125000,
        numberOfFloors: 3,
        occupancyType: 'occupied',
        ownershipType: 'municipal',
        constructionType: 'Reinforced Concrete',
        primaryUse: 'Water Treatment',
        replacementValue: 285000000,
        insuranceValue: 275000000,
        annualMaintenanceCost: 4500000,
        overallCondition: 'good',
        fciScore: 0.1250
      },
      {
        name: 'LRT Maintenance Facility - D.L. MacDonald',
        assetCode: 'COE-TRN-001',
        description: 'Primary maintenance and storage facility for Edmonton\'s Light Rail Transit fleet. Includes heavy repair bays, parts storage, and administrative offices.',
        address: '12310 129 Avenue NW, Edmonton, AB T5L 3H1',
        latitude: 53.5789,
        longitude: -113.5234,
        yearBuilt: 1978,
        yearRenovated: 2012,
        squareFootage: 220000,
        numberOfFloors: 2,
        occupancyType: 'occupied',
        ownershipType: 'municipal',
        constructionType: 'Steel Frame',
        primaryUse: 'Transit Maintenance',
        replacementValue: 95000000,
        insuranceValue: 90000000,
        annualMaintenanceCost: 1800000,
        overallCondition: 'fair',
        fciScore: 0.1850
      },
      {
        name: 'City Hall',
        assetCode: 'COE-ADM-001',
        description: 'Edmonton\'s municipal government headquarters housing City Council chambers, administrative offices, and public service areas.',
        address: '1 Sir Winston Churchill Square, Edmonton, AB T5J 2R7',
        latitude: 53.5461,
        longitude: -113.4938,
        yearBuilt: 1992,
        squareFootage: 420000,
        numberOfFloors: 7,
        occupancyType: 'occupied',
        ownershipType: 'municipal',
        constructionType: 'Steel Frame with Glass Curtain Wall',
        primaryUse: 'Administrative',
        replacementValue: 185000000,
        insuranceValue: 180000000,
        annualMaintenanceCost: 3200000,
        overallCondition: 'good',
        fciScore: 0.1150
      },
      {
        name: 'Terwillegar Community Recreation Centre',
        assetCode: 'COE-REC-003',
        description: 'Modern recreation facility with aquatic centre, fitness areas, library branch, and community spaces serving southwest Edmonton.',
        address: '2051 Leger Road NW, Edmonton, AB T6R 0R9',
        latitude: 53.4667,
        longitude: -113.5833,
        yearBuilt: 2011,
        squareFootage: 195000,
        numberOfFloors: 2,
        occupancyType: 'occupied',
        ownershipType: 'municipal',
        constructionType: 'Steel Frame',
        primaryUse: 'Recreation Centre',
        replacementValue: 85000000,
        insuranceValue: 82000000,
        annualMaintenanceCost: 1350000,
        overallCondition: 'good',
        fciScore: 0.0750
      },
      {
        name: 'Coronation Community Hall',
        assetCode: 'COE-COM-001',
        description: 'Historic community hall providing event space, meeting rooms, and community programming. Designated municipal historic resource.',
        address: '13500 112 Avenue NW, Edmonton, AB T5M 2V5',
        latitude: 53.5567,
        longitude: -113.5567,
        yearBuilt: 1953,
        yearRenovated: 1995,
        squareFootage: 12500,
        numberOfFloors: 1,
        occupancyType: 'occupied',
        ownershipType: 'municipal',
        constructionType: 'Wood Frame with Masonry',
        primaryUse: 'Community Hall',
        replacementValue: 4500000,
        insuranceValue: 4200000,
        annualMaintenanceCost: 95000,
        overallCondition: 'poor',
        fciScore: 0.3250
      },
      {
        name: 'Gold Bar Wastewater Treatment Plant',
        assetCode: 'COE-WWT-001',
        description: 'Primary wastewater treatment facility for Edmonton. Processes municipal sewage with advanced biological treatment and biogas recovery.',
        address: '9640 63 Avenue NW, Edmonton, AB T6E 0G5',
        latitude: 53.5183,
        longitude: -113.4267,
        yearBuilt: 1956,
        yearRenovated: 2018,
        squareFootage: 185000,
        numberOfFloors: 4,
        occupancyType: 'occupied',
        ownershipType: 'municipal',
        constructionType: 'Reinforced Concrete',
        primaryUse: 'Wastewater Treatment',
        replacementValue: 425000000,
        insuranceValue: 400000000,
        annualMaintenanceCost: 6500000,
        overallCondition: 'fair',
        fciScore: 0.1950
      },
      {
        name: 'Kinsmen Sports Centre',
        assetCode: 'COE-REC-004',
        description: 'Multi-purpose sports facility with fieldhouse, aquatic centre, and fitness areas. Home to various community sports programs.',
        address: '9100 Walterdale Hill NW, Edmonton, AB T6E 2V3',
        latitude: 53.5217,
        longitude: -113.5083,
        yearBuilt: 1968,
        yearRenovated: 2005,
        squareFootage: 145000,
        numberOfFloors: 2,
        occupancyType: 'occupied',
        ownershipType: 'municipal',
        constructionType: 'Steel Frame with Concrete',
        primaryUse: 'Recreation Centre',
        replacementValue: 65000000,
        insuranceValue: 62000000,
        annualMaintenanceCost: 1450000,
        overallCondition: 'fair',
        fciScore: 0.2450
      },
      {
        name: 'Fire Station No. 24',
        assetCode: 'COE-FIRE-024',
        description: 'Modern fire station serving the Windermere area in southwest Edmonton. LEED certified building with sustainable design features.',
        address: '1315 Windermere Way SW, Edmonton, AB T6W 2P3',
        latitude: 53.4367,
        longitude: -113.5917,
        yearBuilt: 2018,
        squareFootage: 14500,
        numberOfFloors: 2,
        occupancyType: 'occupied',
        ownershipType: 'municipal',
        constructionType: 'Steel Frame',
        primaryUse: 'Fire Station',
        replacementValue: 11000000,
        insuranceValue: 10500000,
        annualMaintenanceCost: 125000,
        overallCondition: 'excellent',
        fciScore: 0.0250
      },
      {
        name: 'Londonderry Library',
        assetCode: 'COE-LIB-002',
        description: 'Branch library serving north Edmonton with collections, programming space, and computer access for the community.',
        address: '110 Londonderry Mall, Edmonton, AB T5C 3C8',
        latitude: 53.5983,
        longitude: -113.4633,
        yearBuilt: 1972,
        yearRenovated: 2010,
        squareFootage: 18000,
        numberOfFloors: 1,
        occupancyType: 'occupied',
        ownershipType: 'municipal',
        constructionType: 'Steel Frame',
        primaryUse: 'Library',
        replacementValue: 8500000,
        insuranceValue: 8000000,
        annualMaintenanceCost: 145000,
        overallCondition: 'fair',
        fciScore: 0.1850
      },
      {
        name: 'Downtown Parkade',
        assetCode: 'COE-PRK-001',
        description: 'Multi-level parking structure in downtown Edmonton providing public parking for City Hall and surrounding area.',
        address: '102 Street & 102 Avenue, Edmonton, AB T5J 0E1',
        latitude: 53.5450,
        longitude: -113.4925,
        yearBuilt: 1985,
        squareFootage: 285000,
        numberOfFloors: 6,
        numberOfUnits: 850,
        occupancyType: 'occupied',
        ownershipType: 'municipal',
        constructionType: 'Reinforced Concrete',
        primaryUse: 'Parking Structure',
        replacementValue: 42000000,
        insuranceValue: 40000000,
        annualMaintenanceCost: 650000,
        overallCondition: 'poor',
        fciScore: 0.2850
      },
      {
        name: 'Parks Operations Centre - South',
        assetCode: 'COE-OPS-001',
        description: 'Parks maintenance facility with equipment storage, workshops, and administrative space for south district operations.',
        address: '4715 101 Street NW, Edmonton, AB T6E 5C2',
        latitude: 53.5067,
        longitude: -113.4950,
        yearBuilt: 1965,
        yearRenovated: 2000,
        squareFootage: 35000,
        numberOfFloors: 1,
        occupancyType: 'occupied',
        ownershipType: 'municipal',
        constructionType: 'Steel Frame with Metal Siding',
        primaryUse: 'Operations Centre',
        replacementValue: 12000000,
        insuranceValue: 11500000,
        annualMaintenanceCost: 225000,
        overallCondition: 'poor',
        fciScore: 0.3150
      },
      {
        name: 'Muttart Conservatory',
        assetCode: 'COE-CUL-001',
        description: 'Iconic botanical facility featuring four glass pyramids housing plant collections from different climate zones. Major tourist attraction.',
        address: '9626 96A Street NW, Edmonton, AB T6C 4L8',
        latitude: 53.5317,
        longitude: -113.4717,
        yearBuilt: 1976,
        yearRenovated: 2009,
        squareFootage: 48000,
        numberOfFloors: 2,
        occupancyType: 'occupied',
        ownershipType: 'municipal',
        constructionType: 'Steel Frame with Glass',
        primaryUse: 'Cultural Facility',
        replacementValue: 55000000,
        insuranceValue: 52000000,
        annualMaintenanceCost: 850000,
        overallCondition: 'good',
        fciScore: 0.1350
      },
      {
        name: 'Valley Zoo',
        assetCode: 'COE-CUL-002',
        description: 'Edmonton\'s zoo facility with animal exhibits, education centre, and event spaces. Undergoing phased renewal program.',
        address: '13315 Buena Vista Road, Edmonton, AB T5J 4P8',
        latitude: 53.5233,
        longitude: -113.5617,
        yearBuilt: 1959,
        yearRenovated: 2016,
        squareFootage: 95000,
        numberOfFloors: 2,
        occupancyType: 'occupied',
        ownershipType: 'municipal',
        constructionType: 'Mixed',
        primaryUse: 'Cultural Facility',
        replacementValue: 78000000,
        insuranceValue: 75000000,
        annualMaintenanceCost: 1650000,
        overallCondition: 'fair',
        fciScore: 0.2250
      },
      {
        name: 'Century Place',
        assetCode: 'COE-ADM-002',
        description: 'Administrative office building housing various City departments. Located in downtown Edmonton.',
        address: '9803 102A Avenue NW, Edmonton, AB T5J 3A3',
        latitude: 53.5467,
        longitude: -113.4967,
        yearBuilt: 1977,
        yearRenovated: 2012,
        squareFootage: 165000,
        numberOfFloors: 12,
        occupancyType: 'occupied',
        ownershipType: 'municipal',
        constructionType: 'Reinforced Concrete',
        primaryUse: 'Administrative',
        replacementValue: 72000000,
        insuranceValue: 68000000,
        annualMaintenanceCost: 1250000,
        overallCondition: 'fair',
        fciScore: 0.1750
      },
      {
        name: 'Mill Woods Recreation Centre',
        assetCode: 'COE-REC-005',
        description: 'Community recreation facility with pool, fitness centre, and multi-purpose spaces serving southeast Edmonton.',
        address: '7207 28 Avenue NW, Edmonton, AB T6K 2N1',
        latitude: 53.4583,
        longitude: -113.4433,
        yearBuilt: 1983,
        yearRenovated: 2008,
        squareFootage: 85000,
        numberOfFloors: 2,
        occupancyType: 'occupied',
        ownershipType: 'municipal',
        constructionType: 'Steel Frame',
        primaryUse: 'Recreation Centre',
        replacementValue: 38000000,
        insuranceValue: 36000000,
        annualMaintenanceCost: 725000,
        overallCondition: 'fair',
        fciScore: 0.2050
      },
      {
        name: 'Rossdale Power Plant (Heritage)',
        assetCode: 'COE-HER-001',
        description: 'Decommissioned historic power plant undergoing adaptive reuse planning. Designated Provincial Historic Resource with significant heritage value.',
        address: '9540 Rossdale Road NW, Edmonton, AB T5J 3N1',
        latitude: 53.5350,
        longitude: -113.4883,
        yearBuilt: 1931,
        squareFootage: 125000,
        numberOfFloors: 4,
        occupancyType: 'vacant',
        ownershipType: 'municipal',
        constructionType: 'Reinforced Concrete with Masonry',
        primaryUse: 'Heritage Building',
        replacementValue: 95000000,
        insuranceValue: 90000000,
        annualMaintenanceCost: 450000,
        overallCondition: 'critical',
        fciScore: 0.4250
      }
    ];

    // Insert assets
    console.log('📦 Creating 20 municipal assets...\n');
    const assetIds = [];

    for (const asset of assets) {
      const [assetResult] = await connection.execute(
        `INSERT INTO assets (projectId, name, assetCode, description, address, latitude, longitude,
          yearBuilt, yearRenovated, squareFootage, numberOfFloors, numberOfUnits, occupancyType,
          ownershipType, constructionType, primaryUse, replacementValue, insuranceValue,
          annualMaintenanceCost, overallCondition, fciScore, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          projectId, asset.name, asset.assetCode, asset.description, asset.address,
          asset.latitude, asset.longitude, asset.yearBuilt, asset.yearRenovated || null,
          asset.squareFootage, asset.numberOfFloors, asset.numberOfUnits || null,
          asset.occupancyType, asset.ownershipType, asset.constructionType, asset.primaryUse,
          asset.replacementValue, asset.insuranceValue, asset.annualMaintenanceCost,
          asset.overallCondition, asset.fciScore
        ]
      );
      
      assetIds.push({ id: assetResult.insertId, ...asset });
      console.log(`  ✓ ${asset.name} (${asset.overallCondition})`);
    }

    console.log('\n📊 Creating ESG scores at project level...\n');

    // ESG Scores at project level (matching actual table structure)
    const esgScores = [
      { energyScore: 78, waterScore: 82, wasteScore: 76, emissionsScore: 74, benchmarkPercentile: 72, notes: 'Portfolio-wide ESG assessment for City of Edmonton municipal buildings' },
    ];

    for (const esg of esgScores) {
      const compositeScore = (esg.energyScore + esg.waterScore + esg.wasteScore + esg.emissionsScore) / 4;
      await connection.execute(
        `INSERT INTO esg_scores (projectId, scoreDate, energyScore, waterScore, wasteScore,
          emissionsScore, compositeScore, benchmarkPercentile, notes)
        VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId, esg.energyScore, esg.waterScore, esg.wasteScore,
          esg.emissionsScore, compositeScore, esg.benchmarkPercentile, esg.notes
        ]
      );
      console.log(`  ✓ Project ESG Score: Energy ${esg.energyScore}, Water ${esg.waterScore}, Waste ${esg.wasteScore}, Emissions ${esg.emissionsScore}`);
    }

    // Create some deficiencies for assets in poor/critical condition
    console.log('\n⚠️ Creating deficiencies for assets needing attention...\n');

    const deficiencies = [
      { assetIndex: 8, title: 'Roof Membrane Deterioration', severity: 'high', priority: 'short_term', cost: 185000, component: 'B30' },
      { assetIndex: 8, title: 'HVAC System End of Life', severity: 'critical', priority: 'immediate', cost: 125000, component: 'D30' },
      { assetIndex: 13, title: 'Concrete Spalling - Parking Deck', severity: 'high', priority: 'short_term', cost: 450000, component: 'A10' },
      { assetIndex: 13, title: 'Waterproofing Failure', severity: 'medium', priority: 'medium_term', cost: 280000, component: 'B20' },
      { assetIndex: 14, title: 'Structural Steel Corrosion', severity: 'medium', priority: 'short_term', cost: 95000, component: 'B10' },
      { assetIndex: 14, title: 'Electrical Panel Upgrade Required', severity: 'high', priority: 'immediate', cost: 75000, component: 'D50' },
      { assetIndex: 19, title: 'Masonry Deterioration - Exterior Walls', severity: 'critical', priority: 'immediate', cost: 2500000, component: 'B20' },
      { assetIndex: 19, title: 'Window System Failure', severity: 'high', priority: 'short_term', cost: 850000, component: 'B20' },
      { assetIndex: 19, title: 'Structural Assessment Required', severity: 'critical', priority: 'immediate', cost: 150000, component: 'A10' },
      { assetIndex: 2, title: 'Bay Door Mechanism Wear', severity: 'medium', priority: 'medium_term', cost: 45000, component: 'B20' },
      { assetIndex: 10, title: 'Pool Deck Resurfacing', severity: 'medium', priority: 'short_term', cost: 125000, component: 'C10' },
      { assetIndex: 16, title: 'Animal Enclosure Fencing', severity: 'medium', priority: 'medium_term', cost: 185000, component: 'G20' },
    ];

    for (const def of deficiencies) {
      const asset = assetIds[def.assetIndex];
      await connection.execute(
        `INSERT INTO deficiencies (projectId, componentCode, title, description, severity, priority,
          estimatedCost, status, location)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
        [
          projectId, def.component, def.title,
          `${def.title} identified during building condition assessment. Requires attention to maintain facility operations.`,
          def.severity, def.priority, def.cost, asset.name
        ]
      );
      console.log(`  ✓ ${def.title} at ${asset.name}`);
    }

    // Create sustainability goals
    console.log('\n🎯 Creating sustainability goals...\n');

    const goals = [
      { type: 'carbon_reduction', baseline: 15000, target: 10500, baseYear: 2020, targetYear: 2030, unit: 'tonnes CO2e' },
      { type: 'energy_reduction', baseline: 125000000, target: 100000000, baseYear: 2020, targetYear: 2030, unit: 'kWh' },
      { type: 'water_reduction', baseline: 850000, target: 680000, baseYear: 2020, targetYear: 2030, unit: 'm³' },
      { type: 'waste_reduction', baseline: 2500, target: 1500, baseYear: 2020, targetYear: 2030, unit: 'tonnes' },
      { type: 'renewable_energy', baseline: 15, target: 50, baseYear: 2020, targetYear: 2035, unit: 'percent' },
    ];

    for (const goal of goals) {
      await connection.execute(
        `INSERT INTO sustainability_goals (projectId, goalType, baselineValue, baselineYear,
          targetValue, targetYear, unit, status, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
        [
          projectId, goal.type, goal.baseline, goal.baseYear, goal.target, goal.targetYear,
          goal.unit, `City of Edmonton ${goal.type.replace(/_/g, ' ')} goal: ${goal.baseline} ${goal.unit} to ${goal.target} ${goal.unit} by ${goal.targetYear}`
        ]
      );
      console.log(`  ✓ ${goal.type}: ${goal.baseline} → ${goal.target} ${goal.unit}`);
    }

    // Create operational carbon tracking entries
    console.log('\n🌡️ Creating operational carbon tracking data...\n');

    const carbonData = [
      { month: '2025-01', scope1: 850.5, scope2: 2150.8, scope3: 425.2, electricity: 4500000, gas: 125000 },
      { month: '2025-02', scope1: 920.3, scope2: 2350.5, scope3: 445.8, electricity: 4800000, gas: 145000 },
      { month: '2025-03', scope1: 780.2, scope2: 1950.2, scope3: 398.5, electricity: 4200000, gas: 105000 },
      { month: '2025-04', scope1: 650.8, scope2: 1650.5, scope3: 352.2, electricity: 3800000, gas: 85000 },
      { month: '2025-05', scope1: 520.5, scope2: 1450.2, scope3: 315.8, electricity: 3500000, gas: 65000 },
      { month: '2025-06', scope1: 480.2, scope2: 1850.8, scope3: 298.5, electricity: 4100000, gas: 55000 },
    ];

    for (const data of carbonData) {
      const total = data.scope1 + data.scope2 + data.scope3;
      await connection.execute(
        `INSERT INTO operational_carbon_tracking (projectId, recordDate, recordPeriod,
          scope1Total, scope2Total, scope3Total, totalEmissions, electricityKwh, naturalGasM3,
          scope2Method, notes)
        VALUES (?, ?, 'monthly', ?, ?, ?, ?, ?, ?, 'location_based', ?)`,
        [
          projectId, `${data.month}-01`, data.scope1, data.scope2, data.scope3, total,
          data.electricity, data.gas, `Monthly carbon tracking for ${data.month}`
        ]
      );
      console.log(`  ✓ Carbon data for ${data.month}: ${total.toFixed(1)} tCO2e`);
    }

    // Calculate and display summary statistics
    const totalReplacementValue = assets.reduce((sum, a) => sum + a.replacementValue, 0);
    const totalAnnualMaintenance = assets.reduce((sum, a) => sum + a.annualMaintenanceCost, 0);
    const totalSquareFootage = assets.reduce((sum, a) => sum + a.squareFootage, 0);
    const avgFci = assets.reduce((sum, a) => sum + a.fciScore, 0) / assets.length;

    console.log('\n✨ Seed completed successfully!\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    CITY OF EDMONTON                           ');
    console.log('              Municipal Building Portfolio                     ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n📋 Project Summary:`);
    console.log(`   • Project Name: ${projectData.name}`);
    console.log(`   • Project ID: ${projectId}`);
    console.log(`   • Project Number: ${projectNumber}`);
    console.log(`   • Municipality ID: ${municipalityId}`);
    
    console.log(`\n🏢 Asset Portfolio:`);
    console.log(`   • Total Assets: 20 municipal facilities`);
    console.log(`   • Total Square Footage: ${totalSquareFootage.toLocaleString()} sq ft`);
    console.log(`   • Total Replacement Value: $${(totalReplacementValue / 1000000).toFixed(1)}M`);
    console.log(`   • Annual Maintenance Budget: $${(totalAnnualMaintenance / 1000000).toFixed(1)}M`);
    console.log(`   • Average FCI Score: ${(avgFci * 100).toFixed(1)}%`);
    
    console.log(`\n📊 Condition Distribution:`);
    console.log(`   • Excellent: ${assets.filter(a => a.overallCondition === 'excellent').length} assets`);
    console.log(`   • Good: ${assets.filter(a => a.overallCondition === 'good').length} assets`);
    console.log(`   • Fair: ${assets.filter(a => a.overallCondition === 'fair').length} assets`);
    console.log(`   • Poor: ${assets.filter(a => a.overallCondition === 'poor').length} assets`);
    console.log(`   • Critical: ${assets.filter(a => a.overallCondition === 'critical').length} assets`);
    
    console.log(`\n🌱 ESG & Sustainability:`);
    console.log(`   • ESG Scores: Project-level assessment`);
    console.log(`   • Sustainability Goals: 5 targets (2030)`);
    console.log(`   • Carbon Tracking: 6 months of data`);
    
    console.log(`\n⚠️ Maintenance Needs:`);
    console.log(`   • Open Deficiencies: 12 items`);
    console.log(`   • Critical Issues: 3 items`);
    console.log(`   • Estimated Repair Costs: $5.07M`);
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🏙️ City of Edmonton mock-up project is ready for demo!');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('Error during seed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seed().catch(console.error);
