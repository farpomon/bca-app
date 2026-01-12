/**
 * Portfolio Report Presets
 * Defines preset configurations for different report types
 */

import {
  ReportConfiguration,
  DEFAULT_BUILDING_COLUMNS,
  DEFAULT_PRIORITY_HORIZONS,
  ReportPreset,
} from '@shared/reportTypes';

export const REPORT_PRESETS: Record<string, ReportPreset> = {
  recommended: {
    id: 'recommended',
    label: 'Recommended',
    description: 'Standard client deliverable (~12-18 pages)',
    icon: 'Sparkles',
    config: {
      includeExecutiveSummary: true,
      includePortfolioMetrics: true,
      includeBuildingBreakdown: true,
      includeCategoryAnalysis: true,
      includeCapitalForecast: true,
      includePriorityRecommendations: true,
      includeGeographicAnalysis: false,
      includeAssumptions: false,
      includeGlossary: false,
      includeMethodology: false,
      buildingSection: {
        sortBy: 'fci',
        scope: 'all',
        columns: DEFAULT_BUILDING_COLUMNS,
      },
      uniformatSection: {
        level: 'L1',
        view: 'cost',
      },
      prioritySection: {
        horizons: DEFAULT_PRIORITY_HORIZONS,
        includeImmediateOnly: false,
      },
      geographicSection: {
        groupBy: 'city',
      },
    },
  },
  
  minimal: {
    id: 'minimal',
    label: 'Minimal Executive',
    description: 'Brief summary for executives (~3-5 pages)',
    icon: 'FileCheck',
    config: {
      includeExecutiveSummary: true,
      includePortfolioMetrics: true,
      includeBuildingBreakdown: false,
      includeCategoryAnalysis: false,
      includeCapitalForecast: false,
      includePriorityRecommendations: true,
      includeGeographicAnalysis: false,
      includeAssumptions: false,
      includeGlossary: false,
      includeMethodology: false,
      buildingSection: {
        sortBy: 'fci',
        scope: 'top10',
        columns: {
          ...DEFAULT_BUILDING_COLUMNS,
          age: false,
          deficiencies: false,
        },
      },
      uniformatSection: {
        level: 'L1',
        view: 'cost',
      },
      prioritySection: {
        horizons: DEFAULT_PRIORITY_HORIZONS,
        includeImmediateOnly: true,
      },
      geographicSection: {
        groupBy: 'city',
      },
    },
  },
  
  full: {
    id: 'full',
    label: 'Full Technical',
    description: 'Complete detail with appendices (~25-40 pages)',
    icon: 'Layers',
    config: {
      includeExecutiveSummary: true,
      includePortfolioMetrics: true,
      includeBuildingBreakdown: true,
      includeCategoryAnalysis: true,
      includeCapitalForecast: true,
      includePriorityRecommendations: true,
      includeGeographicAnalysis: true,
      includeAssumptions: true,
      includeGlossary: true,
      includeMethodology: true,
      buildingSection: {
        sortBy: 'fci',
        scope: 'all',
        columns: DEFAULT_BUILDING_COLUMNS,
      },
      uniformatSection: {
        level: 'L1_L2',
        view: 'cost',
      },
      prioritySection: {
        horizons: DEFAULT_PRIORITY_HORIZONS,
        includeImmediateOnly: false,
      },
      geographicSection: {
        groupBy: 'city',
      },
    },
  },
  
  capitalPlanning: {
    id: 'capitalPlanning',
    label: 'Capital Planning Focus',
    description: 'Executive + KPIs + Capital Forecast + Priority (~10-15 pages)',
    icon: 'DollarSign',
    config: {
      includeExecutiveSummary: true,
      includePortfolioMetrics: true,
      includeBuildingBreakdown: false,
      includeCategoryAnalysis: false,
      includeCapitalForecast: true,
      includePriorityRecommendations: true,
      includeGeographicAnalysis: false,
      includeAssumptions: true,
      includeGlossary: false,
      includeMethodology: true,
      buildingSection: {
        sortBy: 'priorityScore',
        scope: 'top20',
        columns: {
          name: true,
          age: false,
          crv: true,
          deferredMaintenance: true,
          fci: true,
          condition: false,
          deficiencies: false,
          priorityScore: true,
        },
      },
      uniformatSection: {
        level: 'L1',
        view: 'cost',
      },
      prioritySection: {
        horizons: DEFAULT_PRIORITY_HORIZONS,
        includeImmediateOnly: false,
      },
      geographicSection: {
        groupBy: 'region',
      },
    },
  },
  
  assetDetail: {
    id: 'assetDetail',
    label: 'Asset Detail Focus',
    description: 'Building-by-Building + UNIFORMAT + Assumptions (~18-25 pages)',
    icon: 'Building2',
    config: {
      includeExecutiveSummary: false,
      includePortfolioMetrics: true,
      includeBuildingBreakdown: true,
      includeCategoryAnalysis: true,
      includeCapitalForecast: false,
      includePriorityRecommendations: false,
      includeGeographicAnalysis: true,
      includeAssumptions: true,
      includeGlossary: true,
      includeMethodology: true,
      buildingSection: {
        sortBy: 'name',
        scope: 'all',
        columns: DEFAULT_BUILDING_COLUMNS,
      },
      uniformatSection: {
        level: 'L1_L2',
        view: 'percentage',
      },
      prioritySection: {
        horizons: DEFAULT_PRIORITY_HORIZONS,
        includeImmediateOnly: false,
      },
      geographicSection: {
        groupBy: 'site',
      },
    },
  },
};

/**
 * Get a preset configuration by ID
 */
export function getPresetConfig(presetId: string): Partial<ReportConfiguration> | null {
  const preset = REPORT_PRESETS[presetId];
  return preset ? preset.config : null;
}

/**
 * Get all available presets
 */
export function getAllPresets(): ReportPreset[] {
  return Object.values(REPORT_PRESETS);
}

/**
 * Merge preset config with current config
 */
export function applyPreset(
  currentConfig: ReportConfiguration,
  presetId: string
): ReportConfiguration {
  const presetConfig = getPresetConfig(presetId);
  if (!presetConfig) {
    return currentConfig;
  }
  
  return {
    ...currentConfig,
    ...presetConfig,
    // Deep merge section configs
    buildingSection: {
      ...currentConfig.buildingSection,
      ...presetConfig.buildingSection,
    },
    uniformatSection: {
      ...currentConfig.uniformatSection,
      ...presetConfig.uniformatSection,
    },
    prioritySection: {
      ...currentConfig.prioritySection,
      ...presetConfig.prioritySection,
    },
    geographicSection: {
      ...currentConfig.geographicSection,
      ...presetConfig.geographicSection,
    },
  };
}
