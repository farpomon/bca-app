CREATE TABLE `building_type_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`buildingClass` enum('class_a','class_b','class_c') NOT NULL DEFAULT 'class_b',
	`propertyType` varchar(100) NOT NULL,
	`constructionType` varchar(100),
	`typicalYearBuiltRange` varchar(50),
	`typicalGrossFloorArea` int,
	`typicalNumberOfStories` int,
	`isActive` int NOT NULL DEFAULT 1,
	`isDefault` int NOT NULL DEFAULT 0,
	`companyId` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `building_type_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bulk_service_life_updates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int,
	`updateType` enum('component','building_class','property_type','all') NOT NULL,
	`componentCode` varchar(20),
	`buildingClass` enum('class_a','class_b','class_c','all'),
	`propertyType` varchar(100),
	`previousServiceLife` int,
	`newServiceLife` int NOT NULL,
	`percentageChange` decimal(5,2),
	`affectedProjectsCount` int DEFAULT 0,
	`affectedAssessmentsCount` int DEFAULT 0,
	`reason` text,
	`status` enum('pending','in_progress','completed','failed','rolled_back') NOT NULL DEFAULT 'pending',
	`appliedAt` timestamp,
	`appliedBy` int,
	`rolledBackAt` timestamp,
	`rolledBackBy` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bulk_service_life_updates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bulk_update_affected_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bulkUpdateId` int NOT NULL,
	`assessmentId` int NOT NULL,
	`projectId` int NOT NULL,
	`componentCode` varchar(20) NOT NULL,
	`previousServiceLife` int,
	`newServiceLife` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `bulk_update_affected_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `design_service_life_values` (
	`id` int AUTO_INCREMENT NOT NULL,
	`componentCode` varchar(20) NOT NULL,
	`componentName` varchar(255) NOT NULL,
	`buildingClass` enum('class_a','class_b','class_c','all') NOT NULL DEFAULT 'all',
	`propertyType` varchar(100),
	`designServiceLife` int NOT NULL,
	`minServiceLife` int,
	`maxServiceLife` int,
	`bestCaseServiceLife` int,
	`worstCaseServiceLife` int,
	`dataSource` varchar(255),
	`notes` text,
	`isActive` int NOT NULL DEFAULT 1,
	`companyId` int,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `design_service_life_values_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `template_systems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`componentCode` varchar(20) NOT NULL,
	`componentName` varchar(255) NOT NULL,
	`defaultServiceLife` int NOT NULL,
	`defaultReplacementCost` decimal(15,2),
	`defaultCostUnit` varchar(50),
	`defaultQuantityFormula` varchar(255),
	`typicalCondition` enum('good','fair','poor') DEFAULT 'good',
	`priority` int DEFAULT 1,
	`isRequired` int NOT NULL DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `template_systems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_template_property_type` ON `building_type_templates` (`propertyType`);--> statement-breakpoint
CREATE INDEX `idx_template_building_class` ON `building_type_templates` (`buildingClass`);--> statement-breakpoint
CREATE INDEX `idx_template_company` ON `building_type_templates` (`companyId`);--> statement-breakpoint
CREATE INDEX `idx_template_active` ON `building_type_templates` (`isActive`);--> statement-breakpoint
CREATE INDEX `idx_bulk_update_company` ON `bulk_service_life_updates` (`companyId`);--> statement-breakpoint
CREATE INDEX `idx_bulk_update_status` ON `bulk_service_life_updates` (`status`);--> statement-breakpoint
CREATE INDEX `idx_bulk_update_component` ON `bulk_service_life_updates` (`componentCode`);--> statement-breakpoint
CREATE INDEX `idx_affected_bulk_update` ON `bulk_update_affected_items` (`bulkUpdateId`);--> statement-breakpoint
CREATE INDEX `idx_affected_assessment` ON `bulk_update_affected_items` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `idx_affected_project` ON `bulk_update_affected_items` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_dsl_component` ON `design_service_life_values` (`componentCode`);--> statement-breakpoint
CREATE INDEX `idx_dsl_building_class` ON `design_service_life_values` (`buildingClass`);--> statement-breakpoint
CREATE INDEX `idx_dsl_property_type` ON `design_service_life_values` (`propertyType`);--> statement-breakpoint
CREATE INDEX `idx_dsl_company` ON `design_service_life_values` (`companyId`);--> statement-breakpoint
CREATE INDEX `idx_template_system_template` ON `template_systems` (`templateId`);--> statement-breakpoint
CREATE INDEX `idx_template_system_component` ON `template_systems` (`componentCode`);