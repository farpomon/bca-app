import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Building2, FolderKanban, Warehouse, ClipboardCheck, TrendingUp, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();

  const getConditionColor = (condition: string | null) => {
    switch (condition) {
      case 'excellent': return 'bg-emerald-500';
      case 'good': return 'bg-green-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500';
      case 'in_progress': return 'bg-blue-500';
      case 'under_review': return 'bg-yellow-500';
      case 'draft': return 'bg-gray-400';
      case 'archived': return 'bg-slate-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your building condition assessments
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/municipalities">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Municipalities</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : stats?.totalMunicipalities || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active municipalities
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/projects">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projects</CardTitle>
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : stats?.totalProjects || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Assessment projects
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/assets">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assets</CardTitle>
                <Warehouse className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : stats?.totalAssets || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Buildings & facilities
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assessments</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : stats?.totalAssessments || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Component assessments
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Condition Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Asset Condition Distribution</CardTitle>
              <CardDescription>Overall condition of assessed assets</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <div className="space-y-3">
                  {stats?.conditionDistribution?.map((item) => {
                    const total = stats.totalAssets || 1;
                    const percentage = Math.round((item.count / total) * 100);
                    return (
                      <div key={item.condition || 'unknown'} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize">{item.condition || 'Not Assessed'}</span>
                          <span className="text-muted-foreground">{item.count} ({percentage}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getConditionColor(item.condition)} transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {(!stats?.conditionDistribution || stats.conditionDistribution.length === 0) && (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      No data available
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Status</CardTitle>
              <CardDescription>Current status of assessment projects</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <div className="space-y-3">
                  {stats?.projectStatusDistribution?.map((item) => {
                    const total = stats.totalProjects || 1;
                    const percentage = Math.round((item.count / total) * 100);
                    const statusLabel = item.status?.replace(/_/g, ' ') || 'Unknown';
                    return (
                      <div key={item.status || 'unknown'} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize">{statusLabel}</span>
                          <span className="text-muted-foreground">{item.count} ({percentage}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getStatusColor(item.status)} transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {(!stats?.projectStatusDistribution || stats.projectStatusDistribution.length === 0) && (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      No data available
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks and navigation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Link href="/projects">
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FolderKanban className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">View Projects</p>
                    <p className="text-xs text-muted-foreground">Browse all assessment projects</p>
                  </div>
                </div>
              </Link>
              
              <Link href="/assets">
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Warehouse className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">View Assets</p>
                    <p className="text-xs text-muted-foreground">Browse buildings & facilities</p>
                  </div>
                </div>
              </Link>
              
              <Link href="/municipalities">
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">View Municipalities</p>
                    <p className="text-xs text-muted-foreground">Browse client municipalities</p>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
