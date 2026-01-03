import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

interface AIAssessmentDialogProps {
  photoId: number;
  photoUrl: string;
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeficienciesCreated?: () => void;
}

export default function AIAssessmentDialog({
  photoId,
  photoUrl,
  projectId,
  open,
  onOpenChange,
  onDeficienciesCreated,
}: AIAssessmentDialogProps) {
  const [assessment, setAssessment] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  const assessPhoto = trpc.photos.assessWithAI.useMutation({
    onSuccess: (data) => {
      setAssessment(data);
      toast.success("Photo assessed successfully");
    },
    onError: (error) => {
      toast.error("Failed to assess photo: " + error.message);
    },
  });

  const createDeficiency = trpc.deficiencies.create.useMutation();

  const handleAssess = () => {
    setAssessment(null);
    assessPhoto.mutate({ photoId });
  };

  const handleCreateDeficiencies = async () => {
    if (!assessment || !assessment.deficiencies) return;

    setCreating(true);
    try {
      for (const deficiency of assessment.deficiencies) {
        await createDeficiency.mutateAsync({
          projectId,
          componentCode: assessment.componentCode,
          title: deficiency.title,
          description: deficiency.description,
          location: deficiency.location,
          severity: deficiency.severity,
          priority: deficiency.priority,
          recommendedAction: deficiency.recommendedAction,
          estimatedCost: deficiency.estimatedCost,
        });
      }
      toast.success(`Created ${assessment.deficiencies.length} deficiency record(s)`);
      onDeficienciesCreated?.();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create deficiencies");
    } finally {
      setCreating(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "critical":
        return "text-red-600";
      case "poor":
        return "text-orange-600";
      case "fair":
        return "text-yellow-600";
      case "good":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Photo Assessment
          </DialogTitle>
          <DialogDescription>
            Automatically analyze building conditions from uploaded photos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo Preview */}
          <div className="border rounded-lg overflow-hidden">
            <img src={photoUrl} alt="Assessment photo" className="w-full max-h-64 object-contain bg-gray-50" />
          </div>

          {/* Assessment Button */}
          {!assessment && !assessPhoto.isPending && (
            <Button onClick={handleAssess} className="w-full" size="lg">
              <Sparkles className="mr-2 h-5 w-5" />
              Analyze Photo with AI
            </Button>
          )}

          {/* Loading State */}
          {assessPhoto.isPending && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
                  <p className="text-lg font-medium">Analyzing photo...</p>
                  <p className="text-sm text-muted-foreground">This may take a few seconds</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assessment Results */}
          {assessment && (
            <div className="space-y-4">
              {/* Component Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>Component Identified</CardTitle>
                      <CardDescription>{assessment.componentCode} - {assessment.componentName}</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {assessment.confidence}% confidence
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Overall Condition</p>
                    <p className={`text-lg font-semibold capitalize ${getConditionColor(assessment.condition)}`}>
                      {assessment.condition}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Observations</p>
                    <p className="text-sm text-muted-foreground">{assessment.observations}</p>
                  </div>
                  {assessment.analysisNotes && (
                    <div className="flex gap-2 p-3 bg-blue-50 rounded-lg">
                      <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Analysis Notes</p>
                        <p className="text-sm text-blue-700">{assessment.analysisNotes}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Deficiencies */}
              {assessment.deficiencies && assessment.deficiencies.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Detected Deficiencies</CardTitle>
                        <CardDescription>{assessment.deficiencies.length} issue(s) found</CardDescription>
                      </div>
                      <Button onClick={handleCreateDeficiencies} disabled={creating}>
                        {creating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Create Deficiency Records
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {assessment.deficiencies.map((deficiency: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold">{deficiency.title}</h4>
                          <div className="flex gap-2">
                            <Badge variant={getSeverityColor(deficiency.severity)}>
                              {deficiency.severity}
                            </Badge>
                            <Badge variant="outline">{deficiency.priority.replace("_", " ")}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{deficiency.description}</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-medium">Location:</span> {deficiency.location}
                          </div>
                          {deficiency.estimatedCost && (
                            <div>
                              <span className="font-medium">Est. Cost:</span> ${(deficiency.estimatedCost / 100).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-sm">
                            <span className="font-medium">Recommended Action:</span> {deficiency.recommendedAction}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {assessment.deficiencies && assessment.deficiencies.length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center py-6">
                      <CheckCircle className="h-12 w-12 text-green-600 mb-3" />
                      <p className="text-lg font-medium">No Deficiencies Detected</p>
                      <p className="text-sm text-muted-foreground">This component appears to be in good condition</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
