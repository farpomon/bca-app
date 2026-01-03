ALTER TABLE `asset_documents` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `asset_documents` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `photos` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `photos` ADD `deletedBy` int;