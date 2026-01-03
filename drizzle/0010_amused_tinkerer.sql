CREATE TABLE `assessment_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`data` text NOT NULL,
	`changedBy` int NOT NULL,
	`changeDescription` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assessment_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int NOT NULL,
	`action` enum('create','update','delete') NOT NULL,
	`changes` text NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `database_backups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`backupType` enum('manual','automatic','scheduled') NOT NULL,
	`status` enum('pending','in_progress','completed','failed') NOT NULL DEFAULT 'pending',
	`fileSize` int,
	`recordCount` int,
	`backupPath` text,
	`metadata` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `database_backups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deficiency_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deficiencyId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`data` text NOT NULL,
	`changedBy` int NOT NULL,
	`changeDescription` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deficiency_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`data` text NOT NULL,
	`changedBy` int NOT NULL,
	`changeDescription` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_versions_id` PRIMARY KEY(`id`)
);
