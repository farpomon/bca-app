CREATE TABLE `report_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`frequency` enum('daily','weekly','monthly') NOT NULL,
	`dayOfWeek` int,
	`dayOfMonth` int,
	`recipientEmails` text NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`lastRun` timestamp,
	`nextRun` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `report_schedules_id` PRIMARY KEY(`id`)
);
