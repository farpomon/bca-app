CREATE TABLE `backup_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`cronExpression` varchar(100) NOT NULL,
	`timezone` varchar(50) NOT NULL DEFAULT 'America/New_York',
	`isEnabled` int NOT NULL DEFAULT 1,
	`retentionDays` int NOT NULL DEFAULT 30,
	`encryptionEnabled` int NOT NULL DEFAULT 1,
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`lastRunStatus` enum('success','failed','skipped'),
	`lastRunBackupId` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `database_backups` ADD `isEncrypted` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `database_backups` ADD `encryptionKeyId` varchar(255);--> statement-breakpoint
ALTER TABLE `database_backups` ADD `encryptionAlgorithm` varchar(50);--> statement-breakpoint
ALTER TABLE `database_backups` ADD `encryptionIv` varchar(64);--> statement-breakpoint
CREATE INDEX `idx_enabled` ON `backup_schedules` (`isEnabled`);--> statement-breakpoint
CREATE INDEX `idx_next_run` ON `backup_schedules` (`nextRunAt`);