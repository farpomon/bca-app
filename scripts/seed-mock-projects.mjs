/**
 * Mock Data Seed Script for BCA App
 * Creates two comprehensive mock projects with 10 and 30 assets each
 * Explores full functionality including assessments, deficiencies, risk assessments, etc.
 */

import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

// Database connection
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

// Parse DATABASE_URL
const dbUrl = new URL(DATABASE_URL);
const connection = await mysql.createConnection({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port) || 3306,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: { rejectUnauthorized: true }
});

console.log('Connected to database');

// Helper functions
function generateUniqueId(prefix) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${date}-${random}`;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomDate(startYear, endYear) {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// Get the owner user ID
async function getOwnerUserId() {
  const [rows] = await connection.execute(
    'SELECT id FROM users WHERE role = ? ORDER BY id LIMIT 1',
    ['admin']
  );
  if (rows.length === 0) {
    // Create a default admin user if none exists
    const [result] = await connection.execute(
      `INSERT INTO users (openId, name, email, role, createdAt, updatedAt, lastSignedIn) 
       VALUES (?, ?, ?, ?, NOW(), NOW(), NOW())`,
      ['mock-admin-user', 'Mock Admin', 'admin@bcaapp.com', 'admin']
    );
    return result.insertId;
  }
  return rows[0].id;
}

// UNIFORMAT II Component Codes
const componentCodes = [
  { code: 'A10', name: 'Foundations', level: 1 },
  { code: 'A1010', name: 'Standard Foundations', level: 2, parent: 'A10' },
  { code: 'A1020', name: 'Special Foundations', level: 2, parent: 'A10' },
  { code: 'A20', name: 'Basement Construction', level: 1 },
  { code: 'A2010', name: 'Basement Excavation', level: 2, parent: 'A20' },
  { code: 'A2020', name: 'Basement Walls', level: 2, parent: 'A20' },
  { code: 'B10', name: 'Superstructure', level: 1 },
  { code: 'B1010', name: 'Floor Construction', level: 2, parent: 'B10' },
  { code: 'B1020', name: 'Roof Construction', level: 2, parent: 'B10' },
  { code: 'B20', name: 'Exterior Enclosure', level: 1 },
  { code: 'B2010', name: 'Exterior Walls', level: 2, parent: 'B20' },
  { code: 'B2020', name: 'Exterior Windows', level: 2, parent: 'B20' },
  { code: 'B2030', name: 'Exterior Doors', level: 2, parent: 'B20' },
  { code: 'B30', name: 'Roofing', level: 1 },
  { code: 'B3010', name: 'Roof Coverings', level: 2, parent: 'B30' },
  { code: 'B3020', name: 'Roof Openings', level: 2, parent: 'B30' },
  { code: 'C10', name: 'Interior Construction', level: 1 },
  { code: 'C1010', name: 'Partitions', level: 2, parent: 'C10' },
  { code: 'C1020', name: 'Interior Doors', level: 2, parent: 'C10' },
  { code: 'C1030', name: 'Fittings', level: 2, parent: 'C10' },
  { code: 'C20', name: 'Stairs', level: 1 },
  { code: 'C2010', name: 'Stair Construction', level: 2, parent: 'C20' },
  { code: 'C2020', name: 'Stair Finishes', level: 2, parent: 'C20' },
  { code: 'C30', name: 'Interior Finishes', level: 1 },
  { code: 'C3010', name: 'Wall Finishes', level: 2, parent: 'C30' },
  { code: 'C3020', name: 'Floor Finishes', level: 2, parent: 'C30' },
  { code: 'C3030', name: 'Ceiling Finishes', level: 2, parent: 'C30' },
  { code: 'D10', name: 'Conveying', level: 1 },
  { code: 'D1010', name: 'Elevators & Lifts', level: 2, parent: 'D10' },
  { code: 'D1020', name: 'Escalators & Moving Walks', level: 2, parent: 'D10' },
  { code: 'D20', name: 'Plumbing', level: 1 },
  { code: 'D2010', name: 'Plumbing Fixtures', level: 2, parent: 'D20' },
  { code: 'D2020', name: 'Domestic Water Distribution', level: 2, parent: 'D20' },
  { code: 'D2030', name: 'Sanitary Waste', level: 2, parent: 'D20' },
  { code: 'D2040', name: 'Rain Water Drainage', level: 2, parent: 'D20' },
  { code: 'D30', name: 'HVAC', level: 1 },
  { code: 'D3010', name: 'Energy Supply', level: 2, parent: 'D30' },
  { code: 'D3020', name: 'Heat Generating Systems', level: 2, parent: 'D30' },
  { code: 'D3030', name: 'Cooling Generating Systems', level: 2, parent: 'D30' },
  { code: 'D3040', name: 'Distribution Systems', level: 2, parent: 'D30' },
  { code: 'D3050', name: 'Terminal & Package Units', level: 2, parent: 'D30' },
  { code: 'D3060', name: 'Controls & Instrumentation', level: 2, parent: 'D30' },
  { code: 'D40', name: 'Fire Protection', level: 1 },
  { code: 'D4010', name: 'Sprinklers', level: 2, parent: 'D40' },
  { code: 'D4020', name: 'Standpipes', level: 2, parent: 'D40' },
  { code: 'D4030', name: 'Fire Protection Specialties', level: 2, parent: 'D40' },
  { code: 'D50', name: 'Electrical', level: 1 },
  { code: 'D5010', name: 'Electrical Service & Distribution', level: 2, parent: 'D50' },
  { code: 'D5020', name: 'Lighting & Branch Wiring', level: 2, parent: 'D50' },
  { code: 'D5030', name: 'Communications & Security', level: 2, parent: 'D50' },
  { code: 'E10', name: 'Equipment', level: 1 },
  { code: 'E1010', name: 'Commercial Equipment', level: 2, parent: 'E10' },
  { code: 'E1020', name: 'Institutional Equipment', level: 2, parent: 'E10' },
  { code: 'E1090', name: 'Other Equipment', level: 2, parent: 'E10' },
  { code: 'F10', name: 'Special Construction', level: 1 },
  { code: 'F1010', name: 'Special Structures', level: 2, parent: 'F10' },
  { code: 'F1020', name: 'Integrated Construction', level: 2, parent: 'F10' },
  { code: 'G10', name: 'Site Preparation', level: 1 },
  { code: 'G1010', name: 'Site Clearing', level: 2, parent: 'G10' },
  { code: 'G1020', name: 'Site Demolition', level: 2, parent: 'G10' },
  { code: 'G20', name: 'Site Improvements', level: 1 },
  { code: 'G2010', name: 'Roadways', level: 2, parent: 'G20' },
  { code: 'G2020', name: 'Parking Lots', level: 2, parent: 'G20' },
  { code: 'G2030', name: 'Pedestrian Paving', level: 2, parent: 'G20' },
  { code: 'G2040', name: 'Site Development', level: 2, parent: 'G20' },
  { code: 'G2050', name: 'Landscaping', level: 2, parent: 'G20' },
  { code: 'G30', name: 'Site Civil/Mechanical Utilities', level: 1 },
  { code: 'G3010', name: 'Water Supply', level: 2, parent: 'G30' },
  { code: 'G3020', name: 'Sanitary Sewer', level: 2, parent: 'G30' },
  { code: 'G3030', name: 'Storm Sewer', level: 2, parent: 'G30' },
  { code: 'G40', name: 'Site Electrical Utilities', level: 1 },
  { code: 'G4010', name: 'Electrical Distribution', level: 2, parent: 'G40' },
  { code: 'G4020', name: 'Site Lighting', level: 2, parent: 'G40' },
  { code: 'G4030', name: 'Site Communications & Security', level: 2, parent: 'G40' },
];

// Canadian cities with coordinates
const canadianCities = [
  { city: 'Toronto', province: 'Ontario', lat: 43.6532, lng: -79.3832 },
  { city: 'Vancouver', province: 'British Columbia', lat: 49.2827, lng: -123.1207 },
  { city: 'Montreal', province: 'Quebec', lat: 45.5017, lng: -73.5673 },
  { city: 'Calgary', province: 'Alberta', lat: 51.0447, lng: -114.0719 },
  { city: 'Edmonton', province: 'Alberta', lat: 53.5461, lng: -113.4938 },
  { city: 'Ottawa', province: 'Ontario', lat: 45.4215, lng: -75.6972 },
  { city: 'Winnipeg', province: 'Manitoba', lat: 49.8951, lng: -97.1384 },
  { city: 'Halifax', province: 'Nova Scotia', lat: 44.6488, lng: -63.5752 },
  { city: 'Victoria', province: 'British Columbia', lat: 48.4284, lng: -123.3656 },
  { city: 'Hamilton', province: 'Ontario', lat: 43.2557, lng: -79.8711 },
  { city: 'Mississauga', province: 'Ontario', lat: 43.5890, lng: -79.6441 },
  { city: 'Brampton', province: 'Ontario', lat: 43.7315, lng: -79.7624 },
  { city: 'Surrey', province: 'British Columbia', lat: 49.1913, lng: -122.8490 },
  { city: 'Quebec City', province: 'Quebec', lat: 46.8139, lng: -71.2080 },
  { city: 'London', province: 'Ontario', lat: 42.9849, lng: -81.2453 },
];

// Building types and construction types
const buildingTypes = [
  'Office Building', 'Retail Center', 'Industrial Warehouse', 'Multi-Family Residential',
  'Educational Facility', 'Healthcare Facility', 'Community Center', 'Recreation Center',
  'Parking Structure', 'Mixed-Use Development', 'Government Building', 'Fire Station',
  'Police Station', 'Library', 'Museum', 'Theater', 'Hotel', 'Restaurant',
  'Data Center', 'Laboratory', 'Manufacturing Plant', 'Distribution Center'
];

const constructionTypes = [
  'Steel Frame', 'Concrete Frame', 'Wood Frame', 'Masonry', 'Pre-Engineered Metal',
  'Reinforced Concrete', 'Post and Beam', 'Tilt-Up Concrete', 'Structural Steel',
  'Light Steel Frame', 'Heavy Timber', 'Composite'
];

const propertyTypes = [
  'Commercial', 'Industrial', 'Residential', 'Institutional', 'Mixed-Use',
  'Government', 'Healthcare', 'Educational', 'Recreational', 'Retail'
];

// Street names for realistic addresses
const streetNames = [
  'Main Street', 'Oak Avenue', 'Maple Drive', 'King Street', 'Queen Street',
  'Bay Street', 'Yonge Street', 'Bloor Street', 'University Avenue', 'College Street',
  'Dundas Street', 'Front Street', 'Wellington Street', 'Richmond Street', 'Adelaide Street',
  'Granville Street', 'Robson Street', 'Hastings Street', 'Broadway', 'Commercial Drive',
  'Rue Sainte-Catherine', 'Boulevard Saint-Laurent', 'Rue Sherbrooke', 'Avenue du Parc',
  'Stephen Avenue', 'Jasper Avenue', 'Whyte Avenue', 'Portage Avenue', 'Spring Garden Road'
];

// Asset name generators
const assetNamePrefixes = [
  'Heritage', 'Central', 'Downtown', 'Riverside', 'Lakeside', 'Parkview', 'Hillside',
  'Westgate', 'Eastgate', 'Northgate', 'Southgate', 'Metro', 'Plaza', 'Tower',
  'Centre', 'Square', 'Gardens', 'Heights', 'Point', 'Station', 'Terminal'
];

// Deficiency titles by component
const deficiencyTitles = {
  'B2010': ['Cracking in exterior masonry', 'Deteriorated mortar joints', 'Spalling brick facade', 'Water infiltration at wall assembly'],
  'B2020': ['Failed window seals', 'Condensation between glass panes', 'Deteriorated window frames', 'Broken window hardware'],
  'B3010': ['Roof membrane deterioration', 'Ponding water on roof', 'Missing flashing', 'Damaged roof insulation'],
  'C3020': ['Worn carpet in high-traffic areas', 'Cracked floor tiles', 'Damaged hardwood flooring', 'Uneven floor surfaces'],
  'D2010': ['Leaking faucets', 'Corroded fixtures', 'Non-functional toilets', 'Damaged sinks'],
  'D3020': ['Inefficient boiler operation', 'Corroded heat exchangers', 'Failed heating controls', 'Inadequate heating capacity'],
  'D3030': ['Refrigerant leaks', 'Compressor failure', 'Condenser coil damage', 'Insufficient cooling capacity'],
  'D4010': ['Corroded sprinkler heads', 'Obstructed sprinkler coverage', 'Failed fire pump', 'Damaged sprinkler piping'],
  'D5010': ['Overloaded electrical panels', 'Outdated wiring', 'Failed circuit breakers', 'Inadequate electrical capacity'],
  'D5020': ['Failed lighting fixtures', 'Inadequate lighting levels', 'Emergency lighting failures', 'Outdated lighting controls'],
  'G2020': ['Cracked parking lot pavement', 'Faded parking lot striping', 'Damaged curbs', 'Poor drainage'],
};

// Observation templates
const observationTemplates = [
  'Component shows signs of age-related deterioration consistent with its {age} year service life.',
  'Visual inspection revealed {condition} condition with {issue}.',
  'System is functioning but showing early signs of wear that will require attention within {years} years.',
  'Component has exceeded its expected useful life and requires immediate attention.',
  'Recent maintenance has extended the useful life of this component.',
  'No significant deficiencies noted during inspection. Component is performing as expected.',
  'Minor cosmetic issues observed that do not affect functionality.',
  'Component requires routine maintenance to maintain current condition.',
];

// Recommendation templates
const recommendationTemplates = [
  'Schedule replacement within the next {years} years as part of capital planning.',
  'Implement preventive maintenance program to extend remaining useful life.',
  'Conduct detailed engineering assessment to determine repair vs. replacement strategy.',
  'Include in next fiscal year budget for replacement.',
  'Monitor condition quarterly and reassess in 12 months.',
  'Repair damaged sections and apply protective coating.',
  'Upgrade to current code requirements during next renovation.',
  'No immediate action required. Continue routine maintenance.',
];

// Create a project
async function createProject(userId, projectData) {
  const uniqueId = generateUniqueId('PROJ');
  const now = formatDate(new Date());
  
  const [result] = await connection.execute(
    `INSERT INTO projects (
      uniqueId, userId, name, address, clientName, propertyType, constructionType,
      yearBuilt, numberOfUnits, numberOfStories, buildingCode, assessmentDate,
      status, createdAt, updatedAt, overallConditionScore, ci, fci,
      currentReplacementValue, deferredMaintenanceCost, designLife,
      holdingDepartment, propertyManager, facilityType, occupancyStatus, criticalityLevel,
      streetNumber, streetAddress, city, postalCode, province, latitude, longitude
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uniqueId,
      userId,
      projectData.name,
      projectData.address,
      projectData.clientName,
      projectData.propertyType,
      projectData.constructionType,
      projectData.yearBuilt,
      projectData.numberOfUnits,
      projectData.numberOfStories,
      projectData.buildingCode,
      now,
      'in_progress',
      now,
      now,
      projectData.conditionScore,
      projectData.ci,
      projectData.fci,
      projectData.crv,
      projectData.dmc,
      projectData.designLife,
      projectData.holdingDepartment,
      projectData.propertyManager,
      projectData.facilityType,
      projectData.occupancyStatus,
      projectData.criticalityLevel,
      projectData.streetNumber,
      projectData.streetAddress,
      projectData.city,
      projectData.postalCode,
      projectData.province,
      projectData.latitude,
      projectData.longitude
    ]
  );
  
  console.log(`Created project: ${projectData.name} (ID: ${result.insertId})`);
  return result.insertId;
}

// Create an asset
async function createAsset(projectId, assetData) {
  const uniqueId = generateUniqueId('ASSET');
  const now = formatDate(new Date());
  
  const [result] = await connection.execute(
    `INSERT INTO assets (
      uniqueId, projectId, name, description, assetType, address, yearBuilt,
      grossFloorArea, numberOfStories, constructionType, currentReplacementValue,
      status, createdAt, updatedAt, streetNumber, streetAddress, unitNumber,
      city, postalCode, province, latitude, longitude
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uniqueId,
      projectId,
      assetData.name,
      assetData.description,
      assetData.assetType,
      assetData.address,
      assetData.yearBuilt,
      assetData.grossFloorArea,
      assetData.numberOfStories,
      assetData.constructionType,
      assetData.crv,
      'active',
      now,
      now,
      assetData.streetNumber,
      assetData.streetAddress,
      assetData.unitNumber,
      assetData.city,
      assetData.postalCode,
      assetData.province,
      assetData.latitude,
      assetData.longitude
    ]
  );
  
  return result.insertId;
}

// Create a building section
async function createBuildingSection(projectId, sectionData) {
  const now = formatDate(new Date());
  
  const [result] = await connection.execute(
    `INSERT INTO building_sections (
      projectId, name, description, sectionType, installDate, expectedLifespan,
      grossFloorArea, numberOfStories, constructionType, notes, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId,
      sectionData.name,
      sectionData.description,
      sectionData.sectionType,
      sectionData.installDate,
      sectionData.expectedLifespan,
      sectionData.grossFloorArea,
      sectionData.numberOfStories,
      sectionData.constructionType,
      sectionData.notes,
      now,
      now
    ]
  );
  
  return result.insertId;
}

// Create an assessment
async function createAssessment(projectId, assetId, sectionId, assessmentData) {
  const now = formatDate(new Date());
  
  const [result] = await connection.execute(
    `INSERT INTO assessments (
      projectId, assetId, sectionId, componentCode, condition, observations,
      remainingUsefulLife, expectedUsefulLife, estimatedServiceLife, assessedAt,
      createdAt, updatedAt, conditionPercentage, reviewYear, estimatedRepairCost,
      replacementValue, actionYear, recommendations, conditionScore, ciScore, fciScore,
      status, componentName, componentLocation
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId,
      assetId,
      sectionId,
      assessmentData.componentCode,
      assessmentData.condition,
      assessmentData.observations,
      assessmentData.remainingUsefulLife,
      assessmentData.expectedUsefulLife,
      assessmentData.estimatedServiceLife,
      now,
      now,
      now,
      assessmentData.conditionPercentage,
      assessmentData.reviewYear,
      assessmentData.estimatedRepairCost,
      assessmentData.replacementValue,
      assessmentData.actionYear,
      assessmentData.recommendations,
      assessmentData.conditionScore,
      assessmentData.ciScore,
      assessmentData.fciScore,
      'active',
      assessmentData.componentName,
      assessmentData.componentLocation
    ]
  );
  
  return result.insertId;
}

// Create a deficiency
async function createDeficiency(projectId, assessmentId, deficiencyData) {
  const now = formatDate(new Date());
  
  const [result] = await connection.execute(
    `INSERT INTO deficiencies (
      assessmentId, projectId, componentCode, title, description, location,
      severity, priority, recommendedAction, estimatedCost, status, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      assessmentId,
      projectId,
      deficiencyData.componentCode,
      deficiencyData.title,
      deficiencyData.description,
      deficiencyData.location,
      deficiencyData.severity,
      deficiencyData.priority,
      deficiencyData.recommendedAction,
      deficiencyData.estimatedCost,
      deficiencyData.status,
      now,
      now
    ]
  );
  
  return result.insertId;
}

// Create a risk assessment
async function createRiskAssessment(assessmentId, userId, riskData) {
  const now = formatDate(new Date());
  
  const [result] = await connection.execute(
    `INSERT INTO risk_assessments (
      assessmentId, pof, pofJustification, cof, cofJustification, riskScore,
      riskLevel, assessedBy, assessedAt, status, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      assessmentId,
      riskData.pof,
      riskData.pofJustification,
      riskData.cof,
      riskData.cofJustification,
      riskData.riskScore,
      riskData.riskLevel,
      userId,
      now,
      'approved',
      now,
      now
    ]
  );
  
  return result.insertId;
}

// Create maintenance entry
async function createMaintenanceEntry(projectId, assessmentId, userId, maintenanceData) {
  const now = formatDate(new Date());
  
  const [result] = await connection.execute(
    `INSERT INTO maintenance_entries (
      projectId, assessmentId, entryType, actionType, componentName, location, description,
      workPerformed, findings, estimatedCost, actualCost, status, priority,
      dateIdentified, dateScheduled, dateStarted, dateCompleted, isRecurring,
      recurringFrequency, nextDueDate, contractor, notes, createdBy, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId,
      assessmentId,
      maintenanceData.entryType,
      maintenanceData.actionType,
      maintenanceData.componentName,
      maintenanceData.location,
      maintenanceData.description,
      maintenanceData.workPerformed,
      maintenanceData.findings,
      maintenanceData.estimatedCost,
      maintenanceData.actualCost,
      maintenanceData.status,
      maintenanceData.priority,
      maintenanceData.dateIdentified,
      maintenanceData.dateScheduled,
      maintenanceData.dateStarted,
      maintenanceData.dateCompleted,
      maintenanceData.isRecurring ? 1 : 0,
      maintenanceData.recurringFrequency,
      maintenanceData.nextDueDate,
      maintenanceData.contractor,
      maintenanceData.notes,
      userId,
      now,
      now
    ]
  );
  
  return result.insertId;
}

// Create timeline event
async function createTimelineEvent(assetId, projectId, userId, eventData) {
  const now = formatDate(new Date());
  
  const [result] = await connection.execute(
    `INSERT INTO asset_timeline_events (
      assetId, projectId, eventType, eventDate, title, description,
      relatedId, metadata, createdBy, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      assetId,
      projectId,
      eventData.eventType,
      eventData.eventDate,
      eventData.title,
      eventData.description,
      eventData.relatedId,
      eventData.metadata ? JSON.stringify(eventData.metadata) : null,
      userId,
      now
    ]
  );
  
  return result.insertId;
}

// Create capital budget cycle
async function createCapitalBudgetCycle(userId, cycleData) {
  const now = formatDate(new Date());
  
  const [result] = await connection.execute(
    `INSERT INTO capital_budget_cycles (
      name, description, startYear, endYear, totalBudget, status, createdBy, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cycleData.name,
      cycleData.description,
      cycleData.startYear,
      cycleData.endYear,
      cycleData.totalBudget,
      cycleData.status,
      userId,
      now,
      now
    ]
  );
  
  return result.insertId;
}

// Create budget allocation
async function createBudgetAllocation(cycleId, projectId, allocationData) {
  const now = formatDate(new Date());
  
  const [result] = await connection.execute(
    `INSERT INTO budget_allocations (
      cycleId, projectId, year, allocatedAmount, priority, status,
      justification, strategicAlignment, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cycleId,
      projectId,
      allocationData.year,
      allocationData.allocatedAmount,
      allocationData.priority,
      allocationData.status,
      allocationData.justification,
      allocationData.strategicAlignment,
      now,
      now
    ]
  );
  
  return result.insertId;
}

// ESG tables don't exist in database - skipping ESG data generation

// Generate assets for a project
async function generateAssets(projectId, userId, count, cityData) {
  const assets = [];
  
  for (let i = 0; i < count; i++) {
    const buildingType = randomChoice(buildingTypes);
    const constructionType = randomChoice(constructionTypes);
    const yearBuilt = randomInt(1960, 2020);
    const stories = randomInt(1, 15);
    const gfa = randomInt(5000, 200000);
    const crv = gfa * randomInt(200, 500);
    const streetNum = randomInt(1, 9999);
    const streetName = randomChoice(streetNames);
    
    // Slight variation in coordinates for each asset
    const latOffset = (Math.random() - 0.5) * 0.05;
    const lngOffset = (Math.random() - 0.5) * 0.05;
    
    const assetName = `${randomChoice(assetNamePrefixes)} ${buildingType} ${i + 1}`;
    
    const assetId = await createAsset(projectId, {
      name: assetName,
      description: `${buildingType} constructed in ${yearBuilt}. ${stories} stories with ${gfa.toLocaleString()} sq ft of gross floor area.`,
      assetType: buildingType,
      address: `${streetNum} ${streetName}, ${cityData.city}, ${cityData.province}`,
      yearBuilt: yearBuilt,
      grossFloorArea: gfa,
      numberOfStories: stories,
      constructionType: constructionType,
      crv: crv,
      streetNumber: streetNum.toString(),
      streetAddress: streetName,
      unitNumber: null,
      city: cityData.city,
      postalCode: `${String.fromCharCode(65 + randomInt(0, 25))}${randomInt(0, 9)}${String.fromCharCode(65 + randomInt(0, 25))} ${randomInt(0, 9)}${String.fromCharCode(65 + randomInt(0, 25))}${randomInt(0, 9)}`,
      province: cityData.province,
      latitude: cityData.lat + latOffset,
      longitude: cityData.lng + lngOffset
    });
    
    assets.push({
      id: assetId,
      name: assetName,
      yearBuilt: yearBuilt,
      gfa: gfa,
      crv: crv,
      buildingType: buildingType,
      constructionType: constructionType
    });
    
    console.log(`  Created asset: ${assetName}`);
  }
  
  return assets;
}

// Generate building sections for an asset
async function generateBuildingSections(projectId, asset) {
  const sections = [];
  const sectionTypes = ['original', 'extension', 'addition', 'renovation'];
  
  // Always create original section
  const originalSection = await createBuildingSection(projectId, {
    name: `${asset.name} - Original Building`,
    description: `Original construction from ${asset.yearBuilt}`,
    sectionType: 'original',
    installDate: `${asset.yearBuilt}-01-01`,
    expectedLifespan: 50,
    grossFloorArea: asset.gfa * 0.7,
    numberOfStories: randomInt(1, 5),
    constructionType: asset.constructionType,
    notes: 'Primary building section'
  });
  sections.push({ id: originalSection, type: 'original' });
  
  // Randomly add additional sections
  if (Math.random() > 0.5 && asset.yearBuilt < 2010) {
    const additionYear = asset.yearBuilt + randomInt(10, 30);
    const additionSection = await createBuildingSection(projectId, {
      name: `${asset.name} - ${additionYear} Addition`,
      description: `Building addition constructed in ${additionYear}`,
      sectionType: randomChoice(['extension', 'addition']),
      installDate: `${additionYear}-01-01`,
      expectedLifespan: 40,
      grossFloorArea: asset.gfa * 0.3,
      numberOfStories: randomInt(1, 3),
      constructionType: randomChoice(constructionTypes),
      notes: 'Building expansion'
    });
    sections.push({ id: additionSection, type: 'addition' });
  }
  
  return sections;
}

// Generate assessments for an asset
async function generateAssessments(projectId, assetId, sectionId, userId, asset) {
  const assessments = [];
  const currentYear = new Date().getFullYear();
  const buildingAge = currentYear - asset.yearBuilt;
  
  // Select 8-15 random components to assess
  const numComponents = randomInt(8, 15);
  const selectedComponents = [];
  const level2Components = componentCodes.filter(c => c.level === 2);
  
  while (selectedComponents.length < numComponents && level2Components.length > 0) {
    const component = randomChoice(level2Components);
    if (!selectedComponents.find(c => c.code === component.code)) {
      selectedComponents.push(component);
    }
  }
  
  for (const component of selectedComponents) {
    const conditions = ['good', 'fair', 'poor', 'not_assessed'];
    const conditionWeights = buildingAge < 10 ? [0.6, 0.3, 0.08, 0.02] :
                             buildingAge < 25 ? [0.3, 0.4, 0.25, 0.05] :
                             buildingAge < 40 ? [0.15, 0.35, 0.4, 0.1] :
                             [0.1, 0.25, 0.5, 0.15];
    
    // Weighted random selection
    const rand = Math.random();
    let cumulative = 0;
    let condition = 'fair';
    for (let i = 0; i < conditions.length; i++) {
      cumulative += conditionWeights[i];
      if (rand < cumulative) {
        condition = conditions[i];
        break;
      }
    }
    
    const conditionScores = { good: randomInt(80, 100), fair: randomInt(50, 79), poor: randomInt(20, 49), not_assessed: null };
    const conditionScore = conditionScores[condition];
    
    const expectedLife = randomInt(15, 50);
    const remainingLife = condition === 'good' ? randomInt(Math.floor(expectedLife * 0.6), expectedLife) :
                          condition === 'fair' ? randomInt(Math.floor(expectedLife * 0.3), Math.floor(expectedLife * 0.6)) :
                          condition === 'poor' ? randomInt(1, Math.floor(expectedLife * 0.3)) : null;
    
    const replacementValue = randomInt(10000, 500000);
    const repairCost = condition === 'poor' ? Math.floor(replacementValue * randomDecimal(0.3, 0.6)) :
                       condition === 'fair' ? Math.floor(replacementValue * randomDecimal(0.1, 0.3)) :
                       Math.floor(replacementValue * randomDecimal(0, 0.1));
    
    const observation = randomChoice(observationTemplates)
      .replace('{age}', buildingAge.toString())
      .replace('{condition}', condition)
      .replace('{issue}', 'minor wear and tear')
      .replace('{years}', remainingLife ? remainingLife.toString() : '5');
    
    const recommendation = randomChoice(recommendationTemplates)
      .replace('{years}', remainingLife ? Math.min(remainingLife, 5).toString() : '3');
    
    const assessmentId = await createAssessment(projectId, assetId, sectionId, {
      componentCode: component.code,
      condition: condition,
      observations: observation,
      remainingUsefulLife: remainingLife,
      expectedUsefulLife: expectedLife,
      estimatedServiceLife: expectedLife,
      conditionPercentage: conditionScore ? `${conditionScore}%` : null,
      reviewYear: currentYear,
      estimatedRepairCost: repairCost,
      replacementValue: replacementValue,
      actionYear: remainingLife ? currentYear + Math.min(remainingLife, 5) : currentYear + 1,
      recommendations: recommendation,
      conditionScore: conditionScore,
      ciScore: conditionScore,
      fciScore: replacementValue > 0 ? Math.round((repairCost / replacementValue) * 10000) : 0,
      componentName: component.name,
      componentLocation: `${asset.name} - Level ${randomInt(1, asset.numberOfStories || 3)}`
    });
    
    assessments.push({
      id: assessmentId,
      componentCode: component.code,
      componentName: component.name,
      condition: condition,
      conditionScore: conditionScore,
      repairCost: repairCost,
      replacementValue: replacementValue
    });
    
    // Create risk assessment for poor/fair conditions
    if (condition === 'poor' || (condition === 'fair' && Math.random() > 0.5)) {
      const pof = condition === 'poor' ? randomDecimal(0.6, 0.95) : randomDecimal(0.3, 0.6);
      const cof = randomDecimal(0.3, 0.9);
      const riskScore = pof * cof * 100;
      const riskLevel = riskScore > 60 ? 'critical' : riskScore > 40 ? 'high' : riskScore > 25 ? 'medium' : riskScore > 10 ? 'low' : 'very_low';
      
      await createRiskAssessment(assessmentId, userId, {
        pof: pof,
        pofJustification: `Component age: ${buildingAge} years. Condition: ${condition}. ${remainingLife ? `Remaining useful life: ${remainingLife} years.` : 'End of life reached.'}`,
        cof: cof,
        cofJustification: `Failure would impact building operations and safety. Estimated repair/replacement cost: $${replacementValue.toLocaleString()}.`,
        riskScore: riskScore,
        riskLevel: riskLevel
      });
    }
  }
  
  return assessments;
}

// Generate deficiencies for assessments
async function generateDeficiencies(projectId, assessments, asset) {
  const deficiencies = [];
  
  for (const assessment of assessments) {
    // Only create deficiencies for fair/poor conditions
    if (assessment.condition !== 'fair' && assessment.condition !== 'poor') continue;
    
    // 70% chance of deficiency for poor, 40% for fair
    const deficiencyChance = assessment.condition === 'poor' ? 0.7 : 0.4;
    if (Math.random() > deficiencyChance) continue;
    
    const titles = deficiencyTitles[assessment.componentCode] || [
      `${assessment.componentName} requires attention`,
      `Deterioration observed in ${assessment.componentName}`,
      `${assessment.componentName} maintenance needed`
    ];
    
    const severities = ['low', 'medium', 'high', 'critical'];
    const severityWeights = assessment.condition === 'poor' ? [0.1, 0.2, 0.4, 0.3] : [0.3, 0.4, 0.2, 0.1];
    
    const rand = Math.random();
    let cumulative = 0;
    let severity = 'medium';
    for (let i = 0; i < severities.length; i++) {
      cumulative += severityWeights[i];
      if (rand < cumulative) {
        severity = severities[i];
        break;
      }
    }
    
    const priorities = ['immediate', 'short_term', 'medium_term', 'long_term'];
    const priority = severity === 'critical' ? 'immediate' :
                     severity === 'high' ? randomChoice(['immediate', 'short_term']) :
                     severity === 'medium' ? randomChoice(['short_term', 'medium_term']) :
                     randomChoice(['medium_term', 'long_term']);
    
    const statuses = ['open', 'in_progress', 'resolved', 'deferred'];
    const status = randomChoice(statuses);
    
    const deficiencyId = await createDeficiency(projectId, assessment.id, {
      componentCode: assessment.componentCode,
      title: randomChoice(titles),
      description: `Deficiency identified during assessment of ${assessment.componentName}. Condition rated as ${assessment.condition}. Requires ${priority.replace('_', ' ')} attention.`,
      location: `${asset.name} - ${assessment.componentName}`,
      severity: severity,
      priority: priority,
      recommendedAction: `${severity === 'critical' || severity === 'high' ? 'Immediate' : 'Scheduled'} repair or replacement recommended. Estimated cost: $${assessment.repairCost.toLocaleString()}.`,
      estimatedCost: assessment.repairCost,
      status: status
    });
    
    deficiencies.push({
      id: deficiencyId,
      title: randomChoice(titles),
      severity: severity,
      priority: priority,
      status: status
    });
  }
  
  return deficiencies;
}

// Generate maintenance entries
async function generateMaintenanceEntries(projectId, assessments, userId, asset) {
  const entries = [];
  const currentDate = new Date();
  
  // Create 3-8 maintenance entries per asset
  const numEntries = randomInt(3, 8);
  
  for (let i = 0; i < numEntries; i++) {
    const assessment = randomChoice(assessments);
    const entryTypes = ['identified', 'executed'];
    const entryType = randomChoice(entryTypes);
    const actionTypes = ['repair', 'rehabilitation', 'replacement', 'preventive_maintenance', 'emergency_repair', 'inspection', 'upgrade'];
    const actionType = randomChoice(actionTypes);
    
    const statuses = ['planned', 'approved', 'in_progress', 'completed', 'deferred'];
    const status = randomChoice(statuses);
    
    const priorities = ['immediate', 'high', 'medium', 'low'];
    const priority = randomChoice(priorities);
    
    const dateIdentified = randomDate(currentDate.getFullYear() - 2, currentDate.getFullYear());
    const dateScheduled = new Date(dateIdentified);
    dateScheduled.setMonth(dateScheduled.getMonth() + randomInt(1, 6));
    
    let dateStarted = null;
    let dateCompleted = null;
    
    if (status === 'in_progress' || status === 'completed') {
      dateStarted = new Date(dateScheduled);
      dateStarted.setDate(dateStarted.getDate() + randomInt(0, 30));
    }
    
    if (status === 'completed') {
      dateCompleted = new Date(dateStarted);
      dateCompleted.setDate(dateCompleted.getDate() + randomInt(1, 14));
    }
    
    const estimatedCost = randomInt(1000, 50000);
    const actualCost = status === 'completed' ? Math.floor(estimatedCost * randomDecimal(0.8, 1.3)) : null;
    
    const isRecurring = Math.random() > 0.6;
    const frequencies = ['monthly', 'quarterly', 'semi_annual', 'annual'];
    const frequency = isRecurring ? randomChoice(frequencies) : null;
    
    let nextDueDate = null;
    if (isRecurring && status === 'completed') {
      nextDueDate = new Date(dateCompleted);
      switch (frequency) {
        case 'monthly': nextDueDate.setMonth(nextDueDate.getMonth() + 1); break;
        case 'quarterly': nextDueDate.setMonth(nextDueDate.getMonth() + 3); break;
        case 'semi_annual': nextDueDate.setMonth(nextDueDate.getMonth() + 6); break;
        case 'annual': nextDueDate.setFullYear(nextDueDate.getFullYear() + 1); break;
      }
    }
    
    const contractors = [
      'ABC Mechanical Services', 'XYZ Building Maintenance', 'Premier Facility Solutions',
      'Canadian Building Services', 'Metro Maintenance Corp', 'ProTech Building Systems',
      'National Facility Management', 'Urban Building Services'
    ];
    
    const entryId = await createMaintenanceEntry(projectId, assessment.id, userId, {
      entryType: entryType,
      actionType: actionType,
      componentName: assessment.componentName,
      location: `${asset.name} - Level ${randomInt(1, asset.numberOfStories || 3)}`,
      description: `${actionType.replace('_', ' ').charAt(0).toUpperCase() + actionType.replace('_', ' ').slice(1)} for ${assessment.componentName}`,
      workPerformed: status === 'completed' ? `Completed ${actionType.replace('_', ' ')}. All work performed according to specifications.` : null,
      findings: status === 'completed' ? `Component found in ${assessment.condition} condition. ${assessment.condition === 'poor' ? 'Recommend follow-up inspection.' : 'No immediate concerns.'}` : null,
      estimatedCost: estimatedCost,
      actualCost: actualCost,
      status: status,
      priority: priority,
      dateIdentified: formatDate(dateIdentified),
      dateScheduled: formatDate(dateScheduled),
      dateStarted: dateStarted ? formatDate(dateStarted) : null,
      dateCompleted: dateCompleted ? formatDate(dateCompleted) : null,
      isRecurring: isRecurring,
      recurringFrequency: frequency,
      nextDueDate: nextDueDate ? formatDate(nextDueDate) : null,
      contractor: randomChoice(contractors),
      notes: `Maintenance entry for ${asset.name}`
    });
    
    entries.push({ id: entryId, type: actionType, status: status });
  }
  
  return entries;
}

// Generate timeline events
async function generateTimelineEvents(assetId, projectId, userId, asset, assessments, deficiencies, maintenanceEntries) {
  const events = [];
  const currentDate = new Date();
  
  // Construction event - use a date within MySQL timestamp range (1970-2038)
  const constructionYear = Math.max(asset.yearBuilt, 1970);
  events.push(await createTimelineEvent(assetId, projectId, userId, {
    eventType: 'custom',
    eventDate: formatDate(new Date(constructionYear, 0, 15)),
    title: 'Building Construction Completed',
    description: `Original construction of ${asset.name} completed in ${asset.yearBuilt}.`,
    relatedId: null,
    metadata: { yearBuilt: asset.yearBuilt, constructionType: asset.constructionType }
  }));
  
  // Assessment events
  for (const assessment of assessments.slice(0, 3)) {
    events.push(await createTimelineEvent(assetId, projectId, userId, {
      eventType: 'assessment',
      eventDate: formatDate(randomDate(currentDate.getFullYear() - 1, currentDate.getFullYear())),
      title: `${assessment.componentName} Assessment`,
      description: `Component assessed as ${assessment.condition} condition.`,
      relatedId: assessment.id,
      metadata: { condition: assessment.condition, conditionScore: assessment.conditionScore }
    }));
  }
  
  // Deficiency events
  for (const deficiency of deficiencies.slice(0, 2)) {
    events.push(await createTimelineEvent(assetId, projectId, userId, {
      eventType: 'deficiency',
      eventDate: formatDate(randomDate(currentDate.getFullYear() - 1, currentDate.getFullYear())),
      title: deficiency.title,
      description: `Deficiency identified with ${deficiency.severity} severity.`,
      relatedId: deficiency.id,
      metadata: { severity: deficiency.severity, priority: deficiency.priority }
    }));
  }
  
  // Maintenance events
  for (const entry of maintenanceEntries.filter(e => e.status === 'completed').slice(0, 2)) {
    events.push(await createTimelineEvent(assetId, projectId, userId, {
      eventType: 'maintenance',
      eventDate: formatDate(randomDate(currentDate.getFullYear() - 1, currentDate.getFullYear())),
      title: `${entry.type.charAt(0).toUpperCase() + entry.type.slice(1)} Maintenance Completed`,
      description: `Maintenance work completed successfully.`,
      relatedId: entry.id,
      metadata: { entryType: entry.type, status: entry.status }
    }));
  }
  
  return events;
}

// Generate ESG data - skipped (tables don't exist)
async function generateEsgData(projectId, assetId, asset) {
  // ESG tables don't exist in database, skipping
  return;
}

// Main seed function
async function seedMockProjects() {
  try {
    console.log('Starting mock data generation...\n');
    
    const userId = await getOwnerUserId();
    console.log(`Using user ID: ${userId}\n`);
    
    // ============================================
    // PROJECT 1: Small Portfolio (10 assets)
    // ============================================
    console.log('='.repeat(50));
    console.log('Creating Project 1: Small Municipal Portfolio');
    console.log('='.repeat(50));
    
    const city1 = randomChoice(canadianCities);
    const project1Id = await createProject(userId, {
      name: 'Small Municipal Portfolio - Demo',
      address: `${city1.city}, ${city1.province}`,
      clientName: `City of ${city1.city}`,
      propertyType: 'Government',
      constructionType: 'Mixed',
      yearBuilt: 1985,
      numberOfUnits: 10,
      numberOfStories: null,
      buildingCode: 'NBC 2020',
      conditionScore: 72,
      ci: 72.5,
      fci: 0.15,
      crv: 45000000,
      dmc: 6750000,
      designLife: 50,
      holdingDepartment: 'Municipal Infrastructure',
      propertyManager: 'John Smith',
      facilityType: 'Municipal',
      occupancyStatus: 'occupied',
      criticalityLevel: 'important',
      streetNumber: randomInt(100, 999).toString(),
      streetAddress: randomChoice(streetNames),
      city: city1.city,
      postalCode: `${String.fromCharCode(65 + randomInt(0, 25))}${randomInt(0, 9)}${String.fromCharCode(65 + randomInt(0, 25))} ${randomInt(0, 9)}${String.fromCharCode(65 + randomInt(0, 25))}${randomInt(0, 9)}`,
      province: city1.province,
      latitude: city1.lat,
      longitude: city1.lng
    });
    
    console.log('\nGenerating 10 assets...');
    const assets1 = await generateAssets(project1Id, userId, 10, city1);
    
    let totalAssessments1 = 0;
    let totalDeficiencies1 = 0;
    let totalMaintenance1 = 0;
    
    for (const asset of assets1) {
      const sections = await generateBuildingSections(project1Id, asset);
      const sectionId = sections[0]?.id || null;
      
      const assessments = await generateAssessments(project1Id, asset.id, sectionId, userId, asset);
      totalAssessments1 += assessments.length;
      
      const deficiencies = await generateDeficiencies(project1Id, assessments, asset);
      totalDeficiencies1 += deficiencies.length;
      
      const maintenanceEntries = await generateMaintenanceEntries(project1Id, assessments, userId, asset);
      totalMaintenance1 += maintenanceEntries.length;
      
      await generateTimelineEvents(asset.id, project1Id, userId, asset, assessments, deficiencies, maintenanceEntries);
      await generateEsgData(project1Id, asset.id, asset);
    }
    
    console.log(`\nProject 1 Summary:`);
    console.log(`  - Assets: 10`);
    console.log(`  - Assessments: ${totalAssessments1}`);
    console.log(`  - Deficiencies: ${totalDeficiencies1}`);
    console.log(`  - Maintenance Entries: ${totalMaintenance1}`);
    
    // ============================================
    // PROJECT 2: Large Portfolio (30 assets)
    // ============================================
    console.log('\n' + '='.repeat(50));
    console.log('Creating Project 2: Large Corporate Portfolio');
    console.log('='.repeat(50));
    
    const city2 = randomChoice(canadianCities.filter(c => c.city !== city1.city));
    const project2Id = await createProject(userId, {
      name: 'Large Corporate Portfolio - Demo',
      address: `${city2.city}, ${city2.province}`,
      clientName: 'Maple Leaf Properties Inc.',
      propertyType: 'Commercial',
      constructionType: 'Mixed',
      yearBuilt: 1990,
      numberOfUnits: 30,
      numberOfStories: null,
      buildingCode: 'NBC 2020',
      conditionScore: 68,
      ci: 68.3,
      fci: 0.22,
      crv: 185000000,
      dmc: 40700000,
      designLife: 50,
      holdingDepartment: 'Corporate Real Estate',
      propertyManager: 'Sarah Johnson',
      facilityType: 'Commercial',
      occupancyStatus: 'occupied',
      criticalityLevel: 'critical',
      streetNumber: randomInt(100, 999).toString(),
      streetAddress: randomChoice(streetNames),
      city: city2.city,
      postalCode: `${String.fromCharCode(65 + randomInt(0, 25))}${randomInt(0, 9)}${String.fromCharCode(65 + randomInt(0, 25))} ${randomInt(0, 9)}${String.fromCharCode(65 + randomInt(0, 25))}${randomInt(0, 9)}`,
      province: city2.province,
      latitude: city2.lat,
      longitude: city2.lng
    });
    
    console.log('\nGenerating 30 assets...');
    const assets2 = await generateAssets(project2Id, userId, 30, city2);
    
    let totalAssessments2 = 0;
    let totalDeficiencies2 = 0;
    let totalMaintenance2 = 0;
    
    for (const asset of assets2) {
      const sections = await generateBuildingSections(project2Id, asset);
      const sectionId = sections[0]?.id || null;
      
      const assessments = await generateAssessments(project2Id, asset.id, sectionId, userId, asset);
      totalAssessments2 += assessments.length;
      
      const deficiencies = await generateDeficiencies(project2Id, assessments, asset);
      totalDeficiencies2 += deficiencies.length;
      
      const maintenanceEntries = await generateMaintenanceEntries(project2Id, assessments, userId, asset);
      totalMaintenance2 += maintenanceEntries.length;
      
      await generateTimelineEvents(asset.id, project2Id, userId, asset, assessments, deficiencies, maintenanceEntries);
      await generateEsgData(project2Id, asset.id, asset);
    }
    
    console.log(`\nProject 2 Summary:`);
    console.log(`  - Assets: 30`);
    console.log(`  - Assessments: ${totalAssessments2}`);
    console.log(`  - Deficiencies: ${totalDeficiencies2}`);
    console.log(`  - Maintenance Entries: ${totalMaintenance2}`);
    
    // ============================================
    // Create Capital Budget Cycles
    // ============================================
    console.log('\n' + '='.repeat(50));
    console.log('Creating Capital Budget Cycles');
    console.log('='.repeat(50));
    
    const currentYear = new Date().getFullYear();
    
    const cycle1Id = await createCapitalBudgetCycle(userId, {
      name: `${currentYear}-${currentYear + 4} Capital Plan`,
      description: 'Five-year capital improvement plan for portfolio assets',
      startYear: currentYear,
      endYear: currentYear + 4,
      totalBudget: 25000000,
      status: 'active'
    });
    
    // Create budget allocations for both projects
    for (let year = currentYear; year <= currentYear + 4; year++) {
      await createBudgetAllocation(cycle1Id, project1Id, {
        year: year,
        allocatedAmount: randomInt(500000, 2000000),
        priority: randomInt(1, 5),
        status: year === currentYear ? 'approved' : 'proposed',
        justification: `Capital improvements for Small Municipal Portfolio - Year ${year}`,
        strategicAlignment: 'Supports asset preservation and service delivery objectives'
      });
      
      await createBudgetAllocation(cycle1Id, project2Id, {
        year: year,
        allocatedAmount: randomInt(2000000, 8000000),
        priority: randomInt(1, 5),
        status: year === currentYear ? 'approved' : 'proposed',
        justification: `Capital improvements for Large Corporate Portfolio - Year ${year}`,
        strategicAlignment: 'Supports portfolio value preservation and tenant satisfaction'
      });
    }
    
    console.log('Capital budget cycles and allocations created.');
    
    // ============================================
    // Final Summary
    // ============================================
    console.log('\n' + '='.repeat(50));
    console.log('MOCK DATA GENERATION COMPLETE');
    console.log('='.repeat(50));
    console.log(`\nTotal Summary:`);
    console.log(`  Projects: 2`);
    console.log(`  Assets: ${10 + 30}`);
    console.log(`  Assessments: ${totalAssessments1 + totalAssessments2}`);
    console.log(`  Deficiencies: ${totalDeficiencies1 + totalDeficiencies2}`);
    console.log(`  Maintenance Entries: ${totalMaintenance1 + totalMaintenance2}`);
    console.log(`\nProject IDs:`);
    console.log(`  - Small Municipal Portfolio: ${project1Id}`);
    console.log(`  - Large Corporate Portfolio: ${project2Id}`);
    
  } catch (error) {
    console.error('Error during seed:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('\nDatabase connection closed.');
  }
}

// Run the seed
seedMockProjects();
