import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Building2,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Layers,
  Calendar,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  FileText,
  ArrowLeft,
  FileDown,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PortfolioMap from "@/components/PortfolioMap";

// Color palette for charts
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

const PRIORITY_COLORS: Record<string, string> = {
  immediate: "#ef4444",
  short_term: "#f59e0b",
  medium_term: "#3b82f6",
  long_term: "#22c55e",
};

const CATEGORY_COLORS = [
  "#3b82f6", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"
];

// Format currency
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

// Format percentage
function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Get FCI color based on value
function getFCIColor(fci: number): string {
  if (fci <= 5) return COLORS.success;
  if (fci <= 10) return COLORS.warning;
  if (fci <= 30) return "#f97316"; // orange
  return COLORS.danger;
}

// Get condition badge variant
function getConditionVariant(condition: string): "default" | "secondary" | "destructive" | "outline" {
  switch (condition.toLowerCase()) {
    case "good": return "default";
    case "fair": return "secondary";
    case "poor": return "destructive";
    default: return "outline";
  }
}

export default function PortfolioAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const navigate = (delta: number) => {
    if (delta === -1) window.history.back();
  };
  const [activeTab, setActiveTab] = useState("overview");
  const [buildingSortBy, setBuildingSortBy] = useState<string>("priorityScore");
  const [buildingSortOrder, setBuildingSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  
  // Deficiency trends controls
  const [trendsPeriod, setTrendsPeriod] = useState<number>(12);
  const [trendsGranularity, setTrendsGranularity] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  
  // Get trpc utils for manual invalidation
  const utils = trpc.useUtils();

  // Fetch all analytics data
  const { data: dashboardData, isLoading, refetch, isRefetching } = trpc.portfolioAnalytics.getDashboardData.useQuery(
    undefined,
    { enabled: !!user }
  );
  
  // Fetch deficiency trends with custom parameters
  const { data: customDeficiencyTrends, isLoading: trendsLoading } = trpc.portfolioAnalytics.getDeficiencyTrends.useQuery(
    { months: trendsPeriod, granularity: trendsGranularity },
    { enabled: !!user }
  );
  
  // Use custom trends if available, otherwise fall back to dashboard data
  const deficiencyTrends = customDeficiencyTrends || dashboardData?.deficiencyTrends || [];

  // Fetch building comparison with custom sorting
  const { data: buildingComparison } = trpc.portfolioAnalytics.getBuildingComparison.useQuery(
    { sortBy: buildingSortBy as any, sortOrder: buildingSortOrder, limit: 50 },
    { enabled: !!user }
  );

  // Fetch deficiencies for selected priority
  const { data: priorityDeficiencies } = trpc.deficiencies.getByPriority.useQuery(
    { priority: selectedPriority! },
    { enabled: !!selectedPriority }
  );

  // Calculate total cost for selected priority
  const priorityTotalCost = priorityDeficiencies?.reduce(
    (sum, def) => sum + (def.estimatedCost || 0),
    0
  ) || 0;

  // Export deficiencies to CSV
  const exportDeficienciesToCSV = () => {
    if (!priorityDeficiencies || priorityDeficiencies.length === 0) return;

    const headers = ['Asset', 'Component', 'Description', 'Severity', 'Priority', 'Estimated Cost'];
    const rows = priorityDeficiencies.map((def: any) => [
      def.asset?.name || 'N/A',
      def.component?.name || 'N/A',
      (def.description || 'No description').replace(/"/g, '""'), // Escape quotes
      def.severity || 'N/A',
      getPriorityLabel(def.priority),
      def.estimatedCost ? `$${def.estimatedCost.toFixed(2)}` : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${getPriorityLabel(selectedPriority!)}_deficiencies_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle priority bar click
  const handlePriorityClick = (priority: string) => {
    setSelectedPriority(priority);
    setPriorityDialogOpen(true);
  };

  // Get priority label
  const getPriorityLabel = (priority: string) => {
    return priority.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!dashboardData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-muted-foreground">No analytics data available</p>
            <Button onClick={() => refetch()} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { overview, conditionDistribution, categoryCostBreakdown, priorityBreakdown, capitalForecast, geographicDistribution, propertyTypeDistribution } = dashboardData;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Enhanced Analytics Banner - Hidden */}
        {/* <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
          <AlertDescription className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <span className="text-sm">
              🚀 <strong>New!</strong> Advanced Portfolio Analytics with predictive forecasting, financial modeling, and benchmarking is now available.
            </span>
            <Link href="/portfolio-analytics-enhanced">
              <Button variant="default" size="sm">
                Try Enhanced Analytics
              </Button>
            </Link>
          </AlertDescription>
        </Alert> */}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Portfolio Analytics and BI</h1>
              <p className="text-muted-foreground">
                Comprehensive analysis across {overview.totalBuildings} buildings in your portfolio
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={async () => {
                // Invalidate all portfolio analytics queries to trigger refetch
                await utils.portfolioAnalytics.invalidate();
                // Also invalidate deficiencies if priority is selected
                if (selectedPriority) {
                  await utils.deficiencies.getByPriority.invalidate();
                }
              }} 
              disabled={isRefetching}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link href="/portfolio-wide-report">
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Buildings</p>
                  <p className="text-3xl font-bold">{overview.totalBuildings}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {overview.totalAssets} assets tracked
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Portfolio FCI</p>
                  <p className="text-3xl font-bold" style={{ color: getFCIColor(overview.portfolioFCI) }}>
                    {formatPercentage(overview.portfolioFCI)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {overview.portfolioFCIRating} condition
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total CRV</p>
                  <p className="text-3xl font-bold">{formatCurrency(overview.totalCurrentReplacementValue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Current replacement value
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Deferred Maintenance</p>
                  <p className="text-3xl font-bold text-red-500">{formatCurrency(overview.totalDeferredMaintenance)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {overview.totalDeficiencies} deficiencies
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Avg Building Age</p>
            <p className="text-xl font-semibold">{overview.averageBuildingAge} yrs</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Avg Condition</p>
            <p className="text-xl font-semibold">{overview.averageConditionRating}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Assessments</p>
            <p className="text-xl font-semibold">{overview.totalAssessments}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Critical Issues</p>
            <p className="text-xl font-semibold text-red-500">{overview.criticalDeficiencies}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Immediate Needs</p>
            <p className="text-xl font-semibold">{formatCurrency(overview.immediateNeeds)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Short-Term Needs</p>
            <p className="text-xl font-semibold">{formatCurrency(overview.shortTermNeeds)}</p>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="buildings">Buildings</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
            <TabsTrigger value="map">Map</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Condition Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Condition Distribution</CardTitle>
                  <CardDescription>Assessment conditions across all buildings</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={conditionDistribution}
                        dataKey="count"
                        nameKey="condition"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ condition, percentage }) => `${condition}: ${percentage}%`}
                      >
                        {conditionDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CONDITION_COLORS[entry.condition] || COLORS.muted} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value, 'Count']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Priority Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Deficiency Priority</CardTitle>
                  <CardDescription>Breakdown by urgency level</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={priorityBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={formatCurrency} />
                      <YAxis type="category" dataKey="priority" width={100} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar 
                        dataKey="totalCost" 
                        name="Total Cost"
                        onClick={(data: any) => handlePriorityClick(data.priority)}
                        style={{ cursor: 'pointer' }}
                      >
                        {priorityBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.priority] || COLORS.muted} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Capital Forecast */}
            <Card>
              <CardHeader>
                <CardTitle>5-Year Capital Planning Forecast</CardTitle>
                <CardDescription>Projected capital expenditure requirements</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={capitalForecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={formatCurrency} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="immediateNeeds" stackId="1" stroke="#ef4444" fill="#ef4444" name="Immediate" />
                    <Area type="monotone" dataKey="shortTermNeeds" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Short-Term" />
                    <Area type="monotone" dataKey="mediumTermNeeds" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Medium-Term" />
                    <Area type="monotone" dataKey="longTermNeeds" stackId="1" stroke="#22c55e" fill="#22c55e" name="Long-Term" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Buildings Tab */}
          <TabsContent value="buildings" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Building Comparison</CardTitle>
                    <CardDescription>Compare metrics across all buildings</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={buildingSortBy} onValueChange={setBuildingSortBy}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="priorityScore">Priority Score</SelectItem>
                        <SelectItem value="fci">FCI</SelectItem>
                        <SelectItem value="deferredMaintenanceCost">Deferred Maintenance</SelectItem>
                        <SelectItem value="conditionScore">Condition Score</SelectItem>
                        <SelectItem value="buildingAge">Building Age</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={buildingSortOrder} onValueChange={(v) => setBuildingSortOrder(v as "asc" | "desc")}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Descending</SelectItem>
                        <SelectItem value="asc">Ascending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="p-3 font-medium">Building</th>
                        <th className="p-3 font-medium text-right">Age</th>
                        <th className="p-3 font-medium text-right">FCI</th>
                        <th className="p-3 font-medium text-right">Condition</th>
                        <th className="p-3 font-medium text-right">CRV</th>
                        <th className="p-3 font-medium text-right">Deferred Maint.</th>
                        <th className="p-3 font-medium text-right">Deficiencies</th>
                        <th className="p-3 font-medium text-right">Priority</th>
                        <th className="p-3 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(buildingComparison || dashboardData.buildingComparison).map((building) => (
                        <tr key={building.assetId} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{building.assetName}</p>
                              <p className="text-xs text-muted-foreground">
                                {building.city && building.province ? `${building.city}, ${building.province}` : building.address || 'No address'}
                              </p>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-sm">
                              {building.buildingAge ? `${building.buildingAge} yrs` : 'N/A'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <span style={{ color: getFCIColor(building.fci) }} className="font-semibold">
                              {formatPercentage(building.fci)}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <Badge variant={getConditionVariant(building.conditionRating)}>
                              {building.conditionRating}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">{formatCurrency(building.currentReplacementValue)}</td>
                          <td className="p-3 text-right text-red-500">{formatCurrency(building.deferredMaintenanceCost)}</td>
                          <td className="p-3 text-right">{building.deficiencyCount}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary" 
                                  style={{ width: `${Math.min(building.priorityScore, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm">{building.priorityScore}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Link href={`/projects/${building.projectId}/assets/${building.assetId}`}>
                              <Button variant="ghost" size="sm">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Costs Tab */}
          <TabsContent value="costs" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Category Cost Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost by UNIFORMAT Category</CardTitle>
                  <CardDescription>Repair costs breakdown by building system</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryCostBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="categoryName" angle={-45} textAnchor="end" height={100} />
                      <YAxis tickFormatter={formatCurrency} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="totalRepairCost" name="Repair Cost">
                        {categoryCostBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category FCI */}
              <Card>
                <CardHeader>
                  <CardTitle>FCI by Category</CardTitle>
                  <CardDescription>Facility Condition Index per system</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryCostBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="categoryName" width={120} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                      <Bar dataKey="fci" name="FCI %">
                        {categoryCostBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getFCIColor(entry.fci)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Cost Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>Category Cost Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="p-3 font-medium">Category</th>
                        <th className="p-3 font-medium text-right">Repair Cost</th>
                        <th className="p-3 font-medium text-right">Replacement Value</th>
                        <th className="p-3 font-medium text-right">FCI</th>
                        <th className="p-3 font-medium text-right">Assessments</th>
                        <th className="p-3 font-medium text-right">Deficiencies</th>
                        <th className="p-3 font-medium text-right">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryCostBreakdown.map((cat, index) => (
                        <tr key={cat.categoryCode} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                              />
                              <span className="font-medium">{cat.categoryName}</span>
                              <span className="text-xs text-muted-foreground">({cat.categoryCode})</span>
                            </div>
                          </td>
                          <td className="p-3 text-right">{formatCurrency(cat.totalRepairCost)}</td>
                          <td className="p-3 text-right">{formatCurrency(cat.totalReplacementValue)}</td>
                          <td className="p-3 text-right">
                            <span style={{ color: getFCIColor(cat.fci) }} className="font-semibold">
                              {formatPercentage(cat.fci)}
                            </span>
                          </td>
                          <td className="p-3 text-right">{cat.assessmentCount}</td>
                          <td className="p-3 text-right">{cat.deficiencyCount}</td>
                          <td className="p-3 text-right">{cat.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            {/* Trends Controls */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Time Period & Granularity</h3>
                    <p className="text-sm text-muted-foreground">Customize the view of deficiency trends</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Time Period</label>
                      <Select value={trendsPeriod.toString()} onValueChange={(v) => setTrendsPeriod(parseInt(v))}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6">6 Months</SelectItem>
                          <SelectItem value="12">12 Months</SelectItem>
                          <SelectItem value="24">24 Months</SelectItem>
                          <SelectItem value="36">36 Months</SelectItem>
                          <SelectItem value="60">All Time (5Y)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Granularity</label>
                      <Select value={trendsGranularity} onValueChange={(v: any) => setTrendsGranularity(v)}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Statistics */}
            {deficiencyTrends.length > 0 && (() => {
              const totalDef = deficiencyTrends.reduce((sum, d) => sum + d.totalDeficiencies, 0);
              const avgPerPeriod = totalDef / deficiencyTrends.length;
              const firstPeriod = deficiencyTrends[0]?.totalDeficiencies || 0;
              const lastPeriod = deficiencyTrends[deficiencyTrends.length - 1]?.totalDeficiencies || 0;
              const trend = lastPeriod > firstPeriod ? 'increasing' : lastPeriod < firstPeriod ? 'decreasing' : 'stable';
              const trendPercent = firstPeriod > 0 ? ((lastPeriod - firstPeriod) / firstPeriod * 100) : 0;
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Total Deficiencies</p>
                        <p className="text-3xl font-bold">{totalDef}</p>
                        <p className="text-xs text-muted-foreground">In selected period</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Average per Period</p>
                        <p className="text-3xl font-bold">{avgPerPeriod.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">
                          {trendsGranularity === 'monthly' ? 'Per month' : trendsGranularity === 'quarterly' ? 'Per quarter' : 'Per year'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Trend Direction</p>
                        <div className="flex items-center gap-2">
                          <p className="text-3xl font-bold capitalize">{trend}</p>
                          {trend === 'increasing' && <ArrowUpRight className="h-6 w-6 text-red-500" />}
                          {trend === 'decreasing' && <ArrowDownRight className="h-6 w-6 text-green-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {trendPercent > 0 ? '+' : ''}{trendPercent.toFixed(1)}% vs. first period
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

            {/* Deficiency Count Trends - Stacked Area Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Deficiency Count by Priority</CardTitle>
                <CardDescription>
                  {trendsGranularity === 'monthly' ? 'Monthly' : trendsGranularity === 'quarterly' ? 'Quarterly' : 'Yearly'} breakdown of deficiencies by priority level
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <div className="h-[350px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : deficiencyTrends.length === 0 ? (
                  <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                    No data available for selected period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={deficiencyTrends}>
                      <defs>
                        <linearGradient id="colorImmediate" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0.2}/>
                        </linearGradient>
                        <linearGradient id="colorShortTerm" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.warning} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={COLORS.warning} stopOpacity={0.2}/>
                        </linearGradient>
                        <linearGradient id="colorMediumTerm" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.info} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={COLORS.info} stopOpacity={0.2}/>
                        </linearGradient>
                        <linearGradient id="colorLongTerm" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={COLORS.success} stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="immediateCount" stackId="1" stroke={COLORS.danger} fill="url(#colorImmediate)" name="Immediate" />
                      <Area type="monotone" dataKey="shortTermCount" stackId="1" stroke={COLORS.warning} fill="url(#colorShortTerm)" name="Short-Term" />
                      <Area type="monotone" dataKey="mediumTermCount" stackId="1" stroke={COLORS.info} fill="url(#colorMediumTerm)" name="Medium-Term" />
                      <Area type="monotone" dataKey="longTermCount" stackId="1" stroke={COLORS.success} fill="url(#colorLongTerm)" name="Long-Term" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Cost Trends - Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Deficiency Cost Trends</CardTitle>
                <CardDescription>Financial impact of identified deficiencies over time</CardDescription>
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : deficiencyTrends.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available for selected period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={deficiencyTrends}>
                      <defs>
                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis tickFormatter={formatCurrency} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Area type="monotone" dataKey="totalCost" stroke={COLORS.secondary} fill="url(#colorCost)" name="Total Cost" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Cumulative Capital Forecast */}
            <Card>
              <CardHeader>
                <CardTitle>Cumulative Capital Requirements</CardTitle>
                <CardDescription>Total projected expenditure over 5 years</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={capitalForecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={formatCurrency} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="totalProjectedCost" stroke={COLORS.primary} name="Annual Cost" strokeWidth={2} />
                    <Line type="monotone" dataKey="cumulativeCost" stroke={COLORS.secondary} name="Cumulative" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distribution Tab */}
          <TabsContent value="distribution" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Geographic Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Geographic Distribution</CardTitle>
                  <CardDescription>Buildings by location</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {geographicDistribution.slice(0, 10).map((loc, index) => (
                      <div key={`${loc.city}-${loc.province}`} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{loc.city}, {loc.province}</p>
                            <p className="text-xs text-muted-foreground">{loc.buildingCount} buildings</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(loc.totalCRV)}</p>
                          <p className="text-xs" style={{ color: getFCIColor(loc.averageFCI) }}>
                            FCI: {formatPercentage(loc.averageFCI)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Property Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Type Distribution</CardTitle>
                  <CardDescription>Buildings by property type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={propertyTypeDistribution}
                        dataKey="buildingCount"
                        nameKey="propertyType"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ propertyType, buildingCount }) => `${propertyType}: ${buildingCount}`}
                      >
                        {propertyTypeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Property Type Table */}
            <Card>
              <CardHeader>
                <CardTitle>Property Type Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="p-3 font-medium">Property Type</th>
                        <th className="p-3 font-medium text-right">Buildings</th>
                        <th className="p-3 font-medium text-right">Total CRV</th>
                        <th className="p-3 font-medium text-right">Deferred Maint.</th>
                        <th className="p-3 font-medium text-right">Avg FCI</th>
                        <th className="p-3 font-medium text-right">Avg Age</th>
                        <th className="p-3 font-medium text-right">Deficiencies</th>
                      </tr>
                    </thead>
                    <tbody>
                      {propertyTypeDistribution.map((pt, index) => (
                        <tr key={pt.propertyType} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                              />
                              <span className="font-medium">{pt.propertyType}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right">{pt.buildingCount}</td>
                          <td className="p-3 text-right">{formatCurrency(pt.totalCRV)}</td>
                          <td className="p-3 text-right text-red-500">{formatCurrency(pt.totalDeferredMaintenance)}</td>
                          <td className="p-3 text-right">
                            <span style={{ color: getFCIColor(pt.averageFCI) }} className="font-semibold">
                              {formatPercentage(pt.averageFCI)}
                            </span>
                          </td>
                          <td className="p-3 text-right">{pt.averageAge} yrs</td>
                          <td className="p-3 text-right">{pt.totalDeficiencies}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Map Tab */}
          <TabsContent value="map" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Map</CardTitle>
                <CardDescription>
                  Interactive map showing all {overview.totalBuildings} buildings in your portfolio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PortfolioMap />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Data generated at: {new Date(dashboardData.generatedAt).toLocaleString()}</p>
        </div>
      </div>

      {/* Priority Drill-Down Dialog */}
      <Dialog open={priorityDialogOpen} onOpenChange={setPriorityDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle>
                  {selectedPriority && getPriorityLabel(selectedPriority)} Priority Deficiencies
                </DialogTitle>
                <DialogDescription className="mt-2">
                  {priorityDeficiencies?.length || 0} deficiencies found for this priority level
                </DialogDescription>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    Total Estimated Cost: {formatCurrency(priorityTotalCost)}
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportDeficienciesToCSV}
                disabled={!priorityDeficiencies || priorityDeficiencies.length === 0}
                className="ml-4"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </DialogHeader>
          
          {priorityDeficiencies && priorityDeficiencies.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead className="text-right">Est. Cost</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priorityDeficiencies.map((deficiency: any) => (
                    <TableRow key={deficiency.id}>
                      <TableCell className="font-medium">
                        {deficiency.asset?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {deficiency.component?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={deficiency.description}>
                          {deficiency.description || 'No description'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            deficiency.severity === 'critical' ? 'destructive' :
                            deficiency.severity === 'high' ? 'secondary' : 'outline'
                          }
                        >
                          {deficiency.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {deficiency.estimatedCost 
                          ? formatCurrency(deficiency.estimatedCost)
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPriorityDialogOpen(false);
                            setLocation(`/assets/${deficiency.assetId}`);
                          }}
                        >
                          View Asset
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No deficiencies found for this priority level
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
