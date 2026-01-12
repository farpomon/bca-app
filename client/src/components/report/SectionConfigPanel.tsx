/**
 * Section Configuration Panel Components
 * Provides detailed configuration options for each report section
 */

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  BuildingSectionConfig,
  UniformatSectionConfig,
  PrioritySectionConfig,
  GeographicSectionConfig,
  BuildingColumnConfig,
} from '@shared/reportTypes';
import { Settings } from "lucide-react";

interface BuildingSectionConfigPanelProps {
  config: BuildingSectionConfig;
  onChange: (config: BuildingSectionConfig) => void;
}

export function BuildingSectionConfigPanel({ config, onChange }: BuildingSectionConfigPanelProps) {
  const updateColumns = (key: keyof BuildingColumnConfig, value: boolean) => {
    onChange({
      ...config,
      columns: {
        ...config.columns,
        [key]: value,
      },
    });
  };

  return (
    <Card className="border-l-4 border-l-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Building-by-Building Configuration
        </CardTitle>
        <CardDescription>Customize the building comparison table</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sort By */}
        <div className="space-y-2">
          <Label>Sort Buildings By</Label>
          <Select
            value={config.sortBy}
            onValueChange={(value) => onChange({ ...config, sortBy: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fci">FCI (Worst to Best)</SelectItem>
              <SelectItem value="deferredMaintenance">Deferred Maintenance (Highest to Lowest)</SelectItem>
              <SelectItem value="name">Building Name (A-Z)</SelectItem>
              <SelectItem value="age">Age (Oldest to Newest)</SelectItem>
              <SelectItem value="priorityScore">Priority Score (Highest to Lowest)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Scope */}
        <div className="space-y-2">
          <Label>Buildings to Include</Label>
          <Select
            value={config.scope}
            onValueChange={(value) => onChange({ ...config, scope: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buildings</SelectItem>
              <SelectItem value="top10">Top 10 Worst Condition</SelectItem>
              <SelectItem value="top20">Top 20 Worst Condition</SelectItem>
              <SelectItem value="critical">Critical Only (FCI &gt; 30%)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Columns */}
        <div className="space-y-2">
          <Label>Columns to Include</Label>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="col-name"
                checked={config.columns.name}
                onCheckedChange={(checked) => updateColumns('name', !!checked)}
              />
              <Label htmlFor="col-name" className="font-normal cursor-pointer">Building Name</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="col-age"
                checked={config.columns.age}
                onCheckedChange={(checked) => updateColumns('age', !!checked)}
              />
              <Label htmlFor="col-age" className="font-normal cursor-pointer">Age</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="col-crv"
                checked={config.columns.crv}
                onCheckedChange={(checked) => updateColumns('crv', !!checked)}
              />
              <Label htmlFor="col-crv" className="font-normal cursor-pointer">CRV</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="col-deferred"
                checked={config.columns.deferredMaintenance}
                onCheckedChange={(checked) => updateColumns('deferredMaintenance', !!checked)}
              />
              <Label htmlFor="col-deferred" className="font-normal cursor-pointer">Deferred Maintenance</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="col-fci"
                checked={config.columns.fci}
                onCheckedChange={(checked) => updateColumns('fci', !!checked)}
              />
              <Label htmlFor="col-fci" className="font-normal cursor-pointer">FCI</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="col-condition"
                checked={config.columns.condition}
                onCheckedChange={(checked) => updateColumns('condition', !!checked)}
              />
              <Label htmlFor="col-condition" className="font-normal cursor-pointer">Condition</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="col-deficiencies"
                checked={config.columns.deficiencies}
                onCheckedChange={(checked) => updateColumns('deficiencies', !!checked)}
              />
              <Label htmlFor="col-deficiencies" className="font-normal cursor-pointer">Deficiencies</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="col-priority"
                checked={config.columns.priorityScore}
                onCheckedChange={(checked) => updateColumns('priorityScore', !!checked)}
              />
              <Label htmlFor="col-priority" className="font-normal cursor-pointer">Priority Score</Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface UniformatSectionConfigPanelProps {
  config: UniformatSectionConfig;
  onChange: (config: UniformatSectionConfig) => void;
}

export function UniformatSectionConfigPanel({ config, onChange }: UniformatSectionConfigPanelProps) {
  return (
    <Card className="border-l-4 border-l-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" />
          UNIFORMAT Configuration
        </CardTitle>
        <CardDescription>Customize the category breakdown</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Level */}
        <div className="space-y-2">
          <Label>Classification Level</Label>
          <Select
            value={config.level}
            onValueChange={(value) => onChange({ ...config, level: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="L1">Level 1 Only (Major Categories)</SelectItem>
              <SelectItem value="L1_L2">Level 1 + Level 2 (Detailed Breakdown)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View */}
        <div className="space-y-2">
          <Label>Display View</Label>
          <Select
            value={config.view}
            onValueChange={(value) => onChange({ ...config, view: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cost">By Total Cost</SelectItem>
              <SelectItem value="percentage">By % of Total Backlog</SelectItem>
              <SelectItem value="fci_impact">By FCI Impact</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

interface GeographicSectionConfigPanelProps {
  config: GeographicSectionConfig;
  onChange: (config: GeographicSectionConfig) => void;
}

export function GeographicSectionConfigPanel({ config, onChange }: GeographicSectionConfigPanelProps) {
  return (
    <Card className="border-l-4 border-l-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Geographic Distribution Configuration
        </CardTitle>
        <CardDescription>Customize location-based analysis</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Group By */}
        <div className="space-y-2">
          <Label>Group Buildings By</Label>
          <Select
            value={config.groupBy}
            onValueChange={(value) => onChange({ ...config, groupBy: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="city">City</SelectItem>
              <SelectItem value="region">Region</SelectItem>
              <SelectItem value="site">Site/Campus</SelectItem>
              <SelectItem value="province">Province/State</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
