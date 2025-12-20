CREATE TABLE `project_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`previousStatus` enum('planning','active','on_hold','completed','cancelled'),
	`newStatus` enum('planning','active','on_hold','completed','cancelled') NOT NULL,
	`changedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`notes` text,
	CONSTRAINT `project_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_project_status_history` ON `project_status_history` (`projectId`,`changedAt`);--> statement-breakpoint
CREATE INDEX `idx_user_status_history` ON `project_status_history` (`userId`);