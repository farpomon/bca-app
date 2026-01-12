/**
 * Component Assessment Section Configuration Panel
 * 
 * Provides UI controls for configuring the Individual Component Assessment
 * section of portfolio reports, including scope, filters, detail level, and sorting.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Building2, Layers, TrendingUp, Filter, Info } from "lucide-react";
import type { ComponentAssessmentSectionConfig } from "@shared/reportTypes";
import { MultiSelect } from "@/components/ui/multi-select";

interface ComponentAssessmentConfigPanelProps {
  projectId?: number;
  config: ComponentAssessmentSectionConfig;
  onChange: (config: ComponentAssessmentSectionConfig) => void;
}

export function ComponentAssessmentConfigPanel({
  projectId,
  config,
  onChange,
}: ComponentAssessmentConfigPanelProps) {
  const [estimatedPages, setEstimatedPages] = useState<number>(0);
  const [showWarning, setShowWarning] = useState(false);

  // Fetch filter options
  const { data: filterOptions } = trpc.portfolioReport.getComponentFilterOptions.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );

  // Fetch available assets for selection
  const { data: assetsData } = trpc.assets.list.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );

  // Estimate page count when config changes
  const { data: sizeEstimate } = trpc.portfolioReport.estimateComponentReportSize.useQuery(
    {
      assetCount: config.maxAssets,
      detailLevel: config.detailLevel,
    },
    {
      enabled: config.enabled,
    }
  );

  useEffect(() => {
    if (sizeEstimate) {
      setEstimatedPages(sizeEstimate.estimatedPages);
      setShowWarning(!!sizeEstimate.warning);
    }
  }, [sizeEstimate]);

  const handleScopeChange = (scope: 'all' | 'selected') => {
    onChange({
      ...config,
      scope,
      selectedAssetIds: scope === 'all' ? [] : config.selectedAssetIds,
    });
  };

  const handleFilterChange = (filterKey: keyof typeof config.filters, value: any) => {
    onChange({
      ...config,
      filters: {
        ...config.filters,
        [filterKey]: value,
      },
    });
  };

  const assetOptions = assetsData?.map(asset => ({
    value: asset.id.toString(),
    label: asset.name,
  })) || [];

  const selectedAssetValues = config.selectedAssetIds?.map(id => id.toString()) || [];

  // Show info message for portfolio-wide reports
  if (!projectId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Component Assessment Configuration
          </CardTitle>
          <CardDescription>
            Configure which assets and components to include in the detailed assessment section
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Component assessments will be included for all assets across your portfolio. 
              Detailed filtering options are available when generating reports for individual projects.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Component Assessment Configuration
        </CardTitle>
        <CardDescription>
          Configure which assets and components to include in the detailed assessment section
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scope Selection */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Scope</Label>
          <RadioGroup value={config.scope} onValueChange={handleScopeChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="scope-all" />
              <Label htmlFor="scope-all" className="font-normal cursor-pointer">
                Include for All Assets
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="selected" id="scope-selected" />
              <Label htmlFor="scope-selected" className="font-normal cursor-pointer">
                Include for Selected Assets
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Grouping Option */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Component Breakdown Grouping</Label>
          <Select
            value={config.grouping || 'building_uniformat'}
            onValueChange={(value: any) => {
              onChange({ ...config, grouping: value });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select grouping" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="building_uniformat">By Building, then UNIFORMAT</SelectItem>
              <SelectItem value="uniformat_building">By UNIFORMAT, then Building</SelectItem>
              <SelectItem value="building_only">By Building Only</SelectItem>
              <SelectItem value="uniformat_only">By UNIFORMAT Only</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose how to organize component assessments in the report
          </p>
        </div>

        {/* Asset Selection (only when scope is 'selected') */}
        {config.scope === 'selected' && (
          <div className="space-y-2">
            <Label htmlFor="asset-select">Select Assets</Label>
            <MultiSelect
              options={assetOptions}
              selected={selectedAssetValues}
              onChange={(values) => {
                const assetIds = values.map(v => parseInt(v));
                onChange({
                  ...config,
                  selectedAssetIds: assetIds,
                });
              }}
              placeholder="Choose assets to include..."
            />
            {selectedAssetValues.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedAssetValues.length} asset(s) selected
              </p>
            )}
          </div>
        )}

        {/* Asset Filters (only when scope is 'all') */}
        {config.scope === 'all' && (
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4" />
              <Label className="text-base font-semibold">Asset Filters</Label>
            </div>

            {/* Facility Filter */}
            {filterOptions && filterOptions.facilities.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="facility-filter">Facility / Building</Label>
                <Select
                  value={config.filters.facilities?.[0]?.toString() || "all"}
                  onValueChange={(value) => {
                    handleFilterChange(
                      'facilities',
                      value === 'all' ? [] : [parseInt(value)]
                    );
                  }}
                >
                  <SelectTrigger id="facility-filter">
                    <SelectValue placeholder="All facilities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All facilities</SelectItem>
                    {filterOptions.facilities.map((facility) => (
                      <SelectItem key={facility.id} value={facility.id!.toString()}>
                        {facility.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Category Filter */}
            {filterOptions && filterOptions.categories.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="category-filter">System Category (UNIFORMAT)</Label>
                <Select
                  value={config.filters.categories?.[0] || "all"}
                  onValueChange={(value) => {
                    handleFilterChange(
                      'categories',
                      value === 'all' ? [] : [value]
                    );
                  }}
                >
                  <SelectTrigger id="category-filter">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {filterOptions.categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Condition Filter */}
            <div className="space-y-2">
              <Label htmlFor="condition-filter">Condition Rating</Label>
              <Select
                value={config.filters.conditions?.[0] || "all"}
                onValueChange={(value) => {
                  handleFilterChange(
                    'conditions',
                    value === 'all' ? [] : [value as any]
                  );
                }}
              >
                <SelectTrigger id="condition-filter">
                  <SelectValue placeholder="All conditions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All conditions</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="not_assessed">Not Assessed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Risk Level Filter */}
            <div className="space-y-2">
              <Label htmlFor="risk-filter">Risk Level</Label>
              <Select
                value={config.filters.riskLevels?.[0] || "all"}
                onValueChange={(value) => {
                  handleFilterChange(
                    'riskLevels',
                    value === 'all' ? [] : [value as any]
                  );
                }}
              >
                <SelectTrigger id="risk-filter">
                  <SelectValue placeholder="All risk levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All risk levels</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <Label htmlFor="priority-filter">Priority Band</Label>
              <Select
                value={config.filters.priorities?.[0] || "all"}
                onValueChange={(value) => {
                  handleFilterChange(
                    'priorities',
                    value === 'all' ? [] : [value as any]
                  );
                }}
              >
                <SelectTrigger id="priority-filter">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="necessary">Necessary</SelectItem>
                  <SelectItem value="recommended">Recommended</SelectItem>
                  <SelectItem value="no_action">No Action</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Type Filter */}
            <div className="space-y-2">
              <Label htmlFor="action-type-filter">Recommended Action Type</Label>
              <Select
                value={config.filters.actionTypes?.[0] || "all"}
                onValueChange={(value) => {
                  handleFilterChange(
                    'actionTypes',
                    value === 'all' ? [] : [value as any]
                  );
                }}
              >
                <SelectTrigger id="action-type-filter">
                  <SelectValue placeholder="All action types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All action types</SelectItem>
                  <SelectItem value="renewal">Renewal</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="replace">Replace</SelectItem>
                  <SelectItem value="monitor">Monitor</SelectItem>
                  <SelectItem value="immediate_action">Immediate Action</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Year Range Filter */}
            <div className="space-y-2">
              <Label>Action Year Range</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  placeholder="Min year"
                  value={config.filters.yearRange?.min || ''}
                  onChange={(e) => {
                    const min = e.target.value ? parseInt(e.target.value) : undefined;
                    handleFilterChange('yearRange', {
                      min,
                      max: config.filters.yearRange?.max,
                    });
                  }}
                  className="w-24"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="number"
                  placeholder="Max year"
                  value={config.filters.yearRange?.max || ''}
                  onChange={(e) => {
                    const max = e.target.value ? parseInt(e.target.value) : undefined;
                    handleFilterChange('yearRange', {
                      min: config.filters.yearRange?.min,
                      max,
                    });
                  }}
                  className="w-24"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Filter components by recommended action year
              </p>
            </div>

            {/* Only With Deficiencies Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="deficiencies-only"
                checked={config.filters.onlyWithDeficiencies || false}
                onCheckedChange={(checked) => {
                  handleFilterChange('onlyWithDeficiencies', !!checked);
                }}
              />
              <Label htmlFor="deficiencies-only" className="font-normal cursor-pointer">
                Only include assets with deficiencies
              </Label>
            </div>
          </div>
        )}

        {/* Detail Level */}
        <div className="space-y-2">
          <Label htmlFor="detail-level">Detail Level</Label>
          <Select
            value={config.detailLevel}
            onValueChange={(value: any) => onChange({ ...config, detailLevel: value })}
          >
            <SelectTrigger id="detail-level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minimal">
                <div>
                  <div className="font-medium">Minimal</div>
                  <div className="text-xs text-muted-foreground">1-2 lines per component</div>
                </div>
              </SelectItem>
              <SelectItem value="standard">
                <div>
                  <div className="font-medium">Standard (Recommended)</div>
                  <div className="text-xs text-muted-foreground">Balanced detail with key metrics</div>
                </div>
              </SelectItem>
              <SelectItem value="full">
                <div>
                  <div className="font-medium">Full</div>
                  <div className="text-xs text-muted-foreground">Complete details with notes and photos</div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Page Control */}
        <div className="space-y-4 p-4 border rounded-lg">
          <Label className="text-base font-semibold">Page Control</Label>
          
          <div className="space-y-2">
            <Label htmlFor="max-assets">Maximum Assets to Include</Label>
            <Input
              id="max-assets"
              type="number"
              min={1}
              max={100}
              value={config.maxAssets}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 1 && value <= 100) {
                  onChange({ ...config, maxAssets: value });
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Limit the report to the top {config.maxAssets} assets (max: 100)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort-by">Sort By</Label>
            <Select
              value={config.sortBy}
              onValueChange={(value: any) => onChange({ ...config, sortBy: value })}
            >
              <SelectTrigger id="sort-by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="risk">Highest Risk First</SelectItem>
                <SelectItem value="condition">Worst Condition First</SelectItem>
                <SelectItem value="cost">Highest Replacement Cost First</SelectItem>
                <SelectItem value="name">Asset Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Estimated Pages Info */}
        {estimatedPages > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Estimated report size: <strong>~{estimatedPages} pages</strong>
              {showWarning && (
                <span className="block mt-1 text-orange-600">
                  This report may be very large. Consider applying filters or reducing the maximum asset count.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Active Filters Summary */}
        {config.scope === 'all' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Active Filters:</Label>
            <div className="flex flex-wrap gap-2">
              {config.filters.facilities && config.filters.facilities.length > 0 && (
                <Badge variant="secondary">
                  <Building2 className="h-3 w-3 mr-1" />
                  Facility filtered
                </Badge>
              )}
              {config.filters.categories && config.filters.categories.length > 0 && (
                <Badge variant="secondary">
                  <Layers className="h-3 w-3 mr-1" />
                  Category filtered
                </Badge>
              )}
              {config.filters.conditions && config.filters.conditions.length > 0 && (
                <Badge variant="secondary">
                  Condition: {config.filters.conditions[0]}
                </Badge>
              )}
              {config.filters.riskLevels && config.filters.riskLevels.length > 0 && (
                <Badge variant="secondary">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Risk: {config.filters.riskLevels[0]}
                </Badge>
              )}
              {config.filters.onlyWithDeficiencies && (
                <Badge variant="secondary">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  With deficiencies only
                </Badge>
              )}
              {(!config.filters.facilities || config.filters.facilities.length === 0) &&
                (!config.filters.categories || config.filters.categories.length === 0) &&
                (!config.filters.conditions || config.filters.conditions.length === 0) &&
                (!config.filters.riskLevels || config.filters.riskLevels.length === 0) &&
                !config.filters.onlyWithDeficiencies && (
                  <Badge variant="outline">No filters applied</Badge>
                )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
