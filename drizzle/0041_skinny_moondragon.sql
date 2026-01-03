CREATE TABLE `export_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`exportType` varchar(50) NOT NULL,
	`format` enum('csv','excel','pdf') NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileSize` int,
	`recordCount` int,
	`generatedBy` int NOT NULL,
	`generatedAt` timestamp NOT NULL,
	`downloadCount` int DEFAULT 0,
	`lastDownloadedAt` timestamp,
	`expiresAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `export_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integration_errors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`source` enum('sap','tririga') NOT NULL,
	`recordType` varchar(100) NOT NULL,
	`sourceRecordId` varchar(255),
	`errorCode` varchar(50),
	`errorMessage` text NOT NULL,
	`recordData` text,
	`status` enum('quarantined','resolved','ignored') NOT NULL DEFAULT 'quarantined',
	`resolvedBy` int,
	`resolvedAt` timestamp,
	`resolutionNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `integration_errors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integration_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` enum('sap','tririga') NOT NULL,
	`sourceEntity` varchar(100) NOT NULL,
	`targetEntity` varchar(100) NOT NULL,
	`sourceField` varchar(100) NOT NULL,
	`targetField` varchar(100) NOT NULL,
	`transformationType` varchar(50),
	`transformationLogic` text,
	`isActive` int NOT NULL DEFAULT 1,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integration_mappings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integration_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` enum('sap','tririga') NOT NULL,
	`runType` enum('full','incremental') NOT NULL,
	`status` enum('running','success','failed','partial') NOT NULL,
	`startedAt` timestamp NOT NULL,
	`completedAt` timestamp,
	`recordsExtracted` int DEFAULT 0,
	`recordsTransformed` int DEFAULT 0,
	`recordsLoaded` int DEFAULT 0,
	`recordsFailed` int DEFAULT 0,
	`errorMessage` text,
	`errorDetails` text,
	`triggeredBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `integration_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integration_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` enum('sap','tririga') NOT NULL,
	`runType` enum('full','incremental') NOT NULL,
	`schedule` varchar(100) NOT NULL,
	`isEnabled` int NOT NULL DEFAULT 1,
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integration_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sap_buildings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`functionalLocation` varchar(100) NOT NULL,
	`description` text,
	`address` text,
	`city` varchar(255),
	`postalCode` varchar(20),
	`buildingType` varchar(100),
	`constructionYear` int,
	`replacementValue` decimal(15,2),
	`projectId` int,
	`lastImportedAt` timestamp NOT NULL,
	`sourceData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sap_buildings_id` PRIMARY KEY(`id`),
	CONSTRAINT `sap_buildings_functionalLocation_unique` UNIQUE(`functionalLocation`)
);
--> statement-breakpoint
CREATE TABLE `tririga_buildings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buildingNumber` varchar(100) NOT NULL,
	`buildingName` varchar(255),
	`address` text,
	`city` varchar(255),
	`province` varchar(100),
	`postalCode` varchar(20),
	`buildingType` varchar(100),
	`grossArea` decimal(10,2),
	`yearBuilt` int,
	`replacementValue` decimal(15,2),
	`projectId` int,
	`lastImportedAt` timestamp NOT NULL,
	`sourceData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tririga_buildings_id` PRIMARY KEY(`id`),
	CONSTRAINT `tririga_buildings_buildingNumber_unique` UNIQUE(`buildingNumber`)
);
