import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, DollarSign, AlertTriangle, Target, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import CriteriaManager from "@/components/CriteriaManager";
import ProjectScoringForm from "@/components/ProjectScoringForm";
import RankedProjectsList from "@/components/RankedProjectsList";

/**
 * Multi-Criteria Prioritization Dashboard
 * Unified dashboard for scoring projects and managing capital budget priorities
 */
export default function PrioritizationDashboard() {
  const [, setLocation] = useLocation();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const { data: criteria, isLoading: criteriaLoading, refetch: refetchCriteria } = trpc.prioritization.getCriteria.useQuery();
  const { data: rankedProjects, isLoading: projectsLoading, refetch: refetchRanked } =
    trpc.prioritization.getRankedProjects.useQuery();
  const { data: projects, refetch: refetchProjects } = trpc.projects.list.useQuery();
  const { data: budgetCycles, refetch: refetchBudgetCycles } = trpc.prioritization.getBudgetCycles.useQuery();

  const calculateAllScoresMutation = trpc.prioritization.calculateAllScores.useMutation({
    onMutate: () => {
      setIsRecalculating(true);
    },
    onSuccess: (data) => {
      // Refresh all data after recalculation
      Promise.all([
        refetchRanked(),
        refetchProjects(),
        refetchCriteria(),
        refetchBudgetCycles(),
      ]).then(() => {
        setIsRecalculating(false);
        toast.success(`Successfully recalculated scores for ${data.projectCount} projects`);
      });
    },
    onError: (error) => {
      setIsRecalculating(false);
      toast.error(`Failed to recalculate scores: ${error.message}`);
    },
  });

  const handleRecalculateAll = () => {
    if (isRecalculating) return; // Prevent double-click
    calculateAllScoresMutation.mutate();
  };

  const handleScoreSubmitted = () => {
    // Refresh all data after scoring
    Promise.all([
      refetchRanked(),
      refetchProjects(),
      refetchCriteria(),
    ]).then(() => {
      setSelectedProjectId(null);
      // Don't show duplicate toast - already shown in ProjectScoringForm
    }).catch((error) => {
      console.error("Failed to refresh data after scoring:", error);
      toast.error("Failed to refresh project rankings");
    });
  };

  if (criteriaLoading || projectsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate KPIs from consistent data sources
  const totalProjects = projects?.length || 0;
  const scoredProjects = rankedProjects?.length || 0;
  const unscoredProjects = totalProjects - scoredProjects;
  const avgScore = rankedProjects && rankedProjects.length > 0
    ? rankedProjects.reduce((sum, p) => sum + p.compositeScore, 0) / rankedProjects.length
    : 0;
  const activeCriteria = criteria?.filter(c => c.isActive === 1).length || 0;
  const totalBudgetCycles = budgetCycles?.length || 0;

  // Validation warnings
  const hasNoCriteria = activeCriteria === 0;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.length > 1 ? window.history.back() : setLocation("/projects")}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Multi-Criteria Prioritization</h1>
          <p className="text-muted-foreground mt-2">
            Score projects across multiple strategic factors to build defensible capital budgets
          </p>
        </div>
      </div>


      {/* Overview / KPIs Section */}
      <section id="overview">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                {scoredProjects} scored, {unscoredProjects} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgScore.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Out of 100</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Criteria</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCriteria}</div>
              <p className="text-xs text-muted-foreground">Scoring factors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget Cycles</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBudgetCycles}</div>
              <p className="text-xs text-muted-foreground">
                {totalBudgetCycles === 0 ? (
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() => setLocation("/capital-budget")}
                  >
                    Create 4-year plan →
                  </Button>
                ) : (
                  "Active planning cycles"
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Score Projects Section */}
      <section id="score-projects">
        <Card>
          <CardHeader>
            <CardTitle>Score Projects</CardTitle>
            <CardDescription>
              Evaluate projects across all criteria to calculate composite priority scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectScoringForm
              projects={projects || []}
              criteria={criteria || []}
              selectedProjectId={selectedProjectId}
              onScoreSubmitted={handleScoreSubmitted}
            />
          </CardContent>
        </Card>
      </section>

      {/* Manage Criteria Section */}
      <section id="manage-criteria">
        <Card>
          <CardHeader>
            <CardTitle>Prioritization Criteria</CardTitle>
            <CardDescription>
              Define and weight the factors used to prioritize projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CriteriaManager criteria={criteria || []} />
          </CardContent>
        </Card>
      </section>

      {/* Ranked Projects Section */}
      <section id="ranked-projects">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Ranked Projects</CardTitle>
                <CardDescription>
                  Projects prioritized by weighted composite scores
                </CardDescription>
              </div>
              <Button
                onClick={handleRecalculateAll}
                disabled={isRecalculating || hasNoCriteria}
              >
                {isRecalculating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Recalculate All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {rankedProjects && rankedProjects.length > 0 ? (
              <RankedProjectsList
                rankedProjects={rankedProjects}
                onSelectProject={(projectId) => {
                  setSelectedProjectId(projectId);
                  // Scroll to score projects section
                  document.getElementById("score-projects")?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg font-medium">No projects have been scored yet.</p>
                <p className="text-sm mt-2">Use the "Score Projects" section to begin prioritization.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
