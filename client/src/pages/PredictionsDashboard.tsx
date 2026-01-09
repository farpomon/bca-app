import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, AlertTriangle, TrendingDown, TrendingUp, Activity, ArrowLeft, Download, Calendar, DollarSign, Clock, Target } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { DeteriorationCurveEditor } from "@/components/DeteriorationCurveEditor";
import { ScenarioComparison } from "@/components/ScenarioComparison";
import { PredictionsSkeleton } from "@/components/PredictionsSkeleton";
import { APP_TITLE, getLoginUrl } from "@/const";

export default function PredictionsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"risk" | "confidence" | "failureYear">("risk");
  const [selectedComponent, setSelectedComponent] = useState<{ projectId: number; componentCode: string } | null>(null);
  const [scenarioComponent, setScenarioComponent] = useState<{ componentCode: string; failureYear: number; remainingLife: number; replacementCost: number } | null>(null);
  const [timeHorizon, setTimeHorizon] = useState<number>(10); // Planning horizon in years

  const projectsQuery = trpc.projects.list.useQuery(undefined, { enabled: !!user });
  const predictionsQuery = trpc.predictions.project.useQuery(
    { projectId: selectedProjectId!, method: "hybrid" },
    { enabled: !!selectedProjectId }
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Authentication Required</h1>
        <p className="text-muted-foreground">Please log in to access the predictions dashboard.</p>
        <Button asChild>
          <a href={getLoginUrl()}>Log In</a>
        </Button>
      </div>
    );
  }

  const projects = projectsQuery.data || [];
  const predictions = predictionsQuery.data || [];

  // Memoize expensive calculations to avoid recalculating on every render
  const { filteredPredictions, stats, predictionsInHorizon } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const horizonYear = currentYear + timeHorizon;
    
    // Filter predictions within time horizon
    const inHorizon = predictions.filter(
      (p) => (p.predictedFailureYear || 9999) <= horizonYear
    );
    
    // Calculate portfolio stats
    const calculatedStats = {
      total: predictions.length,
      critical: predictions.filter((p) => p.riskLevel === "critical").length,
      high: predictions.filter((p) => p.riskLevel === "high").length,
      medium: predictions.filter((p) => p.riskLevel === "medium").length,
      low: predictions.filter((p) => p.riskLevel === "low").length,
      avgConfidence: predictions.length > 0
        ? predictions.reduce((sum, p) => sum + (p.confidenceScore || 0), 0) / predictions.length
        : 0,
      inHorizon: inHorizon.length,
      // Estimate replacement costs (using industry averages)
      estimatedCost: inHorizon.reduce((sum, p) => {
        const baseCost = 50000;
        const riskMultiplier = p.riskLevel === 'critical' ? 1.5 : p.riskLevel === 'high' ? 1.2 : 1.0;
        return sum + (baseCost * riskMultiplier);
      }, 0),
    };

    // Filter and sort predictions
    let filtered = predictions;
    if (riskFilter !== "all") {
      filtered = predictions.filter((p) => p.riskLevel === riskFilter);
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "risk") {
        const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return (riskOrder[b.riskLevel as keyof typeof riskOrder] || 0) - (riskOrder[a.riskLevel as keyof typeof riskOrder] || 0);
      } else if (sortBy === "confidence") {
        return (b.confidenceScore || 0) - (a.confidenceScore || 0);
      } else {
        return (a.predictedFailureYear || 9999) - (b.predictedFailureYear || 9999);
      }
    });

    return {
      filteredPredictions: sorted,
      stats: calculatedStats,
      predictionsInHorizon: inHorizon,
    };
  }, [predictions, riskFilter, sortBy, timeHorizon]);

  const currentYear = new Date().getFullYear();
  const horizonYear = currentYear + timeHorizon;

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case "critical":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case "critical":
        return <AlertTriangle className="h-4 w-4" />;
      case "high":
        return <TrendingDown className="h-4 w-4" />;
      case "medium":
        return <Activity className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  // Export predictions to CSV for capital planning
  const exportToCSV = (data: typeof predictions) => {
    const headers = [
      'Component Code',
      'Risk Level',
      'Predicted Failure Year',
      'Remaining Life (Years)',
      'Confidence Score',
      'Estimated Cost',
      'Intervention Timing',
      'Priority',
      'AI Insights'
    ];

    const rows = data.map((pred) => {
      const yearsToFailure = (pred.predictedFailureYear || currentYear) - currentYear;
      const urgency = yearsToFailure <= 2 ? 'Immediate' : yearsToFailure <= 5 ? 'Short-term' : 'Mid-term';
      const baseCost = 50000;
      const riskMultiplier = pred.riskLevel === 'critical' ? 1.5 : pred.riskLevel === 'high' ? 1.2 : 1.0;
      const estimatedCost = baseCost * riskMultiplier;
      const insights = Array.isArray(pred.aiInsights) ? pred.aiInsights.join('; ') : (pred.aiInsights || 'N/A');

      return [
        pred.componentCode,
        pred.riskLevel,
        pred.predictedFailureYear || 'N/A',
        pred.remainingLife || 'N/A',
        pred.confidenceScore ? `${(pred.confidenceScore * 100).toFixed(0)}%` : 'N/A',
        `$${estimatedCost.toLocaleString()}`,
        urgency,
        pred.riskLevel === 'critical' ? 'High' : pred.riskLevel === 'high' ? 'Medium' : 'Low',
        insights.replace(/"/g, '""') // Escape quotes
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `capital_plan_${timeHorizon}yr_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.location.href = '/'}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Predictive Analytics Dashboard</h1>
            <p className="text-muted-foreground">AI-powered deterioration modeling and risk analysis</p>
          </div>
        </div>
      </div>

      {/* Project Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Project</CardTitle>
          <CardDescription>Choose a project to view component predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedProjectId?.toString() || ""}
            onValueChange={(v) => setSelectedProjectId(parseInt(v))}
          >
            <SelectTrigger className="w-full md:w-96">
              <SelectValue placeholder="Select a project..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProjectId && (
        <>
          {predictionsQuery.isLoading ? (
            <PredictionsSkeleton />
          ) : (
            <>
          {/* Portfolio Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Components</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Critical Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-orange-600" />
                  High Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-yellow-600" />
                  Medium Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(stats.avgConfidence * 100).toFixed(0)}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Time Horizon Selector & Financial Impact */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Planning Horizon
                </CardTitle>
                <CardDescription>Select your capital planning timeframe</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Select value={timeHorizon.toString()} onValueChange={(v) => setTimeHorizon(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Year (Immediate)</SelectItem>
                      <SelectItem value="5">5 Years (Short-term)</SelectItem>
                      <SelectItem value="10">10 Years (Mid-term)</SelectItem>
                      <SelectItem value="20">20 Years (Long-term)</SelectItem>
                      <SelectItem value="30">30 Years (Full Lifecycle)</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Planning Period:</span>
                      <span className="font-medium">{currentYear} - {horizonYear}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Components Due:</span>
                      <span className="font-medium text-orange-600">{stats.inHorizon} of {stats.total}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Impact Summary
                </CardTitle>
                <CardDescription>Estimated capital requirements within horizon</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold text-primary">
                      ${(stats.estimatedCost / 1000000).toFixed(2)}M
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Total estimated replacement cost
                    </p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Annual Budget:</span>
                      <span className="font-medium">${((stats.estimatedCost / timeHorizon) / 1000000).toFixed(2)}M/year</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg per Component:</span>
                      <span className="font-medium">${stats.inHorizon > 0 ? ((stats.estimatedCost / stats.inHorizon) / 1000).toFixed(0) : 0}K</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => exportToCSV(predictionsInHorizon)}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Capital Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Intervention Timing Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Intervention Timing Recommendations
              </CardTitle>
              <CardDescription>Optimal replacement windows based on risk and lifecycle analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {predictionsInHorizon.slice(0, 5).map((pred) => {
                  const yearsToFailure = (pred.predictedFailureYear || currentYear) - currentYear;
                  const urgency = yearsToFailure <= 2 ? 'Immediate' : yearsToFailure <= 5 ? 'Short-term' : 'Mid-term';
                  const urgencyColor = yearsToFailure <= 2 ? 'text-red-600' : yearsToFailure <= 5 ? 'text-orange-600' : 'text-blue-600';
                  
                  return (
                    <div key={pred.componentCode} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className={`h-4 w-4 ${urgencyColor}`} />
                        <div>
                          <p className="font-medium">{pred.componentCode}</p>
                          <p className="text-sm text-muted-foreground">
                            {pred.predictedFailureYear ? `Year ${pred.predictedFailureYear}` : 'TBD'} • {yearsToFailure} years remaining
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={urgency === 'Immediate' ? 'destructive' : 'secondary'} className="mb-1">
                          {urgency}
                        </Badge>
                        <p className="text-sm text-muted-foreground">~${(50000 * (pred.riskLevel === 'critical' ? 1.5 : 1.2) / 1000).toFixed(0)}K</p>
                      </div>
                    </div>
                  );
                })}
                {predictionsInHorizon.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    +{predictionsInHorizon.length - 5} more components requiring intervention
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Filters and Sort */}
          <Card>
            <CardHeader>
              <CardTitle>Component Predictions</CardTitle>
              <CardDescription>View and analyze component deterioration predictions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Filter by Risk</label>
                  <Select value={riskFilter} onValueChange={setRiskFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Risks</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Sort by</label>
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="risk">Risk Level</SelectItem>
                      <SelectItem value="confidence">Confidence</SelectItem>
                      <SelectItem value="failureYear">Failure Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredPredictions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No predictions available for this project.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Component Code</TableHead>
                        <TableHead>Risk Level</TableHead>
                        <TableHead>Predicted Failure</TableHead>
                        <TableHead>Remaining Life</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>AI Insights</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPredictions.map((prediction) => (
                        <TableRow key={prediction.componentCode}>
                          <TableCell className="font-medium">{prediction.componentCode}</TableCell>
                          <TableCell>
                            <Badge variant={getRiskBadgeVariant(prediction.riskLevel)} className="flex items-center gap-1 w-fit">
                              {getRiskIcon(prediction.riskLevel)}
                              {prediction.riskLevel}
                            </Badge>
                          </TableCell>
                          <TableCell>{prediction.predictedFailureYear || "N/A"}</TableCell>
                          <TableCell>{prediction.remainingLife ? `${prediction.remainingLife} years` : "N/A"}</TableCell>
                          <TableCell>
                            <span
                              className={
                                (prediction.confidenceScore || 0) >= 0.7
                                  ? "text-green-600 font-medium"
                                  : (prediction.confidenceScore || 0) >= 0.5
                                    ? "text-yellow-600 font-medium"
                                    : "text-red-600 font-medium"
                              }
                            >
                              {prediction.confidenceScore ? `${(prediction.confidenceScore * 100).toFixed(0)}%` : "N/A"}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {prediction.aiInsights && prediction.aiInsights.length > 0 ? (
                              <p className="text-sm text-muted-foreground truncate">{Array.isArray(prediction.aiInsights) ? prediction.aiInsights[0] : prediction.aiInsights}</p>
                            ) : (
                              <span className="text-muted-foreground">No insights</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setSelectedComponent({
                                    projectId: selectedProjectId,
                                    componentCode: prediction.componentCode,
                                  })
                                }
                              >
                                View Curve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setScenarioComponent({
                                    componentCode: prediction.componentCode,
                                    failureYear: prediction.predictedFailureYear || new Date().getFullYear() + 10,
                                    remainingLife: prediction.remainingLife || 10,
                                    replacementCost: 50000,
                                  })
                                }
                              >
                                Scenarios
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
            </>
          )}
        </>
      )}

      {/* Curve Editor Dialog */}
      <Dialog open={!!selectedComponent} onOpenChange={() => setSelectedComponent(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deterioration Curve Editor - {selectedComponent?.componentCode}</DialogTitle>
          </DialogHeader>
          {selectedComponent && (
            <DeteriorationCurveEditor
              projectId={selectedComponent.projectId}
              componentCode={selectedComponent.componentCode}
              onSave={() => {
                predictionsQuery.refetch();
                setSelectedComponent(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Scenario Comparison Dialog */}
      <Dialog open={!!scenarioComponent} onOpenChange={() => setScenarioComponent(null)}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>What-If Scenario Analysis - {scenarioComponent?.componentCode}</DialogTitle>
          </DialogHeader>
          {scenarioComponent && (
            <ScenarioComparison
              componentCode={scenarioComponent.componentCode}
              baselineFailureYear={scenarioComponent.failureYear}
              baselineRemainingLife={scenarioComponent.remainingLife}
              estimatedReplacementCost={scenarioComponent.replacementCost}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
