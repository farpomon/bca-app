CREATE TABLE `bulk_operation_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operationType` enum('delete_users','suspend_users','activate_users','change_role','extend_trial','delete_companies','suspend_companies','activate_companies','approve_requests','reject_requests') NOT NULL,
	`performedBy` int NOT NULL,
	`performedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`expiresAt` timestamp NOT NULL,
	`affectedCount` int NOT NULL,
	`metadata` text,
	`undoneAt` timestamp,
	`undoneBy` int,
	`status` enum('active','undone','expired') NOT NULL DEFAULT 'active',
	CONSTRAINT `bulk_operation_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bulk_operation_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operationId` int NOT NULL,
	`recordType` enum('user','company','access_request') NOT NULL,
	`recordId` int NOT NULL,
	`snapshotData` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `bulk_operation_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_performed_by` ON `bulk_operation_history` (`performedBy`);--> statement-breakpoint
CREATE INDEX `idx_expires_at` ON `bulk_operation_history` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `bulk_operation_history` (`status`);--> statement-breakpoint
CREATE INDEX `idx_operation_id` ON `bulk_operation_snapshots` (`operationId`);--> statement-breakpoint
CREATE INDEX `idx_record` ON `bulk_operation_snapshots` (`recordType`,`recordId`);