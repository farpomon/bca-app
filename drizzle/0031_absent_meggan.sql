CREATE TABLE `custom_vocabulary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`term` varchar(255) NOT NULL,
	`pronunciation` varchar(255),
	`category` varchar(100),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_vocabulary_id` PRIMARY KEY(`id`)
);
