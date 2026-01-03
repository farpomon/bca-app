import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Mock assets for Project 7: Oakwood Corporate Tower Assessment (Commercial Office)
const project7Assets = [
  {
    projectId: 7,
    name: "Oakwood Tower - Parking Structure",
    assetCode: "OCT-002",
    description: "4-level underground parking structure with 450 spaces",
    address: "1250 Bay Street, Toronto, ON M5R 2A5",
    latitude: 43.6705,
    longitude: -79.3882,
    yearBuilt: 2008,
    squareFootage: 180000,
    numberOfFloors: 4,
    occupancyType: "occupied",
    ownershipType: "private",
    constructionType: "Reinforced Concrete",
    primaryUse: "Parking Structure",
    replacementValue: 25000000,
    status: "active",
    overallCondition: "good",
    fciScore: 0.08
  },
  {
    projectId: 7,
    name: "Oakwood Tower - Retail Podium",
    assetCode: "OCT-003",
    description: "3-storey retail podium with food court and shops",
    address: "1250 Bay Street, Toronto, ON M5R 2A5",
    latitude: 43.6706,
    longitude: -79.3881,
    yearBuilt: 2008,
    squareFootage: 75000,
    numberOfFloors: 3,
    occupancyType: "occupied",
    ownershipType: "private",
    constructionType: "Steel Frame with Curtain Wall",
    primaryUse: "Retail",
    replacementValue: 45000000,
    status: "active",
    overallCondition: "good",
    fciScore: 0.05
  },
  {
    projectId: 7,
    name: "Oakwood Tower - Mechanical Penthouse",
    assetCode: "OCT-004",
    description: "Rooftop mechanical equipment enclosure",
    address: "1250 Bay Street, Toronto, ON M5R 2A5",
    latitude: 43.6707,
    longitude: -79.3880,
    yearBuilt: 2008,
    squareFootage: 8500,
    numberOfFloors: 1,
    occupancyType: "occupied",
    ownershipType: "private",
    constructionType: "Steel Frame",
    primaryUse: "Mechanical",
    replacementValue: 5000000,
    status: "active",
    overallCondition: "fair",
    fciScore: 0.15
  },
  {
    projectId: 7,
    name: "Oakwood Tower - Loading Dock",
    assetCode: "OCT-005",
    description: "Service area with 6 loading bays",
    address: "1248 Bay Street, Toronto, ON M5R 2A5",
    latitude: 43.6704,
    longitude: -79.3883,
    yearBuilt: 2008,
    squareFootage: 12000,
    numberOfFloors: 1,
    occupancyType: "occupied",
    ownershipType: "private",
    constructionType: "Reinforced Concrete",
    primaryUse: "Service/Loading",
    replacementValue: 3500000,
    status: "active",
    overallCondition: "fair",
    fciScore: 0.12
  }
];

// Mock assets for Project 8: Riverside Community Center Assessment (Municipal Recreation)
const project8Assets = [
  {
    projectId: 8,
    name: "Riverside CC - Aquatic Center",
    assetCode: "RCC-002",
    description: "Indoor pool complex with Olympic-size pool and leisure pool",
    address: "455 Riverside Drive, Vancouver, BC V6B 3K9",
    latitude: 49.2827,
    longitude: -123.1207,
    yearBuilt: 2005,
    yearRenovated: 2018,
    squareFootage: 45000,
    numberOfFloors: 2,
    occupancyType: "occupied",
    ownershipType: "municipal",
    constructionType: "Steel Frame with Masonry",
    primaryUse: "Recreation/Aquatic",
    replacementValue: 28000000,
    status: "active",
    overallCondition: "good",
    fciScore: 0.09
  },
  {
    projectId: 8,
    name: "Riverside CC - Gymnasium",
    assetCode: "RCC-003",
    description: "Multi-purpose gymnasium with basketball courts",
    address: "460 Riverside Drive, Vancouver, BC V6B 3K9",
    latitude: 49.2828,
    longitude: -123.1205,
    yearBuilt: 2005,
    squareFootage: 25000,
    numberOfFloors: 2,
    occupancyType: "occupied",
    ownershipType: "municipal",
    constructionType: "Steel Frame",
    primaryUse: "Recreation/Sports",
    replacementValue: 15000000,
    status: "active",
    overallCondition: "good",
    fciScore: 0.07
  },
  {
    projectId: 8,
    name: "Riverside CC - Ice Arena",
    assetCode: "RCC-004",
    description: "NHL-size ice rink with seating for 1,500",
    address: "465 Riverside Drive, Vancouver, BC V6B 3K9",
    latitude: 49.2829,
    longitude: -123.1203,
    yearBuilt: 2005,
    squareFootage: 55000,
    numberOfFloors: 1,
    occupancyType: "occupied",
    ownershipType: "municipal",
    constructionType: "Steel Frame with Metal Cladding",
    primaryUse: "Recreation/Ice Sports",
    replacementValue: 35000000,
    status: "active",
    overallCondition: "fair",
    fciScore: 0.18
  },
  {
    projectId: 8,
    name: "Riverside CC - Fitness Center",
    assetCode: "RCC-005",
    description: "Modern fitness facility with cardio and weight areas",
    address: "470 Riverside Drive, Vancouver, BC V6B 3K9",
    latitude: 49.2830,
    longitude: -123.1201,
    yearBuilt: 2010,
    squareFootage: 18000,
    numberOfFloors: 2,
    occupancyType: "occupied",
    ownershipType: "municipal",
    constructionType: "Steel Frame with Curtain Wall",
    primaryUse: "Recreation/Fitness",
    replacementValue: 12000000,
    status: "active",
    overallCondition: "excellent",
    fciScore: 0.03
  },
  {
    projectId: 8,
    name: "Riverside CC - Outdoor Sports Fields",
    assetCode: "RCC-006",
    description: "Multi-use sports fields with lighting and bleachers",
    address: "480 Riverside Drive, Vancouver, BC V6B 3K9",
    latitude: 49.2831,
    longitude: -123.1199,
    yearBuilt: 2005,
    yearRenovated: 2020,
    squareFootage: 200000,
    numberOfFloors: 1,
    occupancyType: "occupied",
    ownershipType: "municipal",
    constructionType: "Open Air Structure",
    primaryUse: "Recreation/Outdoor Sports",
    replacementValue: 8000000,
    status: "active",
    overallCondition: "good",
    fciScore: 0.06
  }
];

// Mock assets for Project 9: Heritage Manor Condominiums Assessment (Multi-Unit Residential)
const project9Assets = [
  {
    projectId: 9,
    name: "Heritage Manor - Tower C",
    assetCode: "HM-001C",
    description: "18-storey residential tower with 85 units",
    address: "829 Heritage Boulevard, Calgary, AB T2P 4K3",
    latitude: 51.0447,
    longitude: -114.0719,
    yearBuilt: 2012,
    squareFootage: 125000,
    numberOfFloors: 18,
    numberOfUnits: 85,
    occupancyType: "occupied",
    ownershipType: "private",
    constructionType: "Reinforced Concrete",
    primaryUse: "Multi-Unit Residential",
    replacementValue: 42000000,
    status: "active",
    overallCondition: "good",
    fciScore: 0.06
  },
  {
    projectId: 9,
    name: "Heritage Manor - Amenity Building",
    assetCode: "HM-002",
    description: "Clubhouse with pool, gym, and party room",
    address: "831 Heritage Boulevard, Calgary, AB T2P 4K3",
    latitude: 51.0448,
    longitude: -114.0717,
    yearBuilt: 2012,
    squareFootage: 15000,
    numberOfFloors: 2,
    occupancyType: "occupied",
    ownershipType: "private",
    constructionType: "Steel Frame with Masonry",
    primaryUse: "Amenity/Recreation",
    replacementValue: 8500000,
    status: "active",
    overallCondition: "excellent",
    fciScore: 0.04
  },
  {
    projectId: 9,
    name: "Heritage Manor - Underground Parking P1",
    assetCode: "HM-003",
    description: "Underground parking level 1 with 150 spaces",
    address: "825 Heritage Boulevard, Calgary, AB T2P 4K3",
    latitude: 51.0446,
    longitude: -114.0720,
    yearBuilt: 2012,
    squareFootage: 55000,
    numberOfFloors: 1,
    occupancyType: "occupied",
    ownershipType: "private",
    constructionType: "Reinforced Concrete",
    primaryUse: "Parking Structure",
    replacementValue: 12000000,
    status: "active",
    overallCondition: "fair",
    fciScore: 0.14
  },
  {
    projectId: 9,
    name: "Heritage Manor - Underground Parking P2",
    assetCode: "HM-004",
    description: "Underground parking level 2 with 150 spaces",
    address: "825 Heritage Boulevard, Calgary, AB T2P 4K3",
    latitude: 51.0446,
    longitude: -114.0720,
    yearBuilt: 2012,
    squareFootage: 55000,
    numberOfFloors: 1,
    occupancyType: "occupied",
    ownershipType: "private",
    constructionType: "Reinforced Concrete",
    primaryUse: "Parking Structure",
    replacementValue: 12000000,
    status: "active",
    overallCondition: "fair",
    fciScore: 0.16
  },
  {
    projectId: 9,
    name: "Heritage Manor - Visitor Parking Structure",
    assetCode: "HM-005",
    description: "Above-ground visitor parking with 50 spaces",
    address: "833 Heritage Boulevard, Calgary, AB T2P 4K3",
    latitude: 51.0449,
    longitude: -114.0715,
    yearBuilt: 2012,
    squareFootage: 18000,
    numberOfFloors: 2,
    occupancyType: "occupied",
    ownershipType: "private",
    constructionType: "Steel Frame",
    primaryUse: "Parking Structure",
    replacementValue: 4500000,
    status: "active",
    overallCondition: "good",
    fciScore: 0.08
  },
  {
    projectId: 9,
    name: "Heritage Manor - Maintenance Building",
    assetCode: "HM-006",
    description: "Maintenance workshop and storage facility",
    address: "835 Heritage Boulevard, Calgary, AB T2P 4K3",
    latitude: 51.0450,
    longitude: -114.0713,
    yearBuilt: 2012,
    squareFootage: 5000,
    numberOfFloors: 1,
    occupancyType: "occupied",
    ownershipType: "private",
    constructionType: "Steel Frame with Metal Cladding",
    primaryUse: "Maintenance/Storage",
    replacementValue: 1500000,
    status: "active",
    overallCondition: "good",
    fciScore: 0.07
  }
];

const allAssets = [...project7Assets, ...project8Assets, ...project9Assets];

console.log(`Inserting ${allAssets.length} mock assets...`);

for (const asset of allAssets) {
  const query = `
    INSERT INTO assets (
      projectId, name, assetCode, description, address, latitude, longitude,
      yearBuilt, yearRenovated, squareFootage, numberOfFloors, numberOfUnits,
      occupancyType, ownershipType, constructionType, primaryUse,
      replacementValue, status, overallCondition, fciScore, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;
  
  const values = [
    asset.projectId,
    asset.name,
    asset.assetCode,
    asset.description,
    asset.address,
    asset.latitude,
    asset.longitude,
    asset.yearBuilt,
    asset.yearRenovated || null,
    asset.squareFootage,
    asset.numberOfFloors,
    asset.numberOfUnits || null,
    asset.occupancyType,
    asset.ownershipType,
    asset.constructionType,
    asset.primaryUse,
    asset.replacementValue,
    asset.status,
    asset.overallCondition,
    asset.fciScore
  ];
  
  try {
    await connection.execute(query, values);
    console.log(`  ✓ Added: ${asset.name}`);
  } catch (err) {
    console.error(`  ✗ Failed to add ${asset.name}:`, err.message);
  }
}

// Verify the counts
const [counts] = await connection.execute(`
  SELECT p.id, p.name as projectName, COUNT(a.id) as assetCount
  FROM projects p
  LEFT JOIN assets a ON p.id = a.projectId
  WHERE p.id IN (7, 8, 9)
  GROUP BY p.id, p.name
  ORDER BY p.id
`);

console.log('\nUpdated asset counts:');
counts.forEach(c => console.log(`  Project ${c.id} (${c.projectName}): ${c.assetCount} assets`));

await connection.end();
console.log('\nDone!');
