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
import { trpc } from "@/lib/trpc";
import { Building2, ClipboardCheck, AlertTriangle, DollarSign, Image, Loader2, ArrowLeft, Edit, FileText, Plus, Trash2, Download } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { useState } from "react";
import PhotoGallery from "@/components/PhotoGallery";
import ReportTab from "@/components/ReportTab";
import ExportButton from "@/components/ExportButton";
import { AssessmentDialog } from "@/components/AssessmentDialog";

export default function ProjectDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const projectId = parseInt(id!);
  
  const [deficiencyDialogOpen, setDeficiencyDialogOpen] = useState(false);
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<any>(null);
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
    { projectId },
    { enabled: !!user && !isNaN(projectId) }
  );
  const { data: deficiencies, refetch: refetchDeficiencies } = trpc.deficiencies.list.useQuery(
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
          <Button onClick={() => setLocation("/projects")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
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
            <Button variant="ghost" size="sm" onClick={() => setLocation("/projects")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground">
              {project.address || "No address specified"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation(`/projects/${projectId}/dashboard`)}>
              <Building2 className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button variant="outline" onClick={() => toast.info("Edit feature coming soon")}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button onClick={() => setLocation(`/projects/${projectId}/assess`)}>
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
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="deficiencies">Deficiencies</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="report">Report</TabsTrigger>
          </TabsList>

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
                  <div>{project.buildingCode || "Not specified"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Status</div>
                  <Badge>{project.status}</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessments">
            <Card>
              <CardHeader>
                <CardTitle>Component Assessments</CardTitle>
                <CardDescription>
                  Building components assessed following UNIFORMAT II classification
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assessments && assessments.length > 0 ? (
                  <div className="space-y-2">
                    {assessments.map((assessment) => (
                      <div key={assessment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex-1">
                          <div className="font-medium">{assessment.componentCode}</div>
                          <div className="text-sm text-muted-foreground line-clamp-1">{assessment.observations}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            assessment.condition === "good" ? "default" :
                            assessment.condition === "fair" ? "secondary" :
                            assessment.condition === "poor" ? "destructive" : "outline"
                          }>
                            {assessment.condition}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingAssessment(assessment);
                              setAssessmentDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
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

          <TabsContent value="report">
            <ReportTab projectId={projectId} />
          </TabsContent>
        </Tabs>
      </div>

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
