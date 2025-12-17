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
  AlertTriangle
} from "lucide-react";
import { useParams, useLocation } from "wouter";
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
          <TabsList>
            <TabsTrigger value="dashboard">
              <Building2 className="mr-2 h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="optimization">
              <Target className="mr-2 h-4 w-4" />
              Optimization
            </TabsTrigger>
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

          {/* Optimization Tab */}
          <TabsContent value="optimization" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Asset Optimization</CardTitle>
                <CardDescription>
                  Optimize maintenance and repair strategies for this asset
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Optimization features coming soon. This will include budget allocation,
                  priority scheduling, and lifecycle cost analysis.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
