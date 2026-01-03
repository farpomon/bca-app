/**
 * Comprehensive Demo Project Seed Script
 * 
 * Creates a complete demo project with:
 * - Multiple diverse assets (different building types)
 * - Full UNIFORMAT II assessments with costs
 * - Deficiencies with varying priorities and severities
 * - Realistic cost data for budget allocation testing
 * - Data suitable for testing all BCA features
 */

import "dotenv/config";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

// Parse connection string
const url = new URL(DATABASE_URL);
const connection = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port || "3306"),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false }
});

console.log("🚀 Starting comprehensive demo project seed...");

// Get admin user
const [users] = await connection.execute(
  "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
);
const adminUserId = users[0]?.id || 1;
console.log(`Using admin user ID: ${adminUserId}`);

// Create main demo project
const projectName = "Metro Vancouver Public Works Portfolio";
const uniqueId = `PROJ-${Date.now()}-COMPREHENSIVE`;

const [projectResult] = await connection.execute(
  `INSERT INTO projects (
    uniqueId, userId, name, status, clientName, address,
    yearBuilt, designLife, deferredMaintenanceCost,
    currentReplacementValue, ci, fci, createdAt, updatedAt
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
  [
    uniqueId,
    adminUserId,
    projectName,
    "in_progress",
    "Metro Vancouver Regional District",
    "4330 Kingsway, Burnaby, BC V5H 4G8",
    1985,
    50,
    0, // Will be calculated
    0, // Will be calculated
    0, // Will be calculated
    0  // Will be calculated
  ]
);

const projectId = projectResult.insertId;
console.log(`✅ Created project: ${projectName} (ID: ${projectId})`);

// Define diverse assets with realistic data
const assets = [
  {
    name: "Regional Administration Building",
    type: "office",
    address: "4330 Kingsway, Burnaby, BC V5H 4G8",
    yearBuilt: 1985,
    grossFloorArea: 45000,
    stories: 8,
    description: "Main administrative headquarters for Metro Vancouver. Houses executive offices, council chambers, and administrative departments.",
    occupancyType: "Government Office",
    constructionType: "Steel Frame with Curtain Wall"
  },
  {
    name: "Central Maintenance Depot",
    type: "industrial",
    address: "2150 Commissioner Street, Vancouver, BC V5L 1A6",
    yearBuilt: 1978,
    grossFloorArea: 35000,
    stories: 2,
    description: "Primary vehicle maintenance and storage facility. Includes heavy equipment bays, parts storage, and fleet management offices.",
    occupancyType: "Industrial/Maintenance",
    constructionType: "Pre-engineered Metal Building"
  },
  {
    name: "Burnaby Lake Recreation Centre",
    type: "recreation",
    address: "3676 Kensington Avenue, Burnaby, BC V5B 4V6",
    yearBuilt: 1992,
    grossFloorArea: 65000,
    stories: 2,
    description: "Multi-purpose recreation facility with Olympic pool, gymnasium, fitness center, and community meeting rooms.",
    occupancyType: "Assembly/Recreation",
    constructionType: "Concrete Frame with Steel Roof"
  },
  {
    name: "Fire Station No. 7",
    type: "fire_station",
    address: "6111 Boundary Road, Burnaby, BC V5R 2P7",
    yearBuilt: 2005,
    grossFloorArea: 12000,
    stories: 2,
    description: "Modern fire station with 4 apparatus bays, living quarters, training facilities, and emergency operations center.",
    occupancyType: "Emergency Services",
    constructionType: "Reinforced Concrete"
  },
  {
    name: "Central Library Branch",
    type: "library",
    address: "6100 Willingdon Avenue, Burnaby, BC V5H 4N5",
    yearBuilt: 1988,
    grossFloorArea: 28000,
    stories: 3,
    description: "Main branch library with extensive collection, computer labs, study rooms, and community programming spaces.",
    occupancyType: "Assembly/Educational",
    constructionType: "Concrete Frame"
  },
  {
    name: "Parkade Structure A",
    type: "parking",
    address: "4299 Canada Way, Burnaby, BC V5G 1H3",
    yearBuilt: 1990,
    grossFloorArea: 85000,
    stories: 5,
    description: "Multi-level parking structure serving downtown core. 850 stalls with EV charging stations.",
    occupancyType: "Parking",
    constructionType: "Post-tensioned Concrete"
  },
  {
    name: "Water Treatment Facility",
    type: "utility",
    address: "3000 Lougheed Highway, Coquitlam, BC V3B 1C5",
    yearBuilt: 1975,
    grossFloorArea: 22000,
    stories: 1,
    description: "Regional water treatment plant serving 500,000 residents. Includes filtration, chemical treatment, and pumping facilities.",
    occupancyType: "Utility/Industrial",
    constructionType: "Reinforced Concrete"
  },
  {
    name: "Senior Citizens Activity Centre",
    type: "community",
    address: "5055 Joyce Street, Vancouver, BC V5R 4G7",
    yearBuilt: 1982,
    grossFloorArea: 15000,
    stories: 1,
    description: "Community center for seniors with activity rooms, kitchen facilities, health services, and outdoor gardens.",
    occupancyType: "Assembly/Community",
    constructionType: "Wood Frame"
  },
  {
    name: "Police Operations Centre",
    type: "police",
    address: "6450 Deer Lake Avenue, Burnaby, BC V5G 2J3",
    yearBuilt: 1998,
    grossFloorArea: 32000,
    stories: 3,
    description: "Regional police headquarters with dispatch center, detention facilities, forensics lab, and training rooms.",
    occupancyType: "Emergency Services",
    constructionType: "Reinforced Concrete"
  },
  {
    name: "Parks Operations Building",
    type: "operations",
    address: "4949 Canada Way, Burnaby, BC V5G 1M2",
    yearBuilt: 1995,
    grossFloorArea: 18000,
    stories: 1,
    description: "Parks department operations center with equipment storage, greenhouses, and horticultural facilities.",
    occupancyType: "Industrial/Operations",
    constructionType: "Pre-engineered Metal Building"
  }
];

// UNIFORMAT II components with realistic cost ranges
const uniformatComponents = [
  // A - Substructure
  { code: "A1010", name: "Standard Foundations", category: "Substructure", costRange: [50000, 200000], replacementRange: [200000, 800000] },
  { code: "A1020", name: "Special Foundations", category: "Substructure", costRange: [30000, 150000], replacementRange: [150000, 600000] },
  { code: "A1030", name: "Slab on Grade", category: "Substructure", costRange: [25000, 100000], replacementRange: [100000, 400000] },
  { code: "A2010", name: "Basement Excavation", category: "Substructure", costRange: [20000, 80000], replacementRange: [80000, 320000] },
  { code: "A2020", name: "Basement Walls", category: "Substructure", costRange: [40000, 160000], replacementRange: [160000, 640000] },
  
  // B - Shell
  { code: "B1010", name: "Floor Construction", category: "Shell", costRange: [60000, 250000], replacementRange: [250000, 1000000] },
  { code: "B1020", name: "Roof Construction", category: "Shell", costRange: [80000, 350000], replacementRange: [350000, 1400000] },
  { code: "B2010", name: "Exterior Walls", category: "Shell", costRange: [100000, 400000], replacementRange: [400000, 1600000] },
  { code: "B2020", name: "Exterior Windows", category: "Shell", costRange: [50000, 200000], replacementRange: [200000, 800000] },
  { code: "B2030", name: "Exterior Doors", category: "Shell", costRange: [15000, 60000], replacementRange: [60000, 240000] },
  { code: "B3010", name: "Roof Coverings", category: "Shell", costRange: [70000, 280000], replacementRange: [280000, 1120000] },
  { code: "B3020", name: "Roof Openings", category: "Shell", costRange: [10000, 40000], replacementRange: [40000, 160000] },
  
  // C - Interiors
  { code: "C1010", name: "Partitions", category: "Interiors", costRange: [30000, 120000], replacementRange: [120000, 480000] },
  { code: "C1020", name: "Interior Doors", category: "Interiors", costRange: [20000, 80000], replacementRange: [80000, 320000] },
  { code: "C1030", name: "Fittings", category: "Interiors", costRange: [15000, 60000], replacementRange: [60000, 240000] },
  { code: "C2010", name: "Stair Construction", category: "Interiors", costRange: [25000, 100000], replacementRange: [100000, 400000] },
  { code: "C3010", name: "Wall Finishes", category: "Interiors", costRange: [35000, 140000], replacementRange: [140000, 560000] },
  { code: "C3020", name: "Floor Finishes", category: "Interiors", costRange: [45000, 180000], replacementRange: [180000, 720000] },
  { code: "C3030", name: "Ceiling Finishes", category: "Interiors", costRange: [25000, 100000], replacementRange: [100000, 400000] },
  
  // D - Services
  { code: "D1010", name: "Elevators & Lifts", category: "Services", costRange: [80000, 320000], replacementRange: [320000, 1280000] },
  { code: "D2010", name: "Plumbing Fixtures", category: "Services", costRange: [40000, 160000], replacementRange: [160000, 640000] },
  { code: "D2020", name: "Domestic Water Distribution", category: "Services", costRange: [35000, 140000], replacementRange: [140000, 560000] },
  { code: "D2030", name: "Sanitary Waste", category: "Services", costRange: [30000, 120000], replacementRange: [120000, 480000] },
  { code: "D2040", name: "Rain Water Drainage", category: "Services", costRange: [20000, 80000], replacementRange: [80000, 320000] },
  { code: "D3010", name: "Energy Supply", category: "Services", costRange: [50000, 200000], replacementRange: [200000, 800000] },
  { code: "D3020", name: "Heat Generating Systems", category: "Services", costRange: [70000, 280000], replacementRange: [280000, 1120000] },
  { code: "D3030", name: "Cooling Generating Systems", category: "Services", costRange: [60000, 240000], replacementRange: [240000, 960000] },
  { code: "D3040", name: "Distribution Systems", category: "Services", costRange: [45000, 180000], replacementRange: [180000, 720000] },
  { code: "D3050", name: "Terminal & Package Units", category: "Services", costRange: [35000, 140000], replacementRange: [140000, 560000] },
  { code: "D3060", name: "Controls & Instrumentation", category: "Services", costRange: [25000, 100000], replacementRange: [100000, 400000] },
  { code: "D4010", name: "Sprinklers", category: "Services", costRange: [40000, 160000], replacementRange: [160000, 640000] },
  { code: "D4020", name: "Standpipes", category: "Services", costRange: [15000, 60000], replacementRange: [60000, 240000] },
  { code: "D4030", name: "Fire Protection Specialties", category: "Services", costRange: [20000, 80000], replacementRange: [80000, 320000] },
  { code: "D5010", name: "Electrical Service & Distribution", category: "Services", costRange: [55000, 220000], replacementRange: [220000, 880000] },
  { code: "D5020", name: "Lighting & Branch Wiring", category: "Services", costRange: [45000, 180000], replacementRange: [180000, 720000] },
  { code: "D5030", name: "Communications & Security", category: "Services", costRange: [35000, 140000], replacementRange: [140000, 560000] },
  
  // E - Equipment & Furnishings
  { code: "E1010", name: "Commercial Equipment", category: "Equipment", costRange: [30000, 120000], replacementRange: [120000, 480000] },
  { code: "E1020", name: "Institutional Equipment", category: "Equipment", costRange: [25000, 100000], replacementRange: [100000, 400000] },
  { code: "E1090", name: "Other Equipment", category: "Equipment", costRange: [20000, 80000], replacementRange: [80000, 320000] },
  { code: "E2010", name: "Fixed Furnishings", category: "Equipment", costRange: [15000, 60000], replacementRange: [60000, 240000] },
  { code: "E2020", name: "Movable Furnishings", category: "Equipment", costRange: [10000, 40000], replacementRange: [40000, 160000] },
  
  // G - Site Work
  { code: "G1010", name: "Site Preparation", category: "Sitework", costRange: [20000, 80000], replacementRange: [80000, 320000] },
  { code: "G2010", name: "Roadways", category: "Sitework", costRange: [40000, 160000], replacementRange: [160000, 640000] },
  { code: "G2020", name: "Parking Lots", category: "Sitework", costRange: [35000, 140000], replacementRange: [140000, 560000] },
  { code: "G2030", name: "Pedestrian Paving", category: "Sitework", costRange: [15000, 60000], replacementRange: [60000, 240000] },
  { code: "G2040", name: "Site Development", category: "Sitework", costRange: [25000, 100000], replacementRange: [100000, 400000] },
  { code: "G3010", name: "Water Supply", category: "Sitework", costRange: [30000, 120000], replacementRange: [120000, 480000] },
  { code: "G3020", name: "Sanitary Sewer", category: "Sitework", costRange: [35000, 140000], replacementRange: [140000, 560000] },
  { code: "G3030", name: "Storm Sewer", category: "Sitework", costRange: [30000, 120000], replacementRange: [120000, 480000] },
  { code: "G4010", name: "Electrical Distribution", category: "Sitework", costRange: [25000, 100000], replacementRange: [100000, 400000] },
  { code: "G4020", name: "Site Lighting", category: "Sitework", costRange: [20000, 80000], replacementRange: [80000, 320000] },
  { code: "G9010", name: "Service Tunnels", category: "Sitework", costRange: [40000, 160000], replacementRange: [160000, 640000] }
];

const conditions = ['excellent', 'good', 'fair', 'poor', 'critical'];
const conditionWeights = [0.1, 0.25, 0.35, 0.2, 0.1]; // Distribution

function getRandomCondition() {
  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < conditions.length; i++) {
    cumulative += conditionWeights[i];
    if (rand <= cumulative) return conditions[i];
  }
  return 'fair';
}

function getConditionScore(condition) {
  const scores = { excellent: 95, good: 80, fair: 60, poor: 40, critical: 20 };
  return scores[condition] + Math.floor(Math.random() * 10) - 5;
}

function getCostMultiplier(condition) {
  const multipliers = { excellent: 0.05, good: 0.15, fair: 0.35, poor: 0.6, critical: 0.85 };
  return multipliers[condition];
}

// Create assets
const assetIds = [];
for (const asset of assets) {
  const assetUniqueId = `ASSET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const [assetResult] = await connection.execute(
    `INSERT INTO assets (
      uniqueId, projectId, name, assetType, address, yearBuilt, grossFloorArea,
      numberOfStories, description, status, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      assetUniqueId,
      projectId,
      asset.name,
      asset.type,
      asset.address,
      asset.yearBuilt,
      asset.grossFloorArea,
      asset.stories,
      asset.description,
      "active"
    ]
  );
  assetIds.push({ id: assetResult.insertId, ...asset });
  console.log(`✅ Created asset: ${asset.name} (ID: ${assetResult.insertId})`);
}

// Create assessments for each asset
console.log("\n📋 Creating assessments for each asset...");
let totalDeferredMaintenance = 0;
let totalReplacementValue = 0;
let totalConditionScore = 0;
let assessmentCount = 0;

for (const asset of assetIds) {
  // Select 20-30 random components for each asset
  const numComponents = 20 + Math.floor(Math.random() * 11);
  const shuffled = [...uniformatComponents].sort(() => Math.random() - 0.5);
  const selectedComponents = shuffled.slice(0, numComponents);
  
  let assetAssessments = 0;
  for (const component of selectedComponents) {
    const condition = getRandomCondition();
    const conditionScore = getConditionScore(condition);
    const costMultiplier = getCostMultiplier(condition);
    
    // Calculate costs based on asset size and condition
    const sizeMultiplier = asset.grossFloorArea / 30000;
    const baseCost = component.costRange[0] + Math.random() * (component.costRange[1] - component.costRange[0]);
    const baseReplacement = component.replacementRange[0] + Math.random() * (component.replacementRange[1] - component.replacementRange[0]);
    
    const repairCost = Math.round(baseCost * costMultiplier * sizeMultiplier);
    const replacementValue = Math.round(baseReplacement * sizeMultiplier);
    
    // Calculate remaining life based on condition
    const maxLife = 30;
    const remainingLife = Math.round(maxLife * (conditionScore / 100));
    
    // Map condition to schema enum
    const conditionEnum = condition === 'excellent' || condition === 'good' ? 'good' : 
                          condition === 'fair' ? 'fair' : 'poor';
    
    await connection.execute(
      `INSERT INTO assessments (
        projectId, assetId, componentCode, componentName,
        condition, conditionScore,
        estimatedRepairCost, replacementValue, remainingUsefulLife,
        observations, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        projectId,
        asset.id,
        component.code,
        component.name,
        conditionEnum,
        conditionScore,
        repairCost,
        replacementValue,
        remainingLife,
        `Assessment of ${component.name} for ${asset.name}. Condition: ${condition}. Recommended action: ${condition === 'critical' ? 'Immediate replacement required' : condition === 'poor' ? 'Schedule replacement within 1-2 years' : 'Continue monitoring'}.`
      ]
    );
    
    totalDeferredMaintenance += repairCost;
    totalReplacementValue += replacementValue;
    totalConditionScore += conditionScore;
    assessmentCount++;
    assetAssessments++;
  }
  console.log(`  ✅ Created ${assetAssessments} assessments for ${asset.name}`);
}

// Create deficiencies
console.log("\n🔧 Creating deficiencies...");
const deficiencyTypes = [
  { title: "Structural Crack in Foundation", severity: "critical", priority: "immediate", costRange: [50000, 150000] },
  { title: "Roof Membrane Deterioration", severity: "high", priority: "short_term", costRange: [80000, 200000] },
  { title: "HVAC System Failure", severity: "high", priority: "immediate", costRange: [60000, 180000] },
  { title: "Electrical Panel Obsolescence", severity: "medium", priority: "short_term", costRange: [30000, 80000] },
  { title: "Fire Suppression System Deficiency", severity: "critical", priority: "immediate", costRange: [40000, 120000] },
  { title: "Elevator Modernization Required", severity: "medium", priority: "medium_term", costRange: [100000, 300000] },
  { title: "Window Seal Failures", severity: "low", priority: "medium_term", costRange: [20000, 60000] },
  { title: "Parking Structure Spalling", severity: "high", priority: "short_term", costRange: [70000, 200000] },
  { title: "Plumbing System Corrosion", severity: "medium", priority: "short_term", costRange: [35000, 100000] },
  { title: "ADA Compliance Issues", severity: "high", priority: "immediate", costRange: [25000, 75000] },
  { title: "Asbestos Abatement Required", severity: "critical", priority: "immediate", costRange: [80000, 250000] },
  { title: "Seismic Retrofit Needed", severity: "critical", priority: "short_term", costRange: [150000, 500000] },
  { title: "Energy Efficiency Upgrades", severity: "low", priority: "long_term", costRange: [50000, 150000] },
  { title: "Exterior Cladding Deterioration", severity: "medium", priority: "medium_term", costRange: [60000, 180000] },
  { title: "Drainage System Failure", severity: "high", priority: "short_term", costRange: [40000, 120000] }
];

let totalDeficiencies = 0;
for (const asset of assetIds) {
  // 3-6 deficiencies per asset
  const numDeficiencies = 3 + Math.floor(Math.random() * 4);
  const shuffledDeficiencies = [...deficiencyTypes].sort(() => Math.random() - 0.5);
  const selectedDeficiencies = shuffledDeficiencies.slice(0, numDeficiencies);
  
  // Get first assessment for this asset
  const [assessments] = await connection.execute(
    "SELECT id FROM assessments WHERE assetId = ? LIMIT 1",
    [asset.id]
  );
  const assessmentId = assessments[0]?.id;
  
  for (const deficiency of selectedDeficiencies) {
    const cost = deficiency.costRange[0] + Math.floor(Math.random() * (deficiency.costRange[1] - deficiency.costRange[0]));
    
    // Get a random component code from the UNIFORMAT list
    const randomComponent = uniformatComponents[Math.floor(Math.random() * uniformatComponents.length)];
    
    await connection.execute(
      `INSERT INTO deficiencies (
        projectId, assessmentId, componentCode, title, description,
        severity, priority, estimatedCost, status, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        projectId,
        assessmentId,
        randomComponent.code,
        deficiency.title,
        `${deficiency.title} identified at ${asset.name}. Requires attention based on ${deficiency.severity} severity rating. Estimated remediation cost: $${cost.toLocaleString()}.`,
        deficiency.severity,
        deficiency.priority,
        cost,
        "open"
      ]
    );
    
    totalDeferredMaintenance += cost;
    totalDeficiencies++;
  }
  console.log(`  ✅ Created ${numDeficiencies} deficiencies for ${asset.name}`);
}

// Calculate and update project metrics
const avgConditionScore = Math.round(totalConditionScore / assessmentCount);
const fci = totalReplacementValue > 0 ? (totalDeferredMaintenance / totalReplacementValue) : 0;

await connection.execute(
  `UPDATE projects SET 
    deferredMaintenanceCost = ?,
    currentReplacementValue = ?,
    ci = ?,
    fci = ?
  WHERE id = ?`,
  [
    totalDeferredMaintenance,
    totalReplacementValue,
    avgConditionScore,
    fci,
    projectId
  ]
);

console.log("\n📊 Summary:");
console.log(`   Project ID: ${projectId}`);
console.log(`   Unique ID: ${uniqueId}`);
console.log(`   Assets: ${assetIds.length}`);
console.log(`   Total Assessments: ${assessmentCount}`);
console.log(`   Total Deficiencies: ${totalDeficiencies}`);
console.log(`   Deferred Maintenance: $${totalDeferredMaintenance.toLocaleString()}`);
console.log(`   Replacement Value: $${totalReplacementValue.toLocaleString()}`);
console.log(`   FCI: ${(fci * 100).toFixed(2)}%`);
console.log(`   Average CI Score: ${avgConditionScore}`);

console.log("\n✅ Comprehensive demo project seed completed successfully!");
console.log("\n🎯 This project is ready to test:");
console.log("   - Portfolio Report with PDF Export");
console.log("   - Budget Allocation & Funding Gap Analysis");
console.log("   - AI-powered Compliance Checking");
console.log("   - Financial Planning & Forecasting");
console.log("   - Asset Prioritization");
console.log("   - Risk Assessment");

await connection.end();
