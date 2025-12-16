CREATE TABLE `integration_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` enum('sap','tririga') NOT NULL,
	`runType` enum('full','incremental') NOT NULL,
	`status` enum('running','success','failed','partial') NOT NULL,
	`startedAt` timestamp NOT NULL,
	`completedAt` timestamp,
	`recordsExtracted` int DEFAULT 0,
	`recordsTransformed` int DEFAULT 0,
	`recordsLoaded` int DEFAULT 0,
	`recordsFailed` int DEFAULT 0,
	`errorMessage` text,
	`errorDetails` text,
	`triggeredBy` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
ALTER TABLE `building_codes` DROP INDEX `building_codes_code_unique`;--> statement-breakpoint
ALTER TABLE `projects` DROP FOREIGN KEY `projects_buildingCodeId_building_codes_id_fk`;
--> statement-breakpoint
DROP INDEX `idx_user_code` ON `sms_verification_codes`;--> statement-breakpoint
DROP INDEX `idx_expires` ON `sms_verification_codes`;--> statement-breakpoint
ALTER TABLE `mfa_audit_log` MODIFY COLUMN `action` enum('setup','enable','disable','verify_success','verify_fail','backup_code_used','device_trusted','device_removed') NOT NULL;--> statement-breakpoint
ALTER TABLE `project_permissions` MODIFY COLUMN `permission` enum('view','edit') NOT NULL DEFAULT 'view';--> statement-breakpoint
ALTER TABLE `sms_verification_codes` MODIFY COLUMN `code` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `sms_verification_codes` MODIFY COLUMN `phoneNumber` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `sms_verification_codes` MODIFY COLUMN `purpose` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `user_mfa_settings` MODIFY COLUMN `secret` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `projects` ADD `buildingCode` varchar(100);--> statement-breakpoint
ALTER TABLE `report_schedules` ADD `nextRun` timestamp;--> statement-breakpoint
ALTER TABLE `report_schedules` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
CREATE INDEX `code` ON `building_codes` (`code`);