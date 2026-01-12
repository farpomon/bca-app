/**
 * Portfolio Report Validation Utilities
 * Validates report configuration and data quality
 */

import {
  ReportConfiguration,
  ValidationError,
  DataQualityIssue,
} from '@shared/reportTypes';

/**
 * Validate required report metadata fields
 */
export function validateReportMetadata(config: ReportConfiguration): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!config.reportTitle?.trim()) {
    errors.push({
      field: 'reportTitle',
      message: 'Report title is required',
      severity: 'error',
    });
  }
  
  if (!config.preparedBy?.trim()) {
    errors.push({
      field: 'preparedBy',
      message: 'Prepared by is required',
      severity: 'error',
    });
  }
  
  if (!config.preparedFor?.trim()) {
    errors.push({
      field: 'preparedFor',
      message: 'Prepared for is required',
      severity: 'error',
    });
  }
  
  return errors;
}

/**
 * Validate data availability for selected sections
 */
export function validateDataAvailability(
  config: ReportConfiguration,
  dashboardData: any
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  
  // Check if portfolio has any buildings
  if (!dashboardData?.overview?.totalBuildings || dashboardData.overview.totalBuildings === 0) {
    issues.push({
      section: 'Portfolio',
      message: 'No buildings found in portfolio. Upload assessment data to generate a report.',
      severity: 'error',
      canGenerate: false,
      fixAction: 'Upload assessment data or import buildings',
    });
    return issues; // Fatal error, return immediately
  }
  
  // Check Building-by-Building section
  if (config.includeBuildingBreakdown) {
    if (!dashboardData?.buildingComparison || dashboardData.buildingComparison.length === 0) {
      issues.push({
        section: 'Building-by-Building',
        message: 'No building comparison data available. This section will be empty.',
        severity: 'warning',
        canGenerate: true,
        fixAction: 'Ensure buildings have assessment data',
      });
    }
  }
  
  // Check UNIFORMAT section
  if (config.includeCategoryAnalysis) {
    if (!dashboardData?.categoryCostBreakdown || dashboardData.categoryCostBreakdown.length === 0) {
      issues.push({
        section: 'UNIFORMAT Analysis',
        message: 'No UNIFORMAT category data available. This section will be empty.',
        severity: 'warning',
        canGenerate: true,
        fixAction: 'Add component assessments with UNIFORMAT classifications',
      });
    }
  }
  
  // Check Capital Forecast section
  if (config.includeCapitalForecast) {
    if (!dashboardData?.capitalForecast || dashboardData.capitalForecast.length === 0) {
      issues.push({
        section: 'Capital Forecast',
        message: 'No capital planning data available. Consider creating a planning cycle first.',
        severity: 'warning',
        canGenerate: true,
        fixAction: 'Create a capital planning cycle or add deficiency priorities',
      });
    }
  }
  
  // Check Geographic Analysis section
  if (config.includeGeographicAnalysis) {
    if (!dashboardData?.geographicDistribution || dashboardData.geographicDistribution.length === 0) {
      issues.push({
        section: 'Geographic Distribution',
        message: 'No location data available for geographic analysis.',
        severity: 'warning',
        canGenerate: true,
        fixAction: 'Add location information to buildings',
      });
    }
  }
  
  // Check Priority Recommendations section
  if (config.includePriorityRecommendations) {
    const hasDeficiencies = dashboardData?.overview?.totalDeficiencies > 0;
    if (!hasDeficiencies) {
      issues.push({
        section: 'Priority Recommendations',
        message: 'No deficiencies found. Priority recommendations will be limited.',
        severity: 'warning',
        canGenerate: true,
        fixAction: 'Add deficiency assessments to buildings',
      });
    }
  }
  
  return issues;
}

/**
 * Check data quality issues
 */
export function checkDataQuality(dashboardData: any): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  
  if (!dashboardData) {
    return issues;
  }
  
  // Check for duplicate buildings
  const buildingNames = dashboardData.buildingComparison?.map((b: any) => b.name) || [];
  const duplicates = buildingNames.filter((name: string, index: number) => 
    buildingNames.indexOf(name) !== index
  );
  if (duplicates.length > 0) {
    issues.push({
      section: 'Data Quality',
      message: `Duplicate building names detected: ${duplicates.join(', ')}`,
      severity: 'warning',
      canGenerate: true,
      fixAction: 'Review and rename duplicate buildings',
    });
  }
  
  // Check for missing CRV values
  const buildingsWithoutCRV = dashboardData.buildingComparison?.filter((b: any) => 
    !b.currentReplacementValue || b.currentReplacementValue === 0
  ) || [];
  if (buildingsWithoutCRV.length > 0) {
    issues.push({
      section: 'Data Quality',
      message: `${buildingsWithoutCRV.length} building(s) missing Current Replacement Value (CRV)`,
      severity: 'warning',
      canGenerate: true,
      fixAction: 'Add CRV values to all buildings',
    });
  }
  
  // Check for negative values
  const buildingsWithNegativeValues = dashboardData.buildingComparison?.filter((b: any) => 
    b.deferredMaintenanceCost < 0 || b.currentReplacementValue < 0
  ) || [];
  if (buildingsWithNegativeValues.length > 0) {
    issues.push({
      section: 'Data Quality',
      message: `${buildingsWithNegativeValues.length} building(s) have negative cost values`,
      severity: 'error',
      canGenerate: false,
      fixAction: 'Correct negative values in building data',
    });
  }
  
  // Check for impossible FCI values (> 100%)
  const buildingsWithInvalidFCI = dashboardData.buildingComparison?.filter((b: any) => 
    b.fci > 100
  ) || [];
  if (buildingsWithInvalidFCI.length > 0) {
    issues.push({
      section: 'Data Quality',
      message: `${buildingsWithInvalidFCI.length} building(s) have FCI > 100%`,
      severity: 'warning',
      canGenerate: true,
      fixAction: 'Review FCI calculations for affected buildings',
    });
  }
  
  // Check for backlog reconciliation
  if (dashboardData.overview) {
    const totalBuildingBacklog = dashboardData.buildingComparison?.reduce(
      (sum: number, b: any) => sum + (b.deferredMaintenanceCost || 0), 0
    ) || 0;
    const portfolioBacklog = dashboardData.overview.totalDeferredMaintenance || 0;
    const difference = Math.abs(totalBuildingBacklog - portfolioBacklog);
    const tolerance = portfolioBacklog * 0.01; // 1% tolerance
    
    if (difference > tolerance) {
      issues.push({
        section: 'Data Consistency',
        message: `Building-level backlog (${totalBuildingBacklog.toFixed(0)}) doesn't match portfolio total (${portfolioBacklog.toFixed(0)})`,
        severity: 'warning',
        canGenerate: true,
        fixAction: 'Refresh dashboard data or verify calculations',
      });
    }
  }
  
  return issues;
}

/**
 * Get all validation issues
 */
export function getAllValidationIssues(
  config: ReportConfiguration,
  dashboardData: any
): {
  metadataErrors: ValidationError[];
  dataIssues: DataQualityIssue[];
  qualityIssues: DataQualityIssue[];
  canGenerate: boolean;
} {
  const metadataErrors = validateReportMetadata(config);
  const dataIssues = validateDataAvailability(config, dashboardData);
  const qualityIssues = checkDataQuality(dashboardData);
  
  // Can generate if no metadata errors and no fatal data issues
  const hasFatalErrors = metadataErrors.length > 0 || 
    dataIssues.some(issue => !issue.canGenerate) ||
    qualityIssues.some(issue => !issue.canGenerate);
  
  return {
    metadataErrors,
    dataIssues,
    qualityIssues,
    canGenerate: !hasFatalErrors,
  };
}
