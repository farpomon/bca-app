import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, DollarSign, Target, BarChart3, LineChart } from "lucide-react";
import { toast } from "sonner";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
} from "recharts";

/**
 * LP Portfolio Optimization Dashboard
 * Uses linear programming to maximize weighted CI improvement within budget
 */
export default function LPOptimizationDashboard() {
  const [budget, setBudget] = useState<string>("5000000");
  const [minProjects, setMinProjects] = useState<string>("");
  const [maxProjects, setMaxProjects] = useState<string>("");

  const { data: portfolioMetrics, isLoading: metricsLoading } =
    trpc.optimization.getPortfolioMetrics.useQuery();

  const optimizeMutation = trpc.optimization.optimizePortfolioLP.useMutation({
    onSuccess: () => {
      toast.success("Portfolio optimization complete");
    },
    onError: (error) => {
      toast.error(`Optimization failed: ${error.message}`);
    },
  });

  const { data: sensitivityData, isLoading: sensitivityLoading } =
    trpc.optimization.analyzeSensitivity.useQuery(
      {
        baseBudget: parseFloat(budget) || 5000000,
        rangePercent: 50,
      },
      { enabled: !!budget && parseFloat(budget) > 0 }
    );

  const { data: paretoData, isLoading: paretoLoading } =
    trpc.optimization.getParetoFrontier.useQuery();

  const { data: costEffectiveness, isLoading: ceLoading } =
    trpc.optimization.getCostEffectivenessRanking.useQuery();

  const handleOptimize = () => {
    const budgetNum = parseFloat(budget);
    if (!budgetNum || budgetNum <= 0) {
      toast.error("Please enter a valid budget");
      return;
    }

    optimizeMutation.mutate({
      maxBudget: budgetNum,
      minProjects: minProjects ? parseInt(minProjects) : undefined,
      maxProjects: maxProjects ? parseInt(maxProjects) : undefined,
    });
  };

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Portfolio Optimization (Linear Programming)</h1>
        <p className="text-muted-foreground mt-2">
          Maximize weighted condition index improvement within budget constraints
        </p>
      </div>

      {/* Portfolio Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioMetrics?.totalProjects || 0}</div>
            <p className="text-xs text-muted-foreground">In portfolio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio CI</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {portfolioMetrics?.weightedCI.toFixed(1) || "—"}
            </div>
            <p className="text-xs text-muted-foreground">Weighted average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio FCI</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {portfolioMetrics?.weightedFCI.toFixed(1) || "—"}%
            </div>
            <p className="text-xs text-muted-foreground">Facility condition index</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deferred Maintenance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {portfolioMetrics
                ? formatCurrency(portfolioMetrics.totalDeferredMaintenance)
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground">Total backlog</p>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Optimization Parameters</CardTitle>
          <CardDescription>
            Configure budget and constraints for linear programming optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="budget">Maximum Budget *</Label>
              <Input
                id="budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="5000000"
                min="0"
                step="100000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minProjects">Minimum Projects (Optional)</Label>
              <Input
                id="minProjects"
                type="number"
                value={minProjects}
                onChange={(e) => setMinProjects(e.target.value)}
                placeholder="No minimum"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxProjects">Maximum Projects (Optional)</Label>
              <Input
                id="maxProjects"
                type="number"
                value={maxProjects}
                onChange={(e) => setMaxProjects(e.target.value)}
                placeholder="No maximum"
                min="0"
              />
            </div>
          </div>

          <Button
            onClick={handleOptimize}
            disabled={optimizeMutation.isPending}
            className="mt-4"
          >
            {optimizeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Optimization
          </Button>
        </CardContent>
      </Card>

      {/* Optimization Results */}
      {optimizeMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle>Optimization Results</CardTitle>
            <CardDescription>
              LP-optimized project selection for maximum CI improvement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Metrics */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Selected Projects</p>
                <p className="text-2xl font-bold">
                  {optimizeMutation.data.selectedProjects.length}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(optimizeMutation.data.totalCost)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">CI Improvement</p>
                <p className="text-2xl font-bold">
                  +{optimizeMutation.data.totalCIImprovement.toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Budget Utilization</p>
                <p className="text-2xl font-bold">
                  {optimizeMutation.data.budgetUtilization.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Before/After Comparison */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Before Optimization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Portfolio CI:</span>
                    <span className="font-semibold">
                      {optimizeMutation.data.portfolioMetrics.beforeCI.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Portfolio FCI:</span>
                    <span className="font-semibold">
                      {optimizeMutation.data.portfolioMetrics.beforeFCI.toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">After Optimization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Portfolio CI:</span>
                    <span className="font-semibold text-green-600">
                      {optimizeMutation.data.portfolioMetrics.afterCI.toFixed(1)}
                      <span className="text-xs ml-1">
                        (+
                        {optimizeMutation.data.portfolioMetrics.ciImprovementPercent.toFixed(1)}
                        %)
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Portfolio FCI:</span>
                    <span className="font-semibold text-green-600">
                      {optimizeMutation.data.portfolioMetrics.afterFCI.toFixed(1)}%
                      <span className="text-xs ml-1">
                        (-
                        {optimizeMutation.data.portfolioMetrics.fciImprovementPercent.toFixed(
                          1
                        )}
                        %)
                      </span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Selected Projects Table */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Selected Projects</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">CI Improvement</TableHead>
                    <TableHead className="text-right">Cost Effectiveness</TableHead>
                    <TableHead className="text-center">Priority Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {optimizeMutation.data.selectedProjects.map((project) => (
                    <TableRow key={project.projectId}>
                      <TableCell className="font-medium">{project.projectName}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(project.cost)}
                      </TableCell>
                      <TableCell className="text-right">
                        +{project.ciImprovement.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(project.costEffectiveness)}/pt
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{project.priorityScore.toFixed(1)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Tabs */}
      <Tabs defaultValue="sensitivity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sensitivity">
            <LineChart className="mr-2 h-4 w-4" />
            Sensitivity Analysis
          </TabsTrigger>
          <TabsTrigger value="pareto">
            <BarChart3 className="mr-2 h-4 w-4" />
            Pareto Frontier
          </TabsTrigger>
          <TabsTrigger value="effectiveness">
            <TrendingUp className="mr-2 h-4 w-4" />
            Cost Effectiveness
          </TabsTrigger>
        </TabsList>

        {/* Sensitivity Analysis */}
        <TabsContent value="sensitivity">
          <Card>
            <CardHeader>
              <CardTitle>Budget Sensitivity Analysis</CardTitle>
              <CardDescription>
                How CI improvement changes with budget variations (±50%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sensitivityLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : sensitivityData ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart data={sensitivityData.results}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="budget"
                        tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                      />
                      <YAxis yAxisId="left" label={{ value: "CI Improvement", angle: -90, position: "insideLeft" }} />
                      <YAxis yAxisId="right" orientation="right" label={{ value: "ROI (%)", angle: 90, position: "insideRight" }} />
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          if (name === "budget") return formatCurrency(value);
                          if (name === "ciImprovement") return value.toFixed(2);
                          if (name === "roi") return `${value.toFixed(1)}%`;
                          return value;
                        }}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="ciImprovement"
                        stroke="#8884d8"
                        name="CI Improvement"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="roi"
                        stroke="#82ca9d"
                        name="ROI"
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>

                  <div className="grid gap-4 md:grid-cols-2 mt-6">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Optimal Budget (Highest ROI)
                      </p>
                      <p className="text-xl font-bold">
                        {formatCurrency(sensitivityData.optimalBudget)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Inflection Point (Diminishing Returns)
                      </p>
                      <p className="text-xl font-bold">
                        {formatCurrency(sensitivityData.inflectionPoint)}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-12">
                  Enter a budget to see sensitivity analysis
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pareto Frontier */}
        <TabsContent value="pareto">
          <Card>
            <CardHeader>
              <CardTitle>Pareto Frontier</CardTitle>
              <CardDescription>
                Trade-off between cost and condition improvement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paretoLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : paretoData && paretoData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="cost"
                      name="Cost"
                      tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                      label={{ value: "Total Cost", position: "insideBottom", offset: -5 }}
                    />
                    <YAxis
                      dataKey="ciImprovement"
                      name="CI Improvement"
                      label={{ value: "CI Improvement", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === "Cost") return formatCurrency(value);
                        return value.toFixed(2);
                      }}
                      labelFormatter={() => ""}
                    />
                    <Legend />
                    <Scatter
                      name="Pareto-Optimal Solutions"
                      data={paretoData}
                      fill="#8884d8"
                      line={{ stroke: "#8884d8", strokeWidth: 2 }}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12">
                  No Pareto frontier data available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Effectiveness */}
        <TabsContent value="effectiveness">
          <Card>
            <CardHeader>
              <CardTitle>Cost-Effectiveness Ranking</CardTitle>
              <CardDescription>
                Projects ranked by cost per CI point improvement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ceLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : costEffectiveness && costEffectiveness.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">CI Improvement</TableHead>
                      <TableHead className="text-right">Cost per CI Point</TableHead>
                      <TableHead className="text-center">Priority Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costEffectiveness.slice(0, 20).map((project) => (
                      <TableRow key={project.projectId}>
                        <TableCell>
                          <Badge variant="outline">#{project.rank}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{project.projectName}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(project.cost)}
                        </TableCell>
                        <TableCell className="text-right">
                          +{project.ciImprovement.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {project.costPerCIPoint === Infinity
                            ? "N/A"
                            : formatCurrency(project.costPerCIPoint)}
                        </TableCell>
                        <TableCell className="text-center">
                          {project.priorityScore.toFixed(1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-12">
                  No cost-effectiveness data available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
