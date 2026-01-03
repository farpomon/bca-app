CREATE TABLE `company_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`userId` int NOT NULL,
	`companyRole` enum('company_admin','project_manager','editor','viewer') NOT NULL,
	`invitedBy` int,
	`invitedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`acceptedAt` timestamp,
	`status` enum('active','inactive','pending') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_users_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_company_user` ON `company_users` (`companyId`,`userId`);--> statement-breakpoint
CREATE INDEX `idx_user_companies` ON `company_users` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_company_role` ON `company_users` (`companyId`,`companyRole`);