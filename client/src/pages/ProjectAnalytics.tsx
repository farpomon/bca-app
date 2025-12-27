import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/BackButton";
import { Loader2, TrendingUp, DollarSign, AlertTriangle, BarChart3, Building2, ArrowUpRight, ArrowDownRight, Download } from "lucide-react";
import { useParams } from "wouter";
import { 
  Chart as ChartJS, 
  ArcElement, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement, 
  PointElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Pie, Bar, Line, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Color palette
const COLORS = {
  primary: "#3b82f6",
  secondary: "#8b5cf6",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#06b6d4",
  muted: "#6b7280",
};

const CONDITION_COLORS: Record<string, string> = {
  good: "#22c55e",
  fair: "#f59e0b",
  poor: "#ef4444",
  not_assessed: "#6b7280",
};

// Format currency
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export default function ProjectAnalytics() {
  const { id } = useParams();
  const projectId = parseInt(id!);

  // Fetch project data
  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery(
    { id: projectId },
    { enabled: !isNaN(projectId) }
  );

  // Fetch assets for this project
  const { data: assets, isLoading: assetsLoading } = trpc.assets.list.useQuery(
    { projectId },
    { enabled: !isNaN(projectId) }
  );

  // Fetch analytics data
  const { data: overview, isLoading: overviewLoading } = trpc.analytics.getDashboardOverview.useQuery({
    projectId,
  });

  const { data: trends, isLoading: trendsLoading } = trpc.analytics.getAssessmentTrends.useQuery({
    projectId,
    months: 12,
  });

  const { data: componentAnalysis, isLoading: componentLoading } = trpc.analytics.getComponentAnalysis.useQuery({
    projectId,
  });

  const isLoading = projectLoading || assetsLoading || overviewLoading || trendsLoading || componentLoading;

  // Calculate project-level metrics
  const totalAssets = assets?.length || 0;
  const totalDeficiencies = overview?.totalDeficiencies || 0;
  const totalCost = overview?.totalEstimatedCost || 0;
  const avgCondition = overview?.conditionDistribution?.reduce((acc, d) => {
    const weight = d.condition === 'good' ? 3 : d.condition === 'fair' ? 2 : d.condition === 'poor' ? 1 : 0;
    return acc + (weight * d.count);
  }, 0) || 0;
  const totalAssessments = overview?.conditionDistribution?.reduce((acc, d) => acc + d.count, 0) || 1;
  const avgScore = (avgCondition / totalAssessments) * 33.33;

  // Prepare chart data
  const conditionChartData = overview?.conditionDistribution ? {
    labels: overview.conditionDistribution.map(d => d.condition.replace('_', ' ').toUpperCase()),
    datasets: [{
      data: overview.conditionDistribution.map(d => d.count),
      backgroundColor: overview.conditionDistribution.map(d => CONDITION_COLORS[d.condition] || COLORS.muted),
      borderColor: overview.conditionDistribution.map(d => CONDITION_COLORS[d.condition] || COLORS.muted),
      borderWidth: 2,
    }],
  } : null;

  const deficiencyChartData = overview?.deficiencyBreakdown ? {
    labels: overview.deficiencyBreakdown.map(d => d.priority.replace('_', ' ').toUpperCase()),
    datasets: [{
      label: 'Count',
      data: overview.deficiencyBreakdown.map(d => d.count),
      backgroundColor: [
        COLORS.danger,
        COLORS.warning,
        COLORS.primary,
        COLORS.success,
      ],
      borderColor: [
        COLORS.danger,
        COLORS.warning,
        COLORS.primary,
        COLORS.success,
      ],
      borderWidth: 2,
    }],
  } : null;

  const trendsChartData = trends ? {
    labels: trends.map(t => t.month),
    datasets: [
      {
        label: 'Assessments',
        data: trends.map(t => t.assessmentCount),
        borderColor: COLORS.primary,
        backgroundColor: `${COLORS.primary}20`,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Deficiencies Found',
        data: trends.map(t => t.deficiencyCount),
        borderColor: COLORS.danger,
        backgroundColor: `${COLORS.danger}20`,
        fill: true,
        tension: 0.4,
      },
    ],
  } : null;

  const componentChartData = componentAnalysis ? {
    labels: componentAnalysis.slice(0, 10).map(c => c.componentName.length > 20 ? c.componentName.substring(0, 20) + '...' : c.componentName),
    datasets: [{
      label: 'Assessments',
      data: componentAnalysis.slice(0, 10).map(c => c.assessmentCount),
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
      borderWidth: 1,
    }],
  } : null;

  // Asset breakdown by type
  const assetTypeBreakdown = assets?.reduce((acc, asset) => {
    const type = asset.assetType || 'Other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const assetTypeChartData = {
    labels: Object.keys(assetTypeBreakdown),
    datasets: [{
      data: Object.values(assetTypeBreakdown),
      backgroundColor: [
        COLORS.primary,
        COLORS.secondary,
        COLORS.success,
        COLORS.warning,
        COLORS.danger,
        COLORS.info,
      ],
      borderWidth: 2,
    }],
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Project not found</h2>
          <BackButton to="/" label="Back to Projects" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <BackButton to={`/projects/${projectId}/assets`} label="Back to Assets" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <BarChart3 className="h-8 w-8" />
                Project Analytics
              </h1>
              <p className="text-muted-foreground">{project.name}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAssets}</div>
              <p className="text-xs text-muted-foreground">
                In this project
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deficiencies</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDeficiencies}</div>
              <p className="text-xs text-muted-foreground">
                Across all assets
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
              <p className="text-xs text-muted-foreground">
                Total repair costs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Condition Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgScore.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground">
                Portfolio health
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="conditions">Conditions</TabsTrigger>
            <TabsTrigger value="deficiencies">Deficiencies</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Asset Types</CardTitle>
                  <CardDescription>Distribution of assets by type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    {Object.keys(assetTypeBreakdown).length > 0 ? (
                      <Doughnut
                        data={assetTypeChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                            },
                          },
                        }}
                      />
                    ) : (
                      <p className="text-muted-foreground">No asset data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Condition Distribution</CardTitle>
                  <CardDescription>Overall condition of assessed components</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    {conditionChartData ? (
                      <Pie
                        data={conditionChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                            },
                          },
                        }}
                      />
                    ) : (
                      <p className="text-muted-foreground">No condition data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="conditions" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Condition Breakdown</CardTitle>
                  <CardDescription>Component conditions across all assets</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    {conditionChartData ? (
                      <Doughnut
                        data={conditionChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                            },
                          },
                        }}
                      />
                    ) : (
                      <p className="text-muted-foreground">No condition data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Assessed Components</CardTitle>
                  <CardDescription>Most frequently assessed building components</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {componentChartData ? (
                      <Bar
                        data={componentChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          indexAxis: 'y',
                          plugins: {
                            legend: {
                              display: false,
                            },
                          },
                          scales: {
                            x: {
                              beginAtZero: true,
                            },
                          },
                        }}
                      />
                    ) : (
                      <p className="text-muted-foreground">No component data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="deficiencies" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Deficiency Priority</CardTitle>
                  <CardDescription>Breakdown by priority level</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    {deficiencyChartData ? (
                      <Pie
                        data={deficiencyChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                            },
                          },
                        }}
                      />
                    ) : (
                      <p className="text-muted-foreground">No deficiency data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Priority Summary</CardTitle>
                  <CardDescription>Deficiencies requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {overview?.deficiencyBreakdown?.map((item) => (
                      <div key={item.priority} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ 
                              backgroundColor: item.priority === 'immediate' ? COLORS.danger :
                                item.priority === 'short_term' ? COLORS.warning :
                                item.priority === 'medium_term' ? COLORS.primary : COLORS.success
                            }}
                          />
                          <span className="capitalize">{item.priority.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{item.count}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(item.totalCost)}
                          </span>
                        </div>
                      </div>
                    )) || (
                      <p className="text-muted-foreground">No deficiency data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Trends</CardTitle>
                <CardDescription>Assessment activity over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  {trendsChartData ? (
                    <Line
                      data={trendsChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                          },
                        },
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No trend data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Asset List Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Summary</CardTitle>
            <CardDescription>Quick overview of all assets in this project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assets?.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{asset.name}</p>
                      <p className="text-sm text-muted-foreground">{asset.assetType || 'Unknown type'}</p>
                    </div>
                  </div>
                  <Badge variant={asset.status === 'active' ? 'default' : 'secondary'}>
                    {asset.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
