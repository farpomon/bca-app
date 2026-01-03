ALTER TABLE `project_permissions` ADD `companyId` int;--> statement-breakpoint
ALTER TABLE `project_permissions` ADD `grantedBy` int;--> statement-breakpoint
ALTER TABLE `project_permissions` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `users` ADD `welcomeEmailSent` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `welcomeEmailSentAt` timestamp;--> statement-breakpoint
CREATE INDEX `idx_project_user` ON `project_permissions` (`projectId`,`userId`);--> statement-breakpoint
CREATE INDEX `idx_company_project` ON `project_permissions` (`companyId`,`projectId`);