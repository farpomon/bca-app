CREATE TABLE `asset_ratings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetId` int NOT NULL,
	`projectId` int NOT NULL,
	`overallScore` decimal(5,2),
	`overallGrade` varchar(5),
	`overallZone` enum('green','yellow','orange','red'),
	`fciScore` decimal(5,2),
	`fciGrade` varchar(5),
	`fciZone` enum('green','yellow','orange','red'),
	`conditionScore` decimal(5,2),
	`conditionGrade` varchar(5),
	`conditionZone` enum('green','yellow','orange','red'),
	`esgScore` decimal(5,2),
	`esgGrade` varchar(5),
	`esgZone` enum('green','yellow','orange','red'),
	`componentBreakdown` text,
	`lastCalculatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`calculatedBy` int,
	`scaleConfigId` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `asset_ratings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_ratings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`portfolioScore` decimal(5,2),
	`portfolioGrade` varchar(5),
	`portfolioZone` enum('green','yellow','orange','red'),
	`avgFciScore` decimal(5,2),
	`avgConditionScore` decimal(5,2),
	`avgEsgScore` decimal(5,2),
	`zoneDistribution` text,
	`gradeDistribution` text,
	`totalAssets` int DEFAULT 0,
	`assessedAssets` int DEFAULT 0,
	`lastCalculatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_ratings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rating_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('asset','project') NOT NULL,
	`entityId` int NOT NULL,
	`ratingType` enum('overall','fci','condition','esg') NOT NULL,
	`score` decimal(5,2) NOT NULL,
	`letterGrade` varchar(5),
	`zone` enum('green','yellow','orange','red'),
	`previousScore` decimal(5,2),
	`previousGrade` varchar(5),
	`changeReason` text,
	`recordedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`recordedBy` int,
	CONSTRAINT `rating_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rating_scale_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int,
	`scaleType` enum('fci','condition','esg','overall','custom') NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`letterGradeThresholds` text NOT NULL,
	`zoneThresholds` text NOT NULL,
	`isDefault` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rating_scale_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_asset_rating_asset` ON `asset_ratings` (`assetId`);--> statement-breakpoint
CREATE INDEX `idx_asset_rating_project` ON `asset_ratings` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_asset_rating_zone` ON `asset_ratings` (`overallZone`);--> statement-breakpoint
CREATE INDEX `idx_project_rating_project` ON `project_ratings` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_project_rating_zone` ON `project_ratings` (`portfolioZone`);--> statement-breakpoint
CREATE INDEX `idx_rating_history_entity` ON `rating_history` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `idx_rating_history_type` ON `rating_history` (`ratingType`);--> statement-breakpoint
CREATE INDEX `idx_rating_history_date` ON `rating_history` (`recordedAt`);--> statement-breakpoint
CREATE INDEX `idx_rating_scale_company` ON `rating_scale_configs` (`companyId`);--> statement-breakpoint
CREATE INDEX `idx_rating_scale_type` ON `rating_scale_configs` (`scaleType`);--> statement-breakpoint
CREATE INDEX `idx_rating_scale_default` ON `rating_scale_configs` (`isDefault`);