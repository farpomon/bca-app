CREATE TABLE `benchmark_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`benchmarkType` enum('industry','sector','region','asset_type','custom') NOT NULL,
	`category` varchar(100) NOT NULL,
	`subcategory` varchar(100),
	`medianFci` decimal(10,4),
	`medianCi` decimal(10,4),
	`medianCostPerSqft` decimal(10,2),
	`medianMaintenanceRatio` decimal(5,2),
	`p25Fci` decimal(10,4),
	`p75Fci` decimal(10,4),
	`p25Ci` decimal(10,4),
	`p75Ci` decimal(10,4),
	`sampleSize` int,
	`dataSource` varchar(255),
	`effectiveDate` date,
	`expiryDate` date,
	`isActive` int NOT NULL DEFAULT 1,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `benchmark_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `economic_indicators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`indicatorDate` date NOT NULL,
	`region` varchar(100) NOT NULL DEFAULT 'Canada',
	`cpiInflationRate` decimal(5,2),
	`constructionInflationRate` decimal(5,2),
	`materialInflationRate` decimal(5,2),
	`laborInflationRate` decimal(5,2),
	`primeRate` decimal(5,2),
	`bondYield10Year` decimal(5,2),
	`recommendedDiscountRate` decimal(5,2),
	`riskFreeRate` decimal(5,2),
	`gdpGrowthRate` decimal(5,2),
	`unemploymentRate` decimal(5,2),
	`exchangeRateUSD` decimal(10,4),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `economic_indicators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_forecasts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`forecastDate` timestamp NOT NULL,
	`companyId` int,
	`projectId` int,
	`assetId` int,
	`forecastYear` int NOT NULL,
	`scenarioType` enum('best_case','most_likely','worst_case','optimized') NOT NULL DEFAULT 'most_likely',
	`predictedMaintenanceCost` decimal(15,2),
	`predictedRepairCost` decimal(15,2),
	`predictedReplacementCost` decimal(15,2),
	`predictedCapitalRequirement` decimal(15,2),
	`confidenceLevel` decimal(5,2),
	`predictionModel` varchar(100),
	`predictedFci` decimal(10,4),
	`predictedCi` decimal(10,4),
	`predictedConditionScore` int,
	`failureProbability` decimal(5,2),
	`riskScore` decimal(10,2),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_forecasts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investment_analysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`assetId` int,
	`analysisDate` timestamp NOT NULL,
	`analysisType` enum('roi','npv','payback','tco','lcca','benefit_cost') NOT NULL,
	`initialInvestment` decimal(15,2) NOT NULL,
	`annualOperatingCost` decimal(15,2),
	`annualMaintenanceCost` decimal(15,2),
	`annualEnergySavings` decimal(15,2),
	`annualCostAvoidance` decimal(15,2),
	`netPresentValue` decimal(15,2),
	`internalRateOfReturn` decimal(5,2),
	`returnOnInvestment` decimal(5,2),
	`paybackPeriodYears` decimal(5,2),
	`benefitCostRatio` decimal(5,2),
	`discountRate` decimal(5,2) NOT NULL,
	`analysisHorizonYears` int NOT NULL,
	`inflationRate` decimal(5,2),
	`recommendation` enum('proceed','defer','reject','requires_review'),
	`confidenceLevel` enum('high','medium','low'),
	`notes` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investment_analysis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portfolio_metrics_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snapshotDate` timestamp NOT NULL,
	`companyId` int,
	`totalReplacementValue` decimal(15,2),
	`totalDeferredMaintenance` decimal(15,2),
	`totalRepairCosts` decimal(15,2),
	`annualCapitalSpend` decimal(15,2),
	`portfolioFci` decimal(10,4),
	`portfolioCi` decimal(10,4),
	`totalAssets` int,
	`assetsGoodCondition` int,
	`assetsFairCondition` int,
	`assetsPoorCondition` int,
	`totalDeficiencies` int,
	`criticalDeficiencies` int,
	`highPriorityDeficiencies` int,
	`activeProjects` int,
	`completedProjects` int,
	`inflationRate` decimal(5,2),
	`discountRate` decimal(5,2),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `portfolio_metrics_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portfolio_targets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int,
	`targetYear` int NOT NULL,
	`targetType` enum('fci','ci','budget','deficiency_reduction','condition_improvement','custom') NOT NULL,
	`metricName` varchar(100) NOT NULL,
	`targetValue` decimal(15,4) NOT NULL,
	`currentValue` decimal(15,4),
	`baselineValue` decimal(15,4),
	`baselineYear` int,
	`progressPercentage` decimal(5,2),
	`status` enum('on_track','at_risk','off_track','achieved') NOT NULL DEFAULT 'on_track',
	`description` text,
	`strategicAlignment` text,
	`accountableParty` varchar(255),
	`reviewFrequency` enum('monthly','quarterly','semi_annual','annual') NOT NULL DEFAULT 'quarterly',
	`lastReviewDate` date,
	`nextReviewDate` date,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portfolio_targets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_benchmark_type` ON `benchmark_data` (`benchmarkType`);--> statement-breakpoint
CREATE INDEX `idx_category` ON `benchmark_data` (`category`);--> statement-breakpoint
CREATE INDEX `idx_active` ON `benchmark_data` (`isActive`);--> statement-breakpoint
CREATE INDEX `idx_indicator_date` ON `economic_indicators` (`indicatorDate`);--> statement-breakpoint
CREATE INDEX `idx_region` ON `economic_indicators` (`region`);--> statement-breakpoint
CREATE INDEX `idx_forecast_year` ON `financial_forecasts` (`forecastYear`);--> statement-breakpoint
CREATE INDEX `idx_company` ON `financial_forecasts` (`companyId`);--> statement-breakpoint
CREATE INDEX `idx_project` ON `financial_forecasts` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_asset` ON `financial_forecasts` (`assetId`);--> statement-breakpoint
CREATE INDEX `idx_scenario` ON `financial_forecasts` (`scenarioType`);--> statement-breakpoint
CREATE INDEX `idx_project` ON `investment_analysis` (`projectId`);--> statement-breakpoint
CREATE INDEX `idx_asset` ON `investment_analysis` (`assetId`);--> statement-breakpoint
CREATE INDEX `idx_analysis_type` ON `investment_analysis` (`analysisType`);--> statement-breakpoint
CREATE INDEX `idx_snapshot_date` ON `portfolio_metrics_history` (`snapshotDate`);--> statement-breakpoint
CREATE INDEX `idx_company` ON `portfolio_metrics_history` (`companyId`);--> statement-breakpoint
CREATE INDEX `idx_company` ON `portfolio_targets` (`companyId`);--> statement-breakpoint
CREATE INDEX `idx_target_year` ON `portfolio_targets` (`targetYear`);--> statement-breakpoint
CREATE INDEX `idx_target_type` ON `portfolio_targets` (`targetType`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `portfolio_targets` (`status`);