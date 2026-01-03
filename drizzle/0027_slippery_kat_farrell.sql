CREATE TABLE `emissions_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`recordDate` timestamp NOT NULL,
	`scope` enum('scope1','scope2','scope3') NOT NULL,
	`emissionSource` varchar(255) NOT NULL,
	`co2Equivalent` decimal(15,4) NOT NULL,
	`calculationMethod` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emissions_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `esg_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`scoreDate` timestamp NOT NULL,
	`energyScore` decimal(5,2),
	`waterScore` decimal(5,2),
	`wasteScore` decimal(5,2),
	`emissionsScore` decimal(5,2),
	`compositeScore` decimal(5,2),
	`benchmarkPercentile` int,
	`certifications` json,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `esg_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `green_upgrades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`upgradeName` varchar(255) NOT NULL,
	`upgradeType` enum('hvac','lighting','insulation','windows','solar','geothermal','water_fixtures','building_automation') NOT NULL,
	`installDate` timestamp,
	`cost` decimal(15,2) NOT NULL,
	`estimatedAnnualSavings` decimal(15,2),
	`actualAnnualSavings` decimal(15,2),
	`paybackPeriod` decimal(10,2),
	`energySavingsKWh` decimal(15,2),
	`waterSavingsGallons` decimal(15,2),
	`co2ReductionMT` decimal(15,4),
	`status` enum('planned','in_progress','completed','cancelled') NOT NULL DEFAULT 'planned',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `green_upgrades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sustainability_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int,
	`goalType` enum('energy_reduction','water_reduction','waste_reduction','carbon_reduction','renewable_energy') NOT NULL,
	`baselineValue` decimal(15,4) NOT NULL,
	`baselineYear` int NOT NULL,
	`targetValue` decimal(15,4) NOT NULL,
	`targetYear` int NOT NULL,
	`unit` varchar(50) NOT NULL,
	`status` enum('active','achieved','missed','cancelled') NOT NULL DEFAULT 'active',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sustainability_goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `utility_consumption` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`recordDate` timestamp NOT NULL,
	`utilityType` enum('electricity','natural_gas','water','steam','chilled_water') NOT NULL,
	`consumption` decimal(15,4) NOT NULL,
	`unit` varchar(50) NOT NULL,
	`cost` decimal(15,2),
	`source` varchar(100),
	`isRenewable` boolean DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `utility_consumption_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `waste_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`recordDate` timestamp NOT NULL,
	`wasteType` enum('general','recycling','compost','hazardous','construction') NOT NULL,
	`weight` decimal(15,4) NOT NULL,
	`unit` varchar(20) NOT NULL,
	`disposalMethod` varchar(100),
	`cost` decimal(15,2),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `waste_tracking_id` PRIMARY KEY(`id`)
);
