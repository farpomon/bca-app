CREATE TABLE `assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`componentCode` varchar(20) NOT NULL,
	`condition` enum('good','fair','poor','not_assessed') NOT NULL DEFAULT 'not_assessed',
	`observations` text,
	`remainingUsefulLife` int,
	`expectedUsefulLife` int,
	`assessedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `building_components` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(20) NOT NULL,
	`level` int NOT NULL,
	`parentCode` varchar(20),
	`name` varchar(255) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `building_components_id` PRIMARY KEY(`id`),
	CONSTRAINT `building_components_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `cost_estimates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deficiencyId` int NOT NULL,
	`projectId` int NOT NULL,
	`componentCode` varchar(20) NOT NULL,
	`description` text,
	`quantity` int,
	`unit` varchar(50),
	`unitCost` int,
	`totalCost` int,
	`timeline` enum('immediate','1_5_years','5_10_years','10_plus_years') NOT NULL DEFAULT '1_5_years',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cost_estimates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deficiencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`projectId` int NOT NULL,
	`componentCode` varchar(20) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`location` varchar(255),
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`priority` enum('immediate','short_term','medium_term','long_term') NOT NULL DEFAULT 'medium_term',
	`recommendedAction` text,
	`estimatedCost` int,
	`status` enum('open','in_progress','resolved','deferred') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deficiencies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`assessmentId` int,
	`deficiencyId` int,
	`fileKey` varchar(500) NOT NULL,
	`url` text NOT NULL,
	`caption` text,
	`mimeType` varchar(100),
	`fileSize` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text,
	`clientName` varchar(255),
	`propertyType` varchar(100),
	`constructionType` varchar(100),
	`yearBuilt` int,
	`numberOfUnits` int,
	`numberOfStories` int,
	`buildingCode` varchar(100),
	`assessmentDate` timestamp,
	`status` enum('draft','in_progress','completed','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
