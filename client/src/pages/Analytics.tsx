import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, DollarSign, AlertTriangle, BarChart3 } from "lucide-react";
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
import { Pie, Bar, Line } from 'react-chartjs-2';

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

export default function Analytics() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>();
  const [timeRange, setTimeRange] = useState<number>(12);

  // Fetch data
  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery();
  const { data: companies, isLoading: companiesLoading } = trpc.admin.listCompanies.useQuery();
  
  const { data: overview, isLoading: overviewLoading } = trpc.analytics.getDashboardOverview.useQuery({
    projectId: selectedProjectId,
    companyId: selectedCompanyId,
  });

  const { data: trends, isLoading: trendsLoading } = trpc.analytics.getAssessmentTrends.useQuery({
    projectId: selectedProjectId,
    companyId: selectedCompanyId,
    months: timeRange,
  });

  const { data: componentAnalysis, isLoading: componentLoading } = trpc.analytics.getComponentAnalysis.useQuery({
    projectId: selectedProjectId,
    companyId: selectedCompanyId,
  });

  const { data: projectAnalytics, isLoading: projectAnalyticsLoading } = trpc.analytics.getProjectAnalytics.useQuery({
    companyId: selectedCompanyId,
  });

  const isLoading = overviewLoading || trendsLoading || componentLoading;

  // Prepare chart data
  const conditionChartData = overview?.conditionDistribution ? {
    labels: overview.conditionDistribution.map(d => d.condition.replace('_', ' ').toUpperCase()),
    datasets: [{
      data: overview.conditionDistribution.map(d => d.count),
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',  // good - green
        'rgba(234, 179, 8, 0.8)',   // fair - yellow
        'rgba(239, 68, 68, 0.8)',   // poor - red
        'rgba(156, 163, 175, 0.8)', // not_assessed - gray
      ],
      borderColor: [
        'rgb(34, 197, 94)',
        'rgb(234, 179, 8)',
        'rgb(239, 68, 68)',
        'rgb(156, 163, 175)',
      ],
      borderWidth: 2,
    }],
  } : null;

  const deficiencyChartData = overview?.deficiencyBreakdown ? {
    labels: overview.deficiencyBreakdown.map(d => d.priority.replace('_', ' ').toUpperCase()),
    datasets: [{
      label: 'Count',
      data: overview.deficiencyBreakdown.map(d => d.count),
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 2,
    }],
  } : null;

  const trendsChartData = trends ? {
    labels: trends.map(t => t.month),
    datasets: [
      {
        label: 'Assessment Count',
        data: trends.map(t => t.count),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
        yAxisID: 'y',
      },
      {
        label: 'Avg Condition Score',
        data: trends.map(t => t.avgConditionScore),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.4,
        fill: true,
        yAxisID: 'y1',
      },
    ],
  } : null;

  const componentChartData = componentAnalysis ? {
    labels: componentAnalysis.slice(0, 10).map(c => c.componentCode),
    datasets: [{
      label: 'Total Repair Cost',
      data: componentAnalysis.slice(0, 10).map(c => c.totalRepairCost),
      backgroundColor: 'rgba(239, 68, 68, 0.8)',
      borderColor: 'rgb(239, 68, 68)',
      borderWidth: 2,
    }],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  const trendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Assessment Count',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Condition Score (1-4)',
        },
        grid: {
          drawOnChartArea: false,
        },
        min: 0,
        max: 4,
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into building conditions, assessments, and deficiencies
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter analytics by company, project, or time range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Company</label>
                <Select
                  value={selectedCompanyId?.toString() || "all"}
                  onValueChange={(value) => {
                    setSelectedCompanyId(value === "all" ? undefined : parseInt(value));
                    setSelectedProjectId(undefined);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Companies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies?.map((company) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Project</label>
                <Select
                  value={selectedProjectId?.toString() || "all"}
                  onValueChange={(value) => setSelectedProjectId(value === "all" ? undefined : parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Time Range</label>
                <Select
                  value={timeRange.toString()}
                  onValueChange={(value) => setTimeRange(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">Last 6 Months</SelectItem>
                    <SelectItem value="12">Last 12 Months</SelectItem>
                    <SelectItem value="24">Last 24 Months</SelectItem>
                    <SelectItem value="36">Last 36 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview?.costAnalysis.assessmentCount || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Across all assets</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Repair Cost</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${(overview?.costAnalysis.totalRepairCost || 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Estimated repairs needed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg Repair Cost</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${(overview?.costAnalysis.avgRepairCost || 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Per assessment</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Deficiencies</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overview?.deficiencyBreakdown.reduce((sum, d) => sum + d.count, 0) || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Identified issues</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
                <TabsTrigger value="components">Components</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Condition Distribution</CardTitle>
                      <CardDescription>Overall condition assessment breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div style={{ height: '300px' }}>
                        {conditionChartData ? (
                          <Pie data={conditionChartData} options={chartOptions} />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            No data available
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Deficiency Priority Breakdown</CardTitle>
                      <CardDescription>Issues grouped by priority level</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div style={{ height: '300px' }}>
                        {deficiencyChartData ? (
                          <Bar data={deficiencyChartData} options={chartOptions} />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            No data available
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="trends" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Assessment Trends Over Time</CardTitle>
                    <CardDescription>Track assessment volume and condition scores</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div style={{ height: '400px' }}>
                      {trendsChartData ? (
                        <Line data={trendsChartData} options={trendChartOptions} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          No data available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="components" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Component Analysis (UNIFORMAT II)</CardTitle>
                    <CardDescription>Top 10 components by repair cost</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div style={{ height: '400px' }}>
                      {componentChartData ? (
                        <Bar data={componentChartData} options={chartOptions} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          No data available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Component Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Code</th>
                            <th className="text-left p-2">Component</th>
                            <th className="text-right p-2">Assessments</th>
                            <th className="text-right p-2">Avg Score</th>
                            <th className="text-right p-2">Repair Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {componentAnalysis?.slice(0, 10).map((comp, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="p-2 font-mono text-sm">{comp.componentCode}</td>
                              <td className="p-2">{comp.componentName}</td>
                              <td className="p-2 text-right">{comp.assessmentCount}</td>
                              <td className="p-2 text-right">{comp.avgConditionScore.toFixed(2)}</td>
                              <td className="p-2 text-right">${comp.totalRepairCost.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="projects" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Analytics</CardTitle>
                    <CardDescription>Performance metrics by project</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Project</th>
                            <th className="text-right p-2">Assets</th>
                            <th className="text-right p-2">Assessments</th>
                            <th className="text-right p-2">Deficiencies</th>
                            <th className="text-right p-2">Avg Score</th>
                            <th className="text-right p-2">Total Repair Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectAnalytics?.map((proj) => (
                            <tr key={proj.projectId} className="border-b hover:bg-muted/50">
                              <td className="p-2">{proj.projectName}</td>
                              <td className="p-2 text-right">{proj.assetCount}</td>
                              <td className="p-2 text-right">{proj.assessmentCount}</td>
                              <td className="p-2 text-right">{proj.deficiencyCount}</td>
                              <td className="p-2 text-right">{proj.avgConditionScore.toFixed(2)}</td>
                              <td className="p-2 text-right">${proj.totalRepairCost.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
