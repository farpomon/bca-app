ALTER TABLE `companies` ADD `defaultTrialDuration` int DEFAULT 14;--> statement-breakpoint
ALTER TABLE `companies` ADD `mfaRequired` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `companies` ADD `maxUsers` int DEFAULT 100;--> statement-breakpoint
ALTER TABLE `companies` ADD `featureAccess` text;