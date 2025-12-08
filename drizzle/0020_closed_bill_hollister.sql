CREATE TABLE `budget_allocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cycleId` int NOT NULL,
	`projectId` int NOT NULL,
	`year` int NOT NULL,
	`allocatedAmount` decimal(15,2) NOT NULL,
	`priority` int NOT NULL,
	`status` enum('proposed','approved','funded','completed') NOT NULL DEFAULT 'proposed',
	`justification` text,
	`strategicAlignment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budget_allocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `capital_budget_cycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`startYear` int NOT NULL,
	`endYear` int NOT NULL,
	`totalBudget` decimal(15,2),
	`status` enum('planning','approved','active','completed') NOT NULL DEFAULT 'planning',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `capital_budget_cycles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `criteria_objective_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`criteriaId` int NOT NULL,
	`objectiveId` int NOT NULL,
	`alignmentStrength` decimal(3,2) NOT NULL DEFAULT '1.00',
	CONSTRAINT `criteria_objective_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `criteria_presets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`configuration` text NOT NULL,
	`isDefault` int NOT NULL DEFAULT 0,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `criteria_presets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prioritization_criteria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`category` enum('risk','strategic','compliance','financial','operational','environmental') NOT NULL,
	`weight` decimal(5,2) NOT NULL DEFAULT '10.00',
	`scoringGuideline` text,
	`isActive` int NOT NULL DEFAULT 1,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prioritization_criteria_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_priority_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`compositeScore` decimal(6,2) NOT NULL,
	`rank` int,
	`urgencyScore` decimal(4,2),
	`missionCriticalityScore` decimal(4,2),
	`safetyScore` decimal(4,2),
	`complianceScore` decimal(4,2),
	`energySavingsScore` decimal(4,2),
	`calculatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_priority_scores_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_priority_scores_projectId_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
CREATE TABLE `project_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`criteriaId` int NOT NULL,
	`score` decimal(4,2) NOT NULL,
	`justification` text,
	`scoredBy` int NOT NULL,
	`scoredAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strategic_objectives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`category` varchar(100),
	`targetYear` int,
	`isActive` int NOT NULL DEFAULT 1,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `strategic_objectives_id` PRIMARY KEY(`id`)
);
