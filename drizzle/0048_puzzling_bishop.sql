CREATE TABLE `asset_timeline_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetId` int NOT NULL,
	`projectId` int NOT NULL,
	`eventType` enum('assessment','deficiency','maintenance','document','schedule','custom') NOT NULL,
	`eventDate` timestamp NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`relatedId` int,
	`metadata` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE INDEX `idx_asset_timeline` ON `asset_timeline_events` (`assetId`,`eventDate`);--> statement-breakpoint
CREATE INDEX `idx_event_type` ON `asset_timeline_events` (`eventType`);