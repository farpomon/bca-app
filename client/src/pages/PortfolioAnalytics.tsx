import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";

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
  const [activeTab, setActiveTab] = useState("overview");
  const [buildingSortBy, setBuildingSortBy] = useState<string>("priorityScore");
  const [buildingSortOrder, setBuildingSortOrder] = useState<"asc" | "desc">("desc");

  // Fetch all analytics data
  const { data: dashboardData, isLoading, refetch, isRefetching } = trpc.portfolioAnalytics.getDashboardData.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Fetch building comparison with custom sorting
  const { data: buildingComparison } = trpc.portfolioAnalytics.getBuildingComparison.useQuery(
    { sortBy: buildingSortBy as any, sortOrder: buildingSortOrder, limit: 50 },
    { enabled: !!user }
  );

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No analytics data available</p>
          <Button onClick={() => refetch()} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  const { overview, conditionDistribution, categoryCostBreakdown, priorityBreakdown, deficiencyTrends, capitalForecast, geographicDistribution, propertyTypeDistribution } = dashboardData;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Portfolio Analytics</h1>
            <p className="text-muted-foreground">
              Comprehensive analysis across {overview.totalBuildings} buildings in your portfolio
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link href="/portfolio-report">
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="buildings">Buildings</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
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
                      <Bar dataKey="totalCost" name="Total Cost">
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
                        <tr key={building.projectId} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{building.projectName}</p>
                              <p className="text-xs text-muted-foreground">
                                {building.city && building.province ? `${building.city}, ${building.province}` : building.address || 'No address'}
                              </p>
                            </div>
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
                            <Link href={`/projects/${building.projectId}`}>
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
            <Card>
              <CardHeader>
                <CardTitle>Deficiency Trends</CardTitle>
                <CardDescription>Monthly deficiency identification over the past 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={deficiencyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={formatCurrency} />
                    <Tooltip formatter={(value: number, name: string) => 
                      name === 'totalCost' ? formatCurrency(value) : value
                    } />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="totalDeficiencies" stroke={COLORS.primary} name="Total" strokeWidth={2} />
                    <Line yAxisId="left" type="monotone" dataKey="immediateCount" stroke={COLORS.danger} name="Immediate" />
                    <Line yAxisId="left" type="monotone" dataKey="shortTermCount" stroke={COLORS.warning} name="Short-Term" />
                    <Line yAxisId="left" type="monotone" dataKey="resolvedCount" stroke={COLORS.success} name="Resolved" strokeDasharray="5 5" />
                    <Line yAxisId="right" type="monotone" dataKey="totalCost" stroke={COLORS.secondary} name="Total Cost" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
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
        </Tabs>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Data generated at: {new Date(dashboardData.generatedAt).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
