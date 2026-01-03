ALTER TABLE `users` ADD `companyId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `isSuperAdmin` tinyint DEFAULT 0 NOT NULL;