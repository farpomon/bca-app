CREATE TABLE `data_access_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`requestType` enum('export','deletion','correction','access_log') NOT NULL,
	`status` enum('pending','processing','completed','rejected') NOT NULL DEFAULT 'pending',
	`requestDetails` text,
	`responseData` text,
	`processedBy` int,
	`rejectionReason` text,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `data_access_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_residency_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(100) NOT NULL,
	`settingValue` text NOT NULL,
	`description` text,
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `data_residency_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `data_residency_settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `user_consents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`consentType` enum('privacy_policy','terms_of_service','data_processing','marketing','analytics') NOT NULL,
	`consentVersion` varchar(20) NOT NULL,
	`consentGiven` int NOT NULL,
	`consentText` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`consentedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `user_consents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY COLUMN `action` enum('create','update','delete','view','export','share') NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_log` ADD `dataClassification` enum('public','internal','confidential','restricted') DEFAULT 'internal';--> statement-breakpoint
ALTER TABLE `audit_log` ADD `complianceTags` text;--> statement-breakpoint
ALTER TABLE `audit_log` ADD `retentionPolicy` varchar(50);--> statement-breakpoint
ALTER TABLE `audit_log` ADD `ipAddress` varchar(45);--> statement-breakpoint
ALTER TABLE `audit_log` ADD `userAgent` text;--> statement-breakpoint
ALTER TABLE `audit_log` ADD `sessionId` varchar(100);