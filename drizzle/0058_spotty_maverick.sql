ALTER TABLE `assets` ADD `uniqueId` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `uniqueId` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `assets` ADD CONSTRAINT `assets_uniqueId_unique` UNIQUE(`uniqueId`);--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_uniqueId_unique` UNIQUE(`uniqueId`);