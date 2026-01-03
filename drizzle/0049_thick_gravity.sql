CREATE TABLE `email_delivery_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emailType` enum('admin_notification','user_confirmation','user_approved','user_rejected','mfa_code','password_reset','other') NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`recipientName` varchar(255),
	`subject` varchar(500) NOT NULL,
	`status` enum('sent','delivered','failed','pending') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`deliveredAt` timestamp,
	`failureReason` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE INDEX `idx_email_status` ON `email_delivery_log` (`status`);--> statement-breakpoint
CREATE INDEX `idx_email_type` ON `email_delivery_log` (`emailType`);--> statement-breakpoint
CREATE INDEX `idx_recipient` ON `email_delivery_log` (`recipientEmail`);--> statement-breakpoint
CREATE INDEX `idx_sent_at` ON `email_delivery_log` (`sentAt`);