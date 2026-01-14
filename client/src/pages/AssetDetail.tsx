import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  Building2, 
  Loader2, 
  ClipboardCheck, 
  Download, 
  TrendingUp,
  Target,
  DollarSign,
  AlertTriangle,
  Camera,
  Wrench,
  FileText,
  Shield,
  Box,
  Clock,
  FileBarChart,
  CalendarDays,
  MapPin,
  Map,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useParams, useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AssetPhotoUpload from "@/components/AssetPhotoUpload";
import AssetPhotoGallery from "@/components/AssetPhotoGallery";
import AssetPhotoMap from "@/components/AssetPhotoMap";
import AssetDocumentUpload from "@/components/AssetDocumentUpload";
import AssetDocumentList from "@/components/AssetDocumentList";
import AssetOptimization from "@/components/AssetOptimization";
import AssetReportTab from "@/components/AssetReportTab";
// import AssetTimeline from "@/components/AssetTimeline";
import { AssetLocation } from "@/components/AssetLocation";
import { BackButton } from "@/components/BackButton";
import { BulkDeleteAssessmentsDialog } from "@/components/BulkDeleteAssessmentsDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AssessmentDialog } from "@/components/AssessmentDialog";
import { AIChatBox, Message } from "@/components/AIChatBox";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import ExportButton from "@/components/ExportButton";
import { Asset3DModelTab } from "@/components/Asset3DModelTab";
import { AssetFinancialTab } from "@/components/AssetFinancialTab";
import { FormattedMeasurement } from "@/components/FormattedMeasurement";
import { ComponentSelectorDialog } from "@/components/ComponentSelectorDialog";
import { AddCustomComponentDialog } from "@/components/AddCustomComponentDialog";


// Scrollable tabs wrapper with left/right arrow indicators
function ScrollableTabsWrapper({ children }: { children: React.ReactNode }) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScrollability = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    // Find the TabsList element inside
    const tabsList = container.querySelector('[role="tablist"]') as HTMLElement;
    if (!tabsList) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = tabsList;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  React.useEffect(() => {
    checkScrollability();
    const container = scrollContainerRef.current;
    const tabsList = container?.querySelector('[role="tablist"]') as HTMLElement;
    
    if (tabsList) {
      tabsList.addEventListener('scroll', checkScrollability);
      window.addEventListener('resize', checkScrollability);
      
      return () => {
        tabsList.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, [checkScrollability]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    const tabsList = container?.querySelector('[role="tablist"]') as HTMLElement;
    if (!tabsList) return;
    
    const scrollAmount = 200;
    tabsList.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div className="relative" ref={scrollContainerRef}>
      {/* Left scroll indicator */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 flex items-center justify-center bg-background/90 backdrop-blur-sm border rounded-full shadow-md hover:bg-accent transition-colors"
          aria-label="Scroll tabs left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      
      {/* Tabs content */}
      <div className={canScrollLeft ? 'pl-10' : canScrollRight ? 'pr-10' : ''}>
        {children}
      </div>
      
      {/* Right scroll indicator */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 flex items-center justify-center bg-background/90 backdrop-blur-sm border rounded-full shadow-md hover:bg-accent transition-colors"
          aria-label="Scroll tabs right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default function AssetDetail() {
  const { id, assetId } = useParams();
  const [, setLocation] = useLocation();
  const projectId = parseInt(id!);
  const assetIdNum = parseInt(assetId!);
  const utils = trpc.useUtils();

  const { user, loading: authLoading } = useAuth();
  const [showAssessmentDialog, setShowAssessmentDialog] = React.useState(false);
  const [selectedAssessment, setSelectedAssessment] = React.useState<any>(null);
  const [showComponentSelector, setShowComponentSelector] = React.useState(false);
  const [aiMessages, setAiMessages] = React.useState<Message[]>([]);
  const [conversationLoaded, setConversationLoaded] = React.useState(false);
  const [selectedBuildingCode, setSelectedBuildingCode] = React.useState<string>("");
  const [checkingCompliance, setCheckingCompliance] = React.useState<Record<number, boolean>>({});
  // Disclaimer acknowledgment removed - now using passive statement
  const [complianceResults, setComplianceResults] = React.useState<Record<number, { compliant: boolean; details: string; nonComplianceReasons?: Array<{ reason: string; codeReference: string; severity: string; recommendation: string }>; complianceNotes?: string | null }>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = React.useState<any>(null);
  const [deleteReason, setDeleteReason] = React.useState("");
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
  const [selectedAssessmentIds, setSelectedAssessmentIds] = React.useState<number[]>([]);
  const [selectionMode, setSelectionMode] = React.useState(false);
  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery(
    { id: projectId },
    { enabled: !!user && !isNaN(projectId) }
  );
  const { data: asset, isLoading: assetLoading } = trpc.assets.get.useQuery(
    { id: assetIdNum, projectId },
    { enabled: !!user && !isNaN(assetIdNum) && !isNaN(projectId) }
  );
  const { data: assessments } = trpc.assessments.listByAsset.useQuery(
    { assetId: assetIdNum, projectId },
    { enabled: !!user && !isNaN(assetIdNum) && !isNaN(projectId) }
  );
  const { data: deficiencies } = trpc.deficiencies.listByAsset.useQuery(
    { assetId: assetIdNum, projectId },
    { enabled: !!user && !isNaN(assetIdNum) && !isNaN(projectId) }
  );
  const { data: buildingCodesList } = trpc.buildingCodes.list.useQuery(
    undefined,
    { enabled: !!user }
  );
  const checkComplianceMutation = trpc.compliance.checkComponent.useMutation();
  
  // Admin delete assessment mutation
  const deleteAssessmentMutation = trpc.assessments.adminDelete.useMutation({
    onSuccess: () => {
      toast.success("Assessment deleted successfully");
      utils.assessments.listByAsset.invalidate({ assetId: assetIdNum, projectId });
      setDeleteDialogOpen(false);
      setAssessmentToDelete(null);
      setDeleteReason("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete assessment");
    },
  });

  // Load conversation history
  const { data: conversationHistory } = trpc.assets.getConversation.useQuery(
    { assetId: assetIdNum, projectId },
    { 
      enabled: !!user && !isNaN(projectId) && !isNaN(assetIdNum) && !conversationLoaded,
    }
  );

  const { data: suggestedQuestions, isLoading: suggestedQuestionsLoading } = trpc.assets.getSuggestedQuestions.useQuery(
    { assetId: assetIdNum, projectId },
    { enabled: !!user && !isNaN(projectId) && !isNaN(assetIdNum) }
  );

  // Update messages when conversation history loads
  React.useEffect(() => {
    if (conversationHistory && conversationHistory.length > 0 && !conversationLoaded) {
      setAiMessages(conversationHistory);
      setConversationLoaded(true);
    } else if (conversationHistory && conversationHistory.length === 0 && !conversationLoaded) {
      setConversationLoaded(true);
    }
  }, [conversationHistory, conversationLoaded]);

  const aiChatMutation = trpc.assets.aiChat.useMutation({
    onSuccess: (response) => {
      setAiMessages(prev => [...prev, { role: "assistant", content: response.message }]);
    },
    onError: (error) => {
      toast.error("AI chat failed: " + error.message);
    },
  });

  const clearConversationMutation = trpc.assets.clearConversation.useMutation({
    onSuccess: () => {
      setAiMessages([]);
      toast.success("Conversation cleared");
    },
    onError: (error) => {
      toast.error("Failed to clear conversation: " + error.message);
    },
  });

  const handleAIMessage = (content: string) => {
    setAiMessages(prev => [...prev, { role: "user", content }]);
    aiChatMutation.mutate({ assetId: assetIdNum, projectId, message: content, conversationHistory: aiMessages });
  };

  if (authLoading || projectLoading || assetLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project || !asset) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Asset not found</h2>
          <BackButton to={`/projects/${projectId}/assets`} label="Back to Assets" />
        </div>
      </DashboardLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "demolished":
        return <Badge variant="destructive">Demolished</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate statistics
  const totalAssessments = assessments?.length || 0;
  const totalDeficiencies = deficiencies?.length || 0;
  const criticalDeficiencies = deficiencies?.filter(d => d.severity === 'critical').length || 0;
  
  // Calculate total costs from BOTH assessments (repair costs) AND deficiencies
  const assessmentRepairCost = assessments?.reduce((sum, a) => sum + (a.estimatedRepairCost || 0), 0) || 0;
  const deficiencyCost = deficiencies?.reduce((sum, d) => sum + (d.estimatedCost || 0), 0) || 0;
  // Use the higher of assessment repair costs or deficiency costs to avoid double-counting
  // If assessments have repair costs, use those; otherwise fall back to deficiency costs
  const totalEstimatedCost = assessmentRepairCost > 0 ? assessmentRepairCost : deficiencyCost;
  
  // Calculate overall condition from assessments
  const getOverallCondition = () => {
    if (!assessments || assessments.length === 0) return '-';
    const conditionScores: Record<string, number> = { 'good': 4, 'fair': 3, 'poor': 2, 'critical': 1, 'not_assessed': 0 };
    const avgScore = assessments.reduce((sum, a) => sum + (conditionScores[a.condition || 'not_assessed'] || 0), 0) / assessments.length;
    if (avgScore >= 3.5) return 'Good';
    if (avgScore >= 2.5) return 'Fair';
    if (avgScore >= 1.5) return 'Poor';
    if (avgScore > 0) return 'Critical';
    return '-';
  };
  const overallCondition = getOverallCondition();

  return (
    <>
      <ComponentSelectorDialog
        open={showComponentSelector}
        onOpenChange={setShowComponentSelector}
        assetId={assetIdNum}
        projectId={projectId}
        existingAssessments={assessments || []}
        onSelectComponent={(code, name) => {
          setSelectedAssessment({ componentCode: code, componentName: name });
          setShowAssessmentDialog(true);
        }}
        onOpenExistingAssessment={(componentCode) => {
          const existingAssessment = assessments?.find(a => a.componentCode === componentCode);
          if (existingAssessment) {
            setSelectedAssessment(existingAssessment);
            setShowAssessmentDialog(true);
          }
        }}
        onCreateCustomComponent={() => {
          setShowComponentSelector(false);
          // TODO: Open AddCustomComponentDialog
        }}
        onBulkAdd={(components) => {
          // Create assessment stubs for multiple components
          components.forEach(comp => {
            // TODO: Implement bulk assessment creation
            console.log('Bulk add:', comp);
          });
          toast.success(`Added ${components.length} component assessment stubs`);
        }}
      />
      <AssessmentDialog
        open={showAssessmentDialog}
        onOpenChange={(open) => {
          setShowAssessmentDialog(open);
          if (!open) setSelectedAssessment(null);
        }}
        projectId={projectId}
        assetId={assetIdNum}
        componentCode={selectedAssessment?.componentCode || "GENERAL"}
        componentName={selectedAssessment?.componentName || "General Assessment"}
        existingAssessment={selectedAssessment}
        onSuccess={() => {
          utils.assessments.listByAsset.invalidate();
          setSelectedAssessment(null);
        }}
      />
      <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <BackButton to={`/projects/${projectId}/assets`} label="Back to Assets" />
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{asset.name}</h1>
              {getStatusBadge(asset.status)}
            </div>
            {asset.uniqueId && (
              <p className="text-sm font-mono text-muted-foreground">
                ID: {asset.uniqueId}
              </p>
            )}
            {asset.address && (
              <p className="text-muted-foreground">{asset.address}</p>
            )}
            {!asset.address && asset.streetAddress && (
              <p className="text-muted-foreground">No address specified</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-4">
          <ScrollableTabsWrapper>
            <TabsList className="w-full max-w-full overflow-x-auto flex-nowrap scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
              <TabsTrigger value="dashboard" className="flex-none px-3">
                <Building2 className="mr-2 h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="ai-insights" className="flex-none px-3">
                AI Insights
              </TabsTrigger>
              <TabsTrigger value="assessments" className="flex-none px-3">
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Assessments
              </TabsTrigger>
              <TabsTrigger value="photos" className="flex-none px-3">
                <Camera className="mr-2 h-4 w-4" />
                Photos
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="flex-none px-3">
                <Wrench className="mr-2 h-4 w-4" />
                Maintenance
              </TabsTrigger>
              <TabsTrigger value="deficiencies" className="flex-none px-3">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Deficiencies
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex-none px-3">
                <FileText className="mr-2 h-4 w-4" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="financial" className="flex-none px-3">
                <DollarSign className="mr-2 h-4 w-4" />
                Financial
              </TabsTrigger>
              <TabsTrigger value="compliance" className="flex-none px-3">
                <Shield className="mr-2 h-4 w-4" />
                Compliance
              </TabsTrigger>
              <TabsTrigger value="3d-model" className="flex-none px-3">
                <Box className="mr-2 h-4 w-4" />
                3D Model
              </TabsTrigger>
              {/* <TabsTrigger value="timeline" className="flex-none px-3">
                <Clock className="mr-2 h-4 w-4" />
                Timeline
              </TabsTrigger> */}
              <TabsTrigger value="reports" className="flex-none px-3">
                <FileBarChart className="mr-2 h-4 w-4" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="optimization" className="flex-none px-3">
                <Target className="mr-2 h-4 w-4" />
                Optimization
              </TabsTrigger>
              <TabsTrigger value="location" className="flex-none px-3">
                <MapPin className="mr-2 h-4 w-4" />
                Location
              </TabsTrigger>
              {/* <TabsTrigger value="timeline" className="flex-none px-3">
                <CalendarDays className="mr-2 h-4 w-4" />
                Timeline
              </TabsTrigger> */}
            </TabsList>
          </ScrollableTabsWrapper>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            {/* Export Data Section */}
            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
                <CardDescription>Download project data in CSV format</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <ExportButton
                  projectId={projectId}
                  type="deficiencies"
                  label="Deficiencies"
                />
                <ExportButton
                  projectId={projectId}
                  type="assessments"
                  label="Assessments"
                />
                <ExportButton
                  projectId={projectId}
                  type="costs"
                  label="Cost Estimates"
                />
              </CardContent>
            </Card>

            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Assessments</CardTitle>
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalAssessments}</div>
                  <p className="text-xs text-muted-foreground">Components assessed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Deficiencies</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalDeficiencies}</div>
                  <p className="text-xs text-muted-foreground">
                    {criticalDeficiencies} critical issues
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${totalEstimatedCost.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Total repair costs</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Condition</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overallCondition}</div>
                  <p className="text-xs text-muted-foreground">Overall rating</p>
                </CardContent>
              </Card>
            </div>

            {/* Asset Details */}
            <Card>
              <CardHeader>
                <CardTitle>Asset Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {asset.description && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                    <p className="text-sm">{asset.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {asset.assetType && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Asset Type</h3>
                      <p className="text-sm font-medium">{asset.assetType}</p>
                    </div>
                  )}
                  {asset.yearBuilt && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Year Built</h3>
                      <p className="text-sm font-medium">{asset.yearBuilt}</p>
                    </div>
                  )}
                  {asset.grossFloorArea && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Floor Area</h3>
                      <p className="text-sm font-medium"><FormattedMeasurement value={Number(asset.grossFloorArea)} type="area" /></p>
                    </div>
                  )}
                  {asset.numberOfStories && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Stories</h3>
                      <p className="text-sm font-medium">{asset.numberOfStories}</p>
                    </div>
                  )}
                  {asset.constructionType && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Construction</h3>
                      <p className="text-sm font-medium">{asset.constructionType}</p>
                    </div>
                  )}

                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assessments Tab */}
          <TabsContent value="assessments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Component Assessments</CardTitle>
                <CardDescription>
                  All UNIFORMAT II component assessments for this asset
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assessments && assessments.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {user?.role === 'admin' && (
                          <>
                            <Button
                              variant={selectionMode ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setSelectionMode(!selectionMode);
                                setSelectedAssessmentIds([]);
                              }}
                            >
                              {selectionMode ? "Cancel Selection" : "Select Multiple"}
                            </Button>
                            {selectionMode && selectedAssessmentIds.length > 0 && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setBulkDeleteDialogOpen(true)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete {selectedAssessmentIds.length} Selected
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                      <Button onClick={() => setShowComponentSelector(true)}>
                        <ClipboardCheck className="mr-2 h-4 w-4" />
                        Start New Assessment
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {assessments.map((assessment) => (
                        <div 
                          key={assessment.id} 
                          className={`p-4 border rounded-lg transition-colors ${
                            selectionMode
                              ? selectedAssessmentIds.includes(assessment.id)
                                ? "bg-primary/10 border-primary"
                                : "hover:bg-accent/30"
                              : "cursor-pointer hover:bg-accent/50"
                          }`}
                          onClick={() => {
                            if (selectionMode) {
                              setSelectedAssessmentIds(prev =>
                                prev.includes(assessment.id)
                                  ? prev.filter(id => id !== assessment.id)
                                  : [...prev, assessment.id]
                              );
                            } else {
                              setSelectedAssessment(assessment);
                              setShowAssessmentDialog(true);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            {selectionMode && (
                              <Checkbox
                                checked={selectedAssessmentIds.includes(assessment.id)}
                                onCheckedChange={(checked) => {
                                  setSelectedAssessmentIds(prev =>
                                    checked
                                      ? [...prev, assessment.id]
                                      : prev.filter(id => id !== assessment.id)
                                  );
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="mr-3"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-medium">{assessment.componentCode}</p>
                              <p className="text-sm text-muted-foreground">{assessment.componentName || 'Unknown Component'}</p>
                              {(assessment.estimatedRepairCost || assessment.replacementValue) && (
                                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                  {assessment.estimatedRepairCost && (
                                    <span>
                                      <DollarSign className="inline h-3 w-3 mr-0.5" />
                                      Repair: ${assessment.estimatedRepairCost.toLocaleString()}
                                    </span>
                                  )}
                                  {assessment.replacementValue && (
                                    <span>
                                      Replacement: ${assessment.replacementValue.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {(assessment as any).photoCount > 0 && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                  <Camera className="h-3 w-3" />
                                  <span>{(assessment as any).photoCount}</span>
                                </div>
                              )}
                              <Badge variant={assessment.condition === 'good' ? 'default' : assessment.condition === 'fair' ? 'secondary' : 'destructive'}>
                                {assessment.condition}
                              </Badge>
                              {user?.role === 'admin' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssessmentToDelete(assessment);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">No assessments found for this asset</p>
                    <Button onClick={() => setShowComponentSelector(true)}>
                      <ClipboardCheck className="mr-2 h-4 w-4" />
                      Start Assessment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Photos</CardTitle>
                <CardDescription>
                  Take photos with your camera or upload from your device
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssetPhotoUpload 
                  assetId={assetIdNum} 
                  projectId={projectId}
                  onPhotoUploaded={() => {
                    // Refresh will happen automatically via tRPC invalidation
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Photo Gallery</CardTitle>
                <CardDescription>
                  All photos for this asset
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssetPhotoGallery assetId={assetIdNum} projectId={projectId} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Photo Map View
                </CardTitle>
                <CardDescription>
                  View all geotagged photos on an interactive map to see where assessments were conducted
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssetPhotoMap assetId={assetIdNum} projectId={projectId} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance History Tab */}
          <TabsContent value="maintenance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Maintenance Documents</CardTitle>
                <CardDescription>
                  Upload maintenance records, reports, and related documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssetDocumentUpload 
                  assetId={assetIdNum} 
                  projectId={projectId}
                  category="maintenance"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maintenance Documents</CardTitle>
                <CardDescription>
                  All maintenance-related documents for this asset
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssetDocumentList assetId={assetIdNum} category="maintenance" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deficiencies Tab */}
          <TabsContent value="deficiencies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Deficiencies</CardTitle>
                <CardDescription>
                  All deficiencies identified for this asset
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deficiencies && deficiencies.length > 0 ? (
                  <div className="space-y-2">
                    {deficiencies.map((deficiency) => (
                      <div key={deficiency.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{deficiency.title}</p>
                          <Badge variant={deficiency.severity === 'critical' ? 'destructive' : deficiency.severity === 'high' ? 'secondary' : 'outline'}>
                            {deficiency.severity}
                          </Badge>
                        </div>
                        {deficiency.description && (
                          <p className="text-sm text-muted-foreground">{deficiency.description}</p>
                        )}
                        <div className="border-t pt-3">
                          <p className="text-sm font-medium mb-2">Upload Evidence</p>
                          <AssetDocumentUpload 
                            assetId={assetIdNum} 
                            projectId={projectId}
                            category="deficiency"
                            deficiencyId={deficiency.id}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No deficiencies found for this asset</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Documents</CardTitle>
                <CardDescription>
                  Upload general documents for this asset (reports, plans, permits, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssetDocumentUpload 
                  assetId={assetIdNum} 
                  projectId={projectId}
                  category="general"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All Documents</CardTitle>
                <CardDescription>
                  All documents attached to this asset
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssetDocumentList assetId={assetIdNum} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Analysis Tab */}
          <TabsContent value="financial" className="space-y-4">
            <AssetFinancialTab 
              asset={asset}
              assessments={assessments}
              deficiencies={deficiencies}
            />
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Building Code Compliance</CardTitle>
                <CardDescription>
                  Select a building code and check component compliance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Building Code Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Building Code</label>
                  <Select value={selectedBuildingCode} onValueChange={setSelectedBuildingCode}>
                    <SelectTrigger className="w-full md:w-[400px]">
                      <SelectValue placeholder="Select a building code" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildingCodesList && buildingCodesList.length > 0 ? (
                        buildingCodesList.map((code) => (
                          <SelectItem key={code.id} value={code.code}>
                            {code.title}
                            {code.effectiveDate && ` (${code.effectiveDate})`}
                            {code.status === 'proposed' && ' (Proposed)'}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="loading" disabled>
                          Loading building codes...
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {!selectedBuildingCode && (
                    <p className="text-xs text-muted-foreground">
                      Select a building code to check component compliance
                    </p>
                  )}
                </div>

                {/* Components List */}
                {selectedBuildingCode && assessments && assessments.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Asset Components</h3>
                    <div className="space-y-3">
                      {assessments.map((assessment) => {
                        const isChecking = checkingCompliance[assessment.id] || false;
                        const result = complianceResults[assessment.id];
                        
                        return (
                          <div
                            key={assessment.id}
                            className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{assessment.componentName}</p>
                                {result && (
                                  <Badge variant={result.compliant ? "default" : "destructive"}>
                                    {result.compliant ? "Compliant" : "Non-Compliant"}
                                  </Badge>
                                )}
                              </div>
                              {assessment.componentLocation && (
                                <p className="text-sm text-muted-foreground">
                                  Location: {assessment.componentLocation}
                                </p>
                              )}
                              {result && (
                                <div className="mt-2 space-y-3">
                                  <p className="text-sm">{result.details}</p>
                                  
                                  {/* Non-Compliance Reasons */}
                                  {!result.compliant && result.nonComplianceReasons && result.nonComplianceReasons.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      <p className="text-sm font-semibold text-destructive">Non-Compliance Reasons:</p>
                                      {result.nonComplianceReasons.map((item, idx) => (
                                        <div key={idx} className="p-3 bg-destructive/10 border border-destructive/20 rounded-md space-y-1">
                                          <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-medium text-destructive">{item.reason}</p>
                                            <Badge variant={item.severity === 'high' ? 'destructive' : item.severity === 'medium' ? 'secondary' : 'outline'} className="shrink-0">
                                              {item.severity?.toUpperCase()}
                                            </Badge>
                                          </div>
                                          {item.codeReference && (
                                            <p className="text-xs text-muted-foreground">
                                              <span className="font-medium">Code Reference:</span> {item.codeReference}
                                            </p>
                                          )}
                                          {item.recommendation && (
                                            <p className="text-xs text-muted-foreground">
                                              <span className="font-medium">Recommendation:</span> {item.recommendation}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Compliance Notes */}
                                  {result.complianceNotes && (
                                    <div className="mt-2 p-2 bg-muted/50 rounded-md">
                                      <p className="text-xs text-muted-foreground">
                                        <span className="font-medium">Additional Notes:</span> {result.complianceNotes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                setCheckingCompliance(prev => ({ ...prev, [assessment.id]: true }));
                                try {
                                  const result = await checkComplianceMutation.mutateAsync({
                                    componentName: assessment.componentName || 'Unknown Component',
                                    componentLocation: assessment.componentLocation || undefined,
                                    condition: assessment.condition || undefined,
                                    observations: assessment.observations || undefined,
                                    buildingCode: selectedBuildingCode,
                                  });
                                  setComplianceResults(prev => ({
                                    ...prev,
                                    [assessment.id]: result,
                                  }));
                                  toast.success('Compliance check completed');
                                } catch (error) {
                                  console.error('Compliance check error:', error);
                                  toast.error('Failed to check compliance');
                                } finally {
                                  setCheckingCompliance(prev => ({ ...prev, [assessment.id]: false }));
                                }
                              }}
                              disabled={isChecking}
                            >
                              {isChecking ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Checking...
                                </>
                              ) : (
                                'Check Compliance'
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedBuildingCode && (!assessments || assessments.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No components found for this asset.</p>
                    <p className="text-sm mt-2">Create assessments to check compliance.</p>
                  </div>
                )}

                {/* Legal Disclaimer */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
                  <p className="text-xs text-muted-foreground">
                    <strong>LEGAL DISCLAIMER:</strong> This AI-assisted compliance check is provided for informational and preliminary screening purposes only. It does not constitute professional engineering advice, legal opinion, official building code interpretation, or certification of compliance. The analysis is generated using artificial intelligence and may not identify all compliance issues, code violations, or safety concerns. This tool should not be relied upon as a substitute for a thorough review by qualified professionals.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Users must consult with licensed professionals including but not limited to engineers, architects, building inspectors, and code officials, as well as relevant authorities having jurisdiction (AHJ), for authoritative compliance determinations and official certifications. Building codes are subject to local amendments, interpretations, and updates that may not be reflected in this analysis.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>LIMITATION OF LIABILITY:</strong> The system operators, developers, and affiliated parties assume no responsibility or liability for any decisions, actions, or omissions made based on the results of this compliance check. Users assume all risk associated with the use of this tool and agree to hold harmless all parties involved in its development and operation.
                  </p>
                  
                  {/* Passive Acknowledgment Statement */}
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground italic">
                      By using this feature, I understand that this AI-assisted compliance check is for informational purposes only and does not replace professional consultation with licensed engineers, architects, or code officials.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3D Model Tab */}
          <TabsContent value="3d-model" className="space-y-4">
            <Asset3DModelTab assetId={assetIdNum} projectId={projectId} />
          </TabsContent>

          {/* Timeline Tab - Hidden due to errors */}
          {/* <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Asset Timeline</CardTitle>
                <CardDescription>
                  Visual timeline of assessment history and projected future actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Timeline view coming soon. This will show historical events and future maintenance schedules.
                </p>
              </CardContent>
            </Card>
          </TabsContent> */}

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <AssetReportTab assetId={assetIdNum} projectId={projectId} />
          </TabsContent>

          {/* Optimization Tab */}
          <TabsContent value="optimization" className="space-y-4">
            <AssetOptimization 
              assetId={assetIdNum}
              assessments={assessments}
              deficiencies={deficiencies}
            />
          </TabsContent>

          {/* Location Tab */}
          <TabsContent value="location" className="space-y-4">
            <AssetLocation
              assetId={assetIdNum}
              projectId={projectId}
              streetAddress={asset.streetAddress}
              streetNumber={asset.streetNumber}
              aptUnit={asset.unitNumber}
              city={asset.city}
              postalCode={asset.postalCode}
              province={asset.province}
            />
          </TabsContent>

          {/* Timeline Tab - Hidden due to errors */}
          {/* <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Asset Timeline</CardTitle>
                <CardDescription>
                  View all historical events and future schedules for this asset
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssetTimeline assetId={assetIdNum} projectId={projectId} />
              </CardContent>
            </Card>
          </TabsContent> */}

          {/* AI Insights Tab */}
          <TabsContent value="ai-insights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI Insights</CardTitle>
                <CardDescription>
                  Ask questions about this asset, get recommendations, and explore insights powered by AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AIChatBox
                  messages={aiMessages}
                  onSendMessage={handleAIMessage}
                  onClearConversation={() => clearConversationMutation.mutate({ assetId: assetIdNum, projectId })}
                  isLoading={aiChatMutation.isPending || suggestedQuestionsLoading}
                  placeholder="Ask about this asset, request analysis, or get recommendations..."
                  height="600px"
                  suggestedPrompts={suggestedQuestions}
                />
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>

      {/* Delete Assessment Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this assessment? This action will be logged for audit purposes.
              {assessmentToDelete && (
                <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                  <p><strong>Component:</strong> {assessmentToDelete.componentCode} - {assessmentToDelete.componentName}</p>
                  <p><strong>Condition:</strong> {assessmentToDelete.condition}</p>
                  {assessmentToDelete.estimatedRepairCost && (
                    <p><strong>Repair Cost:</strong> ${assessmentToDelete.estimatedRepairCost.toLocaleString()}</p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="delete-reason">Reason for deletion (optional)</Label>
            <Textarea
              id="delete-reason"
              placeholder="Enter reason for deleting this assessment..."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteReason("");
              setAssessmentToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (assessmentToDelete) {
                  deleteAssessmentMutation.mutate({
                    assessmentId: assessmentToDelete.id,
                    projectId,
                    reason: deleteReason || undefined,
                  });
                }
              }}
              disabled={deleteAssessmentMutation.isPending}
            >
              {deleteAssessmentMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
              ) : (
                "Delete Assessment"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Assessments Dialog */}
      <BulkDeleteAssessmentsDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        selectedAssessmentIds={selectedAssessmentIds}
        projectId={projectId}
        onSuccess={() => {
          utils.assessments.listByAsset.invalidate({ assetId: assetIdNum, projectId });
          setSelectedAssessmentIds([]);
          setSelectionMode(false);
        }}
      />
    </>
  );
}
