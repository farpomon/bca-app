CREATE TABLE `company_access_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`code` varchar(64) NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`expiresAt` timestamp NOT NULL,
	`usedBy` int,
	`usedAt` timestamp
);
--> statement-breakpoint
ALTER TABLE `companies` ADD `privacyLockEnabled` int DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_company_code` ON `company_access_codes` (`companyId`,`code`);