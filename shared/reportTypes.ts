/**
 * Portfolio Report Configuration Types
 * Defines all configuration options for the enhanced report builder
 */

export type BuildingSortOption = 'fci' | 'deferredMaintenance' | 'name' | 'age' | 'priorityScore';
export type BuildingScopeOption = 'all' | 'top10' | 'top20' | 'critical';
export type UniformatLevelOption = 'L1' | 'L1_L2';
export type UniformatViewOption = 'cost' | 'percentage' | 'fci_impact';
export type GeographicGroupingOption = 'city' | 'region' | 'site' | 'province';
export type PriorityHorizon = 'immediate' | 'short_term' | 'medium_term' | 'long_term';

// Individual Component Assessment types
export type ComponentAssessmentScope = 'all' | 'selected';
export type ComponentDetailLevel = 'minimal' | 'standard' | 'full';
export type ComponentSortOption = 'risk' | 'condition' | 'cost' | 'name';
export type ComponentConditionFilter = 'good' | 'fair' | 'poor' | 'critical' | 'not_assessed';
export type ComponentRiskFilter = 'low' | 'medium' | 'high' | 'critical';

export interface BuildingColumnConfig {
  name: boolean;
  age: boolean;
  crv: boolean;
  deferredMaintenance: boolean;
  fci: boolean;
  condition: boolean;
  deficiencies: boolean;
  priorityScore: boolean;
}

export interface BuildingSectionConfig {
  sortBy: BuildingSortOption;
  scope: BuildingScopeOption;
  columns: BuildingColumnConfig;
}

export interface UniformatSectionConfig {
  level: UniformatLevelOption;
  view: UniformatViewOption;
}

export interface PriorityHorizonDefinition {
  label: string;
  description: string;
  timeframe: string;
}

export interface PrioritySectionConfig {
  horizons: Record<PriorityHorizon, PriorityHorizonDefinition>;
  includeImmediateOnly: boolean;
}

export interface GeographicSectionConfig {
  groupBy: GeographicGroupingOption;
}

export interface ComponentAssessmentFilters {
  facilities?: number[];
  categories?: string[];
  conditions?: ComponentConditionFilter[];
  riskLevels?: ComponentRiskFilter[];
  onlyWithDeficiencies?: boolean;
}

export interface ComponentAssessmentSectionConfig {
  enabled: boolean;
  scope: ComponentAssessmentScope;
  selectedAssetIds?: number[];
  filters: ComponentAssessmentFilters;
  detailLevel: ComponentDetailLevel;
  sortBy: ComponentSortOption;
  maxAssets: number;
}

export interface ReportSectionToggles {
  includeExecutiveSummary: boolean;
  includePortfolioMetrics: boolean;
  includeBuildingBreakdown: boolean;
  includeCategoryAnalysis: boolean;
  includeCapitalForecast: boolean;
  includePriorityRecommendations: boolean;
  includeGeographicAnalysis: boolean;
  includeComponentAssessments: boolean;
  includeAssumptions: boolean;
  includeGlossary: boolean;
  includeMethodology: boolean;
}

export interface ReportMetadata {
  reportTitle: string;
  preparedBy: string;
  preparedFor: string;
  additionalNotes: string;
  companyLogo: string | null;
  clientLogo: string | null;
  footerText: string;
  assessmentDateRange?: string;
  reportVersion?: string;
}

export interface ReportConfiguration extends ReportSectionToggles, ReportMetadata {
  buildingSection: BuildingSectionConfig;
  uniformatSection: UniformatSectionConfig;
  prioritySection: PrioritySectionConfig;
  geographicSection: GeographicSectionConfig;
  componentAssessmentSection: ComponentAssessmentSectionConfig;
}

export interface ComponentAssessmentData {
  assetId: number;
  assetName: string;
  assetUniqueId: string;
  location: string;
  systemCategory: string;
  overallCondition: string;
  riskRating: string;
  assessmentDate: string;
  assessorName: string;
  components: ComponentData[];
  photos: PhotoData[];
  hasDeficiencies: boolean;
}

export interface ComponentData {
  componentCode: string;
  componentName: string;
  condition: string;
  conditionPercentage: number | null;
  riskLevel: string;
  predictedFailureYear: number | null;
  remainingLife: number | null;
  recommendedAction: string;
  estimatedCost: number | null;
  notes: string;
  aiInsights: string;
}

export interface PhotoData {
  id: number;
  url: string;
  caption: string;
  takenAt: string;
}

export interface DataSnapshot {
  timestamp: Date;
  dataHash: string;
  portfolioMetrics: any;
  buildingData: any[];
  uniformatData: any[];
  capitalForecastData: any[];
  componentAssessmentData?: ComponentAssessmentData[];
}

export interface ReportPreset {
  id: string;
  label: string;
  description: string;
  icon: string;
  config: Partial<ReportConfiguration>;
}

// Default configurations
export const DEFAULT_BUILDING_COLUMNS: BuildingColumnConfig = {
  name: true,
  age: true,
  crv: true,
  deferredMaintenance: true,
  fci: true,
  condition: true,
  deficiencies: true,
  priorityScore: true,
};

export const DEFAULT_PRIORITY_HORIZONS: Record<PriorityHorizon, PriorityHorizonDefinition> = {
  immediate: {
    label: 'Immediate',
    description: 'Critical deficiencies requiring urgent attention',
    timeframe: '0-12 months',
  },
  short_term: {
    label: 'Short-Term',
    description: 'Important repairs and renewals',
    timeframe: '1-2 years',
  },
  medium_term: {
    label: 'Medium-Term',
    description: 'Planned capital renewals',
    timeframe: '3-5 years',
  },
  long_term: {
    label: 'Long-Term',
    description: 'Strategic planning and lifecycle replacements',
    timeframe: '6-10 years',
  },
};

export const DEFAULT_COMPONENT_ASSESSMENT_CONFIG: ComponentAssessmentSectionConfig = {
  enabled: false,
  scope: 'all',
  selectedAssetIds: [],
  filters: {
    facilities: [],
    categories: [],
    conditions: [],
    riskLevels: [],
    onlyWithDeficiencies: false,
  },
  detailLevel: 'standard',
  sortBy: 'risk',
  maxAssets: 25,
};

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface DataQualityIssue {
  section: string;
  message: string;
  severity: 'error' | 'warning';
  canGenerate: boolean;
  fixAction?: string;
}
