CREATE TABLE `facility_models` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`fileUrl` varchar(1024) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileSize` int,
	`format` enum('glb','gltf','fbx','obj') NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`isActive` boolean NOT NULL DEFAULT true,
	`metadata` json,
	`uploadedBy` int NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `facility_models_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `model_annotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`modelId` int NOT NULL,
	`projectId` int NOT NULL,
	`componentName` varchar(255),
	`assessmentId` int,
	`deficiencyId` int,
	`maintenanceEntryId` int,
	`annotationType` enum('deficiency','assessment','maintenance','note','issue') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`positionX` decimal(10,6) NOT NULL,
	`positionY` decimal(10,6) NOT NULL,
	`positionZ` decimal(10,6) NOT NULL,
	`cameraPosition` json,
	`cameraTarget` json,
	`priority` enum('immediate','high','medium','low'),
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `model_annotations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `model_viewpoints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`modelId` int NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`cameraPosition` json NOT NULL,
	`cameraTarget` json NOT NULL,
	`cameraZoom` decimal(10,6),
	`visibleLayers` json,
	`isShared` boolean NOT NULL DEFAULT false,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `model_viewpoints_id` PRIMARY KEY(`id`)
);
