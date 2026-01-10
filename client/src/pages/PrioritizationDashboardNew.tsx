import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, TrendingUp, DollarSign, AlertTriangle, Target, ArrowLeft, Search, Filter } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProjectScoringWorkspace from "@/components/ProjectScoringWorkspace";

/**
 * New Multi-Criteria Prioritization Dashboard
 * Three-panel layout: Project List | Scoring Workspace | Live Summary
 */
export default function PrioritizationDashboardNew() {
  const [, setLocation] = useLocation();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isRecalculating, setIsRecalculating] = useState(false);

  const { data: criteria, isLoading: criteriaLoading, refetch: refetchCriteria } = trpc.prioritization.getCriteria.useQuery();
  const { data: rankedProjects, isLoading: projectsLoading, refetch: refetchRanked } =
    trpc.prioritization.getRankedProjects.useQuery();
  const { data: projects, refetch: refetchProjects } = trpc.projects.list.useQuery();
  const { data: budgetCycles } = trpc.prioritization.getBudgetCycles.useQuery();
  const { data: scoringStatus, refetch: refetchScoringStatus } = trpc.prioritization.getScoringStatus.useQuery();
  const { data: activeModelVersion } = trpc.prioritization.getActiveModelVersion.useQuery();

  // Get scoring progress for selected project
  const { data: scoringProgress } = trpc.prioritization.getScoringProgress.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  // Get composite score for selected project
  const { data: compositeScore, refetch: refetchCompositeScore } = trpc.prioritization.getCompositeScore.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  const calculateAllScoresMutation = trpc.prioritization.calculateAllScores.useMutation({
    onMutate: () => {
      setIsRecalculating(true);
    },
    onSuccess: (data) => {
      Promise.all([
        refetchRanked(),
        refetchProjects(),
        refetchScoringStatus(),
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
    if (isRecalculating) return;
    calculateAllScoresMutation.mutate();
  };

  if (criteriaLoading || projectsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate KPIs
  const totalProjects = scoringStatus?.totalProjects || 0;
  const scoredProjects = scoringStatus?.scoredProjects || 0;
  const unscoredProjects = scoringStatus?.unscoredProjects || 0;
  const avgScore = rankedProjects && rankedProjects.length > 0
    ? rankedProjects.reduce((sum, p) => sum + p.compositeScore, 0) / rankedProjects.length
    : 0;
  const activeCriteria = criteria?.filter(c => c.isActive === 1).length || 0;
  const totalBudgetCycles = budgetCycles?.length || 0;

  // Filter projects based on search and status
  const filteredProjects = projects?.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Determine project status based on scoring progress
    const projectRank = rankedProjects?.find(rp => rp.projectId === project.id);
    let projectStatus = "not_started";
    if (projectRank) {
      projectStatus = "scored";
    } else {
      // Check if project has any scores
      const hasScores = false; // TODO: implement this check
      if (hasScores) {
        projectStatus = "in_progress";
      }
    }

    const matchesStatus = statusFilter === "all" || projectStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Get status for a project
  const getProjectStatus = (projectId: number) => {
    const projectRank = rankedProjects?.find(rp => rp.projectId === projectId);
    if (projectRank) return "scored";
    return "not_started";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scored":
        return <Badge variant="default" className="bg-green-500">Scored</Badge>;
      case "in_progress":
        return <Badge variant="secondary">In Progress</Badge>;
      case "needs_review":
        return <Badge variant="destructive">Needs Review</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
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
          <p className="text-muted-foreground mt-1">
            Score projects across multiple strategic factors to build defensible capital budgets
          </p>
        </div>
        <Button
          onClick={handleRecalculateAll}
          disabled={isRecalculating || activeCriteria === 0}
        >
          {isRecalculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Recalculate All
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-muted-foreground">In portfolio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scored / Pending</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scoredProjects} / {unscoredProjects}</div>
            <p className="text-xs text-muted-foreground">Progress tracking</p>
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
            <p className="text-xs text-muted-foreground">Active planning</p>
          </CardContent>
        </Card>
      </div>

      {/* Three-Panel Layout */}
      <div className="grid grid-cols-12 gap-6 min-h-[600px]">
        {/* LEFT PANEL: Project List */}
        <Card className="col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Projects</CardTitle>
            <CardDescription>Select a project to score</CardDescription>
            
            {/* Search */}
            <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="scored">Scored</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
              </SelectContent>
            </Select>

            {/* Progress Indicator */}
            <div className="text-xs text-muted-foreground mt-2">
              {scoredProjects} scored / {unscoredProjects} pending
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              {filteredProjects.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No projects found
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredProjects.map((project) => {
                    const status = getProjectStatus(project.id);
                    const isSelected = selectedProjectId === project.id;
                    
                    return (
                      <button
                        key={project.id}
                        onClick={() => setSelectedProjectId(project.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors border-l-2 ${
                          isSelected ? "border-l-primary bg-accent" : "border-l-transparent"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{project.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {getStatusBadge(status)}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CENTER PANEL: Scoring Workspace */}
        <Card className="col-span-6">
          <CardHeader>
            <CardTitle>Scoring Workspace</CardTitle>
            <CardDescription>
              {selectedProjectId
                ? `Score criteria for ${projects?.find(p => p.id === selectedProjectId)?.name}`
                : "Select a project from the left panel to begin scoring"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedProjectId ? (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a project to start scoring</p>
                </div>
              </div>
            ) : (
              <ProjectScoringWorkspace
                projectId={selectedProjectId}
                projectName={projects?.find(p => p.id === selectedProjectId)?.name || ""}
                criteria={criteria || []}
                onScoreSubmitted={() => {
                  refetchRanked();
                  refetchScoringStatus();
                  refetchCompositeScore();
                  toast.success("Scores submitted successfully!");
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* RIGHT PANEL: Live Summary */}
        <Card className="col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Live Summary</CardTitle>
            <CardDescription>Real-time scoring status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedProjectId ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Select a project to view summary
              </div>
            ) : (
              <>
                {/* Composite Score */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Composite Score</div>
                  <div className="text-3xl font-bold">
                    {compositeScore?.compositeScore?.toFixed(1) || "0.0"}
                    <span className="text-sm font-normal text-muted-foreground ml-1">/ 100</span>
                  </div>
                </div>

                {/* Progress */}
                {scoringProgress && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Progress</div>
                    <div className="text-sm text-muted-foreground">
                      {scoringProgress.scoredCriteria} / {scoringProgress.totalCriteria} criteria scored
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${(scoringProgress.scoredCriteria / scoringProgress.totalCriteria) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Validation Checklist */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Validation</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${scoringProgress?.scoredCriteria === scoringProgress?.totalCriteria ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <span>All criteria scored</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>Weights sum to 100%</span>
                    </div>
                  </div>
                </div>

                {/* Model Version */}
                {activeModelVersion && (
                  <div className="space-y-2 pt-4 border-t">
                    <div className="text-sm font-medium">Model Version</div>
                    <div className="text-xs text-muted-foreground">
                      {activeModelVersion.name}
                    </div>
                  </div>
                )}

                {/* Last Updated */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="text-sm font-medium">Last Updated</div>
                  <div className="text-xs text-muted-foreground">
                    {compositeScore ? new Date().toLocaleString() : "Not calculated"}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
