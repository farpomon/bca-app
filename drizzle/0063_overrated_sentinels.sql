ALTER TABLE `economic_indicators` MODIFY COLUMN `indicatorDate` timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE `portfolio_targets` MODIFY COLUMN `lastReviewDate` timestamp;--> statement-breakpoint
ALTER TABLE `portfolio_targets` MODIFY COLUMN `nextReviewDate` timestamp;