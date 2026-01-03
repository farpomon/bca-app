CREATE TABLE `mfa_time_restrictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`restrictionType` enum('always','business_hours','after_hours','custom_schedule','never') NOT NULL DEFAULT 'always',
	`startTime` varchar(5),
	`endTime` varchar(5),
	`daysOfWeek` text,
	`timezone` varchar(50) DEFAULT 'UTC',
	`isActive` tinyint NOT NULL DEFAULT 1,
	`description` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_user_active` ON `mfa_time_restrictions` (`userId`,`isActive`);--> statement-breakpoint
CREATE INDEX `idx_restriction_type` ON `mfa_time_restrictions` (`restrictionType`);