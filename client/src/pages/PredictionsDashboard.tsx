import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, AlertTriangle, TrendingDown, TrendingUp, Activity } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { DeteriorationCurveEditor } from "@/components/DeteriorationCurveEditor";
import { ScenarioComparison } from "@/components/ScenarioComparison";
import { APP_TITLE, getLoginUrl } from "@/const";

export default function PredictionsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"risk" | "confidence" | "failureYear">("risk");
  const [selectedComponent, setSelectedComponent] = useState<{ projectId: number; componentCode: string } | null>(null);
  const [scenarioComponent, setScenarioComponent] = useState<{ componentCode: string; failureYear: number; remainingLife: number; replacementCost: number } | null>(null);

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

  // Filter and sort predictions
  let filteredPredictions = predictions;
  if (riskFilter !== "all") {
    filteredPredictions = predictions.filter((p) => p.riskLevel === riskFilter);
  }

  filteredPredictions = [...filteredPredictions].sort((a, b) => {
    if (sortBy === "risk") {
      const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return (riskOrder[b.riskLevel as keyof typeof riskOrder] || 0) - (riskOrder[a.riskLevel as keyof typeof riskOrder] || 0);
    } else if (sortBy === "confidence") {
      return (b.confidenceScore || 0) - (a.confidenceScore || 0);
    } else {
      return (a.predictedFailureYear || 9999) - (b.predictedFailureYear || 9999);
    }
  });

  // Calculate portfolio stats
  const stats = {
    total: predictions.length,
    critical: predictions.filter((p) => p.riskLevel === "critical").length,
    high: predictions.filter((p) => p.riskLevel === "high").length,
    medium: predictions.filter((p) => p.riskLevel === "medium").length,
    low: predictions.filter((p) => p.riskLevel === "low").length,
    avgConfidence: predictions.length > 0
      ? predictions.reduce((sum, p) => sum + (p.confidenceScore || 0), 0) / predictions.length
      : 0,
  };

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

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Predictive Analytics Dashboard</h1>
          <p className="text-muted-foreground">AI-powered deterioration modeling and risk analysis</p>
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

              {predictionsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredPredictions.length === 0 ? (
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
