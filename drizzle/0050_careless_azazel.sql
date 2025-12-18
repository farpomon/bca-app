CREATE TABLE `chat_context_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`contextType` varchar(50) NOT NULL,
	`contextData` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`expiresAt` timestamp
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionType` enum('project','asset','company') NOT NULL,
	`contextId` int,
	`companyId` int,
	`title` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastMessageAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE INDEX `idx_session_type` ON `chat_context_cache` (`sessionId`,`contextType`);--> statement-breakpoint
CREATE INDEX `idx_session` ON `chat_messages` (`sessionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_user_session` ON `chat_sessions` (`userId`,`sessionType`);--> statement-breakpoint
CREATE INDEX `idx_context` ON `chat_sessions` (`sessionType`,`contextId`);--> statement-breakpoint
CREATE INDEX `idx_company` ON `chat_sessions` (`companyId`);