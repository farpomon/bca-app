CREATE TABLE `chatbot_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`messageIndex` int NOT NULL,
	`userId` int NOT NULL,
	`feedback` enum('positive','negative') NOT NULL,
	`comment` text,
	`userMessage` text,
	`assistantMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `chatbot_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chatbot_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255),
	`currentPage` varchar(255),
	`pageContext` text,
	`messages` text NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chatbot_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_feedback_session` ON `chatbot_feedback` (`sessionId`);--> statement-breakpoint
CREATE INDEX `idx_feedback_user` ON `chatbot_feedback` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_feedback_type` ON `chatbot_feedback` (`feedback`);--> statement-breakpoint
CREATE INDEX `idx_chatbot_user` ON `chatbot_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_chatbot_active` ON `chatbot_sessions` (`userId`,`isActive`);