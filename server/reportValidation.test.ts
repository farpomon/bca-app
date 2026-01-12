import { describe, it, expect } from 'vitest';
import { validateReportMetadata, validateDataAvailability, validateDataQuality, getAllValidationIssues } from '../client/src/lib/reportValidation';
import type { ReportConfiguration } from '../shared/reportTypes';

describe('Report Validation', () => {
  describe('validateReportMetadata', () => {
    it('should return errors for missing required fields', () => {
      const config: ReportConfiguration = {
        reportTitle: '',
        preparedBy: '',
        preparedFor: '',
        includeExecutiveSummary: true,
        includePortfolioMetrics: true,
        includeBuildingBreakdown: false,
        includeCategoryAnalysis: false,
        includeCapitalForecast: false,
        includePriorityRecommendations: false,
        includeGeographicAnalysis: false,
        includeAssumptions: false,
        includeGlossary: false,
        includeMethodology: false,
        additionalNotes: '',
        companyLogo: null,
        clientLogo: null,
        footerText: '',
        buildingSection: {
          sortBy: 'fci',
          scope: 'all',
          columns: ['name', 'fci', 'crv'],
        },
        uniformatSection: {
          level: 'L1',
          view: 'cost',
        },
        prioritySection: {
          horizons: ['immediate', 'short', 'medium', 'long'],
          includeImmediateOnly: false,
        },
        geographicSection: {
          groupBy: 'city',
        },
      };

      const errors = validateReportMetadata(config);
      
      expect(errors).toHaveLength(3);
      expect(errors.find(e => e.field === 'reportTitle')).toBeDefined();
      expect(errors.find(e => e.field === 'preparedBy')).toBeDefined();
      expect(errors.find(e => e.field === 'preparedFor')).toBeDefined();
    });

    it('should return no errors when all required fields are present', () => {
      const config: ReportConfiguration = {
        reportTitle: 'Portfolio Assessment Report',
        preparedBy: 'John Doe',
        preparedFor: 'ABC Corporation',
        includeExecutiveSummary: true,
        includePortfolioMetrics: true,
        includeBuildingBreakdown: false,
        includeCategoryAnalysis: false,
        includeCapitalForecast: false,
        includePriorityRecommendations: false,
        includeGeographicAnalysis: false,
        includeAssumptions: false,
        includeGlossary: false,
        includeMethodology: false,
        additionalNotes: '',
        companyLogo: null,
        clientLogo: null,
        footerText: '',
        buildingSection: {
          sortBy: 'fci',
          scope: 'all',
          columns: ['name', 'fci', 'crv'],
        },
        uniformatSection: {
          level: 'L1',
          view: 'cost',
        },
        prioritySection: {
          horizons: ['immediate', 'short', 'medium', 'long'],
          includeImmediateOnly: false,
        },
        geographicSection: {
          groupBy: 'city',
        },
      };

      const errors = validateReportMetadata(config);
      
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateDataAvailability', () => {
    it('should return error when no buildings exist', () => {
      const config: ReportConfiguration = {
        reportTitle: 'Test Report',
        preparedBy: 'Tester',
        preparedFor: 'Client',
        includeExecutiveSummary: true,
        includePortfolioMetrics: true,
        includeBuildingBreakdown: true,
        includeCategoryAnalysis: false,
        includeCapitalForecast: false,
        includePriorityRecommendations: false,
        includeGeographicAnalysis: false,
        includeAssumptions: false,
        includeGlossary: false,
        includeMethodology: false,
        additionalNotes: '',
        companyLogo: null,
        clientLogo: null,
        footerText: '',
        buildingSection: {
          sortBy: 'fci',
          scope: 'all',
          columns: ['name', 'fci', 'crv'],
        },
        uniformatSection: {
          level: 'L1',
          view: 'cost',
        },
        prioritySection: {
          horizons: ['immediate', 'short', 'medium', 'long'],
          includeImmediateOnly: false,
        },
        geographicSection: {
          groupBy: 'city',
        },
      };

      const dashboardData = {
        overview: {
          totalBuildings: 0,
          portfolioFCI: 0,
          totalDeferredMaintenance: 0,
        },
      };

      const issues = validateDataAvailability(config, dashboardData);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.severity).toBe('error');
      expect(issues[0]?.canGenerate).toBe(false);
    });

    it('should return warnings for missing section data', () => {
      const config: ReportConfiguration = {
        reportTitle: 'Test Report',
        preparedBy: 'Tester',
        preparedFor: 'Client',
        includeExecutiveSummary: true,
        includePortfolioMetrics: true,
        includeBuildingBreakdown: true,
        includeCategoryAnalysis: true,
        includeCapitalForecast: true,
        includePriorityRecommendations: false,
        includeGeographicAnalysis: false,
        includeAssumptions: false,
        includeGlossary: false,
        includeMethodology: false,
        additionalNotes: '',
        companyLogo: null,
        clientLogo: null,
        footerText: '',
        buildingSection: {
          sortBy: 'fci',
          scope: 'all',
          columns: ['name', 'fci', 'crv'],
        },
        uniformatSection: {
          level: 'L1',
          view: 'cost',
        },
        prioritySection: {
          horizons: ['immediate', 'short', 'medium', 'long'],
          includeImmediateOnly: false,
        },
        geographicSection: {
          groupBy: 'city',
        },
      };

      const dashboardData = {
        overview: {
          totalBuildings: 5,
          portfolioFCI: 12.5,
          totalDeferredMaintenance: 1000000,
        },
        buildingComparison: [],
        categoryCostBreakdown: [],
        capitalForecast: [],
      };

      const issues = validateDataAvailability(config, dashboardData);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.every(i => i.severity === 'warning')).toBe(true);
      expect(issues.every(i => i.canGenerate === true)).toBe(true);
    });
  });

  describe('getAllValidationIssues', () => {
    it('should aggregate all validation issues', () => {
      const config: ReportConfiguration = {
        reportTitle: '',
        preparedBy: 'Tester',
        preparedFor: 'Client',
        includeExecutiveSummary: true,
        includePortfolioMetrics: true,
        includeBuildingBreakdown: true,
        includeCategoryAnalysis: false,
        includeCapitalForecast: false,
        includePriorityRecommendations: false,
        includeGeographicAnalysis: false,
        includeAssumptions: false,
        includeGlossary: false,
        includeMethodology: false,
        additionalNotes: '',
        companyLogo: null,
        clientLogo: null,
        footerText: '',
        buildingSection: {
          sortBy: 'fci',
          scope: 'all',
          columns: ['name', 'fci', 'crv'],
        },
        uniformatSection: {
          level: 'L1',
          view: 'cost',
        },
        prioritySection: {
          horizons: ['immediate', 'short', 'medium', 'long'],
          includeImmediateOnly: false,
        },
        geographicSection: {
          groupBy: 'city',
        },
      };

      const dashboardData = {
        overview: {
          totalBuildings: 5,
          portfolioFCI: 12.5,
          totalDeferredMaintenance: 1000000,
        },
        buildingComparison: [
          { name: 'Building A', fci: 10, crv: 1000000 },
        ],
      };

      const result = getAllValidationIssues(config, dashboardData);
      
      expect(result.metadataErrors.length).toBeGreaterThan(0);
      expect(result.canGenerate).toBe(false); // Missing required field
    });

    it('should allow generation when only warnings exist', () => {
      const config: ReportConfiguration = {
        reportTitle: 'Test Report',
        preparedBy: 'Tester',
        preparedFor: 'Client',
        includeExecutiveSummary: true,
        includePortfolioMetrics: true,
        includeBuildingBreakdown: true,
        includeCategoryAnalysis: true,
        includeCapitalForecast: false,
        includePriorityRecommendations: false,
        includeGeographicAnalysis: false,
        includeAssumptions: false,
        includeGlossary: false,
        includeMethodology: false,
        additionalNotes: '',
        companyLogo: null,
        clientLogo: null,
        footerText: '',
        buildingSection: {
          sortBy: 'fci',
          scope: 'all',
          columns: ['name', 'fci', 'crv'],
        },
        uniformatSection: {
          level: 'L1',
          view: 'cost',
        },
        prioritySection: {
          horizons: ['immediate', 'short', 'medium', 'long'],
          includeImmediateOnly: false,
        },
        geographicSection: {
          groupBy: 'city',
        },
      };

      const dashboardData = {
        overview: {
          totalBuildings: 5,
          portfolioFCI: 12.5,
          totalDeferredMaintenance: 1000000,
        },
        buildingComparison: [
          { name: 'Building A', fci: 10, crv: 1000000 },
        ],
        categoryCostBreakdown: [],
      };

      const result = getAllValidationIssues(config, dashboardData);
      
      expect(result.canGenerate).toBe(true);
      expect(result.dataIssues.some(i => i.severity === 'warning')).toBe(true);
    });
  });
});
