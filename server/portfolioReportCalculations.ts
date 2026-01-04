/**
 * Portfolio Report Financial Metrics Calculations
 * 
 * Industry-standard metrics for building condition assessment:
 * - FCI (Facility Condition Index)
 * - Deferred Maintenance Backlog
 * - Current Replacement Value (CRV)
 * - Capital Renewal Forecast
 * - Remaining Useful Life (RUL)
 * - Priority Weighted Scoring
 */

export interface AssetMetrics {
  assetId: number;
  assetName: string;
  address?: string;
  yearBuilt?: number;
  grossFloorArea?: number;
  currentReplacementValue: number;
  deferredMaintenanceCost: number;
  fci: number;
  fciRating: string;
  conditionScore: number;
  conditionRating: string;
  assessmentCount: number;
  deficiencyCount: number;
  immediateNeeds: number;
  shortTermNeeds: number;
  mediumTermNeeds: number;
  longTermNeeds: number;
  averageRemainingLife: number;
  priorityScore: number;
}

export interface PortfolioSummary {
  totalAssets: number;
  totalCurrentReplacementValue: number;
  totalDeferredMaintenanceCost: number;
  portfolioFCI: number;
  portfolioFCIRating: string;
  averageConditionScore: number;
  averageConditionRating: string;
  totalDeficiencies: number;
  totalAssessments: number;
  fundingGap: number;
  averageAssetAge: number;
}

export interface CapitalRenewalForecast {
  year: number;
  immediateNeeds: number;
  shortTermNeeds: number;
  mediumTermNeeds: number;
  longTermNeeds: number;
  totalProjectedCost: number;
  cumulativeCost: number;
}

export interface CategoryBreakdown {
  category: string;
  categoryCode: string;
  totalRepairCost: number;
  totalReplacementValue: number;
  assessmentCount: number;
  averageCondition: number;
  fci: number;
}

export interface PriorityMatrix {
  priority: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  count: number;
  totalCost: number;
  percentageOfTotal: number;
  items: {
    assetName: string;
    componentName: string;
    description: string;
    estimatedCost: number;
  }[];
}

/**
 * Calculate FCI (Facility Condition Index)
 * FCI = Deferred Maintenance Cost / Current Replacement Value
 * 
 * Returns decimal ratio (0-1 scale):
 * - 0-0.05: Good condition (0-5%)
 * - 0.05-0.10: Fair condition (5-10%)
 * - 0.10-0.30: Poor condition (10-30%)
 * - >0.30: Critical condition (>30%)
 */
export function calculateFCI(deferredMaintenanceCost: number, currentReplacementValue: number): number {
  if (currentReplacementValue <= 0) return 0;
  return deferredMaintenanceCost / currentReplacementValue;
}

/**
 * Get FCI Rating from decimal ratio
 * FCI is expected as decimal ratio (0-1 scale)
 * - Good: 0-0.05 (0-5%)
 * - Fair: 0.05-0.10 (5-10%)
 * - Poor: 0.10-0.30 (10-30%)
 * - Critical: >0.30 (>30%)
 */
export function getFCIRating(fci: number): string {
  if (fci <= 0.05) return 'Good';
  if (fci <= 0.10) return 'Fair';
  if (fci <= 0.30) return 'Poor';
  return 'Critical';
}

/**
 * Calculate Condition Score from condition enum
 * Maps condition ratings to numeric scores (0-100 scale)
 */
export function getConditionScore(condition: string | null): number {
  switch (condition?.toLowerCase()) {
    case 'good': return 85;
    case 'fair': return 65;
    case 'poor': return 35;
    case 'critical': return 15;
    case 'not_assessed': return 50;
    default: return 50;
  }
}

/**
 * Get Condition Rating from numeric score
 */
export function getConditionRating(score: number): string {
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 30) return 'Poor';
  return 'Critical';
}

/**
 * Calculate Priority Score for an asset
 * Higher score = higher priority for maintenance/repair
 * 
 * Factors:
 * - FCI (40% weight)
 * - Immediate needs ratio (25% weight)
 * - Age factor (20% weight)
 * - Deficiency count (15% weight)
 */
export function calculatePriorityScore(
  fci: number,
  immediateNeeds: number,
  totalNeeds: number,
  assetAge: number,
  deficiencyCount: number
): number {
  const fciScore = Math.min(fci / 30, 1) * 40; // Max 40 points
  const immediateRatio = totalNeeds > 0 ? (immediateNeeds / totalNeeds) : 0;
  const immediateScore = immediateRatio * 25; // Max 25 points
  const ageScore = Math.min(assetAge / 50, 1) * 20; // Max 20 points (50+ years = max)
  const deficiencyScore = Math.min(deficiencyCount / 20, 1) * 15; // Max 15 points
  
  return Math.round(fciScore + immediateScore + ageScore + deficiencyScore);
}

/**
 * Calculate Remaining Useful Life (RUL) in years
 * Based on expected useful life and current age
 */
export function calculateRemainingUsefulLife(
  expectedUsefulLife: number | null,
  assetAge: number
): number {
  if (!expectedUsefulLife || expectedUsefulLife <= 0) return 0;
  const rul = expectedUsefulLife - assetAge;
  return Math.max(0, rul);
}

/**
 * Generate 5-year Capital Renewal Forecast
 * Projects costs based on priority timelines
 */
export function generateCapitalRenewalForecast(
  immediateNeeds: number,
  shortTermNeeds: number,
  mediumTermNeeds: number,
  longTermNeeds: number,
  startYear: number = new Date().getFullYear()
): CapitalRenewalForecast[] {
  const forecast: CapitalRenewalForecast[] = [];
  let cumulativeCost = 0;
  
  // Year 1: All immediate needs + 20% of short-term
  const year1Immediate = immediateNeeds;
  const year1ShortTerm = shortTermNeeds * 0.2;
  const year1Total = year1Immediate + year1ShortTerm;
  cumulativeCost += year1Total;
  forecast.push({
    year: startYear,
    immediateNeeds: year1Immediate,
    shortTermNeeds: year1ShortTerm,
    mediumTermNeeds: 0,
    longTermNeeds: 0,
    totalProjectedCost: year1Total,
    cumulativeCost
  });
  
  // Year 2: 40% of short-term + 10% of medium-term
  const year2ShortTerm = shortTermNeeds * 0.4;
  const year2MediumTerm = mediumTermNeeds * 0.1;
  const year2Total = year2ShortTerm + year2MediumTerm;
  cumulativeCost += year2Total;
  forecast.push({
    year: startYear + 1,
    immediateNeeds: 0,
    shortTermNeeds: year2ShortTerm,
    mediumTermNeeds: year2MediumTerm,
    longTermNeeds: 0,
    totalProjectedCost: year2Total,
    cumulativeCost
  });
  
  // Year 3: 40% of short-term + 30% of medium-term
  const year3ShortTerm = shortTermNeeds * 0.4;
  const year3MediumTerm = mediumTermNeeds * 0.3;
  const year3Total = year3ShortTerm + year3MediumTerm;
  cumulativeCost += year3Total;
  forecast.push({
    year: startYear + 2,
    immediateNeeds: 0,
    shortTermNeeds: year3ShortTerm,
    mediumTermNeeds: year3MediumTerm,
    longTermNeeds: 0,
    totalProjectedCost: year3Total,
    cumulativeCost
  });
  
  // Year 4: 30% of medium-term + 20% of long-term
  const year4MediumTerm = mediumTermNeeds * 0.3;
  const year4LongTerm = longTermNeeds * 0.2;
  const year4Total = year4MediumTerm + year4LongTerm;
  cumulativeCost += year4Total;
  forecast.push({
    year: startYear + 3,
    immediateNeeds: 0,
    shortTermNeeds: 0,
    mediumTermNeeds: year4MediumTerm,
    longTermNeeds: year4LongTerm,
    totalProjectedCost: year4Total,
    cumulativeCost
  });
  
  // Year 5: 30% of medium-term + 30% of long-term
  const year5MediumTerm = mediumTermNeeds * 0.3;
  const year5LongTerm = longTermNeeds * 0.3;
  const year5Total = year5MediumTerm + year5LongTerm;
  cumulativeCost += year5Total;
  forecast.push({
    year: startYear + 4,
    immediateNeeds: 0,
    shortTermNeeds: 0,
    mediumTermNeeds: year5MediumTerm,
    longTermNeeds: year5LongTerm,
    totalProjectedCost: year5Total,
    cumulativeCost
  });
  
  return forecast;
}

/**
 * Calculate Funding Gap
 * Difference between required maintenance and available budget
 */
export function calculateFundingGap(
  totalDeferredMaintenance: number,
  availableBudget: number = 0
): number {
  return Math.max(0, totalDeferredMaintenance - availableBudget);
}

/**
 * Aggregate metrics from multiple assets into portfolio summary
 */
export function aggregatePortfolioMetrics(assetMetrics: AssetMetrics[]): PortfolioSummary {
  if (assetMetrics.length === 0) {
    return {
      totalAssets: 0,
      totalCurrentReplacementValue: 0,
      totalDeferredMaintenanceCost: 0,
      portfolioFCI: 0,
      portfolioFCIRating: 'N/A',
      averageConditionScore: 0,
      averageConditionRating: 'N/A',
      totalDeficiencies: 0,
      totalAssessments: 0,
      fundingGap: 0,
      averageAssetAge: 0
    };
  }
  
  const totalCRV = assetMetrics.reduce((sum, a) => sum + a.currentReplacementValue, 0);
  const totalDMC = assetMetrics.reduce((sum, a) => sum + a.deferredMaintenanceCost, 0);
  const totalDeficiencies = assetMetrics.reduce((sum, a) => sum + a.deficiencyCount, 0);
  const totalAssessments = assetMetrics.reduce((sum, a) => sum + a.assessmentCount, 0);
  
  const portfolioFCI = calculateFCI(totalDMC, totalCRV);
  
  // Weighted average condition score (weighted by CRV)
  const weightedConditionSum = assetMetrics.reduce(
    (sum, a) => sum + (a.conditionScore * a.currentReplacementValue), 0
  );
  const averageConditionScore = totalCRV > 0 ? weightedConditionSum / totalCRV : 0;
  
  // Calculate average asset age
  const currentYear = new Date().getFullYear();
  const assetsWithYear = assetMetrics.filter(a => a.yearBuilt && a.yearBuilt > 0);
  const averageAssetAge = assetsWithYear.length > 0
    ? assetsWithYear.reduce((sum, a) => sum + (currentYear - (a.yearBuilt || currentYear)), 0) / assetsWithYear.length
    : 0;
  
  return {
    totalAssets: assetMetrics.length,
    totalCurrentReplacementValue: totalCRV,
    totalDeferredMaintenanceCost: totalDMC,
    portfolioFCI,
    portfolioFCIRating: getFCIRating(portfolioFCI),
    averageConditionScore: Math.round(averageConditionScore),
    averageConditionRating: getConditionRating(averageConditionScore),
    totalDeficiencies,
    totalAssessments,
    fundingGap: totalDMC, // Assuming no budget allocated
    averageAssetAge: Math.round(averageAssetAge)
  };
}

/**
 * Group deficiencies by priority and calculate totals
 */
export function groupByPriority(
  deficiencies: {
    priority: string;
    estimatedCost: number | null;
    title: string;
    description?: string | null;
    assetName?: string;
    componentCode?: string;
  }[]
): PriorityMatrix[] {
  const priorities: ('immediate' | 'short_term' | 'medium_term' | 'long_term')[] = 
    ['immediate', 'short_term', 'medium_term', 'long_term'];
  
  const totalCost = deficiencies.reduce((sum, d) => sum + (d.estimatedCost || 0), 0);
  
  return priorities.map(priority => {
    const items = deficiencies.filter(d => d.priority === priority);
    const priorityCost = items.reduce((sum, d) => sum + (d.estimatedCost || 0), 0);
    
    return {
      priority,
      count: items.length,
      totalCost: priorityCost,
      percentageOfTotal: totalCost > 0 ? (priorityCost / totalCost) * 100 : 0,
      items: items.slice(0, 10).map(d => ({
        assetName: d.assetName || 'Unknown',
        componentName: d.componentCode || 'Unknown',
        description: d.description || d.title,
        estimatedCost: d.estimatedCost || 0
      }))
    };
  });
}

/**
 * Group assessments by UNIFORMAT II category
 */
export function groupByCategory(
  assessments: {
    componentCode: string | null;
    componentName?: string | null;
    estimatedRepairCost: number | null;
    replacementValue: number | null;
    condition: string | null;
  }[]
): CategoryBreakdown[] {
  const categoryMap = new Map<string, {
    name: string;
    repairCost: number;
    replacementValue: number;
    count: number;
    conditionSum: number;
  }>();
  
  // UNIFORMAT II Level 1 categories
  const categoryNames: Record<string, string> = {
    'A': 'Substructure',
    'B': 'Shell',
    'C': 'Interiors',
    'D': 'Services',
    'E': 'Equipment & Furnishings',
    'F': 'Special Construction',
    'G': 'Building Sitework'
  };
  
  for (const assessment of assessments) {
    const code = assessment.componentCode || 'X';
    const categoryCode = code.charAt(0).toUpperCase();
    const categoryName = categoryNames[categoryCode] || 'Other';
    
    const existing = categoryMap.get(categoryCode) || {
      name: categoryName,
      repairCost: 0,
      replacementValue: 0,
      count: 0,
      conditionSum: 0
    };
    
    existing.repairCost += assessment.estimatedRepairCost || 0;
    existing.replacementValue += assessment.replacementValue || 0;
    existing.count += 1;
    existing.conditionSum += getConditionScore(assessment.condition);
    
    categoryMap.set(categoryCode, existing);
  }
  
  return Array.from(categoryMap.entries()).map(([code, data]) => ({
    category: data.name,
    categoryCode: code,
    totalRepairCost: data.repairCost,
    totalReplacementValue: data.replacementValue,
    assessmentCount: data.count,
    averageCondition: data.count > 0 ? Math.round(data.conditionSum / data.count) : 0,
    fci: calculateFCI(data.repairCost, data.replacementValue)
  })).sort((a, b) => a.categoryCode.localeCompare(b.categoryCode));
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
