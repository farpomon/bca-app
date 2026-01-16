/**
 * Report Data Validation and Reconciliation
 * 
 * Ensures data consistency and accuracy before PDF export:
 * - Recalculates and reconciles financial totals
 * - Validates FCI rating logic
 * - Removes duplicate component rows
 * - Detects unresolved template variables
 * - Enforces sum(DM by horizon) = Total DM
 */

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'financial' | 'data_quality' | 'consistency' | 'template';
  message: string;
  field?: string;
  expectedValue?: string | number;
  actualValue?: string | number;
  fixAction?: string;
}

export interface ValidationResult {
  isValid: boolean;
  canExport: boolean;
  issues: ValidationIssue[];
  correctedData?: any;
}

export interface AssessmentAction {
  id?: number;
  assessmentId: number;
  description: string;
  priority?: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  timeline?: string;
  estimatedCost?: number | string;
  consequenceOfDeferral?: string;
  confidence?: number;
  sortOrder?: number;
}

export interface AssetReportData {
  asset: any;
  projectName: string;
  assessments: any[];
  deficiencies: any[];
  assessmentActions?: AssessmentAction[]; // Multiple actions per assessment
}

export interface PortfolioReportData {
  overview: {
    totalDeferredMaintenance: number;
    totalCurrentReplacementValue: number;
    portfolioFCI: number;
    totalDeficiencies: number;
    criticalDeficiencies: number;
  };
  buildingComparison: Array<{
    assetId: number;
    name: string;
    deferredMaintenanceCost: number;
    currentReplacementValue: number;
    fci: number;
    fciRating: string;
  }>;
  costByPriority: {
    immediate: number;
    shortTerm: number;
    mediumTerm: number;
    longTerm: number;
  };
  capitalForecast: Array<{
    year: number;
    immediateNeeds: number;
    shortTermNeeds: number;
    mediumTermNeeds: number;
    longTermNeeds: number;
    totalProjectedCost: number;
  }>;
  categoryCostBreakdown?: any[];
}

const ROUNDING_TOLERANCE = 0.01; // 1% tolerance for floating point arithmetic

/**
 * Calculate FCI as decimal ratio (0-1 scale)
 * FCI = Deferred Maintenance / Current Replacement Value
 */
export function calculateFCI(deferredMaintenance: number, crv: number): number {
  if (crv <= 0) return 0;
  return deferredMaintenance / crv;
}

/**
 * Get FCI Rating from decimal ratio
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
 * Convert FCI to percentage for display
 */
export function fciToPercentage(fci: number): number {
  return fci * 100;
}

/**
 * Validate FCI rating matches the calculated value
 */
function validateFCIRating(
  fci: number,
  rating: string,
  entityName: string
): ValidationIssue | null {
  const expectedRating = getFCIRating(fci);
  
  if (rating !== expectedRating) {
    return {
      severity: 'error',
      category: 'financial',
      message: `FCI rating mismatch for ${entityName}`,
      field: 'fciRating',
      expectedValue: expectedRating,
      actualValue: rating,
      fixAction: `Update FCI rating to "${expectedRating}" (FCI: ${fciToPercentage(fci).toFixed(2)}%)`,
    };
  }
  
  return null;
}

/**
 * Validate sum of DM by priority equals total DM
 */
function validateDMByPriority(
  costByPriority: { immediate: number; shortTerm: number; mediumTerm: number; longTerm: number },
  totalDM: number
): ValidationIssue | null {
  const sumByPriority = 
    costByPriority.immediate +
    costByPriority.shortTerm +
    costByPriority.mediumTerm +
    costByPriority.longTerm;
  
  const difference = Math.abs(sumByPriority - totalDM);
  const tolerance = totalDM * ROUNDING_TOLERANCE;
  
  if (difference > tolerance) {
    return {
      severity: 'error',
      category: 'consistency',
      message: 'Sum of DM by priority does not match Total DM',
      field: 'costByPriority',
      expectedValue: totalDM,
      actualValue: sumByPriority,
      fixAction: `Recalculate priority costs. Difference: $${difference.toFixed(2)}`,
    };
  }
  
  return null;
}

/**
 * Validate 5-year forecast totals are consistent
 */
function validateCapitalForecast(
  forecast: Array<{
    immediateNeeds: number;
    shortTermNeeds: number;
    mediumTermNeeds: number;
    longTermNeeds: number;
    totalProjectedCost: number;
  }>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  forecast.forEach((yearData, index) => {
    const calculatedTotal =
      yearData.immediateNeeds +
      yearData.shortTermNeeds +
      yearData.mediumTermNeeds +
      yearData.longTermNeeds;
    
    const difference = Math.abs(calculatedTotal - yearData.totalProjectedCost);
    const tolerance = yearData.totalProjectedCost * ROUNDING_TOLERANCE;
    
    if (difference > tolerance) {
      issues.push({
        severity: 'error',
        category: 'consistency',
        message: `Year ${index + 1} forecast total mismatch`,
        field: `capitalForecast[${index}].totalProjectedCost`,
        expectedValue: calculatedTotal,
        actualValue: yearData.totalProjectedCost,
        fixAction: `Recalculate year ${index + 1} total. Difference: $${difference.toFixed(2)}`,
      });
    }
  });
  
  return issues;
}

/**
 * Detect unresolved template variables (e.g., ${variableName})
 */
function detectUnresolvedVariables(data: any, path: string = 'root'): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const templateVarRegex = /\$\{[^}]+\}/g;
  
  function scan(obj: any, currentPath: string) {
    if (typeof obj === 'string') {
      const matches = obj.match(templateVarRegex);
      if (matches) {
        matches.forEach(match => {
          issues.push({
            severity: 'error',
            category: 'template',
            message: `Unresolved template variable: ${match}`,
            field: currentPath,
            actualValue: match,
            fixAction: 'Ensure all template variables are resolved before export',
          });
        });
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => scan(item, `${currentPath}[${index}]`));
    } else if (obj && typeof obj === 'object') {
      Object.entries(obj).forEach(([key, value]) => {
        scan(value, `${currentPath}.${key}`);
      });
    }
  }
  
  scan(data, path);
  return issues;
}

/**
 * Remove duplicate component rows based on component name and asset
 */
function removeDuplicateComponents(assessments: any[]): {
  cleaned: any[];
  duplicates: ValidationIssue[];
} {
  const seen = new Map<string, any>();
  const cleaned: any[] = [];
  const duplicates: ValidationIssue[] = [];
  
  assessments.forEach((assessment, index) => {
    const key = `${assessment.assetId || 'unknown'}-${assessment.componentName || 'unknown'}`;
    
    if (seen.has(key)) {
      duplicates.push({
        severity: 'warning',
        category: 'data_quality',
        message: `Duplicate component removed: ${assessment.componentName}`,
        field: `assessments[${index}]`,
        actualValue: assessment.componentName,
        fixAction: 'Duplicate removed automatically',
      });
    } else {
      seen.set(key, assessment);
      cleaned.push(assessment);
    }
  });
  
  return { cleaned, duplicates };
}

/**
 * Validate building-level data sums to portfolio total
 */
function validateBuildingRollup(
  buildings: Array<{ deferredMaintenanceCost: number; currentReplacementValue: number }>,
  portfolioTotal: { totalDeferredMaintenance: number; totalCurrentReplacementValue: number }
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  const sumDM = buildings.reduce((sum, b) => sum + (b.deferredMaintenanceCost || 0), 0);
  const sumCRV = buildings.reduce((sum, b) => sum + (b.currentReplacementValue || 0), 0);
  
  const dmDifference = Math.abs(sumDM - portfolioTotal.totalDeferredMaintenance);
  const dmTolerance = portfolioTotal.totalDeferredMaintenance * ROUNDING_TOLERANCE;
  
  if (dmDifference > dmTolerance) {
    issues.push({
      severity: 'error',
      category: 'consistency',
      message: 'Building-level DM does not sum to portfolio total',
      field: 'totalDeferredMaintenance',
      expectedValue: sumDM,
      actualValue: portfolioTotal.totalDeferredMaintenance,
      fixAction: `Recalculate portfolio total. Difference: $${dmDifference.toFixed(2)}`,
    });
  }
  
  const crvDifference = Math.abs(sumCRV - portfolioTotal.totalCurrentReplacementValue);
  const crvTolerance = portfolioTotal.totalCurrentReplacementValue * ROUNDING_TOLERANCE;
  
  if (crvDifference > crvTolerance) {
    issues.push({
      severity: 'warning',
      category: 'consistency',
      message: 'Building-level CRV does not sum to portfolio total',
      field: 'totalCurrentReplacementValue',
      expectedValue: sumCRV,
      actualValue: portfolioTotal.totalCurrentReplacementValue,
      fixAction: `Recalculate portfolio total. Difference: $${crvDifference.toFixed(2)}`,
    });
  }
  
  return issues;
}

/**
 * Validate asset-level report data
 */
export function validateAssetReport(data: AssetReportData): ValidationResult {
  const issues: ValidationIssue[] = [];
  
  // Calculate financial metrics
  const totalRepairCost = data.assessments.reduce(
    (sum, a) => sum + (a.estimatedRepairCost || a.repairCost || 0),
    0
  );
  const totalReplacementValue = data.assessments.reduce(
    (sum, a) => sum + (a.replacementValue || a.replacementCost || 0),
    0
  );
  
  const estimatedCRV = totalReplacementValue > 0
    ? totalReplacementValue
    : (data.asset.grossFloorArea ? data.asset.grossFloorArea * 350 : totalRepairCost * 10);
  
  const fci = calculateFCI(totalRepairCost, estimatedCRV);
  const fciRating = getFCIRating(fci);
  
  // Validate FCI rating if present in data
  if (data.asset.fci !== undefined && data.asset.fciRating) {
    const ratingIssue = validateFCIRating(data.asset.fci, data.asset.fciRating, data.asset.name);
    if (ratingIssue) issues.push(ratingIssue);
  }
  
  // Remove duplicate components
  const { cleaned, duplicates } = removeDuplicateComponents(data.assessments);
  issues.push(...duplicates);
  
  // Detect unresolved template variables
  const templateIssues = detectUnresolvedVariables(data);
  issues.push(...templateIssues);
  
  // Check for negative values
  data.assessments.forEach((assessment, index) => {
    if ((assessment.estimatedRepairCost || 0) < 0) {
      issues.push({
        severity: 'error',
        category: 'data_quality',
        message: `Negative repair cost in assessment: ${assessment.componentName}`,
        field: `assessments[${index}].estimatedRepairCost`,
        actualValue: assessment.estimatedRepairCost,
        fixAction: 'Correct negative cost value',
      });
    }
  });
  
  // Determine if export can proceed
  const hasBlockingErrors = issues.some(issue => issue.severity === 'error');
  
  return {
    isValid: issues.length === 0,
    canExport: !hasBlockingErrors,
    issues,
    correctedData: {
      ...data,
      assessments: cleaned,
      calculatedMetrics: {
        totalRepairCost,
        totalReplacementValue,
        estimatedCRV,
        fci,
        fciRating,
      },
    },
  };
}

/**
 * Validate portfolio-level report data
 */
export function validatePortfolioReport(data: PortfolioReportData): ValidationResult {
  const issues: ValidationIssue[] = [];
  
  // Validate FCI ratings for all buildings
  data.buildingComparison.forEach(building => {
    const ratingIssue = validateFCIRating(building.fci, building.fciRating, building.name);
    if (ratingIssue) issues.push(ratingIssue);
  });
  
  // Validate portfolio FCI
  const portfolioFCI = calculateFCI(
    data.overview.totalDeferredMaintenance,
    data.overview.totalCurrentReplacementValue
  );
  const portfolioRating = getFCIRating(portfolioFCI);
  
  if (Math.abs(portfolioFCI - data.overview.portfolioFCI) > 0.001) {
    issues.push({
      severity: 'error',
      category: 'financial',
      message: 'Portfolio FCI calculation mismatch',
      field: 'overview.portfolioFCI',
      expectedValue: portfolioFCI,
      actualValue: data.overview.portfolioFCI,
      fixAction: `Recalculate portfolio FCI: ${fciToPercentage(portfolioFCI).toFixed(2)}%`,
    });
  }
  
  // Validate DM by priority
  const priorityIssue = validateDMByPriority(
    data.costByPriority,
    data.overview.totalDeferredMaintenance
  );
  if (priorityIssue) issues.push(priorityIssue);
  
  // Validate capital forecast
  if (data.capitalForecast && data.capitalForecast.length > 0) {
    const forecastIssues = validateCapitalForecast(data.capitalForecast);
    issues.push(...forecastIssues);
  }
  
  // Validate building rollup
  const rollupIssues = validateBuildingRollup(
    data.buildingComparison,
    {
      totalDeferredMaintenance: data.overview.totalDeferredMaintenance,
      totalCurrentReplacementValue: data.overview.totalCurrentReplacementValue,
    }
  );
  issues.push(...rollupIssues);
  
  // Detect unresolved template variables
  const templateIssues = detectUnresolvedVariables(data);
  issues.push(...templateIssues);
  
  // Remove duplicate components if categoryCostBreakdown exists
  if (data.categoryCostBreakdown) {
    const seen = new Set<string>();
    const cleaned = data.categoryCostBreakdown.filter(item => {
      const key = `${item.categoryCode}-${item.category}`;
      if (seen.has(key)) {
        issues.push({
          severity: 'warning',
          category: 'data_quality',
          message: `Duplicate category removed: ${item.category}`,
          field: 'categoryCostBreakdown',
          actualValue: item.category,
          fixAction: 'Duplicate removed automatically',
        });
        return false;
      }
      seen.add(key);
      return true;
    });
    data.categoryCostBreakdown = cleaned;
  }
  
  // Determine if export can proceed
  const hasBlockingErrors = issues.some(issue => issue.severity === 'error');
  
  return {
    isValid: issues.length === 0,
    canExport: !hasBlockingErrors,
    issues,
    correctedData: data,
  };
}

/**
 * Format validation issues for display
 */
export function formatValidationReport(result: ValidationResult): string {
  if (result.isValid) {
    return '✓ All validation checks passed. Report is ready for export.';
  }
  
  const errorCount = result.issues.filter(i => i.severity === 'error').length;
  const warningCount = result.issues.filter(i => i.severity === 'warning').length;
  
  let report = `Validation Report:\n`;
  report += `- Errors: ${errorCount}\n`;
  report += `- Warnings: ${warningCount}\n`;
  report += `- Can Export: ${result.canExport ? 'Yes' : 'No'}\n\n`;
  
  if (errorCount > 0) {
    report += 'ERRORS (must be fixed):\n';
    result.issues
      .filter(i => i.severity === 'error')
      .forEach((issue, index) => {
        report += `${index + 1}. ${issue.message}\n`;
        if (issue.fixAction) report += `   Fix: ${issue.fixAction}\n`;
      });
    report += '\n';
  }
  
  if (warningCount > 0) {
    report += 'WARNINGS (recommended to fix):\n';
    result.issues
      .filter(i => i.severity === 'warning')
      .forEach((issue, index) => {
        report += `${index + 1}. ${issue.message}\n`;
        if (issue.fixAction) report += `   Fix: ${issue.fixAction}\n`;
      });
  }
  
  return report;
}
