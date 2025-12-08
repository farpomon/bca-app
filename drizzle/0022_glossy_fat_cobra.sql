CREATE TABLE `renovation_costs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`costType` enum('identified','planned','executed') NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`status` enum('pending','approved','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`description` text,
	`category` varchar(100),
	`fiscalYear` int,
	`dateRecorded` timestamp NOT NULL DEFAULT (now()),
	`dateCompleted` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `renovation_costs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `designLife` int;--> statement-breakpoint
ALTER TABLE `projects` ADD `endOfLifeDate` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `holdingDepartment` varchar(255);--> statement-breakpoint
ALTER TABLE `projects` ADD `propertyManager` varchar(255);--> statement-breakpoint
ALTER TABLE `projects` ADD `managerEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `projects` ADD `managerPhone` varchar(50);--> statement-breakpoint
ALTER TABLE `projects` ADD `facilityType` varchar(100);--> statement-breakpoint
ALTER TABLE `projects` ADD `occupancyStatus` enum('occupied','vacant','partial');--> statement-breakpoint
ALTER TABLE `projects` ADD `criticalityLevel` enum('critical','important','standard');