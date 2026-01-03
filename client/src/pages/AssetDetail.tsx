import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  Warehouse, MapPin, Calendar, Building, ArrowLeft, 
  ClipboardCheck, DollarSign, AlertTriangle, Wrench
} from "lucide-react";
import { Link, useParams } from "wouter";

export default function AssetDetail() {
  const params = useParams<{ id: string }>();
  const assetId = parseInt(params.id || "0");
  
  const { data: assetData, isLoading: assetLoading } = trpc.assets.getById.useQuery(
    { id: assetId },
    { enabled: assetId > 0 }
  );
  
  const { data: assessments, isLoading: assessmentsLoading } = trpc.assessments.listByAsset.useQuery(
    { assetId },
    { enabled: assetId > 0 }
  );

  const asset = assetData?.asset;
  const category = assetData?.category;
  const project = assetData?.project;

  const getConditionBadge = (condition: string | null) => {
    const colors: Record<string, string> = {
      excellent: "bg-emerald-100 text-emerald-700",
      good: "bg-green-100 text-green-700",
      fair: "bg-yellow-100 text-yellow-700",
      poor: "bg-orange-100 text-orange-700",
      critical: "bg-red-100 text-red-700",
    };
    return condition ? (
      <Badge className={colors[condition] || "bg-gray-100 text-gray-700"}>
        {condition}
      </Badge>
    ) : (
      <Badge variant="outline">Not assessed</Badge>
    );
  };

  const getRatingBadge = (rating: string) => {
    const colors: Record<string, string> = {
      "5": "bg-emerald-100 text-emerald-700",
      "4": "bg-green-100 text-green-700",
      "3": "bg-yellow-100 text-yellow-700",
      "2": "bg-orange-100 text-orange-700",
      "1": "bg-red-100 text-red-700",
    };
    const labels: Record<string, string> = {
      "5": "Excellent",
      "4": "Good",
      "3": "Fair",
      "2": "Poor",
      "1": "Critical",
    };
    return (
      <Badge className={colors[rating] || "bg-gray-100 text-gray-700"}>
        {labels[rating] || rating}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string | null) => {
    if (!severity) return null;
    const colors: Record<string, string> = {
      minor: "bg-blue-100 text-blue-700",
      moderate: "bg-yellow-100 text-yellow-700",
      major: "bg-orange-100 text-orange-700",
      critical: "bg-red-100 text-red-700",
    };
    return (
      <Badge className={colors[severity] || "bg-gray-100 text-gray-700"} variant="outline">
        {severity}
      </Badge>
    );
  };

  const formatNumber = (num: string | null) => {
    if (!num) return "—";
    return parseFloat(num).toLocaleString();
  };

  const formatCurrency = (amount: string | null) => {
    if (!amount) return "—";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (assetLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (!asset) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Warehouse className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Asset not found</h3>
          <Link href="/assets">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Assets
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Link href="/assets">
            <Button variant="ghost" size="sm" className="w-fit">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Assets
            </Button>
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Warehouse className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{asset.name}</h1>
                <p className="text-muted-foreground font-mono text-sm">{asset.assetCode}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getConditionBadge(asset.overallCondition)}
              {asset.fciScore && (
                <Badge variant="outline">
                  FCI: {(parseFloat(asset.fciScore) * 100).toFixed(1)}%
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assessments">
              Assessments ({assessments?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Basic Info Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{category?.name || "—"}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Year Built</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{asset.yearBuilt || "—"}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Square Footage</CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="font-medium">{formatNumber(asset.squareFootage)} SF</span>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Floors</CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="font-medium">{asset.numberOfFloors || "—"}</span>
                </CardContent>
              </Card>
            </div>

            {/* Location */}
            {asset.address && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{asset.address}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Project Info */}
            {project && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href={`/projects/${project.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                      <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <ClipboardCheck className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">{project.projectNumber}</p>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Additional Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Primary Use</p>
                    <p className="font-medium">{asset.primaryUse || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Construction Type</p>
                    <p className="font-medium">{asset.constructionType || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Occupancy</p>
                    <p className="font-medium capitalize">{asset.occupancyType?.replace(/_/g, ' ') || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ownership</p>
                    <p className="font-medium capitalize">{asset.ownershipType || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Replacement Value</p>
                    <p className="font-medium">{formatCurrency(asset.replacementValue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Inspection</p>
                    <p className="font-medium">{formatDate(asset.lastInspectionDate)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessments" className="space-y-4">
            {assessmentsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : assessments && assessments.length > 0 ? (
              <div className="space-y-3">
                {assessments.map(({ assessment, component }) => (
                  <Card key={assessment.id}>
                    <CardContent className="pt-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Wrench className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{component?.name || "Unknown Component"}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {component?.category?.replace(/_/g, ' ')}
                            </p>
                            {assessment.location && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Location: {assessment.location}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          {getRatingBadge(assessment.conditionRating)}
                          {getSeverityBadge(assessment.deficiencySeverity)}
                          {assessment.safetyHazard && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Safety
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {(assessment.conditionNotes || assessment.deficiencyDescription) && (
                        <div className="mt-4 pt-4 border-t">
                          {assessment.conditionNotes && (
                            <p className="text-sm text-muted-foreground">{assessment.conditionNotes}</p>
                          )}
                          {assessment.deficiencyDescription && (
                            <p className="text-sm text-muted-foreground mt-2">
                              <span className="font-medium">Deficiency:</span> {assessment.deficiencyDescription}
                            </p>
                          )}
                        </div>
                      )}
                      
                      <div className="mt-4 flex flex-wrap gap-4 text-sm">
                        {assessment.recommendedAction && assessment.recommendedAction !== 'none' && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Wrench className="h-4 w-4" />
                            <span className="capitalize">{assessment.recommendedAction.replace(/_/g, ' ')}</span>
                          </div>
                        )}
                        {assessment.estimatedRepairCost && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span>{formatCurrency(assessment.estimatedRepairCost)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(assessment.assessmentDate)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No assessments yet</h3>
                  <p className="text-muted-foreground text-sm">
                    Component assessments will appear here once completed.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
