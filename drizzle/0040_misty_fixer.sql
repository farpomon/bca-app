CREATE TABLE `data_disposal_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestType` enum('project','user_data','audit_logs','backups','full_account') NOT NULL,
	`targetId` int,
	`targetType` varchar(100),
	`requestedBy` int NOT NULL,
	`approvedBy` int,
	`status` enum('pending','approved','in_progress','completed','rejected') NOT NULL DEFAULT 'pending',
	`reason` text,
	`disposalMethod` varchar(100),
	`backupPurgeStatus` enum('not_started','in_progress','completed','failed') DEFAULT 'not_started',
	`backupPurgeCompletedAt` timestamp,
	`verificationHash` varchar(255),
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`approvedAt` timestamp,
	`completedAt` timestamp,
	`notes` text,
	CONSTRAINT `data_disposal_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_retention_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`policyName` varchar(255) NOT NULL,
	`dataType` varchar(100) NOT NULL,
	`retentionPeriodYears` int NOT NULL,
	`description` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `data_retention_policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `encryption_key_metadata` (
	`id` int AUTO_INCREMENT NOT NULL,
	`keyIdentifier` varchar(255) NOT NULL,
	`keyType` enum('data_encryption','backup_encryption','transport') NOT NULL,
	`keyOwner` varchar(255) NOT NULL,
	`algorithm` varchar(100) NOT NULL,
	`keyStatus` enum('active','rotated','revoked') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`rotatedAt` timestamp,
	`expiresAt` timestamp,
	`notes` text,
	CONSTRAINT `encryption_key_metadata_id` PRIMARY KEY(`id`),
	CONSTRAINT `encryption_key_metadata_keyIdentifier_unique` UNIQUE(`keyIdentifier`)
);
