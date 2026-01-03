CREATE TABLE `building_performance_factors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buildingType` varchar(100) NOT NULL,
	`ashraeStandard` varchar(20) NOT NULL,
	`climateZone` varchar(5) NOT NULL,
	`bpf` decimal(4,2) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `building_performance_factors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `embodied_carbon_materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`materialCategory` varchar(100) NOT NULL,
	`materialName` varchar(255) NOT NULL,
	`materialDescription` text,
	`gwpPerUnit` decimal(15,4) NOT NULL,
	`unit` varchar(50) NOT NULL,
	`lcaModulesIncluded` varchar(50) DEFAULT 'A1-A3',
	`epdNumber` varchar(100),
	`epdSource` varchar(255),
	`epdExpiryDate` timestamp,
	`industryAvgGwp` decimal(15,4),
	`industryBestGwp` decimal(15,4),
	`region` varchar(100),
	`transportDistance` decimal(10,2),
	`biogenicCarbon` decimal(15,4),
	`dataSource` varchar(255),
	`validFrom` timestamp,
	`validTo` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `embodied_carbon_materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `grid_carbon_intensity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`region` varchar(100) NOT NULL,
	`country` varchar(100) NOT NULL DEFAULT 'Canada',
	`year` int NOT NULL,
	`avgEmissionFactor` decimal(10,4) NOT NULL,
	`marginalEmissionFactor` decimal(10,4),
	`peakEmissionFactor` decimal(10,4),
	`offPeakEmissionFactor` decimal(10,4),
	`renewablePercent` decimal(5,2),
	`nuclearPercent` decimal(5,2),
	`naturalGasPercent` decimal(5,2),
	`coalPercent` decimal(5,2),
	`hydroPercent` decimal(5,2),
	`windPercent` decimal(5,2),
	`solarPercent` decimal(5,2),
	`otherPercent` decimal(5,2),
	`projectedEmissionFactor2030` decimal(10,4),
	`projectedEmissionFactor2040` decimal(10,4),
	`projectedEmissionFactor2050` decimal(10,4),
	`dataSource` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `grid_carbon_intensity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leed_credits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creditCode` varchar(20) NOT NULL,
	`creditName` varchar(255) NOT NULL,
	`category` enum('IP','LT','SS','WE','EA','MR','EQ','IN','RP') NOT NULL,
	`creditType` enum('prerequisite','credit') NOT NULL,
	`maxPoints` int NOT NULL,
	`applicableToNewConstruction` tinyint DEFAULT 1,
	`applicableToCoreShell` tinyint DEFAULT 1,
	`impactDecarbonization` tinyint DEFAULT 0,
	`impactQualityOfLife` tinyint DEFAULT 0,
	`impactEcologicalConservation` tinyint DEFAULT 0,
	`description` text,
	`requirements` text,
	`documentationRequired` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leed_credits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operational_carbon_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`assetId` int,
	`recordDate` timestamp NOT NULL,
	`recordPeriod` enum('monthly','quarterly','annual') NOT NULL DEFAULT 'monthly',
	`scope1Natural_gas` decimal(15,4),
	`scope1Propane` decimal(15,4),
	`scope1Diesel` decimal(15,4),
	`scope1Refrigerants` decimal(15,4),
	`scope1Other` decimal(15,4),
	`scope1Total` decimal(15,4),
	`scope2Electricity` decimal(15,4),
	`scope2DistrictHeating` decimal(15,4),
	`scope2DistrictCooling` decimal(15,4),
	`scope2Steam` decimal(15,4),
	`scope2Total` decimal(15,4),
	`scope2Method` enum('location_based','market_based') DEFAULT 'location_based',
	`gridEmissionFactor` decimal(10,4),
	`scope3Commuting` decimal(15,4),
	`scope3Waste` decimal(15,4),
	`scope3WaterSupply` decimal(15,4),
	`scope3Other` decimal(15,4),
	`scope3Total` decimal(15,4),
	`totalEmissions` decimal(15,4) NOT NULL,
	`emissionsIntensity` decimal(10,4),
	`electricityKwh` decimal(15,2),
	`naturalGasM3` decimal(15,2),
	`verificationStatus` enum('unverified','self_verified','third_party_verified') DEFAULT 'unverified',
	`verifiedBy` varchar(255),
	`verificationDate` timestamp,
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operational_carbon_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_embodied_carbon` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`assetId` int,
	`assessmentDate` timestamp NOT NULL,
	`assessmentType` enum('baseline','design','as_built','renovation') NOT NULL DEFAULT 'design',
	`gwpModuleA1A3` decimal(15,2),
	`gwpModuleA4` decimal(15,2),
	`gwpModuleA5` decimal(15,2),
	`gwpModuleB1B5` decimal(15,2),
	`gwpModuleC1C4` decimal(15,2),
	`gwpModuleD` decimal(15,2),
	`gwpTotal` decimal(15,2) NOT NULL,
	`gwpPerSqm` decimal(10,4),
	`gwpPerSqft` decimal(10,4),
	`materialBreakdown` json,
	`baselineGwp` decimal(15,2),
	`reductionPercent` decimal(5,2),
	`leedPointsEarned` int,
	`leedPathway` enum('wblca','epd_project_avg','epd_materials','construction_tracking'),
	`ozoneDepletion` decimal(15,6),
	`acidification` decimal(15,4),
	`eutrophication` decimal(15,4),
	`smogFormation` decimal(15,4),
	`nonRenewableEnergy` decimal(15,2),
	`lcaSoftware` varchar(100),
	`lcaMethodology` varchar(255),
	`dataQualityScore` decimal(3,2),
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_embodied_carbon_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_leed_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`leedVersion` varchar(20) NOT NULL DEFAULT 'v5',
	`registrationDate` timestamp,
	`targetCertification` enum('certified','silver','gold','platinum'),
	`creditId` int NOT NULL,
	`status` enum('not_started','in_progress','submitted','achieved','denied','not_pursuing') NOT NULL DEFAULT 'not_started',
	`pointsTargeted` int,
	`pointsAchieved` int,
	`selectedPathway` varchar(100),
	`documentationStatus` enum('not_started','in_progress','complete','submitted') DEFAULT 'not_started',
	`documentationNotes` text,
	`reviewStatus` enum('pending','under_review','approved','denied','appealed'),
	`reviewComments` text,
	`reviewDate` timestamp,
	`assignedTo` int,
	`dueDate` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_leed_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_material_quantities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`assetId` int,
	`embodiedCarbonId` int,
	`materialId` int,
	`materialCategory` varchar(100) NOT NULL,
	`materialName` varchar(255) NOT NULL,
	`quantity` decimal(15,4) NOT NULL,
	`unit` varchar(50) NOT NULL,
	`gwpPerUnit` decimal(15,4) NOT NULL,
	`totalGwp` decimal(15,2) NOT NULL,
	`epdNumber` varchar(100),
	`isProductSpecificEpd` tinyint DEFAULT 0,
	`uniformatCode` varchar(20),
	`uniformatDescription` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_material_quantities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `refrigerant_inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`assetId` int,
	`equipmentName` varchar(255) NOT NULL,
	`equipmentType` enum('hvac','heat_pump','chiller','refrigeration','data_center','other') NOT NULL,
	`refrigerantType` varchar(50) NOT NULL,
	`refrigerantGwp` int NOT NULL,
	`chargeAmount` decimal(10,2) NOT NULL,
	`totalGwpCharge` decimal(15,2),
	`gwpBenchmark` int,
	`meetsLeedBenchmark` tinyint,
	`annualLeakageRate` decimal(5,2),
	`lastLeakCheck` timestamp,
	`leakDetectionSystem` tinyint DEFAULT 0,
	`installDate` timestamp,
	`expectedLifespan` int,
	`maintenanceSchedule` varchar(100),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `refrigerant_inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_bpf_building_type` ON `building_performance_factors` (`buildingType`);--> statement-breakpoint
CREATE INDEX `idx_bpf_climate_zone` ON `building_performance_factors` (`climateZone`);--> statement-breakpoint
CREATE INDEX `idx_bpf_standard` ON `building_performance_factors` (`ashraeStandard`);--> statement-breakpoint
CREATE INDEX `idx_material_category` ON `embodied_carbon_materials` (`materialCategory`);--> statement-breakpoint
CREATE INDEX `idx_material_name` ON `embodied_carbon_materials` (`materialName`);--> statement-breakpoint
CREATE INDEX `idx_grid_region_year` ON `grid_carbon_intensity` (`region`,`year`);--> statement-breakpoint
CREATE INDEX `idx_grid_country` ON `grid_carbon_intensity` (`country`);--> statement-breakpoint
CREATE INDEX `idx_leed_credit_code` ON `leed_credits` (`creditCode`);--> statement-breakpoint
CREATE INDEX `idx_leed_category` ON `leed_credits` (`category`);--> statement-breakpoint
CREATE INDEX `idx_op_carbon_project` ON `operational_carbon_tracking` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_op_carbon_asset` ON `operational_carbon_tracking` (`assetId`);--> statement-breakpoint
CREATE INDEX `idx_op_carbon_date` ON `operational_carbon_tracking` (`recordDate`);--> statement-breakpoint
CREATE INDEX `idx_embodied_project` ON `project_embodied_carbon` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_embodied_asset` ON `project_embodied_carbon` (`assetId`);--> statement-breakpoint
CREATE INDEX `idx_embodied_date` ON `project_embodied_carbon` (`assessmentDate`);--> statement-breakpoint
CREATE INDEX `idx_leed_tracking_project` ON `project_leed_tracking` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_leed_tracking_credit` ON `project_leed_tracking` (`creditId`);--> statement-breakpoint
CREATE INDEX `idx_leed_tracking_status` ON `project_leed_tracking` (`status`);--> statement-breakpoint
CREATE INDEX `idx_material_qty_project` ON `project_material_quantities` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_material_qty_embodied` ON `project_material_quantities` (`embodiedCarbonId`);--> statement-breakpoint
CREATE INDEX `idx_material_qty_category` ON `project_material_quantities` (`materialCategory`);--> statement-breakpoint
CREATE INDEX `idx_refrigerant_project` ON `refrigerant_inventory` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_refrigerant_asset` ON `refrigerant_inventory` (`assetId`);--> statement-breakpoint
CREATE INDEX `idx_refrigerant_type` ON `refrigerant_inventory` (`refrigerantType`);