/**
 * Create 3 Demo Projects for Client Demonstrations
 * Matches actual database schema
 */

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function createDemoProjects() {
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

  try {
    // Get admin user
    const [users] = await connection.execute(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );
    
    if (users.length === 0) {
      console.error('No admin user found');
      return;
    }
    
    const userId = users[0].id;
    console.log(`Using admin user ID: ${userId}\n`);

    // Get or create municipality
    let municipalityId;
    const [municipalities] = await connection.execute("SELECT id FROM municipalities LIMIT 1");
    if (municipalities.length > 0) {
      municipalityId = municipalities[0].id;
    } else {
      const [mResult] = await connection.execute(
        "INSERT INTO municipalities (name, province, country) VALUES ('Demo Municipality', 'Ontario', 'Canada')"
      );
      municipalityId = mResult.insertId;
    }
    console.log(`Using municipality ID: ${municipalityId}\n`);

    // Get or create asset category
    let categoryId;
    const [categories] = await connection.execute("SELECT id FROM assetCategories LIMIT 1");
    if (categories.length > 0) {
      categoryId = categories[0].id;
    } else {
      const [cResult] = await connection.execute(
        "INSERT INTO assetCategories (name, description) VALUES ('Buildings', 'Building assets')"
      );
      categoryId = cResult.insertId;
    }

    // Project 1: Oakwood Corporate Tower
    console.log('Creating Project 1: Oakwood Corporate Tower...');
    const [p1] = await connection.execute(`
      INSERT INTO projects (municipalityId, name, description, projectNumber, status, priority, 
        budget, clientContact, clientEmail, createdById)
      VALUES (?, 'Oakwood Corporate Tower Assessment', 
        '28-story Class A office building condition assessment in downtown Toronto. Built 1998, steel frame with curtain wall.',
        'PROJ-2025-001', 'in_progress', 'high', 4250000.00, 
        'Michael Chen', 'mchen@oakwoodproperties.com', ?)
    `, [municipalityId, userId]);
    const project1Id = p1.insertId;
    console.log(`  Project 1 ID: ${project1Id}`);

    // Asset for Project 1
    const [a1] = await connection.execute(`
      INSERT INTO assets (projectId, categoryId, name, assetCode, description, address,
        yearBuilt, squareFootage, numberOfFloors, occupancyType, ownershipType, constructionType,
        primaryUse, replacementValue, status, overallCondition, fciScore, latitude, longitude)
      VALUES (?, ?, 'Oakwood Corporate Tower', 'OCT-001', 
        '28-story Class A office building with underground parking. Steel frame construction with curtain wall facade.',
        '1250 Bay Street, Toronto, ON M5R 2A5', 1998, 450000, 28, 'occupied', 'private',
        'Steel Frame with Curtain Wall', 'Commercial Office', 23000000.00, 'active', 'fair', 0.1850,
        43.6705, -79.3883)
    `, [project1Id, categoryId]);
    const asset1Id = a1.insertId;
    console.log(`  Asset 1 ID: ${asset1Id}`);

    // Get component IDs
    const [components] = await connection.execute("SELECT id, name FROM assessmentComponents");
    const componentMap = {};
    components.forEach(c => componentMap[c.name] = c.id);

    // Assessments for Project 1
    const p1Assessments = [
      { component: 'Foundations', rating: '4', notes: 'Concrete foundation in good condition. Minor hairline cracks observed.', cost: 45000, life: 35 },
      { component: 'Superstructure', rating: '4', notes: 'Steel frame in excellent condition. Minor surface corrosion in mechanical penthouse.', cost: 75000, life: 40 },
      { component: 'Exterior Enclosure', rating: '3', notes: 'Curtain wall showing seal failures on floors 15-22. Air infiltration detected.', cost: 850000, life: 8 },
      { component: 'Roofing', rating: '2', notes: 'Modified bitumen roof beyond useful life. Multiple patches, ponding water.', cost: 420000, life: 2 },
      { component: 'Plumbing', rating: '3', notes: 'Original copper piping showing corrosion in risers. Water pressure issues on upper floors.', cost: 380000, life: 10 },
      { component: 'HVAC', rating: '3', notes: 'Chillers (2008) operating at reduced efficiency. BAS system needs upgrade.', cost: 1250000, life: 8 },
      { component: 'Electrical', rating: '3', notes: 'Main switchgear original but well-maintained. Some circuits at capacity.', cost: 520000, life: 12 },
    ];

    for (const a of p1Assessments) {
      const compId = componentMap[a.component] || 1;
      await connection.execute(`
        INSERT INTO assessments (assetId, componentId, assessorId, assessmentDate, conditionRating, 
          conditionNotes, recommendedAction, estimatedRepairCost, priorityLevel, remainingLifeYears, status)
        VALUES (?, ?, ?, NOW(), ?, ?, 'repair', ?, '3', ?, 'approved')
      `, [asset1Id, compId, userId, a.rating, a.notes, a.cost, a.life]);
    }
    console.log(`  Added ${p1Assessments.length} assessments`);

    // Project 2: Riverside Community Center
    console.log('\nCreating Project 2: Riverside Community Center...');
    const [p2] = await connection.execute(`
      INSERT INTO projects (municipalityId, name, description, projectNumber, status, priority, 
        budget, clientContact, clientEmail, createdById)
      VALUES (?, 'Riverside Community Center Assessment', 
        'Municipal recreation facility with aquatic center. Built 2005, concrete and steel construction. Well-maintained.',
        'PROJ-2025-002', 'completed', 'medium', 1150000.00, 
        'Sarah Williams', 'swilliams@vancouver.ca', ?)
    `, [municipalityId, userId]);
    const project2Id = p2.insertId;
    console.log(`  Project 2 ID: ${project2Id}`);

    // Asset for Project 2
    const [a2] = await connection.execute(`
      INSERT INTO assets (projectId, categoryId, name, assetCode, description, address,
        yearBuilt, squareFootage, numberOfFloors, occupancyType, ownershipType, constructionType,
        primaryUse, replacementValue, status, overallCondition, fciScore, latitude, longitude)
      VALUES (?, ?, 'Riverside Community Center', 'RCC-001', 
        'Multi-purpose recreation facility with gymnasium, fitness center, aquatic center, and meeting rooms.',
        '450 Riverside Drive, Vancouver, BC V6B 3K9', 2005, 87000, 3, 'occupied', 'municipal',
        'Concrete and Steel', 'Recreation/Community', 12500000.00, 'active', 'good', 0.0920,
        49.2827, -123.1207)
    `, [project2Id, categoryId]);
    const asset2Id = a2.insertId;
    console.log(`  Asset 2 ID: ${asset2Id}`);

    // Assessments for Project 2
    const p2Assessments = [
      { component: 'Foundations', rating: '5', notes: 'Reinforced concrete foundation in excellent condition. No issues.', cost: 0, life: 35 },
      { component: 'Superstructure', rating: '4', notes: 'Concrete frame in very good condition. Minor cosmetic cracking only.', cost: 25000, life: 32 },
      { component: 'Exterior Enclosure', rating: '4', notes: 'Brick veneer and aluminum panels in good condition. Some repointing needed.', cost: 85000, life: 20 },
      { component: 'Roofing', rating: '4', notes: 'TPO membrane roof (replaced 2020) in good condition.', cost: 15000, life: 22 },
      { component: 'Interior Finishes', rating: '3', notes: 'High-traffic areas showing wear. Gymnasium floor needs refinishing.', cost: 180000, life: 8 },
      { component: 'HVAC', rating: '4', notes: 'Rooftop units (2015) operating efficiently. Good air quality.', cost: 45000, life: 12 },
    ];

    for (const a of p2Assessments) {
      const compId = componentMap[a.component] || 1;
      await connection.execute(`
        INSERT INTO assessments (assetId, componentId, assessorId, assessmentDate, conditionRating, 
          conditionNotes, recommendedAction, estimatedRepairCost, priorityLevel, remainingLifeYears, status)
        VALUES (?, ?, ?, NOW(), ?, ?, 'preventive_maintenance', ?, '4', ?, 'approved')
      `, [asset2Id, compId, userId, a.rating, a.notes, a.cost, a.life]);
    }
    console.log(`  Added ${p2Assessments.length} assessments`);

    // Project 3: Heritage Manor Condominiums
    console.log('\nCreating Project 3: Heritage Manor Condominiums...');
    const [p3] = await connection.execute(`
      INSERT INTO projects (municipalityId, name, description, projectNumber, status, priority, 
        budget, clientContact, clientEmail, createdById)
      VALUES (?, 'Heritage Manor Condominiums Assessment', 
        '156-unit residential complex built 1985. Aging building requiring significant capital investment. Two 12-story towers.',
        'PROJ-2025-003', 'in_progress', 'critical', 3850000.00, 
        'Robert Thompson', 'rthompson@heritagemanor.ca', ?)
    `, [municipalityId, userId]);
    const project3Id = p3.insertId;
    console.log(`  Project 3 ID: ${project3Id}`);

    // Assets for Project 3 (two towers)
    const [a3a] = await connection.execute(`
      INSERT INTO assets (projectId, categoryId, name, assetCode, description, address,
        yearBuilt, squareFootage, numberOfFloors, numberOfUnits, occupancyType, ownershipType, constructionType,
        primaryUse, replacementValue, status, overallCondition, fciScore, latitude, longitude)
      VALUES (?, ?, 'Heritage Manor Tower A', 'HM-001A', 
        '12-story residential tower with 78 units. Original 1985 construction with reinforced concrete.',
        '825 Heritage Boulevard, Calgary, AB T2P 4K3', 1985, 95000, 12, 78, 'occupied', 'private',
        'Reinforced Concrete', 'Multi-Unit Residential', 7850000.00, 'active', 'fair', 0.2450,
        51.0447, -114.0719)
    `, [project3Id, categoryId]);
    const asset3aId = a3a.insertId;

    const [a3b] = await connection.execute(`
      INSERT INTO assets (projectId, categoryId, name, assetCode, description, address,
        yearBuilt, squareFootage, numberOfFloors, numberOfUnits, occupancyType, ownershipType, constructionType,
        primaryUse, replacementValue, status, overallCondition, fciScore, latitude, longitude)
      VALUES (?, ?, 'Heritage Manor Tower B', 'HM-001B', 
        '12-story residential tower with 78 units. Original 1985 construction with reinforced concrete.',
        '827 Heritage Boulevard, Calgary, AB T2P 4K3', 1985, 95000, 12, 78, 'occupied', 'private',
        'Reinforced Concrete', 'Multi-Unit Residential', 7850000.00, 'active', 'poor', 0.2650,
        51.0448, -114.0720)
    `, [project3Id, categoryId]);
    const asset3bId = a3b.insertId;
    console.log(`  Asset 3A ID: ${asset3aId}, Asset 3B ID: ${asset3bId}`);

    // Assessments for Project 3
    const p3Assessments = [
      { assetId: asset3aId, component: 'Foundations', rating: '4', notes: 'Concrete foundation generally sound. Minor settlement cracks.', cost: 85000, life: 25 },
      { assetId: asset3aId, component: 'Superstructure', rating: '3', notes: 'Concrete showing carbonation on balconies. Spalling in parking garage.', cost: 450000, life: 20 },
      { assetId: asset3aId, component: 'Exterior Enclosure', rating: '3', notes: 'EIFS cladding showing cracking and delamination. Water infiltration.', cost: 1200000, life: 5 },
      { assetId: asset3aId, component: 'Roofing', rating: '2', notes: 'Built-up roof severely deteriorated. Active leaks in penthouse units.', cost: 280000, life: 1 },
      { assetId: asset3aId, component: 'Plumbing', rating: '2', notes: 'Original galvanized piping severely corroded. Multiple leak repairs.', cost: 680000, life: 3 },
      { assetId: asset3bId, component: 'Superstructure', rating: '2', notes: 'More advanced deterioration than Tower A. Balcony railings corroding.', cost: 520000, life: 18 },
      { assetId: asset3bId, component: 'Exterior Enclosure', rating: '2', notes: 'EIFS condition worse on south elevation. Window failures frequent.', cost: 1350000, life: 4 },
      { assetId: asset3bId, component: 'Plumbing', rating: '1', notes: 'Recent catastrophic riser failure. Emergency repairs completed.', cost: 720000, life: 2 },
    ];

    for (const a of p3Assessments) {
      const compId = componentMap[a.component] || 1;
      await connection.execute(`
        INSERT INTO assessments (assetId, componentId, assessorId, assessmentDate, conditionRating, 
          conditionNotes, recommendedAction, estimatedRepairCost, priorityLevel, remainingLifeYears, status)
        VALUES (?, ?, ?, NOW(), ?, ?, 'immediate_action', ?, '2', ?, 'approved')
      `, [a.assetId, compId, userId, a.rating, a.notes, a.cost, a.life]);
    }
    console.log(`  Added ${p3Assessments.length} assessments`);

    console.log('\n========================================');
    console.log('DEMO PROJECTS CREATED SUCCESSFULLY');
    console.log('========================================\n');
    console.log(`1. Oakwood Corporate Tower (Project ID: ${project1Id})`);
    console.log('   - 28-story Class A office in Toronto');
    console.log('   - FCI: 18.5% - Fair condition');
    console.log('   - Key issues: Roof, curtain wall, HVAC\n');
    console.log(`2. Riverside Community Center (Project ID: ${project2Id})`);
    console.log('   - Municipal recreation facility in Vancouver');
    console.log('   - FCI: 9.2% - Good condition');
    console.log('   - Well-maintained with minor items\n');
    console.log(`3. Heritage Manor Condominiums (Project ID: ${project3Id})`);
    console.log('   - 156-unit residential in Calgary (2 towers)');
    console.log('   - FCI: 24.5% - Poor condition');
    console.log('   - Aging building needing major capital work\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

createDemoProjects();
