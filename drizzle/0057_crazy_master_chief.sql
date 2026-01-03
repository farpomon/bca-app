ALTER TABLE `building_codes` ADD `effectiveDate` varchar(64);--> statement-breakpoint
ALTER TABLE `building_codes` ADD `status` varchar(32) DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `building_codes` ADD `isLatest` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `building_codes` ADD `lastVerified` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `building_codes` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
CREATE INDEX `jurisdiction_latest` ON `building_codes` (`jurisdiction`,`isLatest`);