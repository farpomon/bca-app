import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log('Seeding database...');
  
  // Insert municipalities
  console.log('Creating municipalities...');
  await connection.execute(`
    INSERT INTO municipalities (name, code, state, population, contactEmail, contactPhone, address) VALUES
    ('Springfield', 'SPR', 'Illinois', 116250, 'admin@springfield.gov', '(217) 555-0100', '800 E Monroe St, Springfield, IL 62701'),
    ('Riverside', 'RVS', 'California', 314998, 'contact@riverside.gov', '(951) 555-0200', '3900 Main St, Riverside, CA 92522'),
    ('Lakewood', 'LKW', 'Colorado', 155984, 'info@lakewood.gov', '(303) 555-0300', '480 S Allison Pkwy, Lakewood, CO 80226')
    ON DUPLICATE KEY UPDATE name = VALUES(name)
  `);
  
  // Insert asset categories
  console.log('Creating asset categories...');
  await connection.execute(`
    INSERT INTO assetCategories (name, code, description, icon, color) VALUES
    ('Municipal Buildings', 'BLDG', 'Government and administrative buildings', 'building', '#3B82F6'),
    ('Schools', 'SCH', 'Educational facilities', 'school', '#10B981'),
    ('Parks & Recreation', 'PARK', 'Parks and recreational facilities', 'trees', '#22C55E'),
    ('Public Safety', 'SAFE', 'Fire stations, police stations', 'shield', '#EF4444'),
    ('Infrastructure', 'INFRA', 'Roads, bridges, utilities', 'road', '#F59E0B'),
    ('Libraries', 'LIB', 'Public libraries', 'book-open', '#8B5CF6')
    ON DUPLICATE KEY UPDATE name = VALUES(name)
  `);
  
  // Insert assessment components
  console.log('Creating assessment components...');
  await connection.execute(`
    INSERT INTO assessmentComponents (name, code, category, description, expectedLifespan, sortOrder) VALUES
    ('Foundation', 'FOUND', 'structural', 'Building foundation and footings', 75, 1),
    ('Structural Frame', 'FRAME', 'structural', 'Load-bearing walls, columns, beams', 50, 2),
    ('Exterior Walls', 'EXTWALL', 'exterior', 'Exterior cladding, siding, masonry', 40, 3),
    ('Windows', 'WIN', 'exterior', 'Windows and glazing systems', 25, 4),
    ('Doors', 'DOOR', 'exterior', 'Exterior and interior doors', 30, 5),
    ('Roof Covering', 'ROOF', 'roofing', 'Roof membrane, shingles, tiles', 20, 6),
    ('Roof Structure', 'ROOFSTR', 'roofing', 'Roof deck, trusses, rafters', 50, 7),
    ('Plumbing Fixtures', 'PLUMBFIX', 'plumbing', 'Sinks, toilets, faucets', 20, 8),
    ('Plumbing Piping', 'PLUMBPIPE', 'plumbing', 'Water supply and drain piping', 40, 9),
    ('Electrical Distribution', 'ELECDIST', 'electrical', 'Panels, breakers, wiring', 35, 10),
    ('Lighting', 'LIGHT', 'electrical', 'Interior and exterior lighting', 15, 11),
    ('HVAC Equipment', 'HVACEQ', 'hvac', 'Furnaces, AC units, heat pumps', 15, 12),
    ('HVAC Distribution', 'HVACDIST', 'hvac', 'Ductwork, piping, controls', 30, 13),
    ('Interior Finishes', 'INTFIN', 'interior', 'Flooring, ceilings, wall finishes', 15, 14),
    ('Fire Alarm', 'FIREALM', 'fire_safety', 'Fire detection and alarm systems', 15, 15),
    ('Fire Suppression', 'FIRESUPP', 'fire_safety', 'Sprinklers, extinguishers', 25, 16),
    ('ADA Compliance', 'ADA', 'accessibility', 'Accessibility features and compliance', 20, 17),
    ('Site Paving', 'SITEPAVE', 'site', 'Parking lots, sidewalks, driveways', 20, 18),
    ('Site Utilities', 'SITEUTIL', 'site', 'Storm drainage, site lighting', 30, 19),
    ('Landscaping', 'LANDSCAPE', 'site', 'Trees, shrubs, irrigation', 15, 20)
    ON DUPLICATE KEY UPDATE name = VALUES(name)
  `);
  
  // Insert projects - 3 projects with different municipalities
  console.log('Creating projects...');
  await connection.execute(`
    INSERT INTO projects (municipalityId, name, description, projectNumber, status, priority, startDate, dueDate, budget, clientContact, clientEmail) VALUES
    (1, '2024 Municipal Building Assessment', 'Comprehensive condition assessment of all municipal buildings in Springfield', 'SPR-2024-001', 'in_progress', 'high', '2024-01-15', '2024-06-30', 150000.00, 'John Smith', 'jsmith@springfield.gov'),
    (2, 'Riverside Schools FCA', 'Facility Condition Assessment for Riverside Unified School District', 'RVS-2024-002', 'in_progress', 'critical', '2024-02-01', '2024-08-31', 275000.00, 'Maria Garcia', 'mgarcia@riverside.gov'),
    (3, 'Lakewood Parks Assessment', 'Condition assessment of parks and recreation facilities', 'LKW-2024-003', 'draft', 'medium', '2024-03-01', '2024-09-30', 95000.00, 'Robert Johnson', 'rjohnson@lakewood.gov')
    ON DUPLICATE KEY UPDATE name = VALUES(name)
  `);
  
  // Insert assets for Project 1 (Springfield - 10 assets)
  console.log('Creating assets for Springfield...');
  const springfieldAssets = [
    ['City Hall', 'SPR-001', 1, 1, '800 E Monroe St', 39.7983, -89.6437, 1925, 1985, 45000, 3, 'occupied', 'municipal', 'Masonry', 'Government Administration'],
    ['Public Works Building', 'SPR-002', 1, 1, '300 S 7th St', 39.7945, -89.6489, 1962, 2005, 28000, 2, 'occupied', 'municipal', 'Steel Frame', 'Maintenance Facility'],
    ['Central Fire Station', 'SPR-003', 1, 4, '421 E Washington St', 39.7998, -89.6412, 1978, 2010, 15000, 2, 'occupied', 'municipal', 'Masonry', 'Fire Station'],
    ['Main Library', 'SPR-004', 1, 6, '326 S 7th St', 39.7941, -89.6489, 1970, 2015, 52000, 2, 'occupied', 'municipal', 'Concrete', 'Library'],
    ['Recreation Center', 'SPR-005', 1, 3, '2500 S 11th St', 39.7712, -89.6534, 1988, null, 35000, 1, 'occupied', 'municipal', 'Steel Frame', 'Recreation'],
    ['Police Headquarters', 'SPR-006', 1, 4, '800 E Monroe St', 39.7983, -89.6437, 1995, null, 42000, 3, 'occupied', 'municipal', 'Concrete', 'Police Station'],
    ['Senior Center', 'SPR-007', 1, 1, '2603 S Sunrise Dr', 39.7689, -89.6123, 1982, 2008, 18000, 1, 'occupied', 'municipal', 'Wood Frame', 'Community Center'],
    ['Water Treatment Plant', 'SPR-008', 1, 5, '1800 Lakeside Dr', 39.8123, -89.6234, 1965, 2012, 85000, 1, 'occupied', 'municipal', 'Concrete', 'Utility'],
    ['Municipal Parking Garage', 'SPR-009', 1, 5, '500 E Capitol Ave', 39.8012, -89.6445, 1990, null, 120000, 4, 'occupied', 'municipal', 'Concrete', 'Parking'],
    ['Community Health Center', 'SPR-010', 1, 1, '1900 E Washington St', 39.7998, -89.6312, 2001, null, 32000, 2, 'occupied', 'municipal', 'Steel Frame', 'Healthcare']
  ];
  
  for (const asset of springfieldAssets) {
    await connection.execute(`
      INSERT INTO assets (name, assetCode, projectId, categoryId, address, latitude, longitude, yearBuilt, yearRenovated, squareFootage, numberOfFloors, occupancyType, ownershipType, constructionType, primaryUse, overallCondition, fciScore)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'good', 0.15)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `, asset);
  }
  
  // Insert assets for Project 2 (Riverside Schools - 25 assets)
  console.log('Creating assets for Riverside Schools...');
  const schoolNames = [
    'Lincoln Elementary', 'Washington Elementary', 'Jefferson Elementary', 'Roosevelt Elementary', 'Kennedy Elementary',
    'Adams Middle School', 'Madison Middle School', 'Monroe Middle School',
    'Riverside High School', 'Central High School', 'North High School',
    'District Admin Building', 'Transportation Center', 'Maintenance Facility', 'Athletic Complex',
    'Franklin Elementary', 'Hamilton Elementary', 'Jackson Elementary', 'Tyler Elementary', 'Polk Elementary',
    'Harrison Middle School', 'Van Buren Middle School',
    'South High School', 'East High School', 'West High School'
  ];
  
  for (let i = 0; i < 25; i++) {
    const yearBuilt = 1950 + Math.floor(Math.random() * 50);
    const sqft = 20000 + Math.floor(Math.random() * 80000);
    const floors = Math.floor(Math.random() * 3) + 1;
    const condition = ['excellent', 'good', 'fair', 'poor'][Math.floor(Math.random() * 4)];
    const fci = (Math.random() * 0.4).toFixed(4);
    
    await connection.execute(`
      INSERT INTO assets (name, assetCode, projectId, categoryId, address, latitude, longitude, yearBuilt, squareFootage, numberOfFloors, occupancyType, ownershipType, constructionType, primaryUse, overallCondition, fciScore)
      VALUES (?, ?, 2, 2, ?, ?, ?, ?, ?, ?, 'occupied', 'municipal', 'Masonry', 'Education', ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `, [
      schoolNames[i],
      `RVS-${String(i + 1).padStart(3, '0')}`,
      `${1000 + i * 100} Education Blvd, Riverside, CA`,
      33.9533 + (Math.random() - 0.5) * 0.1,
      -117.3962 + (Math.random() - 0.5) * 0.1,
      yearBuilt,
      sqft,
      floors,
      condition,
      fci
    ]);
  }
  
  // Insert assets for Project 3 (Lakewood Parks - 50 assets)
  console.log('Creating assets for Lakewood Parks...');
  const parkFacilities = [
    'Community Park Pavilion', 'Sports Complex Main Building', 'Aquatic Center', 'Golf Course Clubhouse', 'Tennis Center',
    'Soccer Complex Restrooms', 'Baseball Diamond Concessions', 'Skate Park Facility', 'Dog Park Shelter', 'Nature Center',
    'Trail Head Building', 'Boat House', 'Amphitheater', 'Bandshell', 'Picnic Pavilion A',
    'Picnic Pavilion B', 'Picnic Pavilion C', 'Maintenance Shed 1', 'Maintenance Shed 2', 'Maintenance Shed 3',
    'Restroom Building 1', 'Restroom Building 2', 'Restroom Building 3', 'Restroom Building 4', 'Restroom Building 5',
    'Pool House', 'Splash Pad Equipment', 'Playground Shelter 1', 'Playground Shelter 2', 'Playground Shelter 3',
    'Basketball Court Pavilion', 'Volleyball Court Shelter', 'Fishing Pier Structure', 'Observation Deck', 'Wildlife Blind',
    'Garden Center', 'Greenhouse', 'Equipment Storage 1', 'Equipment Storage 2', 'Equipment Storage 3',
    'Ranger Station', 'Visitor Center', 'Gift Shop', 'Cafe Building', 'Event Center',
    'Wedding Pavilion', 'Memorial Garden Shelter', 'Veterans Memorial', 'Fountain Structure', 'Clock Tower'
  ];
  
  for (let i = 0; i < 50; i++) {
    const yearBuilt = 1970 + Math.floor(Math.random() * 40);
    const sqft = 500 + Math.floor(Math.random() * 10000);
    const condition = ['excellent', 'good', 'fair', 'poor', 'critical'][Math.floor(Math.random() * 5)];
    const fci = (Math.random() * 0.5).toFixed(4);
    
    await connection.execute(`
      INSERT INTO assets (name, assetCode, projectId, categoryId, address, latitude, longitude, yearBuilt, squareFootage, numberOfFloors, occupancyType, ownershipType, constructionType, primaryUse, overallCondition, fciScore)
      VALUES (?, ?, 3, 3, ?, ?, ?, ?, ?, 1, 'occupied', 'municipal', 'Wood Frame', 'Recreation', ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `, [
      parkFacilities[i],
      `LKW-${String(i + 1).padStart(3, '0')}`,
      `${100 + i * 10} Park Lane, Lakewood, CO`,
      39.7047 + (Math.random() - 0.5) * 0.05,
      -105.0814 + (Math.random() - 0.5) * 0.05,
      yearBuilt,
      sqft,
      condition,
      fci
    ]);
  }
  
  // Create some sample assessments
  console.log('Creating sample assessments...');
  const [assetRows] = await connection.execute('SELECT id FROM assets LIMIT 20');
  const [componentRows] = await connection.execute('SELECT id FROM assessmentComponents');
  
  for (const asset of assetRows) {
    // Create 3-5 assessments per asset
    const numAssessments = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numAssessments; i++) {
      const component = componentRows[Math.floor(Math.random() * componentRows.length)];
      const rating = String(Math.floor(Math.random() * 5) + 1);
      const severity = ['minor', 'moderate', 'major', 'critical'][Math.floor(Math.random() * 4)];
      const action = ['none', 'monitor', 'preventive_maintenance', 'repair', 'replace'][Math.floor(Math.random() * 5)];
      const cost = Math.floor(Math.random() * 50000);
      
      await connection.execute(`
        INSERT INTO assessments (assetId, componentId, assessmentDate, conditionRating, conditionNotes, deficiencySeverity, recommendedAction, estimatedRepairCost, status)
        VALUES (?, ?, NOW(), ?, 'Assessment notes for this component', ?, ?, ?, 'approved')
      `, [asset.id, component.id, rating, severity, action, cost]);
    }
  }
  
  await connection.end();
  console.log('Database seeded successfully!');
}

main().catch(console.error);
