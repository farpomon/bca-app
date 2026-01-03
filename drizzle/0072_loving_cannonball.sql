CREATE TABLE `esg_benchmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buildingType` varchar(100) NOT NULL,
	`region` varchar(100) NOT NULL,
	`year` int NOT NULL,
	`avgEnergyUseIntensity` decimal(15,4),
	`medianEnergyUseIntensity` decimal(15,4),
	`topQuartileEui` decimal(15,4),
	`avgCarbonIntensity` decimal(15,4),
	`medianCarbonIntensity` decimal(15,4),
	`avgWaterUseIntensity` decimal(15,4),
	`medianWaterUseIntensity` decimal(15,4),
	`avgWasteDiversionRate` decimal(5,2),
	`medianWasteDiversionRate` decimal(5,2),
	`avgEsgScore` decimal(5,2),
	`medianEsgScore` decimal(5,2),
	`topQuartileEsgScore` decimal(5,2),
	`dataSource` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `esg_certifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`assetId` int,
	`certificationType` enum('leed','boma_best','energy_star','well','fitwel','green_globes','passive_house','net_zero','other') NOT NULL,
	`certificationLevel` varchar(100),
	`certificationDate` timestamp,
	`expirationDate` timestamp,
	`certificateNumber` varchar(100),
	`verifyingBody` varchar(255),
	`score` decimal(5,2),
	`documentUrl` varchar(1024),
	`status` enum('active','expired','pending','revoked') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `esg_improvement_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`assetId` int,
	`deficiencyId` int,
	`assessmentId` int,
	`actionType` enum('energy_efficiency','water_conservation','waste_reduction','emissions_reduction','renewable_energy','indoor_quality','accessibility','compliance') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`estimatedCost` decimal(15,2),
	`actualCost` decimal(15,2),
	`estimatedSavings` decimal(15,2),
	`actualSavings` decimal(15,2),
	`estimatedEsgImpact` decimal(5,2),
	`actualEsgImpact` decimal(5,2),
	`paybackPeriodYears` decimal(5,2),
	`priority` enum('high','medium','low') NOT NULL DEFAULT 'medium',
	`status` enum('planned','in_progress','completed','cancelled') NOT NULL DEFAULT 'planned',
	`plannedStartDate` timestamp,
	`plannedEndDate` timestamp,
	`actualStartDate` timestamp,
	`actualEndDate` timestamp,
	`assignedTo` int,
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `esg_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`assetId` int,
	`recordDate` timestamp NOT NULL,
	`carbonFootprint` decimal(15,4),
	`carbonIntensity` decimal(15,4),
	`energyUseIntensity` decimal(15,4),
	`energyStarRating` int,
	`renewableEnergyPercent` decimal(5,2),
	`waterUseIntensity` decimal(15,4),
	`waterRecyclingPercent` decimal(5,2),
	`wasteGenerationRate` decimal(15,4),
	`wasteDiversionRate` decimal(5,2),
	`recyclingRate` decimal(5,2),
	`indoorAirQualityScore` decimal(5,2),
	`thermalComfortScore` decimal(5,2),
	`occupantSatisfactionScore` decimal(5,2),
	`accessibilityScore` decimal(5,2),
	`healthSafetyScore` decimal(5,2),
	`complianceScore` decimal(5,2),
	`transparencyScore` decimal(5,2),
	`riskManagementScore` decimal(5,2),
	`notes` text,
	`dataSource` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `esg_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`assetId` int,
	`reportType` enum('summary','detailed','compliance','annual','quarterly','custom') NOT NULL,
	`reportDate` timestamp NOT NULL,
	`reportPeriodStart` timestamp NOT NULL,
	`reportPeriodEnd` timestamp NOT NULL,
	`title` varchar(255) NOT NULL,
	`reportData` json,
	`fileUrl` varchar(1024),
	`fileKey` varchar(512),
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `esg_scores` ADD `assetId` int;--> statement-breakpoint
ALTER TABLE `esg_scores` ADD `environmentalScore` decimal(5,2);--> statement-breakpoint
ALTER TABLE `esg_scores` ADD `socialScore` decimal(5,2);--> statement-breakpoint
ALTER TABLE `esg_scores` ADD `governanceScore` decimal(5,2);--> statement-breakpoint
ALTER TABLE `esg_scores` ADD `overallEsgScore` decimal(5,2);--> statement-breakpoint
ALTER TABLE `esg_scores` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
CREATE INDEX `idx_benchmark_type_region` ON `esg_benchmarks` (`buildingType`,`region`);--> statement-breakpoint
CREATE INDEX `idx_benchmark_year` ON `esg_benchmarks` (`year`);--> statement-breakpoint
CREATE INDEX `idx_cert_project` ON `esg_certifications` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_cert_type` ON `esg_certifications` (`certificationType`);--> statement-breakpoint
CREATE INDEX `idx_cert_status` ON `esg_certifications` (`status`);--> statement-breakpoint
CREATE INDEX `idx_esg_action_project` ON `esg_improvement_actions` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_esg_action_type` ON `esg_improvement_actions` (`actionType`);--> statement-breakpoint
CREATE INDEX `idx_esg_action_status` ON `esg_improvement_actions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_esg_action_deficiency` ON `esg_improvement_actions` (`deficiencyId`);--> statement-breakpoint
CREATE INDEX `idx_esg_metrics_project` ON `esg_metrics` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_esg_metrics_asset` ON `esg_metrics` (`assetId`);--> statement-breakpoint
CREATE INDEX `idx_esg_metrics_date` ON `esg_metrics` (`recordDate`);--> statement-breakpoint
CREATE INDEX `idx_esg_report_project` ON `esg_reports` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_esg_report_type` ON `esg_reports` (`reportType`);--> statement-breakpoint
CREATE INDEX `idx_esg_report_date` ON `esg_reports` (`reportDate`);--> statement-breakpoint
CREATE INDEX `idx_esg_project` ON `esg_scores` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_esg_asset` ON `esg_scores` (`assetId`);--> statement-breakpoint
CREATE INDEX `idx_esg_date` ON `esg_scores` (`scoreDate`);