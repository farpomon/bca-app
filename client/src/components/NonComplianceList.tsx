import { useState, useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ComplianceIssue {
  severity: "high" | "medium" | "low";
  codeSection: string;
  description: string;
  recommendation: string;
}

interface NonCompliantComponent {
  assessmentId: number;
  componentCode: string;
  componentName: string;
  condition: string;
  conditionPercentage: number | null;
  complianceStatus: "non_compliant" | "needs_review";
  issues: ComplianceIssue[];
  complianceRecommendations: string;
  complianceCheckedAt: string;
}

interface NonComplianceListProps {
  components: NonCompliantComponent[];
  buildingCodeTitle?: string;
  projectName?: string;
  onExportReport?: () => void;
  className?: string;
}

type SortField = "severity" | "component" | "date" | "issueCount";
type SortDirection = "asc" | "desc";
type SeverityFilter = "all" | "high" | "medium" | "low";

/**
 * Displays a comprehensive list of non-compliant building components
 * with filtering, sorting, and export capabilities
 */
export function NonComplianceList({
  components,
  buildingCodeTitle,
  projectName,
  onExportReport,
  className = "",
}: NonComplianceListProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [sortField, setSortField] = useState<SortField>("severity");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // Get severity badge styling
  const getSeverityBadge = (severity: "high" | "medium" | "low") => {
    const styles = {
      high: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300",
      medium: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300",
      low: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300",
    };
    const icons = {
      high: <AlertCircle className="h-3 w-3" />,
      medium: <AlertTriangle className="h-3 w-3" />,
      low: <Info className="h-3 w-3" />,
    };
    return (
      <Badge variant="outline" className={styles[severity]}>
        {icons[severity]}
        <span className="ml-1 uppercase text-xs font-semibold">{severity}</span>
      </Badge>
    );
  };

  // Get highest severity from issues
  const getHighestSeverity = (issues: ComplianceIssue[]): "high" | "medium" | "low" => {
    if (issues.some((i) => i.severity === "high")) return "high";
    if (issues.some((i) => i.severity === "medium")) return "medium";
    return "low";
  };

  // Filter and sort components
  const filteredAndSortedComponents = useMemo(() => {
    let filtered = components;

    // Apply severity filter
    if (severityFilter !== "all") {
      filtered = filtered.filter((comp) =>
        comp.issues.some((issue) => issue.severity === severityFilter)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "severity": {
          const severityOrder = { high: 3, medium: 2, low: 1 };
          const aSeverity = getHighestSeverity(a.issues);
          const bSeverity = getHighestSeverity(b.issues);
          comparison = severityOrder[aSeverity] - severityOrder[bSeverity];
          break;
        }
        case "component":
          comparison = a.componentName.localeCompare(b.componentName);
          break;
        case "date":
          comparison =
            new Date(a.complianceCheckedAt).getTime() - new Date(b.complianceCheckedAt).getTime();
          break;
        case "issueCount":
          comparison = a.issues.length - b.issues.length;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [components, severityFilter, sortField, sortDirection]);

  // Toggle expanded state
  const toggleExpanded = (assessmentId: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(assessmentId)) {
      newExpanded.delete(assessmentId);
    } else {
      newExpanded.add(assessmentId);
    }
    setExpandedItems(newExpanded);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalIssues = components.reduce((sum, comp) => sum + comp.issues.length, 0);
    const highSeverity = components.filter((comp) =>
      comp.issues.some((i) => i.severity === "high")
    ).length;
    const mediumSeverity = components.filter((comp) =>
      comp.issues.some((i) => i.severity === "medium")
    ).length;
    const lowSeverity = components.filter((comp) =>
      comp.issues.some((i) => i.severity === "low")
    ).length;

    return { totalIssues, highSeverity, mediumSeverity, lowSeverity };
  }, [components]);

  // Export to CSV
  const handleExport = () => {
    const csvRows = [
      [
        "Component Code",
        "Component Name",
        "Condition",
        "Condition %",
        "Status",
        "Severity",
        "Code Section",
        "Issue Description",
        "Recommendation",
        "Checked Date",
      ],
    ];

    components.forEach((comp) => {
      comp.issues.forEach((issue) => {
        csvRows.push([
          comp.componentCode,
          comp.componentName,
          comp.condition,
          comp.conditionPercentage?.toString() || "N/A",
          comp.complianceStatus,
          issue.severity,
          issue.codeSection,
          `"${issue.description.replace(/"/g, '""')}"`,
          `"${issue.recommendation.replace(/"/g, '""')}"`,
          new Date(comp.complianceCheckedAt).toLocaleDateString(),
        ]);
      });
    });

    const csvContent = csvRows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `non-compliance-report-${projectName || "project"}-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (components.length === 0) {
    return (
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
        <AlertCircle className="h-5 w-5 text-green-600" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          <strong>No non-compliance issues found.</strong> All assessed components appear to meet the
          selected building code requirements based on the AI analysis.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Statistics Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Non-Compliance Summary
          </CardTitle>
          <CardDescription>
            {buildingCodeTitle && `Building Code: ${buildingCodeTitle} | `}
            {components.length} component{components.length !== 1 ? "s" : ""} with {stats.totalIssues}{" "}
            total issue{stats.totalIssues !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {components.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Non-Compliant Components
              </div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="text-3xl font-bold text-red-700 dark:text-red-400">
                {stats.highSeverity}
              </div>
              <div className="text-sm text-red-600 dark:text-red-400 mt-1">High Severity</div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">
                {stats.mediumSeverity}
              </div>
              <div className="text-sm text-orange-600 dark:text-orange-400 mt-1">Medium Severity</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">
                {stats.lowSeverity}
              </div>
              <div className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">Low Severity</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select
                  value={severityFilter}
                  onValueChange={(value) => setSeverityFilter(value as SeverityFilter)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter by severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="high">High Only</SelectItem>
                    <SelectItem value="medium">Medium Only</SelectItem>
                    <SelectItem value="low">Low Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Select
                value={sortField}
                onValueChange={(value) => setSortField(value as SortField)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="severity">Sort by Severity</SelectItem>
                  <SelectItem value="component">Sort by Component</SelectItem>
                  <SelectItem value="issueCount">Sort by Issue Count</SelectItem>
                  <SelectItem value="date">Sort by Date</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
              >
                {sortDirection === "asc" ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Ascending
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Descending
                  </>
                )}
              </Button>
            </div>

            <Button onClick={onExportReport || handleExport} variant="default" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Non-Compliant Components List */}
      <div className="space-y-3">
        {filteredAndSortedComponents.map((component) => {
          const isExpanded = expandedItems.has(component.assessmentId);
          const highestSeverity = getHighestSeverity(component.issues);

          return (
            <Card
              key={component.assessmentId}
              className="border-l-4"
              style={{
                borderLeftColor:
                  highestSeverity === "high"
                    ? "rgb(220, 38, 38)"
                    : highestSeverity === "medium"
                      ? "rgb(234, 88, 12)"
                      : "rgb(202, 138, 4)",
              }}
            >
              <CardHeader className="pb-3">
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => toggleExpanded(component.assessmentId)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg">
                        {component.componentName}
                        <span className="text-sm text-gray-500 ml-2 font-normal">
                          ({component.componentCode})
                        </span>
                      </CardTitle>
                      {getSeverityBadge(highestSeverity)}
                      <Badge variant="outline" className="text-xs">
                        {component.issues.length} issue{component.issues.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">
                      Condition: {component.condition}
                      {component.conditionPercentage !== null &&
                        ` (${component.conditionPercentage}%)`}{" "}
                      | Checked: {new Date(component.complianceCheckedAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm">
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-4">
                  <Separator />

                  {/* Overall Recommendations */}
                  {component.complianceRecommendations && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        Overall Recommendations:
                      </h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        {component.complianceRecommendations}
                      </p>
                    </div>
                  )}

                  {/* Individual Issues */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      Compliance Issues:
                    </h4>
                    {component.issues.map((issue, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getSeverityBadge(issue.severity)}
                              <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                                {issue.codeSection}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {issue.description}
                            </p>
                          </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Recommended Action:
                          </p>
                          <p className="text-sm text-gray-800 dark:text-gray-200">
                            {issue.recommendation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {filteredAndSortedComponents.length === 0 && (
        <Alert>
          <Info className="h-5 w-5" />
          <AlertDescription>
            No components match the current filter criteria. Try adjusting your filters.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
