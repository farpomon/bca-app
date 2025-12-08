CREATE TABLE `dashboard_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`layout` json NOT NULL,
	`filters` json,
	`isDefault` boolean NOT NULL DEFAULT false,
	`isShared` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dashboard_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kpi_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snapshotDate` timestamp NOT NULL,
	`portfolioFCI` decimal(10,4),
	`portfolioCI` decimal(10,4),
	`totalReplacementValue` decimal(15,2),
	`totalRepairCosts` decimal(15,2),
	`maintenanceBacklog` decimal(15,2),
	`deferredMaintenance` decimal(15,2),
	`budgetUtilization` decimal(10,4),
	`completedProjects` int,
	`activeProjects` int,
	`criticalDeficiencies` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kpi_snapshots_id` PRIMARY KEY(`id`)
);
