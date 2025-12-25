import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { BuildingCodeDisplay } from "@/components/BuildingCodeDisplay";
import { BuildingCodeSelect } from "@/components/BuildingCodeSelect";
import { ComplianceCheckButton } from "@/components/ComplianceCheckButton";
import StatusHistoryTimeline from "@/components/StatusHistoryTimeline";
import { DocumentUploadZone } from "@/components/DocumentUploadZone";
import { ProjectDocumentList } from "@/components/ProjectDocumentList";
import { Building2, ClipboardCheck, AlertTriangle, DollarSign, Image, Loader2, Edit, FileText, Plus, Trash2, Download, Target, Archive, MapPin } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import PhotoGallery from "@/components/PhotoGallery";
import ReportTab from "@/components/ReportTab";
import ExportButton from "@/components/ExportButton";
import { AssessmentDialog } from "@/components/AssessmentDialog";
import { DocumentList } from "@/components/DocumentList";
import { BulkDownloadButton } from "@/components/BulkDownloadButton";
import { ProjectAssetsMap } from "@/components/ProjectAssetsMap";
import ProjectHierarchyConfig from "@/components/ProjectHierarchyConfig";
import ProjectRatingConfig from "@/components/ProjectRatingConfig";
import BuildingSectionsManager from "@/components/BuildingSectionsManager";
import FacilitySummaryTab from "@/components/FacilitySummaryTab";
import { BackButton } from "@/components/BackButton";
import { AIChatBox, Message } from "@/components/AIChatBox";
import { PortfolioReportDialog } from "@/components/PortfolioReportDialog";

export default function ProjectDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const projectId = parseInt(id!);
  
  const [deficiencyDialogOpen, setDeficiencyDialogOpen] = useState(false);
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<"initial" | "active" | "completed" | undefined>(undefined);
  const [selectedAssessments, setSelectedAssessments] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [expandedDocuments, setExpandedDocuments] = useState<number | null>(null);
  const [aiMessages, setAiMessages] = useState<Message[]>([]);
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const utils = trpc.useUtils();
  const [projectEditDialogOpen, setProjectEditDialogOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: "",
    address: "",
    status: "draft" as 'draft' | 'in_progress' | 'completed' | 'archived',
    clientName: "",
    propertyType: "",
    constructionType: "",
    yearBuilt: "",
    numberOfUnits: "",
    numberOfStories: "",
    buildingCodeId: undefined as number | undefined,
  });
  const [deficiencyForm, setDeficiencyForm] = useState({
    assessmentId: 0,
    componentCode: "",
    title: "",
    description: "",
    location: "",
    severity: "medium" as const,
    priority: "medium_term" as const,
    recommendedAction: "",
    estimatedCost: "",
  });

  const { user, loading: authLoading } = useAuth();
  const { data: project, isLoading: projectLoading, error: projectError } = trpc.projects.get.useQuery(
    { id: projectId },
    { 
      enabled: !!user && !isNaN(projectId), 
      retry: false,
      meta: { suppressErrorLogging: true }
    }
  );
  const { data: stats } = trpc.projects.stats.useQuery(
    { projectId },
    { enabled: !!user && !isNaN(projectId) }
  );
  const { data: assessments } = trpc.assessments.list.useQuery(
    { projectId, status: statusFilter },
    { enabled: !!user && !isNaN(projectId) }
  );
  const { data: statusCounts } = trpc.assessments.statusCounts.useQuery(
    { projectId },
    { enabled: !!user && !isNaN(projectId) }
  );
  const { data: deficiencies, refetch: refetchDeficiencies } = trpc.deficiencies.list.useQuery(
    { projectId },
    { enabled: !!user && !isNaN(projectId) }
  );
  const { data: documents, isLoading: documentsLoading } = trpc.documents.listProjectDocuments.useQuery(
    { projectId },
    { enabled: !!user && !isNaN(projectId) }
  );

  const createDeficiency = trpc.deficiencies.create.useMutation({
    onSuccess: () => {
      toast.success("Deficiency created successfully");
      setDeficiencyDialogOpen(false);
      setDeficiencyForm({
        assessmentId: 0,
        componentCode: "",
        title: "",
        description: "",
        location: "",
        severity: "medium",
        priority: "medium_term",
        recommendedAction: "",
        estimatedCost: "",
      });
      refetchDeficiencies();
    },
    onError: (error) => {
      toast.error("Failed to create deficiency: " + error.message);
    },
  });

  const deleteDeficiency = trpc.deficiencies.delete.useMutation({
    onSuccess: () => {
      toast.success("Deficiency deleted successfully");
      refetchDeficiencies();
    },
    onError: (error) => {
      toast.error("Failed to delete deficiency: " + error.message);
    },
  });

  const uploadDocument = trpc.documents.uploadProjectDocument.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      utils.documents.listProjectDocuments.invalidate({ projectId });
    },
    onError: (error) => {
      toast.error("Failed to upload document: " + error.message);
    },
  });

  const deleteDocument = trpc.documents.deleteProjectDocument.useMutation({
    onSuccess: () => {
      toast.success("Document deleted successfully");
      utils.documents.listProjectDocuments.invalidate({ projectId });
    },
    onError: (error) => {
      toast.error("Failed to delete document: " + error.message);
    },
  });

  const estimateCosts = trpc.costEstimates.estimateForProject.useMutation({
    onSuccess: (result: any) => {
      toast.success(result.message);
      // Refetch data to show updated costs
      window.location.reload();
    },
    onError: (error: any) => {
      toast.error('Failed to estimate costs: ' + error.message);
    },
  });

  const bulkUpdateStatus = trpc.assessments.bulkUpdateStatus.useMutation({
    onSuccess: () => {
      toast.success("Assessment statuses updated successfully");
      utils.assessments.list.invalidate();
      utils.assessments.statusCounts.invalidate();
      setSelectedAssessments([]);
      setBulkStatus("");
    },
    onError: (error) => {
      toast.error("Failed to update assessment statuses");
    },
  });

  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => {
      toast.success("Project updated successfully");
      setProjectEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error("Failed to update project: " + error.message);
    },
  });

  // Load conversation history
  const { data: conversationHistory } = trpc.projects.getConversation.useQuery(
    { projectId },
    { enabled: !!user && !isNaN(projectId) }
  );

  const { data: suggestedQuestions, isLoading: suggestedQuestionsLoading } = trpc.projects.getSuggestedQuestions.useQuery(
    { projectId },
    { enabled: !!user && !isNaN(projectId) }
  );

  // Update messages when conversation history loads
  useEffect(() => {
    if (conversationHistory && conversationHistory.length > 0 && !conversationLoaded) {
      setAiMessages(conversationHistory);
      setConversationLoaded(true);
    } else if (conversationHistory && conversationHistory.length === 0 && !conversationLoaded) {
      setConversationLoaded(true);
    }
  }, [conversationHistory, conversationLoaded]);

  const aiChatMutation = trpc.projects.aiChat.useMutation({
    onSuccess: (response) => {
      setAiMessages(prev => [...prev, { role: "assistant", content: response.message }]);
    },
    onError: (error) => {
      toast.error("AI chat failed: " + error.message);
    },
  });

  const clearConversationMutation = trpc.projects.clearConversation.useMutation({
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
    aiChatMutation.mutate({ projectId, message: content, conversationHistory: aiMessages });
  };

  const handleBulkStatusChange = () => {
    if (!bulkStatus || selectedAssessments.length === 0) return;
    bulkUpdateStatus.mutate({
      projectId,
      assessmentIds: selectedAssessments,
      status: bulkStatus as "initial" | "active" | "completed"
    });
  };

  const handleEditProject = () => {
    if (project) {
      setProjectForm({
        name: project.name,
        address: project.address || "",
        status: project.status as 'draft' | 'in_progress' | 'completed' | 'archived',
        clientName: project.clientName || "",
        propertyType: project.propertyType || "",
        constructionType: project.constructionType || "",
        yearBuilt: project.yearBuilt?.toString() || "",
        numberOfUnits: project.numberOfUnits?.toString() || "",
        numberOfStories: project.numberOfStories?.toString() || "",
        buildingCodeId: project.buildingCodeId ?? undefined,
      });
      setProjectEditDialogOpen(true);
    }
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    updateProject.mutate({
      id: projectId,
      name: projectForm.name,
      address: projectForm.address || undefined,
      status: projectForm.status,
      clientName: projectForm.clientName || undefined,
      propertyType: projectForm.propertyType || undefined,
      constructionType: projectForm.constructionType || undefined,
      yearBuilt: projectForm.yearBuilt ? parseInt(projectForm.yearBuilt) : undefined,
      numberOfUnits: projectForm.numberOfUnits ? parseInt(projectForm.numberOfUnits) : undefined,
      numberOfStories: projectForm.numberOfStories ? parseInt(projectForm.numberOfStories) : undefined,
      buildingCodeId: projectForm.buildingCodeId,
    });
  };

  const handleCreateDeficiency = (e: React.FormEvent) => {
    e.preventDefault();
    createDeficiency.mutate({
      projectId,
      assessmentId: deficiencyForm.assessmentId || 1, // Default to 1 if not set
      componentCode: deficiencyForm.componentCode,
      title: deficiencyForm.title,
      description: deficiencyForm.description || undefined,
      location: deficiencyForm.location || undefined,
      severity: deficiencyForm.severity,
      priority: deficiencyForm.priority,
      recommendedAction: deficiencyForm.recommendedAction || undefined,
      estimatedCost: deficiencyForm.estimatedCost ? Math.round(parseFloat(deficiencyForm.estimatedCost) * 100) : undefined,
    });
  };

  if (authLoading || projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Project not found</h2>
          <p className="text-muted-foreground mb-4">
            {projectError?.message || "The project you're looking for doesn't exist or you don't have access to it."}
          </p>
          <BackButton to="/" label="Back to Projects" />
        </div>
      </DashboardLayout>
    );
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <BackButton to="/" label="Back to Projects" />
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            {project.uniqueId && (
              <p className="text-sm font-mono text-muted-foreground">
                ID: {project.uniqueId}
              </p>
            )}
            <p className="text-muted-foreground">
              {project.address || "No address specified"}
            </p>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide max-w-full">
            <Button variant="outline" className="flex-none" onClick={() => setLocation(`/projects/${projectId}/dashboard`)}>
              <Building2 className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button variant="outline" className="flex-none" onClick={() => setLocation(`/projects/${projectId}/optimization`)}>
              <Target className="mr-2 h-4 w-4" />
              Optimization
            </Button>
            <PortfolioReportDialog projectId={projectId} projectName={project.name} />
            <Button variant="outline" className="flex-none" onClick={handleEditProject}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button onClick={() => setLocation(`/projects/${projectId}/assets`)}>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Start Assessment
            </Button>
          </div>
        </div>

        {/* Export Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
            <CardDescription>Download project data in CSV format</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <ExportButton projectId={projectId} type="deficiencies" label="Deficiencies" />
              <ExportButton projectId={projectId} type="assessments" label="Assessments" />
              <ExportButton projectId={projectId} type="costs" label="Cost Estimates" />
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assessments</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.assessments || 0}</div>
              <p className="text-xs text-muted-foreground">Components assessed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deficiencies</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.deficiencies || 0}</div>
              <p className="text-xs text-muted-foreground">Issues identified</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estimated Costs</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalEstimatedCost ? formatCurrency(stats.totalEstimatedCost) : "$0"}
              </div>
              <p className="text-xs text-muted-foreground">Total repair costs</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Photos</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.photos || 0}</div>
              <p className="text-xs text-muted-foreground">Documentation</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="summary">Facility Summary</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="deficiencies">Deficiencies</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
            <TabsTrigger value="ratings">Ratings</TabsTrigger>
            <TabsTrigger value="report">Report</TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              Documents
              {stats && stats.documents > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {stats.documents}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-2">
              <MapPin className="h-4 w-4" />
              Map
            </TabsTrigger>
            <TabsTrigger value="status-history">Status History</TabsTrigger>
            <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <FacilitySummaryTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Client</div>
                  <div>{project.clientName || "Not specified"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Property Type</div>
                  <div>{project.propertyType || "Not specified"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Construction Type</div>
                  <div>{project.constructionType || "Not specified"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Year Built</div>
                  <div>{project.yearBuilt || "Not specified"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Number of Units</div>
                  <div>{project.numberOfUnits || "Not specified"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Number of Stories</div>
                  <div>{project.numberOfStories || "Not specified"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Building Code</div>
                  <BuildingCodeDisplay buildingCodeId={project.buildingCodeId} />
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Status</div>
                  <Badge>{project.status}</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessments">
            {/* Header with Estimate Costs button */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Assessments</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm('Estimate costs for all assessments without cost data? This will use industry-standard pricing.')) {
                    estimateCosts.mutate({ projectId });
                  }
                }}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Estimate Missing Costs
              </Button>
            </div>
            {/* Status Filter Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  statusFilter === "active" ? "ring-2 ring-orange-500 border-orange-500" : ""
                }`}
                onClick={() => setStatusFilter(statusFilter === "active" ? undefined : "active")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Active Assessments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{statusCounts?.active || 0}</div>
                  <p className="text-sm text-muted-foreground mt-1">Currently in progress</p>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  statusFilter === "completed" ? "ring-2 ring-green-500 border-green-500" : ""
                }`}
                onClick={() => setStatusFilter(statusFilter === "completed" ? undefined : "completed")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{statusCounts?.completed || 0}</div>
                  <p className="text-sm text-muted-foreground mt-1">Finished assessments</p>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  statusFilter === "initial" ? "ring-2 ring-blue-500 border-blue-500" : ""
                }`}
                onClick={() => setStatusFilter(statusFilter === "initial" ? undefined : "initial")}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Initial
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{statusCounts?.initial || 0}</div>
                  <p className="text-sm text-muted-foreground mt-1">Not started yet</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Component Assessments</CardTitle>
                    <CardDescription>
                      Building components assessed following UNIFORMAT II classification
                      {statusFilter && (
                        <span className="ml-2">
                          • Filtered by: <strong className="capitalize">{statusFilter}</strong>
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {statusFilter && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setStatusFilter(undefined)}
                    >
                      Clear Filter
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {assessments && assessments.length > 0 ? (
                  <div className="space-y-4">
                    {/* Bulk Action Toolbar */}
                    {selectedAssessments.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="text-sm font-medium">
                          {selectedAssessments.length} assessment{selectedAssessments.length > 1 ? 's' : ''} selected
                        </span>
                        <div className="flex items-center gap-2">
                          <Select
                            value={bulkStatus}
                            onValueChange={setBulkStatus}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Change status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="initial">Initial</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            onClick={handleBulkStatusChange}
                            disabled={!bulkStatus}
                          >
                            Apply
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAssessments([])}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      {assessments.map((assessment) => (
                        <div key={assessment.id} className="border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-3 p-3">
                          {/* Checkbox */}
                          <Checkbox
                            checked={selectedAssessments.includes(assessment.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedAssessments([...selectedAssessments, assessment.id]);
                              } else {
                                setSelectedAssessments(selectedAssessments.filter(id => id !== assessment.id));
                              }
                            }}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{assessment.componentCode}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1">{assessment.observations}</div>
                            {(assessment.estimatedRepairCost || assessment.replacementValue) && (
                              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                                {assessment.estimatedRepairCost && (
                                  <span className="flex items-center">
                                    <DollarSign className="h-3 w-3 mr-0.5" />
                                    Repair: ${assessment.estimatedRepairCost.toLocaleString()}
                                  </span>
                                )}
                                {assessment.replacementValue && (
                                  <span>Replacement: ${assessment.replacementValue.toLocaleString()}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                          {/* Status Badge */}
                          <Badge 
                            variant="outline"
                            className={
                              assessment.status === "initial" ? "border-blue-500 text-blue-700 bg-blue-50" :
                              assessment.status === "active" ? "border-orange-500 text-orange-700 bg-orange-50" :
                              "border-green-500 text-green-700 bg-green-50"
                            }
                          >
                            <span className={
                              assessment.status === "initial" ? "inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5" :
                              assessment.status === "active" ? "inline-block w-2 h-2 rounded-full bg-orange-500 mr-1.5" :
                              "inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5"
                            } />
                            {assessment.status === "initial" ? "Initial" :
                             assessment.status === "active" ? "Active" : "Completed"}
                          </Badge>
                          {/* Condition Badge */}
                          <Badge variant={
                            assessment.condition === "good" ? "default" :
                            assessment.condition === "fair" ? "secondary" :
                            assessment.condition === "poor" ? "destructive" : "outline"
                          }>
                            {assessment.condition}
                          </Badge>
                          <ComplianceCheckButton
                            assessmentId={assessment.id}
                            projectId={projectId}
                            onComplianceChecked={() => utils.projects.get.invalidate({ id: projectId })}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingAssessment(assessment);
                              setAssessmentDialogOpen(true);
                            }}
                            title="Edit assessment"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedDocuments(expandedDocuments === assessment.id ? null : assessment.id)}
                            title="Attach documents"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          </div>
                        </div>
                        {/* Document Upload Section */}
                        {expandedDocuments === assessment.id && (
                          <div className="border-t p-4 bg-muted/30">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium">Assessment Documents</h4>
                              <BulkDownloadButton assessmentId={assessment.id} />
                            </div>
                            <DocumentUploadZone
                              onUpload={async (file) => {
                                const formData = new FormData();
                                formData.append("file", file);
                                formData.append("assessmentId", assessment.id.toString());
                                
                                const response = await fetch("/api/upload-assessment-document", {
                                  method: "POST",
                                  body: formData,
                                });
                                
                                if (!response.ok) {
                                  throw new Error("Upload failed");
                                }
                                
                                utils.assessmentDocuments.list.invalidate({ assessmentId: assessment.id });
                              }}
                            />
                            <div className="mt-4">
                              <DocumentList assessmentId={assessment.id} />
                            </div>
                          </div>
                        )}
                        </div>
                    ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No assessments yet. Start an assessment to begin.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deficiencies" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={deficiencyDialogOpen} onOpenChange={setDeficiencyDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Deficiency
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <form onSubmit={handleCreateDeficiency}>
                    <DialogHeader>
                      <DialogTitle>Add Deficiency</DialogTitle>
                      <DialogDescription>
                        Record a deficiency or maintenance requirement
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="componentCode">Component Code *</Label>
                        <Input
                          id="componentCode"
                          value={deficiencyForm.componentCode}
                          onChange={(e) => setDeficiencyForm({ ...deficiencyForm, componentCode: e.target.value })}
                          placeholder="e.g., B3010"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                          id="title"
                          value={deficiencyForm.title}
                          onChange={(e) => setDeficiencyForm({ ...deficiencyForm, title: e.target.value })}
                          placeholder="Brief description of the issue"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={deficiencyForm.description}
                          onChange={(e) => setDeficiencyForm({ ...deficiencyForm, description: e.target.value })}
                          placeholder="Detailed description of the deficiency"
                          rows={3}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={deficiencyForm.location}
                          onChange={(e) => setDeficiencyForm({ ...deficiencyForm, location: e.target.value })}
                          placeholder="e.g., North wing, 2nd floor"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="severity">Severity *</Label>
                          <Select
                            value={deficiencyForm.severity}
                            onValueChange={(value) => setDeficiencyForm({ ...deficiencyForm, severity: value as any })}
                          >
                            <SelectTrigger id="severity">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="priority">Priority *</Label>
                          <Select
                            value={deficiencyForm.priority}
                            onValueChange={(value) => setDeficiencyForm({ ...deficiencyForm, priority: value as any })}
                          >
                            <SelectTrigger id="priority">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="immediate">Immediate</SelectItem>
                              <SelectItem value="short_term">Short Term (1-2 years)</SelectItem>
                              <SelectItem value="medium_term">Medium Term (3-5 years)</SelectItem>
                              <SelectItem value="long_term">Long Term (5+ years)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="recommendedAction">Recommended Action</Label>
                        <Textarea
                          id="recommendedAction"
                          value={deficiencyForm.recommendedAction}
                          onChange={(e) => setDeficiencyForm({ ...deficiencyForm, recommendedAction: e.target.value })}
                          placeholder="Recommended repair or maintenance action"
                          rows={2}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="estimatedCost">Estimated Cost ($)</Label>
                        <Input
                          id="estimatedCost"
                          type="number"
                          step="0.01"
                          value={deficiencyForm.estimatedCost}
                          onChange={(e) => setDeficiencyForm({ ...deficiencyForm, estimatedCost: e.target.value })}
                          placeholder="e.g., 5000.00"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setDeficiencyDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createDeficiency.isPending}>
                        {createDeficiency.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Deficiency
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Deficiencies</CardTitle>
                <CardDescription>
                  Issues and maintenance requirements identified during assessment
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deficiencies && deficiencies.length > 0 ? (
                  <div className="space-y-3">
                    {deficiencies.map((deficiency) => (
                      <div key={deficiency.id} className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{deficiency.title}</div>
                            <div className="text-sm text-muted-foreground">{deficiency.componentCode}</div>
                          </div>
                          <div className="flex gap-2 items-center">
                            <Badge variant={
                              deficiency.severity === "critical" ? "destructive" :
                              deficiency.severity === "high" ? "destructive" :
                              deficiency.severity === "medium" ? "secondary" : "outline"
                            }>
                              {deficiency.severity}
                            </Badge>
                            <Badge variant="outline">{deficiency.priority.replace("_", " ")}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this deficiency?")) {
                                  deleteDeficiency.mutate({ id: deficiency.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {deficiency.description && (
                          <p className="text-sm">{deficiency.description}</p>
                        )}
                        {deficiency.location && (
                          <p className="text-sm text-muted-foreground">Location: {deficiency.location}</p>
                        )}
                        {deficiency.estimatedCost && (
                          <div className="text-sm font-medium">
                            Estimated Cost: {formatCurrency(deficiency.estimatedCost)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No deficiencies recorded yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="photos">
            <PhotoGallery projectId={projectId} />
          </TabsContent>

          <TabsContent value="sections">
            <BuildingSectionsManager projectId={projectId} />
          </TabsContent>

          <TabsContent value="hierarchy">
            <ProjectHierarchyConfig projectId={projectId} />
          </TabsContent>

          <TabsContent value="ratings">
            <ProjectRatingConfig projectId={projectId} />
          </TabsContent>

          <TabsContent value="report">
            <ReportTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Documents</CardTitle>
                <CardDescription>
                  Upload and manage reference documents for this project (PDFs, Word docs, Excel files, images)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <DocumentUploadZone
                  onUpload={async (file) => {
                    const reader = new FileReader();
                    reader.onload = async () => {
                      const base64Data = reader.result?.toString().split(',')[1];
                      if (base64Data) {
                        await uploadDocument.mutateAsync({
                          projectId,
                          fileName: file.name,
                          fileData: base64Data,
                          mimeType: file.type,
                          fileSize: file.size,
                        });
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                  disabled={uploadDocument.isPending}
                />
                <ProjectDocumentList
                  documents={documents || []}
                  onDelete={async (documentId) => {
                    await deleteDocument.mutateAsync({ documentId, projectId });
                  }}
                  isLoading={documentsLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Asset Locations
                </CardTitle>
                <CardDescription>
                  View all project assets on an interactive map. Click on markers to navigate to asset details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectAssetsMap projectId={projectId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status-history" className="space-y-4">
            <StatusHistoryTimeline projectId={projectId} />
          </TabsContent>

          <TabsContent value="ai-insights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI Insights</CardTitle>
                <CardDescription>
                  Ask questions about this project, get recommendations, and explore insights powered by AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AIChatBox
                  messages={aiMessages}
                  onSendMessage={handleAIMessage}
                  onClearConversation={() => clearConversationMutation.mutate({ projectId })}
                  isLoading={aiChatMutation.isPending || suggestedQuestionsLoading}
                  placeholder="Ask about this project, request analysis, or get recommendations..."
                  height="600px"
                  suggestedPrompts={suggestedQuestions}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Project Edit Dialog */}
      <Dialog open={projectEditDialogOpen} onOpenChange={setProjectEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveProject}>
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>
                Update project information and details
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={projectForm.address}
                  onChange={(e) => setProjectForm({ ...projectForm, address: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Project Status</Label>
                <Select
                  value={projectForm.status}
                  onValueChange={(value) => setProjectForm({ ...projectForm, status: value as 'draft' | 'in_progress' | 'completed' | 'archived' })}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={projectForm.clientName}
                  onChange={(e) => setProjectForm({ ...projectForm, clientName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="propertyType">Property Type</Label>
                  <Input
                    id="propertyType"
                    value={projectForm.propertyType}
                    onChange={(e) => setProjectForm({ ...projectForm, propertyType: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="constructionType">Construction Type</Label>
                  <Input
                    id="constructionType"
                    value={projectForm.constructionType}
                    onChange={(e) => setProjectForm({ ...projectForm, constructionType: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="yearBuilt">Year Built</Label>
                  <Input
                    id="yearBuilt"
                    type="number"
                    value={projectForm.yearBuilt}
                    onChange={(e) => setProjectForm({ ...projectForm, yearBuilt: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="buildingCode">Building Code</Label>
                  <BuildingCodeSelect
                    value={projectForm.buildingCodeId}
                    onChange={(value) => setProjectForm({ ...projectForm, buildingCodeId: value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="numberOfUnits">Number of Units</Label>
                  <Input
                    id="numberOfUnits"
                    type="number"
                    value={projectForm.numberOfUnits}
                    onChange={(e) => setProjectForm({ ...projectForm, numberOfUnits: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="numberOfStories">Number of Stories</Label>
                  <Input
                    id="numberOfStories"
                    type="number"
                    value={projectForm.numberOfStories}
                    onChange={(e) => setProjectForm({ ...projectForm, numberOfStories: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProjectEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateProject.isPending}>
                {updateProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assessment Edit Dialog */}
      <AssessmentDialog
        open={assessmentDialogOpen}
        onOpenChange={(open) => {
          setAssessmentDialogOpen(open);
          if (!open) {
            setEditingAssessment(null);
          }
        }}
        projectId={projectId}
        assetId={1}
        componentCode={editingAssessment?.componentCode || ""}
        componentName={editingAssessment?.componentCode || ""}
        existingAssessment={editingAssessment ? {
          condition: editingAssessment.condition,
          conditionPercentage: editingAssessment.conditionPercentage,
          observations: editingAssessment.observations,
          recommendations: editingAssessment.recommendations,
          remainingUsefulLife: editingAssessment.remainingUsefulLife,
          expectedUsefulLife: editingAssessment.expectedUsefulLife,
          reviewYear: editingAssessment.reviewYear,
          lastTimeAction: editingAssessment.lastTimeAction,
          estimatedRepairCost: editingAssessment.estimatedRepairCost,
          replacementValue: editingAssessment.replacementValue,
          actionYear: editingAssessment.actionYear,
        } : undefined}
        onSuccess={() => {
          setAssessmentDialogOpen(false);
          setEditingAssessment(null);
          toast.success("Assessment updated successfully");
        }}
      />
    </DashboardLayout>
  );
}
