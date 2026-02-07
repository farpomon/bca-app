import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  FileText, Download, Building2, ArrowLeft, Loader2,
  AlertCircle, Info, CheckCircle, DollarSign, Calendar
} from "lucide-react";
import { Link } from "wouter";
import { generateEnhancedPDF, type EnhancedReportData } from "@/utils/enhancedPdfGenerator";
import { toast } from "sonner";

// Section definitions
const REPORT_SECTIONS = [
  { key: "executiveSummary", label: "Executive Summary", description: "FCI, condition ratings, and key metrics" },
  { key: "componentAssessments", label: "Component Assessments", description: "Detailed component-by-component analysis" },
  { key: "actionList", label: "Action List", description: "Prioritized list of recommended actions" },
  { key: "capitalForecast", label: "Capital Forecast", description: "Multi-year capital planning projection" },
  { key: "uniformatBreakdown", label: "UNIFORMAT Breakdown", description: "Cost analysis by building system category" },
  { key: "priorityMatrix", label: "Priority Matrix", description: "Distribution of items by priority level" },
] as const;

type SectionKey = typeof REPORT_SECTIONS[number]["key"];

export default function SingleAssetReport() {
  const { user, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();

  // State
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [reportTitle, setReportTitle] = useState("Building Condition Assessment Report");
  const [preparedBy, setPreparedBy] = useState("");
  const [preparedFor, setPreparedFor] = useState("");
  const [revision, setRevision] = useState("A");
  const [planningHorizon, setPlanningHorizon] = useState(20);
  const [sections, setSections] = useState<Record<SectionKey, boolean>>({
    executiveSummary: true,
    componentAssessments: true,
    actionList: true,
    capitalForecast: true,
    uniformatBreakdown: true,
    priorityMatrix: true,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ stage: "", progress: 0 });

  // Fetch assets for dropdown
  const { data: assets, isLoading: assetsLoading } = trpc.singleAssetReport.getAssets.useQuery();

  // Find selected asset info
  const selectedAsset = useMemo(() => {
    if (!selectedAssetId || !assets) return null;
    return assets.find(a => a.id === selectedAssetId) || null;
  }, [selectedAssetId, assets]);

  // Toggle section
  const toggleSection = (key: SectionKey) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Select all / clear all
  const selectAll = () => {
    const all: Record<string, boolean> = {};
    REPORT_SECTIONS.forEach(s => { all[s.key] = true; });
    setSections(all as any);
  };
  const clearAll = () => {
    const none: Record<string, boolean> = {};
    REPORT_SECTIONS.forEach(s => { none[s.key] = false; });
    setSections(none as any);
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!selectedAssetId) {
      toast.error("Please select an asset first");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress({ stage: "Fetching asset data...", progress: 10 });

    try {
      // Fetch all data from the dedicated single-asset endpoint
      const reportData = await utils.singleAssetReport.getReportData.fetch({
        assetId: selectedAssetId,
        includePhotos: sections.componentAssessments,
        maxPhotosPerComponent: 4,
      });

      setGenerationProgress({ stage: "Building report...", progress: 40 });

      const assetName = reportData.asset.name || "Unknown Asset";

      // Map server data directly to EnhancedReportData
      const pdfData: EnhancedReportData = {
        config: {
          reportTitle: reportTitle || `BCA Report - ${assetName}`,
          preparedBy: preparedBy || user?.name || "",
          preparedFor: preparedFor || reportData.asset.clientName || "",
          reportDate: new Date().toISOString(),
          projectName: assetName,
          clientName: reportData.asset.clientName || "",
          clientAddress: reportData.asset.address || "",
          includeExecutiveSummary: sections.executiveSummary,
          includeAssetOverview: true,
          includeComponentAssessments: sections.componentAssessments,
          includeActionList: sections.actionList,
          includeCapitalForecast: sections.capitalForecast,
          includePriorityMatrix: sections.priorityMatrix,
          includeUniformatBreakdown: sections.uniformatBreakdown,
          includePhotoAppendix: false,
          componentGrouping: "uniformat_building",
          displayLevel: "L3",
          includePhotos: sections.componentAssessments,
          maxPhotosPerComponent: 4,
          showCostFields: true,
          showActionDetails: true,
          includeRollups: true,
          actionYearHorizon: planningHorizon,
        },
        summary: reportData.summary,
        assetMetrics: reportData.assetMetrics,
        components: reportData.components,
        actionList: reportData.actionList,
        uniformatSummary: reportData.uniformatSummary,
        capitalForecast: reportData.capitalForecast,
        priorityMatrix: reportData.priorityMatrix,
      };

      setGenerationProgress({ stage: "Generating PDF...", progress: 60 });

      await generateEnhancedPDF(pdfData, (stage, progress) => {
        setGenerationProgress({ stage, progress: 60 + progress * 0.4 });
      });

      toast.success("PDF report downloaded successfully");
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate PDF report");
    } finally {
      setIsGenerating(false);
      setGenerationProgress({ stage: "", progress: 0 });
    }
  };

  // Loading state
  if (authLoading || assetsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No assets
  if (!assets || assets.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-lg">No assets available for report generation</p>
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

  const enabledSectionCount = Object.values(sections).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
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
                <h1 className="text-xl font-semibold">Generate Single Asset Report</h1>
                <p className="text-sm text-muted-foreground">
                  Create a detailed BCA report for a specific building (PDF)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleDownloadPDF}
                disabled={!selectedAssetId || isGenerating || enabledSectionCount === 0}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isGenerating ? "Generating..." : "Download PDF"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Generation Progress */}
      {isGenerating && (
        <div className="border-b bg-blue-50">
          <div className="container py-3">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm text-blue-700">{generationProgress.stage}</span>
              <Progress value={generationProgress.progress} className="flex-1 h-2" />
              <span className="text-sm font-medium text-blue-700">{Math.round(generationProgress.progress)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container py-6 space-y-6">
        {/* Asset Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Asset Selection <span className="text-red-500">*</span>
            </CardTitle>
            <CardDescription>Select the building to generate a report for</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedAssetId ? String(selectedAssetId) : ""}
              onValueChange={(val) => setSelectedAssetId(Number(val))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an asset..." />
              </SelectTrigger>
              <SelectContent>
                {assets.map(asset => (
                  <SelectItem key={asset.id} value={String(asset.id)}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{asset.name || `Asset #${asset.id}`}</span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {asset.assessmentCount} assessments
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Selected asset info */}
            {selectedAsset && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Building</p>
                    <p className="text-sm font-medium">{selectedAsset.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Year Built</p>
                    <p className="text-sm font-medium">{selectedAsset.yearBuilt || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Replacement Value</p>
                    <p className="text-sm font-medium">
                      {selectedAsset.replacementValue
                        ? `$${(selectedAsset.replacementValue / 1_000_000).toFixed(1)}M`
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Assessments</p>
                    <p className="text-sm font-medium">{selectedAsset.assessmentCount}</p>
                  </div>
                </div>
              </div>
            )}

            {!selectedAssetId && (
              <p className="mt-2 text-sm text-amber-600 flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />
                Please select an asset to generate a report
              </p>
            )}
          </CardContent>
        </Card>

        {/* Report Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Report Settings
            </CardTitle>
            <CardDescription>Configure report metadata and options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reportTitle">Report Title</Label>
                <Input
                  id="reportTitle"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="Building Condition Assessment Report"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preparedBy">Prepared By</Label>
                <Input
                  id="preparedBy"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  placeholder={user?.name || "Your name"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preparedFor">Prepared For</Label>
                <Input
                  id="preparedFor"
                  value={preparedFor}
                  onChange={(e) => setPreparedFor(e.target.value)}
                  placeholder="Client name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="revision">Revision</Label>
                <Input
                  id="revision"
                  value={revision}
                  onChange={(e) => setRevision(e.target.value)}
                  placeholder="A"
                  className="w-24"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="planningHorizon">Capital Planning Horizon</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="planningHorizon"
                    type="number"
                    min={5}
                    max={30}
                    value={planningHorizon}
                    onChange={(e) => setPlanningHorizon(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">years</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Sections */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  Report Sections
                </CardTitle>
                <CardDescription>Select which sections to include in your report</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
                <Button variant="outline" size="sm" onClick={clearAll}>Clear All</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {REPORT_SECTIONS.map(section => (
                <label
                  key={section.key}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    sections[section.key]
                      ? "bg-blue-50 border-blue-200"
                      : "bg-background border-border hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    checked={sections[section.key]}
                    onCheckedChange={() => toggleSection(section.key)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">{section.label}</p>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {enabledSectionCount === 0 && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select at least one section to generate a report
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Summary Info */}
        {selectedAsset && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                Report Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Building2 className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                  <p className="text-lg font-semibold">1</p>
                  <p className="text-xs text-muted-foreground">Asset</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <FileText className="h-5 w-5 mx-auto mb-1 text-green-600" />
                  <p className="text-lg font-semibold">{selectedAsset.assessmentCount}</p>
                  <p className="text-xs text-muted-foreground">Components</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <CheckCircle className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                  <p className="text-lg font-semibold">{enabledSectionCount}</p>
                  <p className="text-xs text-muted-foreground">Sections</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-5 w-5 mx-auto mb-1 text-orange-600" />
                  <p className="text-lg font-semibold">{planningHorizon}</p>
                  <p className="text-xs text-muted-foreground">Year Horizon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
