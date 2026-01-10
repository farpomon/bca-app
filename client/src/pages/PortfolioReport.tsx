import { useState, useRef, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  ChevronDown,
  ChevronRight,
  Eye,
  FileDown,
  Upload,
  Image,
  AlertCircle,
  Info,
  RefreshCw,
  Clock,
  Settings,
  Sparkles,
  FileCheck,
  Layers,
  MapPin,
  BookOpen,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

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

// Section categories
const SECTION_CATEGORIES = {
  executive: {
    label: "Executive & Overview",
    icon: FileText,
    sections: [
      { key: "includeExecutiveSummary", label: "Executive Summary", description: "Portfolio overview, key risks, recommendations" },
      { key: "includePortfolioMetrics", label: "Portfolio KPIs", description: "Key performance indicators and metrics" },
    ]
  },
  asset: {
    label: "Asset & Condition Detail",
    icon: Building2,
    sections: [
      { key: "includeBuildingBreakdown", label: "Building-by-Building", description: "Detailed breakdown per building" },
      { key: "includeCategoryAnalysis", label: "UNIFORMAT Analysis", description: "Category-level cost analysis" },
    ]
  },
  capital: {
    label: "Capital Planning",
    icon: DollarSign,
    sections: [
      { key: "includeCapitalForecast", label: "Capital Forecast", description: "Year-by-year spending projections" },
      { key: "includePriorityRecommendations", label: "Priority Recommendations", description: "Ranked project list with timing" },
    ]
  },
  appendices: {
    label: "Optional Appendices",
    icon: BookOpen,
    sections: [
      { key: "includeGeographicAnalysis", label: "Geographic Distribution", description: "Location-based analysis" },
      { key: "includeAssumptions", label: "Assumptions", description: "Cost escalation, methodology notes" },
      { key: "includeGlossary", label: "Glossary", description: "Terms and definitions" },
    ]
  }
};

// Presets
const PRESETS = {
  recommended: {
    label: "Recommended",
    description: "Standard client deliverable (~12-18 pages)",
    icon: Sparkles,
    sections: {
      includeExecutiveSummary: true,
      includePortfolioMetrics: true,
      includeBuildingBreakdown: true,
      includeCategoryAnalysis: true,
      includeCapitalForecast: true,
      includePriorityRecommendations: true,
      includeGeographicAnalysis: false,
      includeAssumptions: false,
      includeGlossary: false,
    }
  },
  minimal: {
    label: "Minimal Executive",
    description: "Brief summary for executives (~3-5 pages)",
    icon: FileCheck,
    sections: {
      includeExecutiveSummary: true,
      includePortfolioMetrics: true,
      includeBuildingBreakdown: false,
      includeCategoryAnalysis: false,
      includeCapitalForecast: false,
      includePriorityRecommendations: true,
      includeGeographicAnalysis: false,
      includeAssumptions: false,
      includeGlossary: false,
    }
  },
  full: {
    label: "Full Technical",
    description: "Complete detail with appendices (~25-40 pages)",
    icon: Layers,
    sections: {
      includeExecutiveSummary: true,
      includePortfolioMetrics: true,
      includeBuildingBreakdown: true,
      includeCategoryAnalysis: true,
      includeCapitalForecast: true,
      includePriorityRecommendations: true,
      includeGeographicAnalysis: true,
      includeAssumptions: true,
      includeGlossary: true,
    }
  }
};

interface ReportOptions {
  includeExecutiveSummary: boolean;
  includePortfolioMetrics: boolean;
  includeBuildingBreakdown: boolean;
  includeCategoryAnalysis: boolean;
  includeCapitalForecast: boolean;
  includePriorityRecommendations: boolean;
  includeGeographicAnalysis: boolean;
  includeAssumptions: boolean;
  includeGlossary: boolean;
  reportTitle: string;
  preparedBy: string;
  preparedFor: string;
  additionalNotes: string;
  companyLogo: string | null;
  clientLogo: string | null;
  footerText: string;
}

interface ValidationErrors {
  reportTitle?: string;
  preparedBy?: string;
  preparedFor?: string;
}

export default function PortfolioReport() {
  const { user, loading: authLoading } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTimestamp, setPreviewTimestamp] = useState<Date | null>(null);
  const [dataChangedSincePreview, setDataChangedSincePreview] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    executive: true,
    asset: true,
    capital: true,
    appendices: false,
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [activePreset, setActivePreset] = useState<string | null>("recommended");
  
  const [options, setOptions] = useState<ReportOptions>({
    ...PRESETS.recommended.sections,
    reportTitle: "Portfolio Condition Assessment Report",
    preparedBy: user?.name || "",
    preparedFor: "",
    additionalNotes: "",
    companyLogo: null,
    clientLogo: null,
    footerText: "CONFIDENTIAL - For internal use only",
  });

  // Fetch analytics data
  const { data: dashboardData, isLoading, dataUpdatedAt } = trpc.portfolioAnalytics.getDashboardData.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Fetch full building comparison
  const { data: allBuildings } = trpc.portfolioAnalytics.getBuildingComparison.useQuery(
    { sortBy: 'priorityScore', sortOrder: 'desc', limit: 100 },
    { enabled: !!user && showPreview }
  );

  // Check if data changed since preview
  useMemo(() => {
    if (previewTimestamp && dataUpdatedAt) {
      setDataChangedSincePreview(new Date(dataUpdatedAt) > previewTimestamp);
    }
  }, [dataUpdatedAt, previewTimestamp]);

  // Estimate page count based on selections
  const estimatedPages = useMemo(() => {
    let pages = 1; // Cover page
    if (options.includeExecutiveSummary) pages += 2;
    if (options.includePortfolioMetrics) pages += 2;
    if (options.includeBuildingBreakdown) pages += Math.ceil((dashboardData?.buildingComparison?.length || 0) / 3) + 1;
    if (options.includeCategoryAnalysis) pages += 2;
    if (options.includeCapitalForecast) pages += 2;
    if (options.includePriorityRecommendations) pages += 2;
    if (options.includeGeographicAnalysis) pages += 1;
    if (options.includeAssumptions) pages += 1;
    if (options.includeGlossary) pages += 1;
    return { min: Math.max(3, pages - 3), max: pages + 3 };
  }, [options, dashboardData]);

  // Validation
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    if (!options.reportTitle.trim()) {
      errors.reportTitle = "Report title is required";
    }
    if (!options.preparedBy.trim()) {
      errors.preparedBy = "Prepared by is required";
    }
    if (!options.preparedFor.trim()) {
      errors.preparedFor = "Prepared for is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Data validation
  const dataValidation = useMemo(() => {
    const issues: { section: string; message: string; severity: "error" | "warning" }[] = [];
    
    if (!dashboardData?.overview?.totalBuildings || dashboardData.overview.totalBuildings === 0) {
      issues.push({
        section: "Portfolio",
        message: "No buildings found in portfolio. Upload assessment data to generate a report.",
        severity: "error"
      });
    }

    if (options.includeCategoryAnalysis && (!dashboardData?.categoryCostBreakdown || dashboardData.categoryCostBreakdown.length === 0)) {
      issues.push({
        section: "UNIFORMAT Analysis",
        message: "No category data available. This section will be empty.",
        severity: "warning"
      });
    }

    if (options.includeCapitalForecast && (!dashboardData?.capitalForecast || dashboardData.capitalForecast.length === 0)) {
      issues.push({
        section: "Capital Forecast",
        message: "No capital planning data available. Consider creating a planning cycle first.",
        severity: "warning"
      });
    }

    if (options.includeGeographicAnalysis && (!dashboardData?.geographicDistribution || dashboardData.geographicDistribution.length === 0)) {
      issues.push({
        section: "Geographic Distribution",
        message: "No location data available for geographic analysis.",
        severity: "warning"
      });
    }

    return issues;
  }, [dashboardData, options]);

  const hasBlockingErrors = dataValidation.some(v => v.severity === "error");

  const handlePrint = () => {
    window.print();
  };

  const handleGeneratePreview = async () => {
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (hasBlockingErrors) {
      toast.error("Cannot generate report due to missing data");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    // Simulate generation time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    clearInterval(progressInterval);
    setGenerationProgress(100);
    
    setTimeout(() => {
      setShowPreview(true);
      setPreviewTimestamp(new Date());
      setDataChangedSincePreview(false);
      setIsGenerating(false);
      setGenerationProgress(0);
      toast.success("Preview generated successfully");
    }, 300);
  };

  const handleExportPDF = () => {
    window.print();
    toast.success("Use your browser's print dialog to save as PDF");
  };

  const handleRefreshPreview = () => {
    setShowPreview(false);
    setTimeout(() => {
      handleGeneratePreview();
    }, 100);
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey as keyof typeof PRESETS];
    if (preset) {
      setOptions(prev => ({
        ...prev,
        ...preset.sections
      }));
      setActivePreset(presetKey);
      toast.success(`Applied "${preset.label}" preset`);
    }
  };

  const handleSectionToggle = (key: string, checked: boolean) => {
    setOptions(prev => ({ ...prev, [key]: checked }));
    setActivePreset(null); // Clear preset when manually changing
  };

  const selectAll = () => {
    const allSections = Object.values(SECTION_CATEGORIES).flatMap(cat => cat.sections.map(s => s.key));
    const updates = allSections.reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setOptions(prev => ({ ...prev, ...updates }));
    setActivePreset(null);
  };

  const clearAll = () => {
    const allSections = Object.values(SECTION_CATEGORIES).flatMap(cat => cat.sections.map(s => s.key));
    const updates = allSections.reduce((acc, key) => ({ ...acc, [key]: false }), {});
    setOptions(prev => ({ ...prev, ...updates }));
    setActivePreset(null);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-lg">No data available for report generation</p>
        <p className="text-sm text-muted-foreground">Upload assessment data to get started</p>
        <Link href="/portfolio-analytics">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Analytics
          </Button>
        </Link>
      </div>
    );
  }

  const { overview, categoryCostBreakdown, priorityBreakdown, capitalForecast, geographicDistribution } = dashboardData;
  const buildings = allBuildings || dashboardData.buildingComparison;

  return (
    <div className="min-h-screen bg-background">
      {/* Configuration Panel - Hidden when printing */}
      {!showPreview && (
        <div className="print:hidden">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="container py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link href="/portfolio-analytics">
                    <Button variant="ghost" size="sm">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Analytics
                    </Button>
                  </Link>
                  <Separator orientation="vertical" className="h-6" />
                  <div>
                    <h1 className="text-xl font-semibold">Generate Portfolio Report</h1>
                    <p className="text-sm text-muted-foreground">
                      Create a professional portfolio condition assessment report (PDF)
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleGeneratePreview} 
                  disabled={isGenerating || hasBlockingErrors}
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Generate Preview
                    </>
                  )}
                </Button>
              </div>
              {isGenerating && (
                <Progress value={generationProgress} className="mt-3 h-1" />
              )}
            </div>
          </div>

          <div className="container py-6">
            {/* Data Validation Alerts */}
            {dataValidation.length > 0 && (
              <div className="mb-6 space-y-2">
                {dataValidation.map((issue, i) => (
                  <Alert key={i} variant={issue.severity === "error" ? "destructive" : "default"}>
                    {issue.severity === "error" ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertTitle>{issue.section}</AlertTitle>
                    <AlertDescription>{issue.message}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Report Sections Panel */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Report Sections</CardTitle>
                        <CardDescription>Select which sections to include in your report</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={selectAll}>
                          Select All
                        </Button>
                        <Button variant="outline" size="sm" onClick={clearAll}>
                          Clear All
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {/* Presets */}
                    <div className="flex flex-wrap gap-2 pb-4 border-b">
                      {Object.entries(PRESETS).map(([key, preset]) => {
                        const Icon = preset.icon;
                        return (
                          <Button
                            key={key}
                            variant={activePreset === key ? "default" : "outline"}
                            size="sm"
                            onClick={() => applyPreset(key)}
                            className="gap-2"
                          >
                            <Icon className="h-4 w-4" />
                            {preset.label}
                          </Button>
                        );
                      })}
                    </div>

                    {/* Section Categories */}
                    {Object.entries(SECTION_CATEGORIES).map(([catKey, category]) => {
                      const Icon = category.icon;
                      const isExpanded = expandedCategories[catKey];
                      const selectedCount = category.sections.filter(s => options[s.key as keyof ReportOptions]).length;

                      return (
                        <Collapsible key={catKey} open={isExpanded} onOpenChange={() => toggleCategory(catKey)}>
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                              <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                <span className="font-medium">{category.label}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {selectedCount}/{category.sections.length}
                                </Badge>
                              </div>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="pl-8 pr-3 pb-3 space-y-2">
                              {category.sections.map((section) => (
                                <div key={section.key} className="flex items-start space-x-3 p-2 rounded hover:bg-muted/30">
                                  <Checkbox
                                    id={section.key}
                                    checked={options[section.key as keyof ReportOptions] as boolean}
                                    onCheckedChange={(checked) => handleSectionToggle(section.key, !!checked)}
                                  />
                                  <div className="flex-1">
                                    <Label htmlFor={section.key} className="cursor-pointer font-medium">
                                      {section.label}
                                    </Label>
                                    <p className="text-xs text-muted-foreground">{section.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}

                    {/* Estimated Length */}
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>Estimated length: ~{estimatedPages.min}-{estimatedPages.max} pages</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Report Details Panel */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Report Details</CardTitle>
                    <CardDescription>Required information for your report</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reportTitle">
                        Report Title <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="reportTitle"
                        value={options.reportTitle}
                        onChange={(e) => setOptions({ ...options, reportTitle: e.target.value })}
                        className={validationErrors.reportTitle ? "border-destructive" : ""}
                      />
                      {validationErrors.reportTitle && (
                        <p className="text-xs text-destructive">{validationErrors.reportTitle}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preparedBy">
                        Prepared By <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="preparedBy"
                        value={options.preparedBy}
                        onChange={(e) => setOptions({ ...options, preparedBy: e.target.value })}
                        className={validationErrors.preparedBy ? "border-destructive" : ""}
                      />
                      {validationErrors.preparedBy && (
                        <p className="text-xs text-destructive">{validationErrors.preparedBy}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preparedFor">
                        Prepared For <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="preparedFor"
                        value={options.preparedFor}
                        onChange={(e) => setOptions({ ...options, preparedFor: e.target.value })}
                        placeholder="Client name or organization"
                        className={validationErrors.preparedFor ? "border-destructive" : ""}
                      />
                      {validationErrors.preparedFor && (
                        <p className="text-xs text-destructive">{validationErrors.preparedFor}</p>
                      )}
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

                {/* Branding Options */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Branding (Optional)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="footerText">Footer Text</Label>
                      <Input
                        id="footerText"
                        value={options.footerText}
                        onChange={(e) => setOptions({ ...options, footerText: e.target.value })}
                        placeholder="Confidentiality notice"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Logo upload coming soon
                    </div>
                  </CardContent>
                </Card>

                {/* Data Snapshot */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Data as of:</span>
                      <span className="font-medium">
                        {new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Preview */}
      {showPreview && (
        <>
          {/* Preview Controls - Hidden when printing */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b print:hidden">
            <div className="container py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Options
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Eye className="h-3 w-3" />
                      DRAFT PREVIEW
                    </Badge>
                    {previewTimestamp && (
                      <span className="text-xs text-muted-foreground">
                        Generated {previewTimestamp.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {dataChangedSincePreview && (
                    <Button variant="outline" size="sm" onClick={handleRefreshPreview}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Preview
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                  <Button size="sm" onClick={handleExportPDF}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                </div>
              </div>
              {dataChangedSincePreview && (
                <Alert className="mt-3" variant="default">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Data has been updated since this preview was generated. Click "Refresh Preview" to see the latest data.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Report Content */}
          <div ref={reportRef} className="container py-6 max-w-4xl mx-auto print:max-w-none print:py-0">
            {/* Draft Watermark - Only in preview */}
            <div className="fixed inset-0 pointer-events-none print:hidden flex items-center justify-center z-0">
              <span className="text-[120px] font-bold text-muted-foreground/5 rotate-[-30deg] select-none">
                DRAFT
              </span>
            </div>

            {/* Cover Page */}
            <div className="relative text-center py-12 print:py-24 print:page-break-after-always">
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

            {/* Table of Contents */}
            <section className="py-8 print:page-break-after-always">
              <h2 className="text-2xl font-bold mb-6">Table of Contents</h2>
              <div className="space-y-2">
                {options.includeExecutiveSummary && (
                  <div className="flex items-center justify-between py-2 border-b border-dotted">
                    <span>1. Executive Summary</span>
                    <span className="text-muted-foreground">2</span>
                  </div>
                )}
                {options.includePortfolioMetrics && (
                  <div className="flex items-center justify-between py-2 border-b border-dotted">
                    <span>2. Portfolio Metrics & KPIs</span>
                    <span className="text-muted-foreground">4</span>
                  </div>
                )}
                {options.includeBuildingBreakdown && (
                  <div className="flex items-center justify-between py-2 border-b border-dotted">
                    <span>3. Building-by-Building Breakdown</span>
                    <span className="text-muted-foreground">6</span>
                  </div>
                )}
                {options.includeCategoryAnalysis && (
                  <div className="flex items-center justify-between py-2 border-b border-dotted">
                    <span>4. UNIFORMAT Category Analysis</span>
                    <span className="text-muted-foreground">10</span>
                  </div>
                )}
                {options.includeCapitalForecast && (
                  <div className="flex items-center justify-between py-2 border-b border-dotted">
                    <span>5. Capital Planning Forecast</span>
                    <span className="text-muted-foreground">12</span>
                  </div>
                )}
                {options.includePriorityRecommendations && (
                  <div className="flex items-center justify-between py-2 border-b border-dotted">
                    <span>6. Priority Recommendations</span>
                    <span className="text-muted-foreground">14</span>
                  </div>
                )}
                {options.includeGeographicAnalysis && (
                  <div className="flex items-center justify-between py-2 border-b border-dotted">
                    <span>7. Geographic Distribution</span>
                    <span className="text-muted-foreground">16</span>
                  </div>
                )}
              </div>
            </section>

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
                  
                  <h3>Key Findings</h3>
                  <ul>
                    <li><strong>Immediate capital needs:</strong> {formatCurrency(overview.immediateNeeds)}</li>
                    <li><strong>Short-term needs (1-2 years):</strong> {formatCurrency(overview.shortTermNeeds)}</li>
                    <li><strong>Medium-term needs (3-5 years):</strong> {formatCurrency(overview.mediumTermNeeds)}</li>
                    <li><strong>Long-term needs (5+ years):</strong> {formatCurrency(overview.longTermNeeds)}</li>
                  </ul>

                  <h3>Top Risks and Consequences of Deferral</h3>
                  <p>
                    Deferring maintenance on critical systems poses significant risks including potential safety hazards, 
                    accelerated deterioration of building components, increased repair costs over time, and potential 
                    regulatory compliance issues. The {overview.criticalDeficiencies} critical deficiencies identified 
                    should be addressed within the next 12 months to mitigate these risks.
                  </p>

                  <h3>Key Recommendations</h3>
                  <ol>
                    <li>Address all critical deficiencies within the next fiscal year</li>
                    <li>Establish a sustainable capital renewal program targeting 2-3% of CRV annually</li>
                    <li>Prioritize buildings with FCI above 30% for comprehensive renewal</li>
                    <li>Implement preventive maintenance programs to extend asset lifecycles</li>
                  </ol>

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
                        <th className="text-right p-2">Age</th>
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
                            <span className="text-sm">
                              {building.buildingAge ? `${building.buildingAge} yrs` : 'N/A'}
                            </span>
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
            {options.includeCategoryAnalysis && categoryCostBreakdown && categoryCostBreakdown.length > 0 && (
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
            {options.includeCapitalForecast && capitalForecast && capitalForecast.length > 0 && (
              <section className="py-8 print:page-break-after-always">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Calendar className="h-6 w-6" />
                  Capital Planning Forecast
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
            {options.includePriorityRecommendations && priorityBreakdown && priorityBreakdown.length > 0 && (
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
            {options.includeGeographicAnalysis && geographicDistribution && geographicDistribution.length > 0 && (
              <section className="py-8 print:page-break-after-always">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <MapPin className="h-6 w-6" />
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

            {/* Assumptions */}
            {options.includeAssumptions && (
              <section className="py-8 print:page-break-after-always">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Settings className="h-6 w-6" />
                  Assumptions & Methodology
                </h2>
                <div className="prose max-w-none">
                  <h3>Cost Escalation</h3>
                  <p>
                    All cost estimates are presented in current-year dollars. Future year projections 
                    assume an annual cost escalation rate of 3% to account for inflation and market conditions.
                  </p>
                  
                  <h3>Assessment Methodology</h3>
                  <p>
                    Building condition assessments were conducted following industry-standard practices 
                    including visual inspections, review of maintenance records, and evaluation of 
                    building systems against expected service life benchmarks.
                  </p>
                  
                  <h3>FCI Calculation</h3>
                  <p>
                    The Facility Condition Index (FCI) is calculated as the ratio of deferred maintenance 
                    costs to current replacement value, expressed as a percentage. Lower FCI values 
                    indicate better condition.
                  </p>
                  
                  <h3>Limitations</h3>
                  <ul>
                    <li>Estimates are based on visual assessments and may not reflect hidden conditions</li>
                    <li>Actual costs may vary based on market conditions at time of procurement</li>
                    <li>Priority recommendations are based on current information and may need adjustment</li>
                  </ul>
                </div>
              </section>
            )}

            {/* Glossary */}
            {options.includeGlossary && (
              <section className="py-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <BookOpen className="h-6 w-6" />
                  Glossary
                </h2>
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <p className="font-semibold">FCI (Facility Condition Index)</p>
                    <p className="text-sm text-muted-foreground">
                      A ratio of deferred maintenance to current replacement value, expressed as a percentage. 
                      Lower values indicate better condition.
                    </p>
                  </div>
                  <div className="border-b pb-2">
                    <p className="font-semibold">CRV (Current Replacement Value)</p>
                    <p className="text-sm text-muted-foreground">
                      The estimated cost to replace a building or asset with a similar one at current prices.
                    </p>
                  </div>
                  <div className="border-b pb-2">
                    <p className="font-semibold">Deferred Maintenance</p>
                    <p className="text-sm text-muted-foreground">
                      Maintenance work that has been postponed to a future period, typically due to budget constraints.
                    </p>
                  </div>
                  <div className="border-b pb-2">
                    <p className="font-semibold">UNIFORMAT</p>
                    <p className="text-sm text-muted-foreground">
                      A standard classification system for building elements used in construction cost estimating.
                    </p>
                  </div>
                  <div className="border-b pb-2">
                    <p className="font-semibold">Condition Rating</p>
                    <p className="text-sm text-muted-foreground">
                      Good (0-5% FCI): Minimal deficiencies, routine maintenance only. 
                      Fair (5-10% FCI): Some deficiencies, planned repairs needed. 
                      Poor (10-30% FCI): Significant deficiencies, major repairs required. 
                      Critical (&gt;30% FCI): Extensive deficiencies, replacement may be warranted.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Footer */}
            <footer className="py-8 text-center text-sm text-muted-foreground border-t mt-8">
              <p>{options.footerText}</p>
              <p className="mt-2">Report generated on {new Date().toLocaleString()}</p>
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
          @page {
            margin: 1in;
            size: letter;
          }
        }
      `}</style>
    </div>
  );
}
