import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  FolderKanban, Calendar, DollarSign, Building2, ArrowLeft, 
  Warehouse, Mail, Phone, MapPin 
} from "lucide-react";
import { Link, useParams } from "wouter";

export default function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id || "0");
  
  const { data: projectData, isLoading: projectLoading } = trpc.projects.getWithMunicipality.useQuery(
    { id: projectId },
    { enabled: projectId > 0 }
  );
  
  const { data: assets, isLoading: assetsLoading } = trpc.assets.list.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  const project = projectData?.project;
  const municipality = projectData?.municipality;

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700",
      in_progress: "bg-blue-100 text-blue-700",
      under_review: "bg-yellow-100 text-yellow-700",
      completed: "bg-green-100 text-green-700",
      archived: "bg-slate-100 text-slate-700",
    };
    return (
      <Badge className={colors[status] || colors.draft}>
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

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

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
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

  if (projectLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Project not found</h3>
          <Link href="/projects">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
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
          <Link href="/projects">
            <Button variant="ghost" size="sm" className="w-fit">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <FolderKanban className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                <p className="text-muted-foreground font-mono text-sm">{project.projectNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(project.status)}
            </div>
          </div>
        </div>

        {/* Project Info Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Municipality</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{municipality?.name || "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Due Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{formatDate(project.dueDate)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{formatCurrency(project.budget)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Contact */}
        {(project.clientContact || project.clientEmail || project.clientPhone) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Client Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6">
                {project.clientContact && (
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{project.clientContact}</p>
                  </div>
                )}
                {project.clientEmail && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{project.clientEmail}</p>
                  </div>
                )}
                {project.clientPhone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{project.clientPhone}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {project.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{project.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Assets */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Assets</CardTitle>
                <CardDescription>
                  {assets?.length || 0} assets in this project
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {assetsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : assets && assets.length > 0 ? (
              <div className="space-y-2">
                {assets.map(({ asset, category }) => (
                  <Link key={asset.id} href={`/assets/${asset.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <Warehouse className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-medium">{asset.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {asset.assetCode} • {category?.name || "Uncategorized"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getConditionBadge(asset.overallCondition)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Warehouse className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">No assets in this project</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
