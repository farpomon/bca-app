ALTER TABLE `facility_models` MODIFY COLUMN `format` enum('glb','gltf','fbx','obj','skp','rvt','rfa','dwg','dxf','ifc','nwd','nwc') NOT NULL;--> statement-breakpoint
ALTER TABLE `facility_models` ADD `apsObjectKey` varchar(512);--> statement-breakpoint
ALTER TABLE `facility_models` ADD `apsBucketKey` varchar(128);--> statement-breakpoint
ALTER TABLE `facility_models` ADD `apsUrn` varchar(512);--> statement-breakpoint
ALTER TABLE `facility_models` ADD `apsTranslationStatus` enum('pending','in_progress','success','failed','timeout') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `facility_models` ADD `apsTranslationProgress` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `facility_models` ADD `apsTranslationMessage` text;--> statement-breakpoint
ALTER TABLE `facility_models` ADD `apsDerivativeUrn` varchar(512);--> statement-breakpoint
ALTER TABLE `facility_models` ADD `apsUploadedAt` timestamp;--> statement-breakpoint
ALTER TABLE `facility_models` ADD `apsTranslationStartedAt` timestamp;--> statement-breakpoint
ALTER TABLE `facility_models` ADD `apsTranslationCompletedAt` timestamp;