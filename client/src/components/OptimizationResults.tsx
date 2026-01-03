import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, DollarSign, AlertTriangle, X } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface OptimizationResultsProps {
  scenarioId: number;
  onClose: () => void;
}

export function OptimizationResults({ scenarioId, onClose }: OptimizationResultsProps) {
  const { data, isLoading } = trpc.optimization.get.useQuery({ scenarioId });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Scenario not found</p>
        </CardContent>
      </Card>
    );
  }

  const { scenario, strategies, cashFlows } = data;

  // Format currency
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number | undefined) => {
    if (value === undefined) return "N/A";
    return `${value.toFixed(2)}%`;
  };

  // Prepare cash flow chart data
  const cashFlowChartData = cashFlows.map((cf) => ({
    year: cf.year,
    cost: cf.totalCost,
    benefit: cf.totalBenefit,
    netCashFlow: cf.netCashFlow,
    cumulativeCashFlow: cf.cumulativeCashFlow,
  }));

  // Prepare CI/FCI projection data
  const metricsChartData = cashFlows.map((cf) => ({
    year: cf.year,
    ci: cf.projectedCI,
    fci: cf.projectedFCI ? cf.projectedFCI * 100 : undefined, // Convert to percentage
  }));

  // Group strategies by type
  const strategyGroups = {
    replace: strategies.filter((s) => s.strategy === "replace"),
    rehabilitate: strategies.filter((s) => s.strategy === "rehabilitate"),
    defer: strategies.filter((s) => s.strategy === "defer"),
    do_nothing: strategies.filter((s) => s.strategy === "do_nothing"),
  };

  const strategyLabels: Record<string, string> = {
    replace: "Replace",
    rehabilitate: "Rehabilitate",
    defer: "Defer",
    do_nothing: "Do Nothing",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{scenario.name}</CardTitle>
            <CardDescription>{scenario.description || "Optimization Results"}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="strategies">Strategies</TabsTrigger>
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Cost</CardDescription>
                  <CardTitle className="text-2xl">
                    {formatCurrency(scenario.totalCost)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Benefit</CardDescription>
                  <CardTitle className="text-2xl">
                    {formatCurrency(scenario.totalBenefit)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Net Present Value</CardDescription>
                  <CardTitle className="text-2xl">
                    {formatCurrency(scenario.netPresentValue)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Return on Investment</CardDescription>
                  <CardTitle className="text-2xl text-green-600">
                    {formatPercent(scenario.returnOnInvestment)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Condition Improvements */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Condition Index</CardDescription>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">
                      {scenario.currentCI?.toFixed(1)}
                    </span>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-2xl font-bold text-green-600">
                      {scenario.projectedCI?.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Improvement: +{scenario.ciImprovement?.toFixed(1)} points
                  </p>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Facility Condition Index</CardDescription>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">
                      {formatPercent(scenario.currentFCI)}
                    </span>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-2xl font-bold text-green-600">
                      {formatPercent(scenario.projectedFCI)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Improvement: {formatPercent(scenario.fciImprovement)}
                  </p>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Risk Reduction</CardDescription>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-2xl font-bold text-green-600">
                      {scenario.riskReduction?.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From {scenario.currentRiskScore?.toFixed(1)} to{" "}
                    {scenario.projectedRiskScore?.toFixed(1)}
                  </p>
                </CardHeader>
              </Card>
            </div>

            {/* Payback Period */}
            {scenario.paybackPeriod !== undefined && (
              <Card>
                <CardHeader>
                  <CardTitle>Payback Period</CardTitle>
                  <CardDescription>
                    Time required to recover the initial investment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {scenario.paybackPeriod.toFixed(1)} years
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="strategies" className="space-y-6">
            <div className="space-y-4">
              {Object.entries(strategyGroups).map(([strategyType, items]) => {
                if (items.length === 0) return null;
                return (
                  <Card key={strategyType}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {strategyLabels[strategyType]} ({items.length} components)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {items.slice(0, 10).map((strategy, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <div>
                              <span className="font-medium">{strategy.componentCode}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                Year {strategy.actionYear}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                {formatCurrency(strategy.strategyCost)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ROI: {strategy.priorityScore?.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))}
                        {items.length > 10 && (
                          <p className="text-sm text-muted-foreground text-center pt-2">
                            ... and {items.length - 10} more
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="cashflow" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Projections</CardTitle>
                <CardDescription>
                  Annual costs, benefits, and cumulative cash flow over {scenario.timeHorizon} years
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={cashFlowChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
                        return `$${value}`;
                      }}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Year ${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="#ef4444"
                      name="Total Cost"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="benefit"
                      stroke="#22c55e"
                      name="Total Benefit"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulativeCashFlow"
                      stroke="#3b82f6"
                      name="Cumulative Cash Flow"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Condition Metrics Projection</CardTitle>
                <CardDescription>
                  Projected CI and FCI over {scenario.timeHorizon} years
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={metricsChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis
                      yAxisId="left"
                      label={{ value: "Condition Index", angle: -90, position: "insideLeft" }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      label={{ value: "FCI (%)", angle: 90, position: "insideRight" }}
                    />
                    <Tooltip labelFormatter={(label) => `Year ${label}`} />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="ci"
                      stroke="#22c55e"
                      name="Condition Index"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="fci"
                      stroke="#ef4444"
                      name="FCI (%)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
