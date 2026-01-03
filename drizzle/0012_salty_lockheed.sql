CREATE TABLE `building_sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`sectionType` enum('original','extension','addition','renovation') NOT NULL DEFAULT 'original',
	`installDate` timestamp,
	`expectedLifespan` int,
	`grossFloorArea` int,
	`numberOfStories` int,
	`constructionType` varchar(100),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `building_sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `assessments` ADD `sectionId` int;