ALTER TABLE `projects` MODIFY COLUMN `status` enum('draft','in_progress','completed','archived','deleted') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `projects` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `deletedBy` int;