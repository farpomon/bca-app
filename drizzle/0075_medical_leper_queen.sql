CREATE TABLE `assessment_deletion_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`projectId` int NOT NULL,
	`assetId` int,
	`componentCode` varchar(20),
	`componentName` varchar(255),
	`condition` varchar(50),
	`estimatedRepairCost` int,
	`replacementValue` int,
	`deletedBy` int NOT NULL,
	`deletedByName` varchar(255),
	`deletedByEmail` varchar(320),
	`deletionReason` text,
	`assessmentData` text,
	`deletedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assessment_deletion_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `assessments` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `assessments` ADD `deletedBy` int;