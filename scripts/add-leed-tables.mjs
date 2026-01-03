import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log('Creating LEED v5 ESG tables...');
  
  // Grid Carbon Intensity
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS grid_carbon_intensity (
      id int AUTO_INCREMENT PRIMARY KEY,
      region varchar(100) NOT NULL,
      country varchar(100) NOT NULL DEFAULT 'Canada',
      year int NOT NULL,
      avgEmissionFactor decimal(10,4) NOT NULL,
      marginalEmissionFactor decimal(10,4),
      peakEmissionFactor decimal(10,4),
      offPeakEmissionFactor decimal(10,4),
      renewablePercent decimal(5,2),
      nuclearPercent decimal(5,2),
      naturalGasPercent decimal(5,2),
      coalPercent decimal(5,2),
      hydroPercent decimal(5,2),
      windPercent decimal(5,2),
      solarPercent decimal(5,2),
      otherPercent decimal(5,2),
      projectedEmissionFactor2030 decimal(10,4),
      projectedEmissionFactor2040 decimal(10,4),
      projectedEmissionFactor2050 decimal(10,4),
      dataSource varchar(255),
      notes text,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_grid_region_year (region, year),
      INDEX idx_grid_country (country)
    )
  `);
  console.log('✓ Created grid_carbon_intensity');

  // Embodied Carbon Materials
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS embodied_carbon_materials (
      id int AUTO_INCREMENT PRIMARY KEY,
      materialCategory varchar(100) NOT NULL,
      materialName varchar(255) NOT NULL,
      materialDescription text,
      gwpPerUnit decimal(15,4) NOT NULL,
      unit varchar(50) NOT NULL,
      lcaModulesIncluded varchar(50) DEFAULT 'A1-A3',
      epdNumber varchar(100),
      epdSource varchar(255),
      epdExpiryDate timestamp NULL,
      industryAvgGwp decimal(15,4),
      industryBestGwp decimal(15,4),
      region varchar(100),
      transportDistance decimal(10,2),
      biogenicCarbon decimal(15,4),
      dataSource varchar(255),
      validFrom timestamp NULL,
      validTo timestamp NULL,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_material_category (materialCategory),
      INDEX idx_material_name (materialName)
    )
  `);
  console.log('✓ Created embodied_carbon_materials');

  // Project Embodied Carbon
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS project_embodied_carbon (
      id int AUTO_INCREMENT PRIMARY KEY,
      projectId int NOT NULL,
      assetId int,
      assessmentDate timestamp NOT NULL,
      assessmentType enum('baseline','design','as_built','renovation') NOT NULL DEFAULT 'design',
      gwpModuleA1A3 decimal(15,2),
      gwpModuleA4 decimal(15,2),
      gwpModuleA5 decimal(15,2),
      gwpModuleB1B5 decimal(15,2),
      gwpModuleC1C4 decimal(15,2),
      gwpModuleD decimal(15,2),
      gwpTotal decimal(15,2) NOT NULL,
      gwpPerSqm decimal(10,4),
      gwpPerSqft decimal(10,4),
      materialBreakdown json,
      baselineGwp decimal(15,2),
      reductionPercent decimal(5,2),
      leedPointsEarned int,
      leedPathway enum('wblca','epd_project_avg','epd_materials','construction_tracking'),
      ozoneDepletion decimal(15,6),
      acidification decimal(15,4),
      eutrophication decimal(15,4),
      smogFormation decimal(15,4),
      nonRenewableEnergy decimal(15,2),
      lcaSoftware varchar(100),
      lcaMethodology varchar(255),
      dataQualityScore decimal(3,2),
      notes text,
      createdBy int,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_embodied_project (projectId),
      INDEX idx_embodied_asset (assetId),
      INDEX idx_embodied_date (assessmentDate)
    )
  `);
  console.log('✓ Created project_embodied_carbon');

  // Project Material Quantities
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS project_material_quantities (
      id int AUTO_INCREMENT PRIMARY KEY,
      projectId int NOT NULL,
      assetId int,
      embodiedCarbonId int,
      materialId int,
      materialCategory varchar(100) NOT NULL,
      materialName varchar(255) NOT NULL,
      quantity decimal(15,4) NOT NULL,
      unit varchar(50) NOT NULL,
      gwpPerUnit decimal(15,4) NOT NULL,
      totalGwp decimal(15,2) NOT NULL,
      epdNumber varchar(100),
      isProductSpecificEpd tinyint DEFAULT 0,
      uniformatCode varchar(20),
      uniformatDescription varchar(255),
      notes text,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_material_qty_project (projectId),
      INDEX idx_material_qty_embodied (embodiedCarbonId),
      INDEX idx_material_qty_category (materialCategory)
    )
  `);
  console.log('✓ Created project_material_quantities');

  // LEED Credits
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS leed_credits (
      id int AUTO_INCREMENT PRIMARY KEY,
      creditCode varchar(20) NOT NULL,
      creditName varchar(255) NOT NULL,
      category enum('IP','LT','SS','WE','EA','MR','EQ','IN','RP') NOT NULL,
      creditType enum('prerequisite','credit') NOT NULL,
      maxPoints int NOT NULL,
      applicableToNewConstruction tinyint DEFAULT 1,
      applicableToCoreShell tinyint DEFAULT 1,
      impactDecarbonization tinyint DEFAULT 0,
      impactQualityOfLife tinyint DEFAULT 0,
      impactEcologicalConservation tinyint DEFAULT 0,
      description text,
      requirements text,
      documentationRequired text,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_leed_credit_code (creditCode),
      INDEX idx_leed_category (category)
    )
  `);
  console.log('✓ Created leed_credits');

  // Project LEED Tracking
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS project_leed_tracking (
      id int AUTO_INCREMENT PRIMARY KEY,
      projectId int NOT NULL,
      leedVersion varchar(20) NOT NULL DEFAULT 'v5',
      registrationDate timestamp NULL,
      targetCertification enum('certified','silver','gold','platinum'),
      creditId int NOT NULL,
      status enum('not_started','in_progress','submitted','achieved','denied','not_pursuing') NOT NULL DEFAULT 'not_started',
      pointsTargeted int,
      pointsAchieved int,
      selectedPathway varchar(100),
      documentationStatus enum('not_started','in_progress','complete','submitted') DEFAULT 'not_started',
      documentationNotes text,
      reviewStatus enum('pending','under_review','approved','denied','appealed'),
      reviewComments text,
      reviewDate timestamp NULL,
      assignedTo int,
      dueDate timestamp NULL,
      notes text,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_leed_tracking_project (projectId),
      INDEX idx_leed_tracking_credit (creditId),
      INDEX idx_leed_tracking_status (status)
    )
  `);
  console.log('✓ Created project_leed_tracking');

  // Building Performance Factors
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS building_performance_factors (
      id int AUTO_INCREMENT PRIMARY KEY,
      buildingType varchar(100) NOT NULL,
      ashraeStandard varchar(20) NOT NULL,
      climateZone varchar(5) NOT NULL,
      bpf decimal(4,2) NOT NULL,
      notes text,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_bpf_building_type (buildingType),
      INDEX idx_bpf_climate_zone (climateZone),
      INDEX idx_bpf_standard (ashraeStandard)
    )
  `);
  console.log('✓ Created building_performance_factors');

  // Refrigerant Inventory
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS refrigerant_inventory (
      id int AUTO_INCREMENT PRIMARY KEY,
      projectId int NOT NULL,
      assetId int,
      equipmentName varchar(255) NOT NULL,
      equipmentType enum('hvac','heat_pump','chiller','refrigeration','data_center','other') NOT NULL,
      refrigerantType varchar(50) NOT NULL,
      refrigerantGwp int NOT NULL,
      chargeAmount decimal(10,2) NOT NULL,
      totalGwpCharge decimal(15,2),
      gwpBenchmark int,
      meetsLeedBenchmark tinyint,
      annualLeakageRate decimal(5,2),
      lastLeakCheck timestamp NULL,
      leakDetectionSystem tinyint DEFAULT 0,
      installDate timestamp NULL,
      expectedLifespan int,
      maintenanceSchedule varchar(100),
      notes text,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_refrigerant_project (projectId),
      INDEX idx_refrigerant_asset (assetId),
      INDEX idx_refrigerant_type (refrigerantType)
    )
  `);
  console.log('✓ Created refrigerant_inventory');

  // Operational Carbon Tracking
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS operational_carbon_tracking (
      id int AUTO_INCREMENT PRIMARY KEY,
      projectId int NOT NULL,
      assetId int,
      recordDate timestamp NOT NULL,
      recordPeriod enum('monthly','quarterly','annual') NOT NULL DEFAULT 'monthly',
      scope1Natural_gas decimal(15,4),
      scope1Propane decimal(15,4),
      scope1Diesel decimal(15,4),
      scope1Refrigerants decimal(15,4),
      scope1Other decimal(15,4),
      scope1Total decimal(15,4),
      scope2Electricity decimal(15,4),
      scope2DistrictHeating decimal(15,4),
      scope2DistrictCooling decimal(15,4),
      scope2Steam decimal(15,4),
      scope2Total decimal(15,4),
      scope2Method enum('location_based','market_based') DEFAULT 'location_based',
      gridEmissionFactor decimal(10,4),
      scope3Commuting decimal(15,4),
      scope3Waste decimal(15,4),
      scope3WaterSupply decimal(15,4),
      scope3Other decimal(15,4),
      scope3Total decimal(15,4),
      totalEmissions decimal(15,4) NOT NULL,
      emissionsIntensity decimal(10,4),
      electricityKwh decimal(15,2),
      naturalGasM3 decimal(15,2),
      verificationStatus enum('unverified','self_verified','third_party_verified') DEFAULT 'unverified',
      verifiedBy varchar(255),
      verificationDate timestamp NULL,
      notes text,
      createdBy int,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_op_carbon_project (projectId),
      INDEX idx_op_carbon_asset (assetId),
      INDEX idx_op_carbon_date (recordDate)
    )
  `);
  console.log('✓ Created operational_carbon_tracking');

  console.log('\n✅ All LEED v5 ESG tables created successfully!');
  
  await connection.end();
}

main().catch(console.error);
