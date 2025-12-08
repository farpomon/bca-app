import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, DollarSign, AlertTriangle, Target } from "lucide-react";
import { useLocation } from "wouter";
import CriteriaManager from "@/components/CriteriaManager";
import ProjectScoringForm from "@/components/ProjectScoringForm";
import RankedProjectsList from "@/components/RankedProjectsList";

/**
 * Multi-Criteria Prioritization Dashboard
 * Main hub for scoring projects and managing capital budget priorities
 */
export default function PrioritizationDashboard() {
  const [, setLocation] = useLocation();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const { data: criteria, isLoading: criteriaLoading } = trpc.prioritization.getCriteria.useQuery();
  const { data: rankedProjects, isLoading: projectsLoading, refetch: refetchRanked } =
    trpc.prioritization.getRankedProjects.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();

  const calculateAllScoresMutation = trpc.prioritization.calculateAllScores.useMutation({
    onSuccess: () => {
      refetchRanked();
    },
  });

  if (criteriaLoading || projectsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalProjects = projects?.length || 0;
  const scoredProjects = rankedProjects?.length || 0;
  const unscoredProjects = totalProjects - scoredProjects;
  const avgScore = rankedProjects?.length
    ? rankedProjects.reduce((sum, p) => sum + p.compositeScore, 0) / rankedProjects.length
    : 0;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Multi-Criteria Prioritization</h1>
        <p className="text-muted-foreground mt-2">
          Score projects across multiple strategic factors to build defensible capital budgets
        </p>
      </div>

      {/* Summary Cards */}
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
            <div className="text-2xl font-bold">{criteria?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Scoring factors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Cycles</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              <Button
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={() => setLocation("/capital-budget")}
              >
                Create 4-year plan →
              </Button>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="ranking" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ranking">Project Rankings</TabsTrigger>
          <TabsTrigger value="scoring">Score Projects</TabsTrigger>
          <TabsTrigger value="criteria">Manage Criteria</TabsTrigger>
        </TabsList>

        {/* Project Rankings Tab */}
        <TabsContent value="ranking" className="space-y-4">
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
                  onClick={() => calculateAllScoresMutation.mutate()}
                  disabled={calculateAllScoresMutation.isPending}
                >
                  {calculateAllScoresMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Recalculate All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <RankedProjectsList
                rankedProjects={rankedProjects || []}
                onSelectProject={(projectId) => {
                  setSelectedProjectId(projectId);
                  // Switch to scoring tab
                  const scoringTab = document.querySelector('[value="scoring"]') as HTMLElement;
                  scoringTab?.click();
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Score Projects Tab */}
        <TabsContent value="scoring" className="space-y-4">
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
                onScoreSubmitted={() => {
                  refetchRanked();
                  setSelectedProjectId(null);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Criteria Tab */}
        <TabsContent value="criteria" className="space-y-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
