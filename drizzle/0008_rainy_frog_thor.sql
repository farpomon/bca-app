CREATE TABLE `hierarchy_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`isDefault` boolean NOT NULL DEFAULT false,
	`config` text NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hierarchy_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_hierarchy_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`templateId` int,
	`maxDepth` int NOT NULL DEFAULT 3,
	`componentWeights` text,
	`componentPriorities` text,
	`enabledComponents` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_hierarchy_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_hierarchy_config_projectId_unique` UNIQUE(`projectId`)
);
