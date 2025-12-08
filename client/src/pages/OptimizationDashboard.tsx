import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, TrendingUp, DollarSign, Target, AlertTriangle } from "lucide-react";
import { ScenarioBuilder } from "@/components/ScenarioBuilder";
import { OptimizationResults } from "@/components/OptimizationResults";

export default function OptimizationDashboard() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id);
  const [, setLocation] = useLocation();
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);

  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery(
    { id: projectId },
    { retry: false, meta: { suppressErrorLogging: true } }
  );

  const { data: scenarios, isLoading: scenariosLoading, refetch } = trpc.optimization.list.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const deleteMutation = trpc.optimization.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  if (projectLoading || scenariosLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Project not found</p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => setLocation("/projects")}>Back to Projects</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleScenarioCreated = (scenarioId: number) => {
    setShowBuilder(false);
    setSelectedScenarioId(scenarioId);
    refetch();
  };

  const handleDeleteScenario = async (scenarioId: number) => {
    if (confirm("Are you sure you want to delete this scenario?")) {
      await deleteMutation.mutateAsync({ scenarioId });
      if (selectedScenarioId === scenarioId) {
        setSelectedScenarioId(null);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-500";
      case "optimized":
        return "bg-blue-500";
      case "approved":
        return "bg-green-500";
      case "implemented":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getGoalIcon = (goal: string) => {
    switch (goal) {
      case "minimize_cost":
        return <DollarSign className="h-4 w-4" />;
      case "maximize_ci":
        return <TrendingUp className="h-4 w-4" />;
      case "maximize_roi":
        return <Target className="h-4 w-4" />;
      case "minimize_risk":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getGoalLabel = (goal: string) => {
    switch (goal) {
      case "minimize_cost":
        return "Minimize Cost";
      case "maximize_ci":
        return "Maximize CI";
      case "maximize_roi":
        return "Maximize ROI";
      case "minimize_risk":
        return "Minimize Risk";
      default:
        return goal;
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground mt-1">
              Optimization & Scenario Modeling
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation(`/projects/${projectId}`)}>
              Back to Project
            </Button>
            <Button onClick={() => setShowBuilder(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Scenario
            </Button>
          </div>
        </div>
      </div>

      {showBuilder && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create Optimization Scenario</CardTitle>
            <CardDescription>
              Configure parameters and run optimization to find the most cost-effective maintenance strategy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScenarioBuilder
              projectId={projectId}
              onScenarioCreated={handleScenarioCreated}
              onCancel={() => setShowBuilder(false)}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {scenarios && scenarios.length > 0 ? (
          scenarios.map((scenario) => (
            <Card
              key={scenario.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedScenarioId === scenario.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedScenarioId(scenario.id!)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{scenario.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {scenario.description || "No description"}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(scenario.status)}>
                    {scenario.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {getGoalIcon(scenario.optimizationGoal)}
                    <span className="text-muted-foreground">
                      {getGoalLabel(scenario.optimizationGoal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Time Horizon:</span>
                    <span className="font-medium">{scenario.timeHorizon} years</span>
                  </div>
                  {scenario.budgetConstraint && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Budget:</span>
                      <span className="font-medium">
                        ${scenario.budgetConstraint.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {scenario.status === "optimized" && scenario.returnOnInvestment !== undefined && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-muted-foreground">ROI:</span>
                      <span className="font-bold text-green-600">
                        {scenario.returnOnInvestment.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedScenarioId(scenario.id!);
                    }}
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteScenario(scenario.id!);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="py-12">
              <div className="text-center">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Scenarios Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first optimization scenario to compare maintenance strategies
                </p>
                <Button onClick={() => setShowBuilder(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Scenario
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedScenarioId && (
        <OptimizationResults
          scenarioId={selectedScenarioId}
          onClose={() => setSelectedScenarioId(null)}
        />
      )}
    </div>
  );
}
