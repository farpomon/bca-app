/**
 * Advanced Portfolio Analytics Database Functions
 * 
 * Provides comprehensive financial analysis, predictive modeling, and risk assessment
 * capabilities for portfolio management.
 */

import { getDb } from "./db";
import { sql, eq, and, gte, lte, desc, asc } from "drizzle-orm";
import {
  portfolioMetricsHistory,
  financialForecasts,
  benchmarkData,
  economicIndicators,
  portfolioTargets,
  investmentAnalysis,
  assets,
  projects,
  assessments,
  deficiencies,
  ciFciSnapshots,
} from "../drizzle/schema";

/**
 * Calculate and store portfolio metrics snapshot
 */
export async function capturePortfolioMetricsSnapshot(companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();

  // Get current portfolio metrics
  const metrics = await db.execute(sql`
    SELECT 
      COUNT(DISTINCT a.id) as totalAssets,
      SUM(CASE WHEN ass.condition = 'good' THEN 1 ELSE 0 END) as assetsGoodCondition,
      SUM(CASE WHEN ass.condition = 'fair' THEN 1 ELSE 0 END) as assetsFairCondition,
      SUM(CASE WHEN ass.condition = 'poor' THEN 1 ELSE 0 END) as assetsPoorCondition,
      SUM(COALESCE(a.currentReplacementValue, 0)) as totalReplacementValue,
      SUM(COALESCE(ass.estimatedRepairCost, 0)) as totalRepairCosts,
      COUNT(DISTINCT d.id) as totalDeficiencies,
      SUM(CASE WHEN d.severity = 'critical' THEN 1 ELSE 0 END) as criticalDeficiencies,
      SUM(CASE WHEN d.priority = 'immediate' OR d.priority = 'short_term' THEN 1 ELSE 0 END) as highPriorityDeficiencies,
      COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as activeProjects,
      COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completedProjects
    FROM assets a
    LEFT JOIN assessments ass ON a.id = ass.assetId
    LEFT JOIN deficiencies d ON a.projectId = d.projectId
    LEFT JOIN projects p ON a.projectId = p.id
    ${companyId ? sql`WHERE p.company = ${companyId}` : sql``}
  `);

  const row = metrics[0] as any;

  // Calculate FCI and CI
  const totalReplacementValue = parseFloat(row.totalReplacementValue) || 0;
  const totalRepairCosts = parseFloat(row.totalRepairCosts) || 0;
  const portfolioFci = totalReplacementValue > 0 ? (totalRepairCosts / totalReplacementValue) * 100 : 0;

  // Get latest economic indicators
  const latestIndicators = await db
    .select()
    .from(economicIndicators)
    .orderBy(desc(economicIndicators.indicatorDate))
    .limit(1);

  const inflationRate = latestIndicators[0]?.constructionInflationRate || null;
  const discountRate = latestIndicators[0]?.recommendedDiscountRate || null;

  // Insert snapshot
  await db.insert(portfolioMetricsHistory).values({
    snapshotDate: now.toISOString(),
    companyId: companyId || null,
    totalReplacementValue: totalReplacementValue.toString(),
    totalDeferredMaintenance: totalRepairCosts.toString(),
    totalRepairCosts: totalRepairCosts.toString(),
    portfolioFci: portfolioFci.toFixed(4),
    totalAssets: parseInt(row.totalAssets) || 0,
    assetsGoodCondition: parseInt(row.assetsGoodCondition) || 0,
    assetsFairCondition: parseInt(row.assetsFairCondition) || 0,
    assetsPoorCondition: parseInt(row.assetsPoorCondition) || 0,
    totalDeficiencies: parseInt(row.totalDeficiencies) || 0,
    criticalDeficiencies: parseInt(row.criticalDeficiencies) || 0,
    highPriorityDeficiencies: parseInt(row.highPriorityDeficiencies) || 0,
    activeProjects: parseInt(row.activeProjects) || 0,
    completedProjects: parseInt(row.completedProjects) || 0,
    inflationRate: inflationRate ? inflationRate.toString() : null,
    discountRate: discountRate ? discountRate.toString() : null,
  });

  return { success: true, snapshotDate: now };
}

/**
 * Get portfolio metrics trend over time
 */
export async function getPortfolioMetricsTrend(
  companyId: number | undefined,
  months: number = 12
) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const query = db
    .select()
    .from(portfolioMetricsHistory)
    .where(
      and(
        gte(portfolioMetricsHistory.snapshotDate, startDate.toISOString()),
        companyId ? eq(portfolioMetricsHistory.companyId, companyId) : sql`1=1`
      )
    )
    .orderBy(asc(portfolioMetricsHistory.snapshotDate));

  return await query;
}

/**
 * Calculate Net Present Value (NPV) for a project
 */
export function calculateNPV(
  initialInvestment: number,
  annualCashFlows: number[],
  discountRate: number
): number {
  let npv = -initialInvestment;

  for (let year = 0; year < annualCashFlows.length; year++) {
    npv += annualCashFlows[year] / Math.pow(1 + discountRate / 100, year + 1);
  }

  return npv;
}

/**
 * Calculate Return on Investment (ROI)
 */
export function calculateROI(
  totalBenefit: number,
  totalCost: number
): number {
  if (totalCost === 0) return 0;
  return ((totalBenefit - totalCost) / totalCost) * 100;
}

/**
 * Calculate payback period in years
 */
export function calculatePaybackPeriod(
  initialInvestment: number,
  annualCashFlow: number
): number {
  if (annualCashFlow <= 0) return Infinity;
  return initialInvestment / annualCashFlow;
}

/**
 * Calculate Internal Rate of Return (IRR) using Newton-Raphson method
 */
export function calculateIRR(
  initialInvestment: number,
  annualCashFlows: number[],
  maxIterations: number = 100,
  tolerance: number = 0.0001
): number {
  let irr = 0.1; // Initial guess: 10%

  for (let i = 0; i < maxIterations; i++) {
    let npv = -initialInvestment;
    let derivative = 0;

    for (let year = 0; year < annualCashFlows.length; year++) {
      const t = year + 1;
      npv += annualCashFlows[year] / Math.pow(1 + irr, t);
      derivative -= (t * annualCashFlows[year]) / Math.pow(1 + irr, t + 1);
    }

    if (Math.abs(npv) < tolerance) {
      return irr * 100; // Return as percentage
    }

    if (derivative === 0) break;
    irr = irr - npv / derivative;
  }

  return irr * 100;
}

/**
 * Create investment analysis for a project
 */
export async function createInvestmentAnalysis(data: {
  projectId: number;
  assetId?: number;
  analysisType: "roi" | "npv" | "payback" | "tco" | "lcca" | "benefit_cost";
  initialInvestment: number;
  annualOperatingCost?: number;
  annualMaintenanceCost?: number;
  annualEnergySavings?: number;
  annualCostAvoidance?: number;
  discountRate: number;
  analysisHorizonYears: number;
  inflationRate?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    projectId,
    assetId,
    analysisType,
    initialInvestment,
    annualOperatingCost = 0,
    annualMaintenanceCost = 0,
    annualEnergySavings = 0,
    annualCostAvoidance = 0,
    discountRate,
    analysisHorizonYears,
    inflationRate = 0,
  } = data;

  // Calculate annual net cash flow
  const annualNetCashFlow =
    annualEnergySavings +
    annualCostAvoidance -
    annualOperatingCost -
    annualMaintenanceCost;

  // Generate cash flows with inflation adjustment
  const cashFlows: number[] = [];
  for (let year = 1; year <= analysisHorizonYears; year++) {
    const inflationFactor = Math.pow(1 + inflationRate / 100, year);
    cashFlows.push(annualNetCashFlow * inflationFactor);
  }

  // Calculate financial metrics
  const npv = calculateNPV(initialInvestment, cashFlows, discountRate);
  const roi = calculateROI(
    cashFlows.reduce((sum, cf) => sum + cf, 0),
    initialInvestment
  );
  const paybackPeriod = calculatePaybackPeriod(
    initialInvestment,
    annualNetCashFlow
  );
  const irr =
    annualNetCashFlow > 0
      ? calculateIRR(initialInvestment, cashFlows)
      : null;

  const totalBenefit = cashFlows.reduce((sum, cf) => sum + cf, 0);
  const benefitCostRatio =
    initialInvestment > 0 ? totalBenefit / initialInvestment : 0;

  // Determine recommendation
  let recommendation: "proceed" | "defer" | "reject" | "requires_review";
  if (npv > 0 && roi > 15 && paybackPeriod < 5) {
    recommendation = "proceed";
  } else if (npv > 0 && roi > 5) {
    recommendation = "requires_review";
  } else if (npv < 0 || roi < 0) {
    recommendation = "reject";
  } else {
    recommendation = "defer";
  }

  // Insert analysis
  const result = await db.insert(investmentAnalysis).values({
    projectId,
    assetId: assetId || null,
    analysisDate: new Date().toISOString(),
    analysisType,
    initialInvestment: initialInvestment.toString(),
    annualOperatingCost: annualOperatingCost.toString(),
    annualMaintenanceCost: annualMaintenanceCost.toString(),
    annualEnergySavings: annualEnergySavings.toString(),
    annualCostAvoidance: annualCostAvoidance.toString(),
    netPresentValue: npv.toFixed(2),
    internalRateOfReturn: irr ? irr.toFixed(2) : null,
    returnOnInvestment: roi.toFixed(2),
    paybackPeriodYears:
      paybackPeriod !== Infinity ? paybackPeriod.toFixed(2) : null,
    benefitCostRatio: benefitCostRatio.toFixed(2),
    discountRate: discountRate.toString(),
    analysisHorizonYears,
    inflationRate: inflationRate.toString(),
    recommendation,
    confidenceLevel: "medium",
  });

  return {
    npv,
    roi,
    irr,
    paybackPeriod,
    benefitCostRatio,
    recommendation,
  };
}

/**
 * Generate financial forecast for future years
 */
export async function generateFinancialForecast(
  projectId: number,
  assetId: number | undefined,
  companyId: number | undefined,
  forecastYears: number = 5,
  scenarioType: "best_case" | "most_likely" | "worst_case" = "most_likely"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get historical data
  const historicalMetrics = await getPortfolioMetricsTrend(companyId, 24);

  if (historicalMetrics.length < 2) {
    throw new Error("Insufficient historical data for forecasting");
  }

  // Calculate average deterioration rate
  const oldestMetric = historicalMetrics[0];
  const latestMetric = historicalMetrics[historicalMetrics.length - 1];

  const oldestFci = parseFloat(oldestMetric.portfolioFci || "0");
  const latestFci = parseFloat(latestMetric.portfolioFci || "0");
  const monthsElapsed = historicalMetrics.length;

  const annualFciDeteriorationRate =
    ((latestFci - oldestFci) / oldestFci) * (12 / monthsElapsed);

  // Get latest economic indicators
  const latestIndicators = await db
    .select()
    .from(economicIndicators)
    .orderBy(desc(economicIndicators.indicatorDate))
    .limit(1);

  const inflationRate =
    parseFloat(latestIndicators[0]?.constructionInflationRate || "2.5") / 100;

  // Scenario multipliers
  const scenarioMultipliers = {
    best_case: 0.7,
    most_likely: 1.0,
    worst_case: 1.3,
  };

  const multiplier = scenarioMultipliers[scenarioType];

  // Generate forecasts
  const currentYear = new Date().getFullYear();
  const forecasts = [];

  for (let year = 1; year <= forecastYears; year++) {
    const forecastYear = currentYear + year;

    // Project costs with deterioration and inflation
    const costGrowthFactor =
      Math.pow(1 + inflationRate, year) *
      Math.pow(1 + annualFciDeteriorationRate, year) *
      multiplier;

    const baseMaintenanceCost = parseFloat(
      latestMetric.totalRepairCosts || "0"
    );
    const predictedMaintenanceCost = baseMaintenanceCost * costGrowthFactor;

    // Calculate failure probability (increases with age and deterioration)
    const failureProbability = Math.min(
      100,
      latestFci * (1 + year * 0.1) * multiplier
    );

    // Calculate risk score
    const riskScore = (failureProbability * predictedMaintenanceCost) / 1000;

    const forecast = {
      forecastDate: new Date().toISOString(),
      companyId: companyId || null,
      projectId: projectId || null,
      assetId: assetId || null,
      forecastYear,
      scenarioType,
      predictedMaintenanceCost: predictedMaintenanceCost.toFixed(2),
      predictedRepairCost: (predictedMaintenanceCost * 0.6).toFixed(2),
      predictedReplacementCost: (predictedMaintenanceCost * 1.5).toFixed(2),
      predictedCapitalRequirement: (predictedMaintenanceCost * 1.2).toFixed(2),
      confidenceLevel: (100 - year * 10).toFixed(2),
      predictionModel: "Linear Regression with Inflation",
      predictedFci: (latestFci * costGrowthFactor).toFixed(4),
      failureProbability: failureProbability.toFixed(2),
      riskScore: riskScore.toFixed(2),
    };

    forecasts.push(forecast);

    // Insert into database
    await db.insert(financialForecasts).values(forecast);
  }

  return forecasts;
}

/**
 * Get benchmark comparison for portfolio
 */
export async function getBenchmarkComparison(
  portfolioFci: number,
  portfolioCi: number,
  assetType?: string
) {
  const db = await getDb();
  if (!db) return null;

  // Get relevant benchmarks
  const benchmarks = await db
    .select()
    .from(benchmarkData)
    .where(
      and(
        eq(benchmarkData.isActive, 1),
        assetType
          ? eq(benchmarkData.category, assetType)
          : sql`benchmarkType = 'industry'`
      )
    )
    .limit(1);

  if (benchmarks.length === 0) return null;

  const benchmark = benchmarks[0];

  const medianFci = parseFloat(benchmark.medianFci || "0");
  const medianCi = parseFloat(benchmark.medianCi || "0");

  return {
    benchmark,
    comparison: {
      fciDifference: portfolioFci - medianFci,
      fciPercentile:
        portfolioFci <= medianFci
          ? "Better than median"
          : "Worse than median",
      ciDifference: portfolioCi - medianCi,
      ciPercentile:
        portfolioCi >= medianCi ? "Better than median" : "Worse than median",
    },
  };
}

/**
 * Calculate Total Cost of Ownership (TCO)
 */
export async function calculateTCO(
  assetId: number,
  analysisHorizonYears: number = 10
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get asset details
  const asset = await db
    .select()
    .from(assets)
    .where(eq(assets.id, assetId))
    .limit(1);

  if (asset.length === 0) {
    throw new Error("Asset not found");
  }

  const assetData = asset[0];
  const replacementValue = parseFloat(
    assetData.currentReplacementValue || "0"
  );

  // Get historical maintenance costs
  const assessmentData = await db
    .select()
    .from(assessments)
    .where(eq(assessments.assetId, assetId));

  const totalRepairCosts = assessmentData.reduce(
    (sum, a) => sum + (a.estimatedRepairCost || 0),
    0
  );

  // Estimate annual maintenance (2-4% of replacement value)
  const annualMaintenanceRate = 0.03;
  const annualMaintenance = replacementValue * annualMaintenanceRate;

  // Calculate TCO
  const acquisitionCost = replacementValue;
  const totalMaintenanceCost = annualMaintenance * analysisHorizonYears;
  const totalRepairCost = totalRepairCosts * 1.5; // Project future repairs

  const tco = acquisitionCost + totalMaintenanceCost + totalRepairCost;

  return {
    assetId,
    analysisHorizonYears,
    acquisitionCost,
    annualMaintenance,
    totalMaintenanceCost,
    totalRepairCost,
    totalCostOfOwnership: tco,
    annualizedCost: tco / analysisHorizonYears,
  };
}

/**
 * Update portfolio targets progress
 */
export async function updatePortfolioTargetsProgress(companyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all active targets
  const targets = await db
    .select()
    .from(portfolioTargets)
    .where(
      and(
        companyId ? eq(portfolioTargets.companyId, companyId) : sql`1=1`,
        lte(portfolioTargets.targetYear, new Date().getFullYear() + 5)
      )
    );

  // Get current metrics
  const latestMetrics = await db
    .select()
    .from(portfolioMetricsHistory)
    .where(
      companyId ? eq(portfolioMetricsHistory.companyId, companyId) : sql`1=1`
    )
    .orderBy(desc(portfolioMetricsHistory.snapshotDate))
    .limit(1);

  if (latestMetrics.length === 0) return;

  const currentMetrics = latestMetrics[0];

  // Update each target
  for (const target of targets) {
    let currentValue = 0;

    switch (target.targetType) {
      case "fci":
        currentValue = parseFloat(currentMetrics.portfolioFci || "0");
        break;
      case "ci":
        currentValue = parseFloat(currentMetrics.portfolioCi || "0");
        break;
      case "deficiency_reduction":
        currentValue = currentMetrics.totalDeficiencies || 0;
        break;
      default:
        continue;
    }

    const targetValue = parseFloat(target.targetValue);
    const baselineValue = parseFloat(target.baselineValue || "0");

    // Calculate progress
    const progressPercentage =
      baselineValue !== targetValue
        ? ((currentValue - baselineValue) / (targetValue - baselineValue)) *
          100
        : 0;

    // Determine status
    let status: "on_track" | "at_risk" | "off_track" | "achieved";
    if (progressPercentage >= 100) {
      status = "achieved";
    } else if (progressPercentage >= 75) {
      status = "on_track";
    } else if (progressPercentage >= 50) {
      status = "at_risk";
    } else {
      status = "off_track";
    }

    // Update target
    await db
      .update(portfolioTargets)
      .set({
        currentValue: currentValue.toString(),
        progressPercentage: progressPercentage.toFixed(2),
        status,
        lastReviewDate: sql`CURDATE()`,
      })
      .where(eq(portfolioTargets.id, target.id));
  }

  return { success: true, updatedCount: targets.length };
}
