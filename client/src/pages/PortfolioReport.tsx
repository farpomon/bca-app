import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  FileText,
  Download,
  Printer,
  Building2,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Calendar,
  User,
  ArrowLeft,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Link } from "wouter";

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Format percentage
function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Get FCI rating color
function getFCIColor(fci: number): string {
  if (fci <= 5) return "#22c55e";
  if (fci <= 10) return "#f59e0b";
  if (fci <= 30) return "#f97316";
  return "#ef4444";
}

// Get condition color
function getConditionColor(condition: string): string {
  switch (condition.toLowerCase()) {
    case "good": return "#22c55e";
    case "fair": return "#f59e0b";
    case "poor": return "#ef4444";
    default: return "#6b7280";
  }
}

interface ReportOptions {
  includeExecutiveSummary: boolean;
  includePortfolioMetrics: boolean;
  includeBuildingBreakdown: boolean;
  includeCategoryAnalysis: boolean;
  includeCapitalForecast: boolean;
  includePriorityRecommendations: boolean;
  includeGeographicAnalysis: boolean;
  reportTitle: string;
  preparedBy: string;
  preparedFor: string;
  additionalNotes: string;
}

export default function PortfolioReport() {
  const { user, loading: authLoading } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const [options, setOptions] = useState<ReportOptions>({
    includeExecutiveSummary: true,
    includePortfolioMetrics: true,
    includeBuildingBreakdown: true,
    includeCategoryAnalysis: true,
    includeCapitalForecast: true,
    includePriorityRecommendations: true,
    includeGeographicAnalysis: false,
    reportTitle: "Portfolio Condition Assessment Report",
    preparedBy: user?.name || "",
    preparedFor: "",
    additionalNotes: "",
  });

  // Fetch analytics data
  const { data: dashboardData, isLoading } = trpc.portfolioAnalytics.getDashboardData.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Fetch full building comparison
  const { data: allBuildings } = trpc.portfolioAnalytics.getBuildingComparison.useQuery(
    { sortBy: 'priorityScore', sortOrder: 'desc', limit: 100 },
    { enabled: !!user && showPreview }
  );

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateReport = () => {
    setIsGenerating(true);
    setShowPreview(true);
    setTimeout(() => setIsGenerating(false), 500);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No data available for report generation</p>
      </div>
    );
  }

  const { overview, categoryCostBreakdown, priorityBreakdown, capitalForecast, geographicDistribution, propertyTypeDistribution } = dashboardData;
  const buildings = allBuildings || dashboardData.buildingComparison;

  return (
    <div className="min-h-screen bg-background">
      {/* Configuration Panel - Hidden when printing */}
      {!showPreview && (
        <div className="container py-6 space-y-6 print:hidden">
          <div className="flex items-center gap-4">
            <Link href="/portfolio-analytics">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Analytics
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Generate Portfolio Report</h1>
              <p className="text-muted-foreground">
                Create a comprehensive PDF report of your portfolio condition assessment
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Report Options */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Report Sections</CardTitle>
                <CardDescription>Select which sections to include in your report</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="executiveSummary"
                      checked={options.includeExecutiveSummary}
                      onCheckedChange={(checked) => setOptions({ ...options, includeExecutiveSummary: !!checked })}
                    />
                    <Label htmlFor="executiveSummary">Executive Summary</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="portfolioMetrics"
                      checked={options.includePortfolioMetrics}
                      onCheckedChange={(checked) => setOptions({ ...options, includePortfolioMetrics: !!checked })}
                    />
                    <Label htmlFor="portfolioMetrics">Portfolio Metrics & KPIs</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="buildingBreakdown"
                      checked={options.includeBuildingBreakdown}
                      onCheckedChange={(checked) => setOptions({ ...options, includeBuildingBreakdown: !!checked })}
                    />
                    <Label htmlFor="buildingBreakdown">Building-by-Building Breakdown</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="categoryAnalysis"
                      checked={options.includeCategoryAnalysis}
                      onCheckedChange={(checked) => setOptions({ ...options, includeCategoryAnalysis: !!checked })}
                    />
                    <Label htmlFor="categoryAnalysis">UNIFORMAT Category Analysis</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="capitalForecast"
                      checked={options.includeCapitalForecast}
                      onCheckedChange={(checked) => setOptions({ ...options, includeCapitalForecast: !!checked })}
                    />
                    <Label htmlFor="capitalForecast">Capital Planning Forecast</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="priorityRecommendations"
                      checked={options.includePriorityRecommendations}
                      onCheckedChange={(checked) => setOptions({ ...options, includePriorityRecommendations: !!checked })}
                    />
                    <Label htmlFor="priorityRecommendations">Priority Recommendations</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="geographicAnalysis"
                      checked={options.includeGeographicAnalysis}
                      onCheckedChange={(checked) => setOptions({ ...options, includeGeographicAnalysis: !!checked })}
                    />
                    <Label htmlFor="geographicAnalysis">Geographic Distribution</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Report Details */}
            <Card>
              <CardHeader>
                <CardTitle>Report Details</CardTitle>
                <CardDescription>Customize report information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reportTitle">Report Title</Label>
                  <Input
                    id="reportTitle"
                    value={options.reportTitle}
                    onChange={(e) => setOptions({ ...options, reportTitle: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preparedBy">Prepared By</Label>
                  <Input
                    id="preparedBy"
                    value={options.preparedBy}
                    onChange={(e) => setOptions({ ...options, preparedBy: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preparedFor">Prepared For</Label>
                  <Input
                    id="preparedFor"
                    value={options.preparedFor}
                    onChange={(e) => setOptions({ ...options, preparedFor: e.target.value })}
                    placeholder="Client name or organization"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="additionalNotes">Additional Notes</Label>
                  <Textarea
                    id="additionalNotes"
                    value={options.additionalNotes}
                    onChange={(e) => setOptions({ ...options, additionalNotes: e.target.value })}
                    placeholder="Any additional notes to include..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-4">
            <Button onClick={handleGenerateReport} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report Preview
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Report Preview */}
      {showPreview && (
        <>
          {/* Print Controls - Hidden when printing */}
          <div className="container py-4 print:hidden">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setShowPreview(false)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Options
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print / Save as PDF
                </Button>
              </div>
            </div>
          </div>

          {/* Report Content */}
          <div ref={reportRef} className="container py-6 max-w-4xl mx-auto print:max-w-none print:py-0">
            {/* Cover Page */}
            <div className="text-center py-12 print:py-24 print:page-break-after-always">
              <h1 className="text-4xl font-bold mb-4">{options.reportTitle}</h1>
              <Separator className="my-8 mx-auto w-1/2" />
              <div className="space-y-2 text-muted-foreground">
                {options.preparedFor && (
                  <p className="text-lg">Prepared for: <span className="font-semibold text-foreground">{options.preparedFor}</span></p>
                )}
                {options.preparedBy && (
                  <p>Prepared by: {options.preparedBy}</p>
                )}
                <p>Date: {new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div className="mt-12 p-6 bg-muted/50 rounded-lg inline-block">
                <div className="grid grid-cols-2 gap-8 text-left">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Buildings</p>
                    <p className="text-2xl font-bold">{overview.totalBuildings}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Portfolio FCI</p>
                    <p className="text-2xl font-bold" style={{ color: getFCIColor(overview.portfolioFCI) }}>
                      {formatPercentage(overview.portfolioFCI)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total CRV</p>
                    <p className="text-2xl font-bold">{formatCurrency(overview.totalCurrentReplacementValue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Deferred Maintenance</p>
                    <p className="text-2xl font-bold text-red-500">{formatCurrency(overview.totalDeferredMaintenance)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            {options.includeExecutiveSummary && (
              <section className="py-8 print:page-break-after-always">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  Executive Summary
                </h2>
                <div className="prose max-w-none">
                  <p>
                    This Portfolio Condition Assessment Report provides a comprehensive analysis of {overview.totalBuildings} buildings 
                    with a combined Current Replacement Value (CRV) of {formatCurrency(overview.totalCurrentReplacementValue)}. 
                    The portfolio has an overall Facility Condition Index (FCI) of {formatPercentage(overview.portfolioFCI)}, 
                    indicating a <strong>{overview.portfolioFCIRating}</strong> overall condition.
                  </p>
                  <p>
                    The total deferred maintenance backlog is {formatCurrency(overview.totalDeferredMaintenance)}, 
                    with {overview.criticalDeficiencies} critical deficiencies requiring immediate attention. 
                    The average building age across the portfolio is {overview.averageBuildingAge} years.
                  </p>
                  <p>
                    Key findings include:
                  </p>
                  <ul>
                    <li>Immediate capital needs: {formatCurrency(overview.immediateNeeds)}</li>
                    <li>Short-term needs (1-2 years): {formatCurrency(overview.shortTermNeeds)}</li>
                    <li>Medium-term needs (3-5 years): {formatCurrency(overview.mediumTermNeeds)}</li>
                    <li>Long-term needs (5+ years): {formatCurrency(overview.longTermNeeds)}</li>
                  </ul>
                  {options.additionalNotes && (
                    <>
                      <h3>Additional Notes</h3>
                      <p>{options.additionalNotes}</p>
                    </>
                  )}
                </div>
              </section>
            )}

            {/* Portfolio Metrics */}
            {options.includePortfolioMetrics && (
              <section className="py-8 print:page-break-after-always">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-6 w-6" />
                  Portfolio Metrics & KPIs
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Total Buildings</p>
                    <p className="text-2xl font-bold">{overview.totalBuildings}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Total Assets</p>
                    <p className="text-2xl font-bold">{overview.totalAssets}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Total Assessments</p>
                    <p className="text-2xl font-bold">{overview.totalAssessments}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Total Deficiencies</p>
                    <p className="text-2xl font-bold">{overview.totalDeficiencies}</p>
                  </Card>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Metric</th>
                        <th className="text-right p-2">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-2">Portfolio FCI</td>
                        <td className="p-2 text-right font-semibold" style={{ color: getFCIColor(overview.portfolioFCI) }}>
                          {formatPercentage(overview.portfolioFCI)} ({overview.portfolioFCIRating})
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2">Total Current Replacement Value</td>
                        <td className="p-2 text-right font-semibold">{formatCurrency(overview.totalCurrentReplacementValue)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2">Total Deferred Maintenance</td>
                        <td className="p-2 text-right font-semibold text-red-500">{formatCurrency(overview.totalDeferredMaintenance)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2">Average Building Age</td>
                        <td className="p-2 text-right font-semibold">{overview.averageBuildingAge} years</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2">Average Condition Rating</td>
                        <td className="p-2 text-right font-semibold" style={{ color: getConditionColor(overview.averageConditionRating) }}>
                          {overview.averageConditionRating}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2">Critical Deficiencies</td>
                        <td className="p-2 text-right font-semibold text-red-500">{overview.criticalDeficiencies}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Building Breakdown */}
            {options.includeBuildingBreakdown && (
              <section className="py-8 print:page-break-after-always">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Building2 className="h-6 w-6" />
                  Building-by-Building Breakdown
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2">Building</th>
                        <th className="text-right p-2">FCI</th>
                        <th className="text-right p-2">Condition</th>
                        <th className="text-right p-2">CRV</th>
                        <th className="text-right p-2">Deferred Maint.</th>
                        <th className="text-right p-2">Deficiencies</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buildings.map((building) => (
                        <tr key={building.projectId} className="border-b">
                          <td className="p-2">
                            <div>
                              <p className="font-medium">{building.projectName}</p>
                              <p className="text-xs text-muted-foreground">
                                {building.city && building.province ? `${building.city}, ${building.province}` : building.address || ''}
                              </p>
                            </div>
                          </td>
                          <td className="p-2 text-right">
                            <span style={{ color: getFCIColor(building.fci) }} className="font-semibold">
                              {formatPercentage(building.fci)}
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            <span style={{ color: getConditionColor(building.conditionRating) }}>
                              {building.conditionRating}
                            </span>
                          </td>
                          <td className="p-2 text-right">{formatCurrency(building.currentReplacementValue)}</td>
                          <td className="p-2 text-right text-red-500">{formatCurrency(building.deferredMaintenanceCost)}</td>
                          <td className="p-2 text-right">{building.deficiencyCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Category Analysis */}
            {options.includeCategoryAnalysis && (
              <section className="py-8 print:page-break-after-always">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <DollarSign className="h-6 w-6" />
                  UNIFORMAT Category Analysis
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2">Category</th>
                        <th className="text-right p-2">Repair Cost</th>
                        <th className="text-right p-2">Replacement Value</th>
                        <th className="text-right p-2">FCI</th>
                        <th className="text-right p-2">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryCostBreakdown.map((cat) => (
                        <tr key={cat.categoryCode} className="border-b">
                          <td className="p-2">
                            <span className="font-medium">{cat.categoryName}</span>
                            <span className="text-xs text-muted-foreground ml-2">({cat.categoryCode})</span>
                          </td>
                          <td className="p-2 text-right">{formatCurrency(cat.totalRepairCost)}</td>
                          <td className="p-2 text-right">{formatCurrency(cat.totalReplacementValue)}</td>
                          <td className="p-2 text-right">
                            <span style={{ color: getFCIColor(cat.fci) }} className="font-semibold">
                              {formatPercentage(cat.fci)}
                            </span>
                          </td>
                          <td className="p-2 text-right">{cat.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Capital Forecast */}
            {options.includeCapitalForecast && (
              <section className="py-8 print:page-break-after-always">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Calendar className="h-6 w-6" />
                  5-Year Capital Planning Forecast
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2">Year</th>
                        <th className="text-right p-2">Immediate</th>
                        <th className="text-right p-2">Short-Term</th>
                        <th className="text-right p-2">Medium-Term</th>
                        <th className="text-right p-2">Long-Term</th>
                        <th className="text-right p-2">Annual Total</th>
                        <th className="text-right p-2">Cumulative</th>
                      </tr>
                    </thead>
                    <tbody>
                      {capitalForecast.map((year) => (
                        <tr key={year.year} className="border-b">
                          <td className="p-2 font-medium">{year.year}</td>
                          <td className="p-2 text-right">{formatCurrency(year.immediateNeeds)}</td>
                          <td className="p-2 text-right">{formatCurrency(year.shortTermNeeds)}</td>
                          <td className="p-2 text-right">{formatCurrency(year.mediumTermNeeds)}</td>
                          <td className="p-2 text-right">{formatCurrency(year.longTermNeeds)}</td>
                          <td className="p-2 text-right font-semibold">{formatCurrency(year.totalProjectedCost)}</td>
                          <td className="p-2 text-right font-semibold">{formatCurrency(year.cumulativeCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Priority Recommendations */}
            {options.includePriorityRecommendations && (
              <section className="py-8 print:page-break-after-always">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6" />
                  Priority Recommendations
                </h2>
                <div className="space-y-4">
                  {priorityBreakdown.map((priority) => (
                    <Card key={priority.priority} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold capitalize">{priority.priority.replace('_', ' ')} Priority</h3>
                        <span className="text-lg font-bold">{formatCurrency(priority.totalCost)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {priority.count} deficiencies ({priority.percentage}% of total cost)
                      </p>
                      {priority.buildings.length > 0 && (
                        <p className="text-sm mt-2">
                          <span className="text-muted-foreground">Affected buildings: </span>
                          {priority.buildings.join(', ')}
                        </p>
                      )}
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Geographic Analysis */}
            {options.includeGeographicAnalysis && geographicDistribution.length > 0 && (
              <section className="py-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Building2 className="h-6 w-6" />
                  Geographic Distribution
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2">Location</th>
                        <th className="text-right p-2">Buildings</th>
                        <th className="text-right p-2">Total CRV</th>
                        <th className="text-right p-2">Deferred Maint.</th>
                        <th className="text-right p-2">Avg FCI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {geographicDistribution.map((loc) => (
                        <tr key={`${loc.city}-${loc.province}`} className="border-b">
                          <td className="p-2 font-medium">{loc.city}, {loc.province}</td>
                          <td className="p-2 text-right">{loc.buildingCount}</td>
                          <td className="p-2 text-right">{formatCurrency(loc.totalCRV)}</td>
                          <td className="p-2 text-right text-red-500">{formatCurrency(loc.totalDeferredMaintenance)}</td>
                          <td className="p-2 text-right">
                            <span style={{ color: getFCIColor(loc.averageFCI) }} className="font-semibold">
                              {formatPercentage(loc.averageFCI)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Footer */}
            <footer className="py-8 text-center text-sm text-muted-foreground border-t mt-8">
              <p>Report generated on {new Date().toLocaleString()}</p>
              <p>This report is for informational purposes only.</p>
            </footer>
          </div>
        </>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:page-break-after-always {
            page-break-after: always;
          }
          .print\\:py-0 {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          .print\\:py-24 {
            padding-top: 6rem !important;
            padding-bottom: 6rem !important;
          }
          .print\\:max-w-none {
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  );
}
