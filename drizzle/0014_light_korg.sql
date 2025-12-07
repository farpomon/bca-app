CREATE TABLE `validation_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ruleId` int NOT NULL,
	`assessmentId` int,
	`deficiencyId` int,
	`projectId` int NOT NULL,
	`fieldName` varchar(100) NOT NULL,
	`originalValue` text,
	`overriddenValue` text,
	`justification` text,
	`overriddenBy` int NOT NULL,
	`overriddenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `validation_overrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `validation_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`ruleType` enum('date_range','numeric_range','required_field','custom_logic','same_year_inspection') NOT NULL,
	`severity` enum('error','warning','info') NOT NULL DEFAULT 'warning',
	`field` varchar(100) NOT NULL,
	`condition` text NOT NULL,
	`message` text NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`projectId` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `validation_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `assessments` ADD `hasValidationOverrides` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `assessments` ADD `validationWarnings` text;