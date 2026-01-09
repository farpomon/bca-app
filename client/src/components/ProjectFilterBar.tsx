import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface ProjectFilters {
  assetType?: string;
  conditionLevel?: string;
  fundingStatus?: string;
}

interface ProjectFilterBarProps {
  filters: ProjectFilters;
  onFiltersChange: (filters: ProjectFilters) => void;
  // Future: Get these from backend
  availableAssetTypes?: string[];
}

const CONDITION_LEVELS = [
  { value: "all", label: "All Conditions" },
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
  { value: "critical", label: "Critical" },
];

const FUNDING_STATUS = [
  { value: "all", label: "All Status" },
  { value: "funded", label: "Funded" },
  { value: "proposed", label: "Proposed" },
  { value: "deferred", label: "Deferred" },
];

export function ProjectFilterBar({
  filters,
  onFiltersChange,
  availableAssetTypes = [],
}: ProjectFilterBarProps) {
  const hasActiveFilters =
    (filters.assetType && filters.assetType !== "all") ||
    (filters.conditionLevel && filters.conditionLevel !== "all") ||
    (filters.fundingStatus && filters.fundingStatus !== "all");

  const clearFilters = () => {
    onFiltersChange({
      assetType: "all",
      conditionLevel: "all",
      fundingStatus: "all",
    });
  };

  const activeFilterCount = [
    filters.assetType && filters.assetType !== "all",
    filters.conditionLevel && filters.conditionLevel !== "all",
    filters.fundingStatus && filters.fundingStatus !== "all",
  ].filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border">
      <span className="text-sm font-medium text-muted-foreground">Filter by:</span>

      {/* Asset Type Filter */}
      {availableAssetTypes.length > 0 && (
        <Select
          value={filters.assetType || "all"}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, assetType: value })
          }
        >
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue placeholder="Asset Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Asset Types</SelectItem>
            {availableAssetTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Condition Level Filter */}
      <Select
        value={filters.conditionLevel || "all"}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, conditionLevel: value })
        }
      >
        <SelectTrigger className="w-[180px] bg-background">
          <SelectValue placeholder="Condition" />
        </SelectTrigger>
        <SelectContent>
          {CONDITION_LEVELS.map((level) => (
            <SelectItem key={level.value} value={level.value}>
              {level.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Funding Status Filter */}
      <Select
        value={filters.fundingStatus || "all"}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, fundingStatus: value })
        }
      >
        <SelectTrigger className="w-[180px] bg-background">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {FUNDING_STATUS.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Active Filters Badge & Clear Button */}
      {hasActiveFilters && (
        <>
          <Badge variant="secondary" className="gap-1">
            {activeFilterCount} {activeFilterCount === 1 ? "filter" : "filters"} active
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1 h-8"
          >
            <X className="h-3 w-3" />
            Clear all
          </Button>
        </>
      )}

      {!hasActiveFilters && (
        <span className="text-xs text-muted-foreground">
          No filters applied
        </span>
      )}
    </div>
  );
}
