import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Loader2, Info } from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: number;
  name: string;
}

interface Criteria {
  id: number;
  name: string;
  description: string | null;
  category: string;
  weight: string;
  scoringGuideline: string | null;
}

interface ProjectScoringFormProps {
  projects: Project[];
  criteria: Criteria[];
  selectedProjectId: number | null;
  onScoreSubmitted: () => void;
}

interface ScoreInput {
  criteriaId: number;
  score: number;
  justification: string;
}

export default function ProjectScoringForm({
  projects,
  criteria,
  selectedProjectId,
  onScoreSubmitted,
}: ProjectScoringFormProps) {
  const [projectId, setProjectId] = useState<number | null>(selectedProjectId);
  const [scores, setScores] = useState<Record<number, ScoreInput>>({});

  const utils = trpc.useUtils();

  const { data: existingScores, isLoading: scoresLoading } = trpc.prioritization.getProjectScores.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );

  const { data: compositeScore, refetch: refetchCompositeScore, isLoading: isLoadingComposite } = trpc.prioritization.getCompositeScore.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );

  // Auto-calculate composite score whenever scores or weights change
  useEffect(() => {
    if (projectId && Object.keys(scores).length > 0) {
      refetchCompositeScore();
    }
  }, [scores, projectId, refetchCompositeScore]);

  const scoreProjectMutation = trpc.prioritization.scoreProject.useMutation({
    onSuccess: (data) => {
      utils.prioritization.getRankedProjects.invalidate();
      utils.prioritization.getProjectScores.invalidate();
      utils.prioritization.getCompositeScore.invalidate();
      toast.success("Scores successfully saved! All criteria scores have been recorded.");
      onScoreSubmitted();
    },
  });

  // Initialize scores from existing data
  useEffect(() => {
    if (existingScores) {
      const scoreMap: Record<number, ScoreInput> = {};
      existingScores.forEach((s: any) => {
        scoreMap[s.criteriaId] = {
          criteriaId: s.criteriaId,
          score: parseFloat(s.score),
          justification: s.justification || "",
        };
      });
      setScores(scoreMap);
    } else if (projectId) {
      // Initialize empty scores for all criteria
      const scoreMap: Record<number, ScoreInput> = {};
      criteria.forEach((c) => {
        scoreMap[c.id] = {
          criteriaId: c.id,
          score: 5,
          justification: "",
        };
      });
      setScores(scoreMap);
    }
  }, [existingScores, projectId, criteria]);

  // Update projectId when selectedProjectId changes
  useEffect(() => {
    if (selectedProjectId) {
      setProjectId(selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleScoreChange = (criteriaId: number, score: number) => {
    setScores((prev) => ({
      ...prev,
      [criteriaId]: {
        ...prev[criteriaId]!,
        score,
      },
    }));
  };

  const handleJustificationChange = (criteriaId: number, justification: string) => {
    setScores((prev) => ({
      ...prev,
      [criteriaId]: {
        ...prev[criteriaId]!,
        justification,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      toast.error("Please select a project");
      return;
    }

    const scoreArray = Object.values(scores);
    scoreProjectMutation.mutate({
      projectId,
      scores: scoreArray,
    });
  };

  const getScoreLabel = (score: number) => {
    if (score >= 9) return "Critical";
    if (score >= 7) return "High";
    if (score >= 5) return "Medium";
    if (score >= 3) return "Low";
    return "Very Low";
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return "text-red-600";
    if (score >= 7) return "text-orange-600";
    if (score >= 5) return "text-yellow-600";
    return "text-green-600";
  };

  if (criteria.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No criteria defined yet.</p>
        <p className="text-sm mt-2">Use the "Manage Criteria" tab to create scoring factors.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project Selection */}
      <div className="space-y-2">
        <Label htmlFor="project">Select Project</Label>
        <Select value={projectId?.toString() || ""} onValueChange={(val) => setProjectId(parseInt(val))}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a project to score..." />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id.toString()}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {projectId && !scoresLoading && (
        <>
          {/* Scoring Criteria */}
          <div className="space-y-6">
            {criteria.map((criterion) => {
              const currentScore = scores[criterion.id]?.score || 5;
              const currentJustification = scores[criterion.id]?.justification || "";

              return (
                <Card key={criterion.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{criterion.name}</CardTitle>
                        <CardDescription>{criterion.description}</CardDescription>
                      </div>
                      <Badge variant="outline" className="ml-4">
                        Weight: {parseFloat(criterion.weight).toFixed(1)}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Scoring Guideline */}
                    {criterion.scoringGuideline && (
                      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
                        <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">{criterion.scoringGuideline}</p>
                      </div>
                    )}

                    {/* Score Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Score</Label>
                        <span className={`text-lg font-semibold ${getScoreColor(currentScore)}`}>
                          {currentScore.toFixed(1)} — {getScoreLabel(currentScore)}
                        </span>
                      </div>
                      <Slider
                        value={[currentScore]}
                        onValueChange={(values) => handleScoreChange(criterion.id, values[0] || 5)}
                        min={0}
                        max={10}
                        step={0.5}
                        className="py-4"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0 (None)</span>
                        <span>5 (Medium)</span>
                        <span>10 (Critical)</span>
                      </div>
                    </div>

                    {/* Justification */}
                    <div className="space-y-2">
                      <Label htmlFor={`justification-${criterion.id}`}>Justification</Label>
                      <Textarea
                        id={`justification-${criterion.id}`}
                        value={currentJustification}
                        onChange={(e) => handleJustificationChange(criterion.id, e.target.value)}
                        placeholder="Why did you assign this score?"
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Submit Button - Save Scores First */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setProjectId(null);
                setScores({});
                setLocalCompositeScore(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={scoreProjectMutation.isPending}>
              {scoreProjectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Scores
            </Button>
          </div>

          {/* Current Composite Score - Auto-calculated */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Composite Priority Score</CardTitle>
              <CardDescription>Weighted average of all criteria scores</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingComposite ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : compositeScore?.compositeScore !== undefined ? (
                <>
                  <div className="text-4xl font-bold">{compositeScore.compositeScore.toFixed(1)}</div>
                  <p className="text-sm text-muted-foreground mt-1">Out of 100</p>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-muted-foreground">0.0</div>
                  <p className="text-sm text-muted-foreground mt-1">Out of 100</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </form>
  );
}
