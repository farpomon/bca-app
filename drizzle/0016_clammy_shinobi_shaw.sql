CREATE TABLE `consultant_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`submissionId` varchar(50) NOT NULL,
	`submittedBy` int NOT NULL,
	`consultantName` varchar(255),
	`consultantEmail` varchar(320),
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`dataType` enum('assessments','deficiencies','mixed') NOT NULL,
	`fileName` varchar(255),
	`totalItems` int NOT NULL DEFAULT 0,
	`validItems` int NOT NULL DEFAULT 0,
	`invalidItems` int NOT NULL DEFAULT 0,
	`status` enum('pending_review','under_review','approved','rejected','partially_approved','finalized') NOT NULL DEFAULT 'pending_review',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`reviewNotes` text,
	`finalizedAt` timestamp,
	`finalizedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `consultant_submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `consultant_submissions_submissionId_unique` UNIQUE(`submissionId`)
);
--> statement-breakpoint
CREATE TABLE `submission_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`projectId` int NOT NULL,
	`itemType` enum('assessment','deficiency') NOT NULL,
	`rowNumber` int,
	`data` text NOT NULL,
	`validationStatus` enum('valid','warning','error') NOT NULL,
	`validationErrors` text,
	`itemStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewNotes` text,
	`finalizedAssessmentId` int,
	`finalizedDeficiencyId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `submission_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submission_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`submissionItemId` int,
	`fileName` varchar(255) NOT NULL,
	`fileSize` int,
	`mimeType` varchar(100),
	`fileKey` varchar(500) NOT NULL,
	`url` varchar(1000) NOT NULL,
	`thumbnailUrl` varchar(1000),
	`componentCode` varchar(50),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`finalizedPhotoId` int,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `submission_photos_id` PRIMARY KEY(`id`)
);
