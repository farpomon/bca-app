CREATE TABLE `report_configurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`logoUrl` varchar(500),
	`headerText` text,
	`footerText` text,
	`colorScheme` json,
	`fontOptions` json,
	`pageOptions` json,
	`coverPageOptions` json,
	`tableOfContents` boolean NOT NULL DEFAULT true,
	`disclaimerText` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `report_configurations_id` PRIMARY KEY(`id`),
	CONSTRAINT `report_configurations_templateId_unique` UNIQUE(`templateId`)
);
--> statement-breakpoint
CREATE TABLE `report_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`templateId` int NOT NULL,
	`userId` int NOT NULL,
	`format` enum('pdf','excel','word','html') NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` varchar(500),
	`fileSize` int,
	`status` enum('generating','completed','failed') NOT NULL DEFAULT 'generating',
	`errorMessage` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `report_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `report_sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`sectionType` enum('cover_page','executive_summary','condition_summary','cost_tables','deficiencies_list','photo_gallery','risk_assessment','optimization_results','prioritization_rankings','component_details','ci_fci_trends','cash_flow_projections','custom_text') NOT NULL,
	`title` varchar(255),
	`orderIndex` int NOT NULL,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`layoutOptions` json,
	`contentOptions` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `report_sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `report_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` enum('executive_summary','detailed_assessment','financial_analysis','compliance','risk_assessment','optimization_results','custom') NOT NULL,
	`stakeholder` varchar(100),
	`isGlobal` boolean NOT NULL DEFAULT false,
	`userId` int,
	`projectId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `report_templates_id` PRIMARY KEY(`id`)
);
