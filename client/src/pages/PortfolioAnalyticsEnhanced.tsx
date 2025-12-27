import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  AlertTriangle,
  RefreshCw,
  Download,
  Calculator,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";

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

// Format currency
function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(0)}K`;
  }
  return `$${num.toFixed(0)}`;
}

// Format percentage
function formatPercentage(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `${num.toFixed(1)}%`;
}

// Get status color
function getStatusColor(status: string): string {
  switch (status) {
    case "on_track":
    case "achieved":
      return COLORS.success;
    case "at_risk":
      return COLORS.warning;
    case "off_track":
      return COLORS.danger;
    default:
      return COLORS.muted;
  }
}

// Get recommendation color
function getRecommendationColor(recommendation: string): string {
  switch (recommendation) {
    case "proceed":
      return COLORS.success;
    case "requires_review":
      return COLORS.warning;
    case "defer":
      return COLORS.info;
    case "reject":
      return COLORS.danger;
    default:
      return COLORS.muted;
  }
}

export default function PortfolioAnalyticsEnhanced() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [forecastMonths, setForecastMonths] = useState(12);
  const [scenarioType, setScenarioType] = useState<"best_case" | "most_likely" | "worst_case">("most_likely");

  // Fetch advanced dashboard data
  const { data: dashboardData, isLoading, refetch, isRefetching } = 
    trpc.portfolioAnalyticsEnhanced.getAdvancedDashboardData.useQuery(
      undefined,
      { enabled: !!user }
    );

  // Fetch metrics trend
  const { data: metricsTrend } = trpc.portfolioAnalyticsEnhanced.getMetricsTrend.useQuery(
    { months: forecastMonths },
    { enabled: !!user }
  );

  // Fetch portfolio targets
  const { data: targets } = trpc.portfolioAnalyticsEnhanced.getPortfolioTargets.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Fetch forecasts
  const { data: forecasts } = trpc.portfolioAnalyticsEnhanced.getForecasts.useQuery(
    { scenarioType },
    { enabled: !!user }
  );

  // Fetch economic indicators
  const { data: economicIndicators } = trpc.portfolioAnalyticsEnhanced.getEconomicIndicators.useQuery(
    undefined,
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

  const latestMetric = dashboardData.metricsTrend?.[dashboardData.metricsTrend.length - 1];
  const latestIndicator = dashboardData.economicIndicators;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Advanced Portfolio Analytics</h1>
            <p className="text-muted-foreground">
              Financial forecasting, predictive modeling, and performance benchmarking
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics Summary */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Portfolio FCI</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestMetric ? formatPercentage(latestMetric.portfolioFci || "0") : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                Facility Condition Index
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestMetric?.totalAssets || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Active buildings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deferred Maintenance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestMetric ? formatCurrency(latestMetric.totalDeferredMaintenance || "0") : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                Total repair costs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inflation Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestIndicator ? formatPercentage(latestIndicator.constructionInflationRate || "0") : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                Construction inflation
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
            <TabsTrigger value="targets">Targets & KPIs</TabsTrigger>
            <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
            <TabsTrigger value="investments">Investments</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Portfolio Metrics Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Metrics Trend</CardTitle>
                <CardDescription>
                  Historical tracking of key portfolio indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-2">
                  <Select
                    value={forecastMonths.toString()}
                    onValueChange={(v) => setForecastMonths(parseInt(v))}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">Last 6 months</SelectItem>
                      <SelectItem value="12">Last 12 months</SelectItem>
                      <SelectItem value="24">Last 24 months</SelectItem>
                      <SelectItem value="36">Last 36 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {metricsTrend && metricsTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={metricsTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="snapshotDate"
                        tickFormatter={(date) => new Date(date).toLocaleDateString()}
                      />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        labelFormatter={(date) => new Date(date).toLocaleDateString()}
                        formatter={(value: any) => [
                          typeof value === "number" ? value.toFixed(2) : value,
                        ]}
                      />
                      <Legend />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="portfolioFci"
                        stroke={COLORS.danger}
                        fill={COLORS.danger}
                        fillOpacity={0.3}
                        name="Portfolio FCI (%)"
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="totalAssets"
                        stroke={COLORS.primary}
                        fill={COLORS.primary}
                        fillOpacity={0.3}
                        name="Total Assets"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                    No trend data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Economic Indicators */}
            <Card>
              <CardHeader>
                <CardTitle>Economic Indicators</CardTitle>
                <CardDescription>
                  Current economic factors affecting portfolio planning
                </CardDescription>
              </CardHeader>
              <CardContent>
                {latestIndicator ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Construction Inflation
                      </div>
                      <div className="text-2xl font-bold">
                        {formatPercentage(latestIndicator.constructionInflationRate || "0")}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Recommended Discount Rate
                      </div>
                      <div className="text-2xl font-bold">
                        {formatPercentage(latestIndicator.recommendedDiscountRate || "0")}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Prime Rate
                      </div>
                      <div className="text-2xl font-bold">
                        {formatPercentage(latestIndicator.primeRate || "0")}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No economic indicator data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Forecasting Tab */}
          <TabsContent value="forecasting" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Forecasts</CardTitle>
                <CardDescription>
                  Multi-year cost projections with scenario analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-2">
                  <Select
                    value={scenarioType}
                    onValueChange={(v: any) => setScenarioType(v)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="best_case">Best Case</SelectItem>
                      <SelectItem value="most_likely">Most Likely</SelectItem>
                      <SelectItem value="worst_case">Worst Case</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {forecasts && forecasts.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={forecasts}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="forecastYear" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: any) => formatCurrency(value)}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="predictedMaintenanceCost"
                        stroke={COLORS.primary}
                        name="Predicted Maintenance Cost"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="predictedCapitalRequirement"
                        stroke={COLORS.secondary}
                        name="Capital Requirement"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                    No forecast data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Risk & Failure Probability */}
            {forecasts && forecasts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Risk Analysis</CardTitle>
                  <CardDescription>
                    Failure probability and risk scores over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={forecasts}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="forecastYear" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="failureProbability"
                        fill={COLORS.danger}
                        name="Failure Probability (%)"
                      />
                      <Bar
                        dataKey="riskScore"
                        fill={COLORS.warning}
                        name="Risk Score"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Targets & KPIs Tab */}
          <TabsContent value="targets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Targets</CardTitle>
                <CardDescription>
                  Track progress towards strategic goals and KPIs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {targets && targets.length > 0 ? (
                  <div className="space-y-4">
                    {targets.map((target) => (
                      <div
                        key={target.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{target.metricName}</h4>
                            <Badge
                              style={{
                                backgroundColor: getStatusColor(target.status),
                                color: "white",
                              }}
                            >
                              {target.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {target.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span>
                              Target: {formatCurrency(target.targetValue)} ({target.targetYear})
                            </span>
                            <span>
                              Current: {target.currentValue ? formatCurrency(target.currentValue) : "N/A"}
                            </span>
                            <span>
                              Progress: {target.progressPercentage ? formatPercentage(target.progressPercentage) : "0%"}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          {parseFloat(target.progressPercentage || "0") >= 0 ? (
                            <ArrowUpRight className="h-6 w-6 text-success" />
                          ) : (
                            <ArrowDownRight className="h-6 w-6 text-danger" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No targets defined. Create targets to track portfolio performance.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Benchmarks Tab */}
          <TabsContent value="benchmarks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Industry Benchmarks</CardTitle>
                <CardDescription>
                  Compare your portfolio against industry standards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  Benchmark comparison feature coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Investments Tab */}
          <TabsContent value="investments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Investment Analysis</CardTitle>
                <CardDescription>
                  ROI, NPV, and payback analysis for capital projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  Investment analysis tools available via project detail pages
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
