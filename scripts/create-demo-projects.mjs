/**
 * Create 3 Demo Projects for Client Demonstrations
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
      "SELECT id, company FROM users WHERE role = 'admin' LIMIT 1"
    );
    
    if (users.length === 0) {
      console.error('No admin user found');
      return;
    }
    
    const userId = users[0].id;
    const company = users[0].company || 'Demo Company';
    console.log(`Using admin user ID: ${userId}, Company: ${company}\n`);

    // Project 1: Oakwood Corporate Tower
    console.log('Creating Project 1: Oakwood Corporate Tower...');
    const [p1] = await connection.execute(`
      INSERT INTO projects (userId, name, address, streetNumber, streetAddress, city, province, postalCode,
        clientName, propertyType, constructionType, yearBuilt, numberOfStories, status, company,
        ci, fci, deferredMaintenanceCost, currentReplacementValue, overallConditionRating,
        designLife, holdingDepartment, propertyManager, managerEmail, facilityType, occupancyStatus, criticalityLevel)
      VALUES (?, 'Oakwood Corporate Tower', '1250 Bay Street, Toronto, ON M5R 2A5',
        '1250', 'Bay Street', 'Toronto', 'Ontario', 'M5R 2A5',
        'Oakwood Properties Inc.', 'Commercial Office', 'Steel Frame with Curtain Wall',
        1998, 28, 'in_progress', ?, 72.50, 0.1850, 4250000.00, 23000000.00, 'Fair',
        50, 'Corporate Real Estate', 'Michael Chen', 'mchen@oakwoodproperties.com',
        'Class A Office', 'occupied', 'critical')
    `, [userId, company]);
    const project1Id = p1.insertId;
    console.log(`  Project 1 ID: ${project1Id}`);

    // Add assessments for Project 1
    const p1Assessments = [
      ['A10', 'Foundations', 'good', 85, 'Concrete foundation in good condition. Minor hairline cracks.', 35, 50, 45000, 2500000],
      ['B10', 'Superstructure', 'good', 82, 'Steel frame in excellent condition. Minor surface corrosion.', 40, 50, 75000, 8500000],
      ['B20', 'Exterior Enclosure', 'fair', 62, 'Curtain wall showing seal failures on floors 15-22.', 8, 35, 850000, 4200000],
      ['B30', 'Roofing', 'poor', 45, 'Roof membrane beyond useful life. Multiple patches.', 2, 25, 420000, 650000],
      ['D20', 'Plumbing', 'fair', 58, 'Original copper piping showing corrosion.', 10, 40, 380000, 1600000],
      ['D30', 'HVAC', 'fair', 55, 'Chillers operating at reduced efficiency.', 8, 25, 1250000, 3800000],
      ['D50', 'Electrical', 'fair', 60, 'Main switchgear original but maintained.', 12, 35, 520000, 2200000],
    ];
    
    for (const a of p1Assessments) {
      await connection.execute(`
        INSERT INTO assessments (projectId, componentCode, componentName, condition, conditionScore,
          observations, remainingUsefulLife, expectedUsefulLife, estimatedRepairCost, replacementValue, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
      `, [project1Id, ...a]);
    }
    console.log(`  Added ${p1Assessments.length} assessments`);

    // Add deficiencies for Project 1
    const p1Deficiencies = [
      ['B30', 'Roof Membrane Failure', 'Multiple areas of membrane failure with active leaks.', 'Main roof', 'critical', 'immediate', 420000],
      ['B20', 'Curtain Wall Seal Degradation', 'Sealant failure between glass panels.', 'Floors 15-22', 'high', 'short_term', 850000],
      ['D30', 'Chiller Efficiency Decline', 'Chiller operating at 65% efficiency.', 'Mechanical penthouse', 'medium', 'medium_term', 750000],
    ];
    
    for (const d of p1Deficiencies) {
      await connection.execute(`
        INSERT INTO deficiencies (projectId, componentCode, title, description, location, severity, priority, estimatedCost, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')
      `, [project1Id, ...d]);
    }
    console.log(`  Added ${p1Deficiencies.length} deficiencies`);

    // Project 2: Riverside Community Center
    console.log('\nCreating Project 2: Riverside Community Center...');
    const [p2] = await connection.execute(`
      INSERT INTO projects (userId, name, address, streetNumber, streetAddress, city, province, postalCode,
        clientName, propertyType, constructionType, yearBuilt, numberOfStories, status, company,
        ci, fci, deferredMaintenanceCost, currentReplacementValue, overallConditionRating,
        designLife, holdingDepartment, propertyManager, managerEmail, facilityType, occupancyStatus, criticalityLevel)
      VALUES (?, 'Riverside Community Center', '450 Riverside Drive, Vancouver, BC V6B 3K9',
        '450', 'Riverside Drive', 'Vancouver', 'British Columbia', 'V6B 3K9',
        'City of Vancouver Parks & Recreation', 'Recreation/Community', 'Concrete and Steel',
        2005, 3, 'completed', ?, 81.20, 0.0920, 1150000.00, 12500000.00, 'Good',
        40, 'Parks & Recreation', 'Sarah Williams', 'swilliams@vancouver.ca',
        'Community Recreation', 'occupied', 'important')
    `, [userId, company]);
    const project2Id = p2.insertId;
    console.log(`  Project 2 ID: ${project2Id}`);

    // Add assessments for Project 2
    const p2Assessments = [
      ['A10', 'Foundations', 'good', 90, 'Reinforced concrete foundation in excellent condition.', 35, 50, 0, 1200000],
      ['B10', 'Superstructure', 'good', 88, 'Concrete frame in very good condition.', 32, 50, 25000, 2800000],
      ['B20', 'Exterior Walls', 'good', 85, 'Brick veneer in good condition.', 20, 35, 85000, 950000],
      ['B30', 'Roofing', 'good', 78, 'TPO membrane roof (replaced 2020) in good condition.', 22, 25, 15000, 320000],
      ['C30', 'Interior Finishes', 'fair', 68, 'High-traffic areas showing wear.', 8, 15, 180000, 650000],
      ['D30', 'HVAC', 'good', 82, 'Rooftop units operating efficiently.', 12, 20, 45000, 850000],
    ];
    
    for (const a of p2Assessments) {
      await connection.execute(`
        INSERT INTO assessments (projectId, componentCode, componentName, condition, conditionScore,
          observations, remainingUsefulLife, expectedUsefulLife, estimatedRepairCost, replacementValue, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
      `, [project2Id, ...a]);
    }
    console.log(`  Added ${p2Assessments.length} assessments`);

    // Add deficiencies for Project 2
    const p2Deficiencies = [
      ['C30', 'Gymnasium Floor Wear', 'Hardwood floor showing significant wear.', 'Main gymnasium', 'medium', 'short_term', 85000],
      ['C30', 'Locker Room Renovation', 'Locker room finishes dated.', 'Locker rooms', 'low', 'medium_term', 220000],
    ];
    
    for (const d of p2Deficiencies) {
      await connection.execute(`
        INSERT INTO deficiencies (projectId, componentCode, title, description, location, severity, priority, estimatedCost, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')
      `, [project2Id, ...d]);
    }
    console.log(`  Added ${p2Deficiencies.length} deficiencies`);

    // Project 3: Heritage Manor Condominiums
    console.log('\nCreating Project 3: Heritage Manor Condominiums...');
    const [p3] = await connection.execute(`
      INSERT INTO projects (userId, name, address, streetNumber, streetAddress, city, province, postalCode,
        clientName, propertyType, constructionType, yearBuilt, numberOfUnits, numberOfStories, status, company,
        ci, fci, deferredMaintenanceCost, currentReplacementValue, overallConditionRating,
        designLife, holdingDepartment, propertyManager, managerEmail, facilityType, occupancyStatus, criticalityLevel)
      VALUES (?, 'Heritage Manor Condominiums', '825 Heritage Boulevard, Calgary, AB T2P 4K3',
        '825', 'Heritage Boulevard', 'Calgary', 'Alberta', 'T2P 4K3',
        'Heritage Manor Condominium Corporation', 'Multi-Unit Residential', 'Reinforced Concrete',
        1985, 156, 12, 'in_progress', ?, 58.50, 0.2450, 3850000.00, 15700000.00, 'Fair',
        50, 'Strata Council', 'Robert Thompson', 'rthompson@heritagemanor.ca',
        'Residential Condominium', 'occupied', 'important')
    `, [userId, company]);
    const project3Id = p3.insertId;
    console.log(`  Project 3 ID: ${project3Id}`);

    // Add assessments for Project 3
    const p3Assessments = [
      ['A10', 'Foundations', 'good', 78, 'Concrete foundation generally sound. Minor settlement.', 25, 50, 85000, 1800000],
      ['B10', 'Superstructure', 'fair', 65, 'Concrete showing carbonation on balconies. Spalling in garage.', 20, 50, 450000, 2400000],
      ['B20', 'Exterior Walls', 'fair', 55, 'EIFS cladding showing cracking and delamination.', 5, 30, 1200000, 1600000],
      ['B30', 'Roofing', 'poor', 42, 'Built-up roof severely deteriorated. Active leaks.', 1, 25, 280000, 350000],
      ['D20', 'Plumbing', 'poor', 48, 'Original galvanized piping severely corroded.', 3, 40, 680000, 950000],
      ['D30', 'HVAC', 'fair', 58, 'Individual PTAC units varying condition.', 8, 20, 320000, 780000],
      ['D10', 'Elevators', 'fair', 60, 'Two elevators modernized 2019. Freight elevator needs work.', 18, 25, 145000, 480000],
    ];
    
    for (const a of p3Assessments) {
      await connection.execute(`
        INSERT INTO assessments (projectId, componentCode, componentName, condition, conditionScore,
          observations, remainingUsefulLife, expectedUsefulLife, estimatedRepairCost, replacementValue, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
      `, [project3Id, ...a]);
    }
    console.log(`  Added ${p3Assessments.length} assessments`);

    // Add deficiencies for Project 3
    const p3Deficiencies = [
      ['B30', 'Critical Roof Failure', 'Roof membrane failed with active leaks.', 'Main roof', 'critical', 'immediate', 280000],
      ['D20', 'Plumbing Riser Failure Risk', 'Recent catastrophic failure. Remaining risers at risk.', 'All risers', 'critical', 'immediate', 720000],
      ['B20', 'Building Envelope Failure', 'EIFS cladding failing across building.', 'All elevations', 'high', 'short_term', 1200000],
      ['B10', 'Concrete Deterioration', 'Significant spalling in parking structure.', 'Parking garage', 'high', 'short_term', 450000],
    ];
    
    for (const d of p3Deficiencies) {
      await connection.execute(`
        INSERT INTO deficiencies (projectId, componentCode, title, description, location, severity, priority, estimatedCost, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')
      `, [project3Id, ...d]);
    }
    console.log(`  Added ${p3Deficiencies.length} deficiencies`);

    // Add ESG scores for all projects
    console.log('\nAdding ESG scores...');
    await connection.execute(`
      INSERT INTO esg_scores (projectId, scoreDate, energyScore, waterScore, wasteScore, emissionsScore, 
        compositeScore, environmentalScore, socialScore, governanceScore, overallEsgScore, benchmarkPercentile)
      VALUES (?, NOW(), 68, 72, 65, 62, 67, 66, 78, 82, 72, 58)
    `, [project1Id]);
    await connection.execute(`
      INSERT INTO esg_scores (projectId, scoreDate, energyScore, waterScore, wasteScore, emissionsScore, 
        compositeScore, environmentalScore, socialScore, governanceScore, overallEsgScore, benchmarkPercentile)
      VALUES (?, NOW(), 82, 78, 85, 80, 81, 81, 88, 85, 84, 76)
    `, [project2Id]);
    await connection.execute(`
      INSERT INTO esg_scores (projectId, scoreDate, energyScore, waterScore, wasteScore, emissionsScore, 
        compositeScore, environmentalScore, socialScore, governanceScore, overallEsgScore, benchmarkPercentile)
      VALUES (?, NOW(), 52, 58, 48, 55, 53, 53, 65, 70, 60, 35)
    `, [project3Id]);
    console.log('  Added ESG scores for all projects');

    console.log('\n========================================');
    console.log('DEMO PROJECTS CREATED SUCCESSFULLY');
    console.log('========================================\n');
    console.log(`1. Oakwood Corporate Tower (ID: ${project1Id})`);
    console.log('   - 28-story Class A office in Toronto');
    console.log('   - CI: 72.5%, FCI: 18.5%');
    console.log('   - Key issues: Roof, curtain wall, HVAC\n');
    console.log(`2. Riverside Community Center (ID: ${project2Id})`);
    console.log('   - Municipal recreation facility in Vancouver');
    console.log('   - CI: 81.2%, FCI: 9.2%');
    console.log('   - Well-maintained with minor items\n');
    console.log(`3. Heritage Manor Condominiums (ID: ${project3Id})`);
    console.log('   - 156-unit residential in Calgary');
    console.log('   - CI: 58.5%, FCI: 24.5%');
    console.log('   - Aging building needing major work\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

createDemoProjects();
