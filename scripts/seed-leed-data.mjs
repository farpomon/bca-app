import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log('Seeding LEED v5 reference data...');
  
  // Canadian Grid Carbon Intensity Data (2024)
  const gridData = [
    { region: 'Alberta', avgEmissionFactor: 540.0, renewablePercent: 25, coalPercent: 35, naturalGasPercent: 40, projectedEmissionFactor2030: 350 },
    { region: 'British Columbia', avgEmissionFactor: 11.0, hydroPercent: 91, naturalGasPercent: 8, renewablePercent: 92, projectedEmissionFactor2030: 8 },
    { region: 'Manitoba', avgEmissionFactor: 3.0, hydroPercent: 97, renewablePercent: 98, projectedEmissionFactor2030: 2 },
    { region: 'New Brunswick', avgEmissionFactor: 290.0, nuclearPercent: 35, hydroPercent: 20, naturalGasPercent: 25, coalPercent: 15, projectedEmissionFactor2030: 180 },
    { region: 'Newfoundland and Labrador', avgEmissionFactor: 30.0, hydroPercent: 95, renewablePercent: 96, projectedEmissionFactor2030: 20 },
    { region: 'Nova Scotia', avgEmissionFactor: 670.0, coalPercent: 50, naturalGasPercent: 20, renewablePercent: 25, projectedEmissionFactor2030: 400 },
    { region: 'Ontario', avgEmissionFactor: 40.0, nuclearPercent: 60, hydroPercent: 25, naturalGasPercent: 10, renewablePercent: 30, projectedEmissionFactor2030: 30 },
    { region: 'Prince Edward Island', avgEmissionFactor: 5.0, windPercent: 95, renewablePercent: 98, projectedEmissionFactor2030: 3 },
    { region: 'Quebec', avgEmissionFactor: 2.0, hydroPercent: 95, windPercent: 3, renewablePercent: 99, projectedEmissionFactor2030: 1 },
    { region: 'Saskatchewan', avgEmissionFactor: 650.0, coalPercent: 40, naturalGasPercent: 40, renewablePercent: 15, projectedEmissionFactor2030: 450 },
    { region: 'Northwest Territories', avgEmissionFactor: 180.0, hydroPercent: 70, naturalGasPercent: 25, projectedEmissionFactor2030: 120 },
    { region: 'Nunavut', avgEmissionFactor: 800.0, naturalGasPercent: 5, otherPercent: 95, projectedEmissionFactor2030: 600 },
    { region: 'Yukon', avgEmissionFactor: 50.0, hydroPercent: 90, naturalGasPercent: 8, projectedEmissionFactor2030: 30 },
  ];

  for (const data of gridData) {
    await connection.execute(`
      INSERT INTO grid_carbon_intensity 
      (region, country, year, avgEmissionFactor, renewablePercent, nuclearPercent, naturalGasPercent, coalPercent, hydroPercent, windPercent, solarPercent, otherPercent, projectedEmissionFactor2030, dataSource)
      VALUES (?, 'Canada', 2024, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Canada Energy Regulator / Environment and Climate Change Canada')
      ON DUPLICATE KEY UPDATE avgEmissionFactor = VALUES(avgEmissionFactor)
    `, [
      data.region, data.avgEmissionFactor, data.renewablePercent || 0, data.nuclearPercent || 0,
      data.naturalGasPercent || 0, data.coalPercent || 0, data.hydroPercent || 0,
      data.windPercent || 0, data.solarPercent || 0, data.otherPercent || 0, data.projectedEmissionFactor2030
    ]);
  }
  console.log('✓ Seeded Canadian grid carbon intensity data');

  // LEED v5 Credits - Energy & Atmosphere
  const leedCredits = [
    // Prerequisites
    { code: 'EAp1', name: 'Minimum Energy Performance', category: 'EA', type: 'prerequisite', points: 0, decarb: 1 },
    { code: 'EAp2', name: 'Building-Level Energy Metering', category: 'EA', type: 'prerequisite', points: 0, decarb: 1 },
    { code: 'EAp3', name: 'Fundamental Refrigerant Management', category: 'EA', type: 'prerequisite', points: 0, decarb: 1 },
    // Credits
    { code: 'EAc1', name: 'Optimize Energy Performance', category: 'EA', type: 'credit', points: 20, decarb: 1 },
    { code: 'EAc2', name: 'Grid Harmonization', category: 'EA', type: 'credit', points: 2, decarb: 1 },
    { code: 'EAc3', name: 'Advanced Energy Metering', category: 'EA', type: 'credit', points: 1, decarb: 1 },
    { code: 'EAc4', name: 'Demand Response', category: 'EA', type: 'credit', points: 2, decarb: 1 },
    { code: 'EAc5', name: 'Renewable Energy', category: 'EA', type: 'credit', points: 5, decarb: 1 },
    { code: 'EAc6', name: 'Enhanced Commissioning', category: 'EA', type: 'credit', points: 6, decarb: 1 },
    { code: 'EAc7', name: 'Enhanced Refrigerant Management', category: 'EA', type: 'credit', points: 2, decarb: 1 },
    // Materials & Resources
    { code: 'MRp1', name: 'Planning for Zero Waste Operations', category: 'MR', type: 'prerequisite', points: 0, decarb: 1, eco: 1 },
    { code: 'MRc1', name: 'Building Life-Cycle Impact Reduction', category: 'MR', type: 'credit', points: 5, decarb: 1, eco: 1 },
    { code: 'MRc2', name: 'Reduce Embodied Carbon', category: 'MR', type: 'credit', points: 6, decarb: 1 },
    { code: 'MRc3', name: 'Environmental Product Declarations', category: 'MR', type: 'credit', points: 2, decarb: 1, eco: 1 },
    { code: 'MRc4', name: 'Sourcing of Raw Materials', category: 'MR', type: 'credit', points: 2, eco: 1 },
    { code: 'MRc5', name: 'Material Ingredients', category: 'MR', type: 'credit', points: 2, qol: 1, eco: 1 },
    { code: 'MRc6', name: 'Construction and Demolition Waste Management', category: 'MR', type: 'credit', points: 2, eco: 1 },
    // Water Efficiency
    { code: 'WEp1', name: 'Outdoor Water Use Reduction', category: 'WE', type: 'prerequisite', points: 0, eco: 1 },
    { code: 'WEp2', name: 'Indoor Water Use Reduction', category: 'WE', type: 'prerequisite', points: 0, eco: 1 },
    { code: 'WEp3', name: 'Building-Level Water Metering', category: 'WE', type: 'prerequisite', points: 0, eco: 1 },
    { code: 'WEc1', name: 'Outdoor Water Use Reduction', category: 'WE', type: 'credit', points: 2, eco: 1 },
    { code: 'WEc2', name: 'Indoor Water Use Reduction', category: 'WE', type: 'credit', points: 6, eco: 1 },
    { code: 'WEc3', name: 'Cooling Tower Water Use', category: 'WE', type: 'credit', points: 2, eco: 1 },
    { code: 'WEc4', name: 'Water Metering', category: 'WE', type: 'credit', points: 1, eco: 1 },
    // Indoor Environmental Quality
    { code: 'EQp1', name: 'Minimum Indoor Air Quality Performance', category: 'EQ', type: 'prerequisite', points: 0, qol: 1 },
    { code: 'EQp2', name: 'Environmental Tobacco Smoke Control', category: 'EQ', type: 'prerequisite', points: 0, qol: 1 },
    { code: 'EQc1', name: 'Enhanced Indoor Air Quality Strategies', category: 'EQ', type: 'credit', points: 2, qol: 1 },
    { code: 'EQc2', name: 'Low-Emitting Materials', category: 'EQ', type: 'credit', points: 3, qol: 1 },
    { code: 'EQc3', name: 'Construction Indoor Air Quality Management Plan', category: 'EQ', type: 'credit', points: 1, qol: 1 },
    { code: 'EQc4', name: 'Indoor Air Quality Assessment', category: 'EQ', type: 'credit', points: 2, qol: 1 },
    { code: 'EQc5', name: 'Thermal Comfort', category: 'EQ', type: 'credit', points: 1, qol: 1 },
    { code: 'EQc6', name: 'Interior Lighting', category: 'EQ', type: 'credit', points: 2, qol: 1 },
    { code: 'EQc7', name: 'Daylight', category: 'EQ', type: 'credit', points: 3, qol: 1 },
    { code: 'EQc8', name: 'Quality Views', category: 'EQ', type: 'credit', points: 1, qol: 1 },
    { code: 'EQc9', name: 'Acoustic Performance', category: 'EQ', type: 'credit', points: 1, qol: 1 },
  ];

  for (const credit of leedCredits) {
    await connection.execute(`
      INSERT INTO leed_credits 
      (creditCode, creditName, category, creditType, maxPoints, impactDecarbonization, impactQualityOfLife, impactEcologicalConservation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE creditName = VALUES(creditName)
    `, [
      credit.code, credit.name, credit.category, credit.type, credit.points,
      credit.decarb || 0, credit.qol || 0, credit.eco || 0
    ]);
  }
  console.log('✓ Seeded LEED v5 credits');

  // Building Performance Factors (ASHRAE 90.1-2019)
  const bpfData = [
    // Multifamily
    { type: 'Multifamily (4-7 stories)', zones: { '1A': 0.53, '2A': 0.55, '2B': 0.54, '3A': 0.58, '3B': 0.56, '3C': 0.57, '4A': 0.62, '4B': 0.60, '4C': 0.61, '5A': 0.66, '5B': 0.64, '6A': 0.70, '6B': 0.68, '7': 0.72, '8': 0.74 }},
    // Office
    { type: 'Office (Large)', zones: { '1A': 0.45, '2A': 0.48, '2B': 0.47, '3A': 0.52, '3B': 0.50, '3C': 0.51, '4A': 0.56, '4B': 0.54, '4C': 0.55, '5A': 0.60, '5B': 0.58, '6A': 0.65, '6B': 0.63, '7': 0.68, '8': 0.72 }},
    // Retail
    { type: 'Retail (Stand Alone)', zones: { '1A': 0.36, '2A': 0.38, '2B': 0.37, '3A': 0.42, '3B': 0.40, '3C': 0.41, '4A': 0.46, '4B': 0.44, '4C': 0.45, '5A': 0.50, '5B': 0.48, '6A': 0.54, '6B': 0.52, '7': 0.56, '8': 0.60 }},
    // Healthcare
    { type: 'Healthcare (Hospital)', zones: { '1A': 0.62, '2A': 0.64, '2B': 0.63, '3A': 0.67, '3B': 0.65, '3C': 0.66, '4A': 0.70, '4B': 0.68, '4C': 0.69, '5A': 0.73, '5B': 0.71, '6A': 0.76, '6B': 0.74, '7': 0.77, '8': 0.79 }},
    // School
    { type: 'School (Primary)', zones: { '1A': 0.44, '2A': 0.46, '2B': 0.45, '3A': 0.48, '3B': 0.47, '3C': 0.47, '4A': 0.50, '4B': 0.49, '4C': 0.49, '5A': 0.52, '5B': 0.51, '6A': 0.55, '6B': 0.54, '7': 0.56, '8': 0.58 }},
    // Warehouse
    { type: 'Warehouse (Non-Refrigerated)', zones: { '1A': 0.17, '2A': 0.20, '2B': 0.19, '3A': 0.24, '3B': 0.22, '3C': 0.23, '4A': 0.28, '4B': 0.26, '4C': 0.27, '5A': 0.32, '5B': 0.30, '6A': 0.37, '6B': 0.35, '7': 0.40, '8': 0.44 }},
  ];

  for (const bpf of bpfData) {
    for (const [zone, value] of Object.entries(bpf.zones)) {
      await connection.execute(`
        INSERT INTO building_performance_factors 
        (buildingType, ashraeStandard, climateZone, bpf)
        VALUES (?, '90.1-2019', ?, ?)
        ON DUPLICATE KEY UPDATE bpf = VALUES(bpf)
      `, [bpf.type, zone, value]);
    }
  }
  console.log('✓ Seeded Building Performance Factors');

  // Common Embodied Carbon Materials
  const materials = [
    { category: 'Concrete', name: 'Ready-mix concrete (30 MPa)', gwp: 320, unit: 'm3' },
    { category: 'Concrete', name: 'Ready-mix concrete (40 MPa)', gwp: 380, unit: 'm3' },
    { category: 'Concrete', name: 'Precast concrete', gwp: 290, unit: 'm3' },
    { category: 'Concrete', name: 'Low-carbon concrete (30% SCM)', gwp: 240, unit: 'm3' },
    { category: 'Steel', name: 'Structural steel (hot-rolled)', gwp: 1.95, unit: 'kg' },
    { category: 'Steel', name: 'Reinforcing steel (rebar)', gwp: 1.20, unit: 'kg' },
    { category: 'Steel', name: 'Steel deck', gwp: 2.10, unit: 'kg' },
    { category: 'Wood', name: 'Softwood lumber', gwp: 0.35, unit: 'kg' },
    { category: 'Wood', name: 'Cross-laminated timber (CLT)', gwp: 0.40, unit: 'kg' },
    { category: 'Wood', name: 'Glulam beam', gwp: 0.45, unit: 'kg' },
    { category: 'Insulation', name: 'Mineral wool', gwp: 1.20, unit: 'kg' },
    { category: 'Insulation', name: 'XPS foam board', gwp: 8.50, unit: 'kg' },
    { category: 'Insulation', name: 'EPS foam board', gwp: 3.30, unit: 'kg' },
    { category: 'Glass', name: 'Float glass', gwp: 1.30, unit: 'kg' },
    { category: 'Glass', name: 'Double-glazed IGU', gwp: 35.0, unit: 'm2' },
    { category: 'Aluminum', name: 'Aluminum extrusion', gwp: 8.50, unit: 'kg' },
    { category: 'Aluminum', name: 'Aluminum curtain wall', gwp: 12.0, unit: 'kg' },
    { category: 'Gypsum', name: 'Gypsum board', gwp: 0.35, unit: 'kg' },
    { category: 'Masonry', name: 'Clay brick', gwp: 0.24, unit: 'kg' },
    { category: 'Masonry', name: 'Concrete masonry unit (CMU)', gwp: 0.12, unit: 'kg' },
  ];

  for (const mat of materials) {
    await connection.execute(`
      INSERT INTO embodied_carbon_materials 
      (materialCategory, materialName, gwpPerUnit, unit, lcaModulesIncluded, dataSource)
      VALUES (?, ?, ?, ?, 'A1-A3', 'CLF Material Baselines / Industry EPDs')
      ON DUPLICATE KEY UPDATE gwpPerUnit = VALUES(gwpPerUnit)
    `, [mat.category, mat.name, mat.gwp, mat.unit]);
  }
  console.log('✓ Seeded embodied carbon materials');

  console.log('\n✅ All LEED v5 reference data seeded successfully!');
  
  await connection.end();
}

main().catch(console.error);
