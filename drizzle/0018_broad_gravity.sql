CREATE TABLE `ci_fci_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`level` enum('component','system','building','portfolio') NOT NULL,
	`entityId` varchar(100),
	`ci` decimal(5,2),
	`fci` decimal(5,4),
	`deferredMaintenanceCost` decimal(15,2),
	`currentReplacementValue` decimal(15,2),
	`calculatedAt` timestamp NOT NULL DEFAULT (now()),
	`calculationMethod` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ci_fci_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `ci` decimal(5,2);--> statement-breakpoint
ALTER TABLE `projects` ADD `fci` decimal(5,4);--> statement-breakpoint
ALTER TABLE `projects` ADD `deferredMaintenanceCost` decimal(15,2);--> statement-breakpoint
ALTER TABLE `projects` ADD `currentReplacementValue` decimal(15,2);--> statement-breakpoint
ALTER TABLE `projects` ADD `lastCalculatedAt` timestamp;