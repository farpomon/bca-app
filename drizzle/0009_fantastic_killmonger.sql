CREATE TABLE `project_rating_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`conditionScaleId` int,
	`priorityScaleId` int,
	`fciScaleId` int,
	`useWeightedAverage` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_rating_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_rating_config_projectId_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
CREATE TABLE `rating_scales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` enum('fci','ci','condition','priority','custom') NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	`minValue` int NOT NULL,
	`maxValue` int NOT NULL,
	`scaleItems` text NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rating_scales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `assessments` ADD `conditionScore` int;--> statement-breakpoint
ALTER TABLE `assessments` ADD `ciScore` int;--> statement-breakpoint
ALTER TABLE `assessments` ADD `fciScore` int;--> statement-breakpoint
ALTER TABLE `projects` ADD `overallConditionScore` int;--> statement-breakpoint
ALTER TABLE `projects` ADD `overallFciScore` int;--> statement-breakpoint
ALTER TABLE `projects` ADD `overallConditionRating` varchar(50);