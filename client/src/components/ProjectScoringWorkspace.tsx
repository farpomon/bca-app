import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, ChevronDown, ChevronRight, Save, Send, AlertCircle, CheckCircle2, Copy, Sparkles, MoreVertical, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Criteria {
  id: number;
  name: string;
  description: string | null;
  category: string;
  weight: string;
  scoringGuideline: string | null;
}

interface ProjectScoringWorkspaceProps {
  projectId: number;
  projectName: string;
  criteria: Criteria[];
  onScoreSubmitted: () => void;
}

interface ScoreInput {
  criteriaId: number;
  score: number | null;
  justification: string;
  status: 'draft' | 'submitted' | 'locked';
}

export default function ProjectScoringWorkspace({
  projectId,
  projectName,
  criteria,
  onScoreSubmitted,
}: ProjectScoringWorkspaceProps) {
  const [scores, setScores] = useState<Record<number, ScoreInput>>({});
  const [expandedCriterion, setExpandedCriterion] = useState<number | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [criterionToRemove, setCriterionToRemove] = useState<number | null>(null);
  const [criterionToDisable, setCriterionToDisable] = useState<number | null>(null);
  const [criterionToDelete, setCriterionToDelete] = useState<number | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteUnderstood, setDeleteUnderstood] = useState(false);

  const utils = trpc.useUtils();

  // Get existing scores with status
  const { data: existingScores, isLoading: scoresLoading } = trpc.prioritization.getProjectScoresWithStatus.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // Get scoring progress
  const { data: scoringProgress, refetch: refetchProgress } = trpc.prioritization.getScoringProgress.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // Save draft mutation (autosave)
  const saveDraftMutation = trpc.prioritization.scoreProject.useMutation({
    onSuccess: () => {
      setLastSaved(new Date());
      utils.prioritization.getProjectScoresWithStatus.invalidate({ projectId });
      utils.prioritization.getScoringProgress.invalidate({ projectId });
      utils.prioritization.getCompositeScore.invalidate({ projectId });
    },
  });

  // Submit all scores mutation - use new finalization endpoint
  const submitAllMutation = trpc.prioritization.finalizeScores.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Scores finalized! Composite score: ${data.compositeScore?.toFixed(2) || 'N/A'}`);
        utils.prioritization.getRankedProjects.invalidate();
        utils.prioritization.getProjectScoresWithStatus.invalidate({ projectId });
        utils.prioritization.getScoringProgress.invalidate({ projectId });
        utils.prioritization.getCompositeScore.invalidate({ projectId });
        onScoreSubmitted();
      } else {
        toast.error(data.message || "Failed to finalize scores");
        if (data.traceId) {
          console.error(`Finalization failed. Trace ID: ${data.traceId}`);
        }
      }
    },
    onError: (error) => {
      toast.error(`Failed to submit scores: ${error.message}`);
    },
  });

  // Criteria management mutations
  const removeCriterionMutation = trpc.prioritization.removeCriterionFromModel.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        utils.prioritization.getCriteria.invalidate();
        setCriterionToRemove(null);
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Failed to remove criterion: ${error.message}`);
    },
  });

  const disableCriterionMutation = trpc.prioritization.disableCriterion.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        utils.prioritization.getCriteria.invalidate();
        setCriterionToDisable(null);
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Failed to disable criterion: ${error.message}`);
    },
  });

  const deleteCriterionMutation = trpc.prioritization.deleteCriterionPermanent.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        utils.prioritization.getCriteria.invalidate();
        setCriterionToDelete(null);
        setDeleteConfirmation("");
        setDeleteUnderstood(false);
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Failed to delete criterion: ${error.message}`);
    },
  });

  // Initialize scores from existing data
  useEffect(() => {
    if (!projectId || criteria.length === 0) return;

    // Always initialize with all criteria first
    const scoreMap: Record<number, ScoreInput> = {};
    criteria.forEach((c) => {
      scoreMap[c.id] = {
        criteriaId: c.id,
        score: null,
        justification: "",
        status: 'draft',
      };
    });

    // Then overlay existing scores if any
    if (existingScores && existingScores.length > 0) {
      existingScores.forEach((s: any) => {
        scoreMap[s.criteriaId] = {
          criteriaId: s.criteriaId,
          score: s.score ? parseFloat(s.score) : null,
          justification: s.justification || "",
          status: s.status || 'draft',
        };
      });
    }

    setScores(scoreMap);
  }, [existingScores, projectId, criteria]);

  // Auto-save on score change (debounced)
  useEffect(() => {
    if (!autoSaveEnabled || !projectId) return;

    const timeoutId = setTimeout(() => {
      handleSaveDraft();
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeoutId);
  }, [scores, autoSaveEnabled, projectId]);

  const handleScoreChange = (criteriaId: number, score: number | null) => {
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

  const handleSaveDraft = () => {
    const scoreArray = Object.values(scores).filter(s => s.score !== null);
    if (scoreArray.length === 0) return;

    saveDraftMutation.mutate({
      projectId,
      scores: scoreArray.map(s => ({
        criteriaId: s.criteriaId,
        score: s.score!,
        justification: s.justification,
      })),
    });
  };

  const handleSubmitAll = () => {
    // Validate all scores are entered
    const missingScores = criteria.filter(c => !scores[c.id] || scores[c.id].score === null);
    if (missingScores.length > 0) {
      toast.error(`Please score all criteria before submitting. Missing: ${missingScores.map(c => c.name).join(", ")}`);
      return;
    }

    // First save draft, then finalize
    const scoreArray = Object.values(scores).filter(s => s.score !== null);
    if (scoreArray.length === 0) {
      toast.error("No scores to submit");
      return;
    }

    // Use new finalization endpoint
    submitAllMutation.mutate({ projectId });
  };

  const handleRemoveCriterion = (criteriaId: number) => {
    removeCriterionMutation.mutate({
      criteriaId,
      portfolioId: null,
      reason: "Removed from scoring workspace",
    });
  };

  const handleDisableCriterion = (criteriaId: number) => {
    disableCriterionMutation.mutate({
      criteriaId,
      reason: "Disabled from scoring workspace",
    });
  };

  const handleDeleteCriterion = () => {
    if (!criterionToDelete) return;
    if (deleteConfirmation !== "DELETE") {
      toast.error('Please type "DELETE" to confirm');
      return;
    }
    if (!deleteUnderstood) {
      toast.error("Please confirm you understand this action cannot be undone");
      return;
    }

    deleteCriterionMutation.mutate({
      criteriaId: criterionToDelete,
      confirmation: deleteConfirmation,
      reason: "Permanently deleted from scoring workspace",
    });
  };

  const handleCopyFromSimilar = () => {
    toast.info("Copy from similar project feature coming soon!");
    // TODO: Implement copy from similar project
  };

  const handleApplyDefaults = () => {
    // Apply default score of 5 to all criteria
    const defaultScores: Record<number, ScoreInput> = {};
    criteria.forEach((c) => {
      defaultScores[c.id] = {
        criteriaId: c.id,
        score: 5,
        justification: scores[c.id]?.justification || "",
        status: 'draft',
      };
    });
    setScores(defaultScores);
    toast.success("Default scores applied (5/10 for all criteria)");
  };

  const getScoreLabel = (score: number | null) => {
    if (score === null) return "Not Scored";
    if (score >= 9) return "Critical";
    if (score >= 7) return "High";
    if (score >= 5) return "Medium";
    if (score >= 3) return "Low";
    return "Very Low";
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "bg-gray-500";
    if (score >= 9) return "bg-red-500";
    if (score >= 7) return "bg-orange-500";
    if (score >= 5) return "bg-yellow-500";
    if (score >= 3) return "bg-blue-500";
    return "bg-green-500";
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'risk':
        return 'bg-red-100 text-red-800';
      case 'strategic':
        return 'bg-blue-100 text-blue-800';
      case 'compliance':
        return 'bg-purple-100 text-purple-800';
      case 'financial':
        return 'bg-green-100 text-green-800';
      case 'operational':
        return 'bg-yellow-100 text-yellow-800';
      case 'environmental':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Justification is now optional for all criteria
  const requiresJustification = (_criteriaId: number) => false;

  if (scoresLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyFromSimilar}>
            <Copy className="h-4 w-4 mr-2" />
            Copy from Similar
          </Button>
          <Button variant="outline" size="sm" onClick={handleApplyDefaults}>
            <Sparkles className="h-4 w-4 mr-2" />
            Apply Defaults
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info("Criteria management: Use the ⋯ menu on each criterion card")}>
            <Settings className="h-4 w-4 mr-2" />
            Manage Criteria
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saveDraftMutation.isPending}>
            {saveDraftMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Draft
          </Button>
          <Button size="sm" onClick={handleSubmitAll} disabled={submitAllMutation.isPending}>
            {submitAllMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Submit Final
          </Button>
        </div>
      </div>

      {/* Auto-save indicator */}
      {lastSaved && (
        <div className="text-xs text-muted-foreground text-right">
          Last saved: {lastSaved.toLocaleTimeString()}
        </div>
      )}

      {/* Scoring Progress Alert */}
      {scoringProgress && scoringProgress.unscoredCriteria > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {scoringProgress.unscoredCriteria} criteria remaining to score
          </AlertDescription>
        </Alert>
      )}

      {/* Collapsible Criteria Cards */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {criteria.map((criterion) => {
          const score = scores[criterion.id];
          const isExpanded = expandedCriterion === criterion.id;
          const needsJustification = requiresJustification(criterion.id);
          const hasJustification = score?.justification?.trim().length > 0;
          const isComplete = score?.score !== null && (!needsJustification || hasJustification);

          return (
            <Collapsible
              key={criterion.id}
              open={isExpanded}
              onOpenChange={(open) => setExpandedCriterion(open ? criterion.id : null)}
            >
              <Card className={`${isExpanded ? 'border-primary' : ''}`}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">{criterion.name}</CardTitle>
                            <Badge variant="outline" className={`text-xs ${getCategoryBadgeColor(criterion.category)}`}>
                              {criterion.category}
                            </Badge>
                            {isComplete && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                          {criterion.description && (
                            <CardDescription className="text-xs mt-1">{criterion.description}</CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setCriterionToRemove(criterion.id);
                              }}
                            >
                              Remove from Model
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setCriterionToDisable(criterion.id);
                              }}
                            >
                              Disable Criterion
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setCriterionToDelete(criterion.id);
                              }}
                              className="text-red-600"
                            >
                              Delete Permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="text-xs text-muted-foreground">
                          Weight: {parseFloat(criterion.weight).toFixed(1)}%
                        </div>
                        <Badge className={`${getScoreColor(score?.score || null)} text-white`}>
                          {score?.score !== null ? `${score.score}/10` : "Not Scored"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 space-y-4">
                    {/* Scoring Guideline */}
                    {criterion.scoringGuideline && (
                      <Alert>
                        <AlertDescription className="text-sm">
                          <strong>Scoring Guideline:</strong> {criterion.scoringGuideline}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Score Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Score (0-10)</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{score?.score !== null ? score.score : "N/A"}</span>
                          <span className="text-xs text-muted-foreground">({getScoreLabel(score?.score || null)})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">0</span>
                        <Slider
                          value={[score?.score || 0]}
                          onValueChange={([value]) => handleScoreChange(criterion.id, value)}
                          max={10}
                          step={0.5}
                          className="flex-1"
                        />
                        <span className="text-xs text-muted-foreground">10</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground px-2">
                        <span>Very Low</span>
                        <span>Medium</span>
                        <span>Critical</span>
                      </div>
                    </div>

                    {/* Justification */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          Justification
                          {needsJustification && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </Label>
                        {needsJustification && (
                          <span className="text-xs text-muted-foreground">
                            Required {score?.score && score.score >= 7 ? "(score ≥7)" : "(Safety/Compliance)"}
                          </span>
                        )}
                      </div>
                      <Textarea
                        placeholder="What evidence supports this score?"
                        value={score?.justification || ""}
                        onChange={(e) => handleJustificationChange(criterion.id, e.target.value)}
                        rows={3}
                        className="text-sm"
                      />
                    </div>

                    {/* Not Applicable Option */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleScoreChange(criterion.id, null)}
                      >
                        Mark as Not Applicable
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Confirmation Dialogs */}
      
      {/* Remove Criterion Dialog */}
      <Dialog open={!!criterionToRemove} onOpenChange={(open) => !open && setCriterionToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Criterion from Model?</DialogTitle>
            <DialogDescription>
              This will deactivate the criterion and exclude it from future scoring calculations.
              Existing scores will be preserved but won't affect rankings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCriterionToRemove(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => criterionToRemove && handleRemoveCriterion(criterionToRemove)}
              disabled={removeCriterionMutation.isPending}
            >
              {removeCriterionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Criterion Dialog */}
      <Dialog open={!!criterionToDisable} onOpenChange={(open) => !open && setCriterionToDisable(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Criterion?</DialogTitle>
            <DialogDescription>
              This will soft-delete the criterion, keeping it in the system but excluding it from all scoring.
              You can re-enable it later if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCriterionToDisable(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => criterionToDisable && handleDisableCriterion(criterionToDisable)}
              disabled={disableCriterionMutation.isPending}
            >
              {disableCriterionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Disable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Criterion Dialog */}
      <Dialog open={!!criterionToDelete} onOpenChange={(open) => {
        if (!open) {
          setCriterionToDelete(null);
          setDeleteConfirmation("");
          setDeleteUnderstood(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Permanently Delete Criterion?</DialogTitle>
            <DialogDescription>
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Warning:</strong> This action cannot be undone. This will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Permanently delete the criterion</li>
                    <li>Remove all associated project scores</li>
                    <li>Recalculate all project rankings</li>
                    <li>Affect historical data and reports</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type <strong>DELETE</strong> to confirm</Label>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="understand"
                checked={deleteUnderstood}
                onCheckedChange={(checked) => setDeleteUnderstood(checked as boolean)}
              />
              <label
                htmlFor="understand"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I understand this action cannot be undone
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCriterionToDelete(null);
                setDeleteConfirmation("");
                setDeleteUnderstood(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCriterion}
              disabled={deleteCriterionMutation.isPending || deleteConfirmation !== "DELETE" || !deleteUnderstood}
            >
              {deleteCriterionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
