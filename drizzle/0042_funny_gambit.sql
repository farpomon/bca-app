CREATE TABLE `building_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`edition` varchar(100),
	`jurisdiction` varchar(100),
	`year` int,
	`documentUrl` text,
	`documentKey` varchar(500),
	`pageCount` int,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `building_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`city` varchar(255),
	`status` enum('active','suspended','inactive') NOT NULL DEFAULT 'active',
	`contactEmail` varchar(320),
	`contactPhone` varchar(50),
	`address` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `mfa_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` enum('setup','enable','disable','verify_success','verify_fail','backup_code_used','device_trusted','device_removed','mfa_reset_by_admin','sms_sent','sms_verified','email_sent','email_verified') NOT NULL,
	`success` int NOT NULL DEFAULT 1,
	`ipAddress` varchar(45),
	`userAgent` text,
	`deviceFingerprint` varchar(255),
	`failureReason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `mfa_method_switch_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currentMethod` enum('totp','sms','email') NOT NULL,
	`newMethod` enum('totp','sms','email') NOT NULL,
	`newMethodSecret` varchar(255),
	`newMethodVerified` int NOT NULL DEFAULT 0,
	`status` enum('pending','completed','cancelled','expired') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`completedAt` timestamp
);
--> statement-breakpoint
CREATE TABLE `mfa_recovery_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reason` text NOT NULL,
	`identityVerification` text,
	`status` enum('pending','approved','rejected','completed','expired') NOT NULL DEFAULT 'pending',
	`recoveryCode` varchar(255),
	`recoveryCodeExpiresAt` timestamp,
	`submittedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`reviewedAt` timestamp,
	`reviewedBy` int,
	`adminNotes` text,
	`rejectionReason` text,
	`completedAt` timestamp,
	`ipAddress` varchar(45),
	`userAgent` text
);
--> statement-breakpoint
CREATE TABLE `project_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`url` text NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`fileSize` int NOT NULL,
	`uploadedBy` int NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `sms_verification_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`code` varchar(255) NOT NULL,
	`phoneNumber` varchar(20) NOT NULL,
	`purpose` enum('mfa_setup','mfa_login','phone_verification','email_verification') NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`verified` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `trusted_devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`deviceFingerprint` varchar(255) NOT NULL,
	`deviceName` varchar(255),
	`userAgent` text,
	`ipAddress` varchar(45),
	`lastUsed` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `user_mfa_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`secret` varchar(255),
	`enabled` int NOT NULL DEFAULT 0,
	`backupCodes` text,
	`mfaMethod` enum('totp','sms','email') DEFAULT 'totp',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
DROP TABLE `export_history`;--> statement-breakpoint
DROP TABLE `integration_errors`;--> statement-breakpoint
DROP TABLE `integration_mappings`;--> statement-breakpoint
DROP TABLE `integration_runs`;--> statement-breakpoint
DROP TABLE `integration_schedules`;--> statement-breakpoint
DROP TABLE `sap_buildings`;--> statement-breakpoint
DROP TABLE `tririga_buildings`;--> statement-breakpoint
ALTER TABLE `building_components` DROP INDEX `building_components_code_unique`;--> statement-breakpoint
ALTER TABLE `consultant_submissions` DROP INDEX `consultant_submissions_submissionId_unique`;--> statement-breakpoint
ALTER TABLE `critical_equipment` DROP INDEX `critical_equipment_assessmentId_unique`;--> statement-breakpoint
ALTER TABLE `data_residency_settings` DROP INDEX `data_residency_settings_settingKey_unique`;--> statement-breakpoint
ALTER TABLE `encryption_key_metadata` DROP INDEX `encryption_key_metadata_keyIdentifier_unique`;--> statement-breakpoint
ALTER TABLE `project_hierarchy_config` DROP INDEX `project_hierarchy_config_projectId_unique`;--> statement-breakpoint
ALTER TABLE `project_priority_scores` DROP INDEX `project_priority_scores_projectId_unique`;--> statement-breakpoint
ALTER TABLE `project_rating_config` DROP INDEX `project_rating_config_projectId_unique`;--> statement-breakpoint
ALTER TABLE `report_configurations` DROP INDEX `report_configurations_templateId_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_openId_unique`;--> statement-breakpoint
ALTER TABLE `access_requests` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `assessment_documents` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `assessment_versions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `assessments` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `asset_documents` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `assets` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `audit_log` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `budget_allocations` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `building_components` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `building_sections` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `capital_budget_cycles` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `cash_flow_projections` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `ci_fci_snapshots` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `cof_factors` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `component_deterioration_config` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `component_history` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `consultant_submissions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `cost_estimates` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `criteria_objective_links` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `criteria_presets` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `critical_equipment` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `custom_components` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `custom_vocabulary` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `dashboard_configs` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `data_access_requests` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `data_disposal_requests` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `data_residency_settings` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `data_retention_policies` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `database_backups` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `deficiencies` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `deficiency_versions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `deterioration_curves` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `emissions_data` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `encryption_key_metadata` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `esg_scores` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `facility_models` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `floor_plans` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `green_upgrades` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `hierarchy_templates` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `kpi_snapshots` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `maintenance_entries` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `model_annotations` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `model_viewpoints` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `optimization_scenarios` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `photos` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `pof_factors` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `prediction_history` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `prioritization_criteria` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `project_hierarchy_config` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `project_permissions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `project_priority_scores` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `project_rating_config` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `project_scores` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `project_versions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `projects` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `rating_scales` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `renovation_costs` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `report_configurations` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `report_history` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `report_schedules` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `report_sections` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `report_templates` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `risk_assessments` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `risk_mitigation_actions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `scenario_strategies` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `strategic_objectives` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `submission_items` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `submission_photos` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `sustainability_goals` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `user_consents` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `users` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `utility_consumption` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `validation_overrides` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `validation_rules` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `waste_tracking` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `access_requests` MODIFY COLUMN `submittedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `assessment_documents` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `assessment_versions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `assessments` MODIFY COLUMN `assessedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `assessments` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `asset_documents` MODIFY COLUMN `fileKey` varchar(500) NOT NULL;--> statement-breakpoint
ALTER TABLE `asset_documents` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `assets` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `budget_allocations` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `building_components` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `building_sections` MODIFY COLUMN `installDate` date;--> statement-breakpoint
ALTER TABLE `building_sections` MODIFY COLUMN `grossFloorArea` decimal(10,2);--> statement-breakpoint
ALTER TABLE `building_sections` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `capital_budget_cycles` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `cash_flow_projections` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `ci_fci_snapshots` MODIFY COLUMN `calculatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `ci_fci_snapshots` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `cof_factors` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `component_deterioration_config` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `component_history` MODIFY COLUMN `timestamp` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `consultant_submissions` MODIFY COLUMN `submittedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `consultant_submissions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `cost_estimates` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `criteria_presets` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `critical_equipment` MODIFY COLUMN `designatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `critical_equipment` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `custom_components` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `custom_vocabulary` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `dashboard_configs` MODIFY COLUMN `isDefault` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `dashboard_configs` MODIFY COLUMN `isDefault` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `dashboard_configs` MODIFY COLUMN `isShared` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `dashboard_configs` MODIFY COLUMN `isShared` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `dashboard_configs` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `data_access_requests` MODIFY COLUMN `requestedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `data_disposal_requests` MODIFY COLUMN `requestedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `data_residency_settings` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `data_retention_policies` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `database_backups` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `deficiencies` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `deficiency_versions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `deterioration_curves` MODIFY COLUMN `isDefault` tinyint;--> statement-breakpoint
ALTER TABLE `deterioration_curves` MODIFY COLUMN `isDefault` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `deterioration_curves` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `emissions_data` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `encryption_key_metadata` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `esg_scores` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `facility_models` MODIFY COLUMN `isActive` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `facility_models` MODIFY COLUMN `uploadedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `floor_plans` MODIFY COLUMN `scale` decimal(10,4);--> statement-breakpoint
ALTER TABLE `floor_plans` MODIFY COLUMN `createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `floor_plans` MODIFY COLUMN `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `green_upgrades` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `hierarchy_templates` MODIFY COLUMN `isDefault` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `hierarchy_templates` MODIFY COLUMN `isDefault` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `hierarchy_templates` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `kpi_snapshots` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `maintenance_entries` MODIFY COLUMN `isRecurring` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `maintenance_entries` MODIFY COLUMN `isRecurring` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `maintenance_entries` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `model_annotations` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `model_viewpoints` MODIFY COLUMN `isShared` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `model_viewpoints` MODIFY COLUMN `isShared` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `model_viewpoints` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `optimization_scenarios` MODIFY COLUMN `fciImprovement` decimal(10,4);--> statement-breakpoint
ALTER TABLE `optimization_scenarios` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `photos` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `pof_factors` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `prediction_history` MODIFY COLUMN `predictionDate` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `prediction_history` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `prioritization_criteria` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `project_hierarchy_config` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `project_permissions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `project_priority_scores` MODIFY COLUMN `calculatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `project_rating_config` MODIFY COLUMN `useWeightedAverage` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `project_rating_config` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `project_scores` MODIFY COLUMN `scoredAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `project_versions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `rating_scales` MODIFY COLUMN `isDefault` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `rating_scales` MODIFY COLUMN `isDefault` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `rating_scales` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `renovation_costs` MODIFY COLUMN `dateRecorded` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `renovation_costs` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `report_configurations` MODIFY COLUMN `tableOfContents` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `report_configurations` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `report_history` MODIFY COLUMN `generatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `report_schedules` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `report_sections` MODIFY COLUMN `isEnabled` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `report_sections` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `report_templates` MODIFY COLUMN `isGlobal` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `report_templates` MODIFY COLUMN `isGlobal` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `report_templates` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `risk_assessments` MODIFY COLUMN `assessedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `risk_assessments` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `risk_mitigation_actions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `scenario_strategies` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `strategic_objectives` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `submission_items` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `submission_photos` MODIFY COLUMN `uploadedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `sustainability_goals` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `user_consents` MODIFY COLUMN `consentedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','viewer','editor','project_manager') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `utility_consumption` MODIFY COLUMN `isRenewable` tinyint;--> statement-breakpoint
ALTER TABLE `utility_consumption` MODIFY COLUMN `isRenewable` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `utility_consumption` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `validation_overrides` MODIFY COLUMN `overriddenAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `validation_rules` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `waste_tracking` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `assessments` ADD `estimatedServiceLife` int;--> statement-breakpoint
ALTER TABLE `assessments` ADD `complianceStatus` varchar(50);--> statement-breakpoint
ALTER TABLE `assessments` ADD `complianceIssues` text;--> statement-breakpoint
ALTER TABLE `assessments` ADD `complianceRecommendations` text;--> statement-breakpoint
ALTER TABLE `assessments` ADD `complianceCheckedAt` timestamp;--> statement-breakpoint
ALTER TABLE `assessments` ADD `complianceCheckedBy` int;--> statement-breakpoint
ALTER TABLE `asset_documents` ADD `url` text NOT NULL;--> statement-breakpoint
ALTER TABLE `asset_documents` ADD `uploadedBy` int NOT NULL;--> statement-breakpoint
ALTER TABLE `assets` ADD `streetNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `assets` ADD `streetAddress` varchar(255);--> statement-breakpoint
ALTER TABLE `assets` ADD `unitNumber` varchar(50);--> statement-breakpoint
ALTER TABLE `assets` ADD `postalCode` varchar(20);--> statement-breakpoint
ALTER TABLE `assets` ADD `province` varchar(100);--> statement-breakpoint
ALTER TABLE `assets` ADD `latitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `assets` ADD `longitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `cash_flow_projections` ADD `projectedCi` decimal(5,2);--> statement-breakpoint
ALTER TABLE `cash_flow_projections` ADD `projectedFci` decimal(10,4);--> statement-breakpoint
ALTER TABLE `floor_plans` ADD `sectionId` int;--> statement-breakpoint
ALTER TABLE `floor_plans` ADD `floorLevel` varchar(50);--> statement-breakpoint
ALTER TABLE `floor_plans` ADD `imageUrl` text NOT NULL;--> statement-breakpoint
ALTER TABLE `green_upgrades` ADD `energySavingsKwh` decimal(15,2);--> statement-breakpoint
ALTER TABLE `green_upgrades` ADD `co2ReductionMt` decimal(15,4);--> statement-breakpoint
ALTER TABLE `kpi_snapshots` ADD `portfolioFci` decimal(10,4);--> statement-breakpoint
ALTER TABLE `kpi_snapshots` ADD `portfolioCi` decimal(10,4);--> statement-breakpoint
ALTER TABLE `optimization_scenarios` ADD `currentCi` decimal(5,2);--> statement-breakpoint
ALTER TABLE `optimization_scenarios` ADD `projectedCi` decimal(5,2);--> statement-breakpoint
ALTER TABLE `optimization_scenarios` ADD `currentFci` decimal(10,4);--> statement-breakpoint
ALTER TABLE `optimization_scenarios` ADD `projectedFci` decimal(10,4);--> statement-breakpoint
ALTER TABLE `projects` ADD `streetNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `projects` ADD `streetAddress` varchar(255);--> statement-breakpoint
ALTER TABLE `projects` ADD `unitNumber` varchar(50);--> statement-breakpoint
ALTER TABLE `projects` ADD `postalCode` varchar(20);--> statement-breakpoint
ALTER TABLE `projects` ADD `province` varchar(100);--> statement-breakpoint
ALTER TABLE `projects` ADD `latitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `projects` ADD `longitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `projects` ADD `buildingCodeId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `mfaRequired` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `mfaEnforcedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `mfaGracePeriodEnd` timestamp;--> statement-breakpoint
CREATE INDEX `idx_user_action` ON `mfa_audit_log` (`userId`,`action`);--> statement-breakpoint
CREATE INDEX `idx_created` ON `mfa_audit_log` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_user_status` ON `mfa_method_switch_requests` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_expires` ON `mfa_method_switch_requests` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `idx_user_status` ON `mfa_recovery_requests` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `mfa_recovery_requests` (`status`);--> statement-breakpoint
CREATE INDEX `idx_submitted` ON `mfa_recovery_requests` (`submittedAt`);--> statement-breakpoint
CREATE INDEX `idx_project_documents_projectId` ON `project_documents` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_project_documents_uploadedBy` ON `project_documents` (`uploadedBy`);--> statement-breakpoint
CREATE INDEX `idx_user_code` ON `sms_verification_codes` (`userId`,`code`);--> statement-breakpoint
CREATE INDEX `idx_expires` ON `sms_verification_codes` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `idx_user_device` ON `trusted_devices` (`userId`,`deviceFingerprint`);--> statement-breakpoint
CREATE INDEX `idx_expires` ON `trusted_devices` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `user_mfa_settings` (`userId`);--> statement-breakpoint
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_sectionId_building_sections_id_fk` FOREIGN KEY (`sectionId`) REFERENCES `building_sections`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `building_sections` ADD CONSTRAINT `building_sections_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plans` ADD CONSTRAINT `floor_plans_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plans` ADD CONSTRAINT `floor_plans_sectionId_building_sections_id_fk` FOREIGN KEY (`sectionId`) REFERENCES `building_sections`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `photos` ADD CONSTRAINT `photos_floorPlanId_floor_plans_id_fk` FOREIGN KEY (`floorPlanId`) REFERENCES `floor_plans`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_buildingCodeId_building_codes_id_fk` FOREIGN KEY (`buildingCodeId`) REFERENCES `building_codes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_assessment` ON `assessment_versions` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `idx_version` ON `assessment_versions` (`assessmentId`,`versionNumber`);--> statement-breakpoint
CREATE INDEX `idx_entity` ON `audit_log` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `idx_user` ON `audit_log` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_created` ON `audit_log` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_project_id` ON `building_sections` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_risk_assessment` ON `cof_factors` (`riskAssessmentId`);--> statement-breakpoint
CREATE INDEX `component_idx` ON `component_history` (`projectId`,`componentCode`,`timestamp`);--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `component_history` (`timestamp`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `component_history` (`userId`);--> statement-breakpoint
CREATE INDEX `submissionId` ON `consultant_submissions` (`submissionId`);--> statement-breakpoint
CREATE INDEX `idx_criticality` ON `critical_equipment` (`criticalityLevel`);--> statement-breakpoint
CREATE INDEX `assessmentId` ON `critical_equipment` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `settingKey` ON `data_residency_settings` (`settingKey`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `database_backups` (`status`);--> statement-breakpoint
CREATE INDEX `idx_created` ON `database_backups` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_deficiency` ON `deficiency_versions` (`deficiencyId`);--> statement-breakpoint
CREATE INDEX `keyIdentifier` ON `encryption_key_metadata` (`keyIdentifier`);--> statement-breakpoint
CREATE INDEX `idx_projectId` ON `maintenance_entries` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_assessmentId` ON `maintenance_entries` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `idx_entryType` ON `maintenance_entries` (`entryType`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `maintenance_entries` (`status`);--> statement-breakpoint
CREATE INDEX `idx_componentName` ON `maintenance_entries` (`componentName`);--> statement-breakpoint
CREATE INDEX `idx_dateCompleted` ON `maintenance_entries` (`dateCompleted`);--> statement-breakpoint
CREATE INDEX `idx_nextDueDate` ON `maintenance_entries` (`nextDueDate`);--> statement-breakpoint
CREATE INDEX `idx_risk_assessment` ON `pof_factors` (`riskAssessmentId`);--> statement-breakpoint
CREATE INDEX `project_hierarchy_config_projectId_unique` ON `project_hierarchy_config` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_priority_scores_projectId_unique` ON `project_priority_scores` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_rating_config_projectId_unique` ON `project_rating_config` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_project` ON `project_versions` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_projectId` ON `renovation_costs` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_costType` ON `renovation_costs` (`costType`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `renovation_costs` (`status`);--> statement-breakpoint
CREATE INDEX `templateId` ON `report_configurations` (`templateId`);--> statement-breakpoint
CREATE INDEX `idx_projectId` ON `report_history` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_userId` ON `report_history` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `report_history` (`status`);--> statement-breakpoint
CREATE INDEX `idx_templateId` ON `report_sections` (`templateId`);--> statement-breakpoint
CREATE INDEX `idx_orderIndex` ON `report_sections` (`orderIndex`);--> statement-breakpoint
CREATE INDEX `idx_type` ON `report_templates` (`type`);--> statement-breakpoint
CREATE INDEX `idx_isGlobal` ON `report_templates` (`isGlobal`);--> statement-breakpoint
CREATE INDEX `idx_projectId` ON `report_templates` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_assessment` ON `risk_assessments` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `idx_risk_level` ON `risk_assessments` (`riskLevel`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `risk_assessments` (`status`);--> statement-breakpoint
CREATE INDEX `idx_risk_assessment` ON `risk_mitigation_actions` (`riskAssessmentId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `risk_mitigation_actions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_priority` ON `risk_mitigation_actions` (`priority`);--> statement-breakpoint
ALTER TABLE `asset_documents` DROP COLUMN `userId`;--> statement-breakpoint
ALTER TABLE `asset_documents` DROP COLUMN `fileUrl`;--> statement-breakpoint
ALTER TABLE `asset_documents` DROP COLUMN `uploadedAt`;--> statement-breakpoint
ALTER TABLE `asset_documents` DROP COLUMN `updatedAt`;--> statement-breakpoint
ALTER TABLE `cash_flow_projections` DROP COLUMN `projectedCI`;--> statement-breakpoint
ALTER TABLE `cash_flow_projections` DROP COLUMN `projectedFCI`;--> statement-breakpoint
ALTER TABLE `floor_plans` DROP COLUMN `floorNumber`;--> statement-breakpoint
ALTER TABLE `floor_plans` DROP COLUMN `buildingSectionId`;--> statement-breakpoint
ALTER TABLE `floor_plans` DROP COLUMN `fileKey`;--> statement-breakpoint
ALTER TABLE `floor_plans` DROP COLUMN `url`;--> statement-breakpoint
ALTER TABLE `floor_plans` DROP COLUMN `uploadedBy`;--> statement-breakpoint
ALTER TABLE `green_upgrades` DROP COLUMN `energySavingsKWh`;--> statement-breakpoint
ALTER TABLE `green_upgrades` DROP COLUMN `co2ReductionMT`;--> statement-breakpoint
ALTER TABLE `kpi_snapshots` DROP COLUMN `portfolioFCI`;--> statement-breakpoint
ALTER TABLE `kpi_snapshots` DROP COLUMN `portfolioCI`;--> statement-breakpoint
ALTER TABLE `optimization_scenarios` DROP COLUMN `currentCI`;--> statement-breakpoint
ALTER TABLE `optimization_scenarios` DROP COLUMN `projectedCI`;--> statement-breakpoint
ALTER TABLE `optimization_scenarios` DROP COLUMN `currentFCI`;--> statement-breakpoint
ALTER TABLE `optimization_scenarios` DROP COLUMN `projectedFCI`;--> statement-breakpoint
ALTER TABLE `project_permissions` DROP COLUMN `grantedBy`;--> statement-breakpoint
ALTER TABLE `project_permissions` DROP COLUMN `updatedAt`;--> statement-breakpoint
ALTER TABLE `projects` DROP COLUMN `buildingCode`;--> statement-breakpoint
ALTER TABLE `report_schedules` DROP COLUMN `nextRun`;--> statement-breakpoint
ALTER TABLE `report_schedules` DROP COLUMN `updatedAt`;