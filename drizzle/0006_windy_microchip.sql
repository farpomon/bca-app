ALTER TABLE `assessments` ADD `estimatedRepairCost` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `assessments` ADD `replacementValue` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `assessments` ADD `actionYear` int;