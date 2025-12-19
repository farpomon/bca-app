import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  Building2, 
  ArrowLeft, 
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
  CalendarDays
} from "lucide-react";
import { useParams, useLocation } from "wouter";
import AssetPhotoUpload from "@/components/AssetPhotoUpload";
import AssetPhotoGallery from "@/components/AssetPhotoGallery";
import AssetDocumentUpload from "@/components/AssetDocumentUpload";
import AssetDocumentList from "@/components/AssetDocumentList";
import AssetOptimization from "@/components/AssetOptimization";
// import AssetTimeline from "@/components/AssetTimeline";
import { toast } from "sonner";
import ExportButton from "@/components/ExportButton";

export default function AssetDetail() {
  const { id, assetId } = useParams();
  const [, setLocation] = useLocation();
  const projectId = parseInt(id!);
  const assetIdNum = parseInt(assetId!);

  const { user, loading: authLoading } = useAuth();
  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery(
    { id: projectId },
    { enabled: !!user && !isNaN(projectId) }
  );
  const { data: asset, isLoading: assetLoading } = trpc.assets.get.useQuery(
    { id: assetIdNum, projectId },
    { enabled: !!user && !isNaN(assetIdNum) && !isNaN(projectId) }
  );
  const { data: assessments } = trpc.assessments.listByAsset.useQuery(
    { assetId: assetIdNum },
    { enabled: !!user && !isNaN(assetIdNum) }
  );
  const { data: deficiencies } = trpc.deficiencies.listByAsset.useQuery(
    { assetId: assetIdNum },
    { enabled: !!user && !isNaN(assetIdNum) }
  );

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
          <Button onClick={() => setLocation(`/projects/${projectId}/assets`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assets
          </Button>
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
  const totalEstimatedCost = deficiencies?.reduce((sum, d) => sum + (d.estimatedCost || 0), 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation(`/projects/${projectId}/assets`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{asset.name}</h1>
              {getStatusBadge(asset.status)}
            </div>
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
          <TabsList className="w-full max-w-full overflow-x-auto scrollbar-hide">
            <TabsTrigger value="dashboard" className="flex-none px-3">
              <Building2 className="mr-2 h-4 w-4" />
              Dashboard
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
            {/* <TabsTrigger value="timeline" className="flex-none px-3">
              <CalendarDays className="mr-2 h-4 w-4" />
              Timeline
            </TabsTrigger> */}
          </TabsList>

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
                  type="cost-estimates"
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
                  <div className="text-2xl font-bold">-</div>
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
                      <p className="text-sm font-medium">{asset.grossFloorArea.toLocaleString()} sq ft</p>
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
                  {asset.occupancyType && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Occupancy</h3>
                      <p className="text-sm font-medium">{asset.occupancyType}</p>
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
                  <div className="space-y-2">
                    {assessments.map((assessment) => (
                      <div key={assessment.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{assessment.componentCode}</p>
                            <p className="text-sm text-muted-foreground">{assessment.componentName || 'Unknown Component'}</p>
                          </div>
                          <Badge variant={assessment.condition === 'good' ? 'default' : assessment.condition === 'fair' ? 'secondary' : 'destructive'}>
                            {assessment.condition}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No assessments found for this asset</p>
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
                <AssetPhotoGallery assetId={assetIdNum} />
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

          {/* Financial Summary Tab */}
          <TabsContent value="financial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>
                  Cost breakdown and budget allocation for this asset
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Estimated Costs</h3>
                    <p className="text-3xl font-bold">${totalEstimatedCost.toLocaleString()}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Repair Costs</h3>
                      <p className="text-xl font-semibold">${totalEstimatedCost.toLocaleString()}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">FCI</h3>
                      <p className="text-xl font-semibold">-</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Building Code Compliance</CardTitle>
                <CardDescription>
                  Compliance status and violations for this asset
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Compliance tracking coming soon. This will show building code violations and recommendations.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3D Model Tab */}
          <TabsContent value="3d-model" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>3D Digital Twin</CardTitle>
                <CardDescription>
                  Interactive 3D model with clickable annotations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  3D model viewer coming soon. This will display digital twin models with linked assessments.
                </p>
              </CardContent>
            </Card>
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
            <Card>
              <CardHeader>
                <CardTitle>Asset Reports</CardTitle>
                <CardDescription>
                  Generate customized reports for this asset
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Generate comprehensive reports in PDF or Excel format
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" disabled>
                    <Download className="mr-2 h-4 w-4" />
                    PDF Report
                  </Button>
                  <Button variant="outline" disabled>
                    <Download className="mr-2 h-4 w-4" />
                    Excel Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Optimization Tab */}
          <TabsContent value="optimization" className="space-y-4">
            <AssetOptimization 
              assetId={assetIdNum}
              assessments={assessments}
              deficiencies={deficiencies}
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
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
