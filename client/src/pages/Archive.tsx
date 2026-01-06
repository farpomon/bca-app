import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCcw, AlertCircle, Trash2, Archive as ArchiveIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";

export default function Archive() {
  const { user, loading: authLoading } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);

  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery(undefined, {
    enabled: !!user && user.role === 'admin',
  });

  const { data: archivedAssessments, isLoading: assessmentsLoading, refetch } = trpc.assessments.getArchived.useQuery(
    { projectId: selectedProjectId, limit: 100 },
    { enabled: !!user && user.role === 'admin' }
  );

  const restoreMutation = trpc.assessments.restore.useMutation({
    onSuccess: () => {
      toast.success("Assessment restored successfully");
      refetch();
      setRestoreDialogOpen(false);
      setSelectedAssessmentId(null);
    },
    onError: (error) => {
      toast.error(`Failed to restore assessment: ${error.message}`);
    },
  });

  const handleRestore = (assessmentId: number, projectId: number) => {
    setSelectedAssessmentId(assessmentId);
    setRestoreDialogOpen(true);
  };

  const confirmRestore = () => {
    if (selectedAssessmentId && selectedProjectId) {
      restoreMutation.mutate({
        assessmentId: selectedAssessmentId,
        projectId: selectedProjectId,
      });
    }
  };

  if (authLoading || projectsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              Only administrators can access the archive.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ArchiveIcon className="h-8 w-8" />
            Assessment Archive
          </h1>
          <p className="text-muted-foreground mt-2">
            View and restore deleted assessments
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter by Project</CardTitle>
          <CardDescription>
            Select a project to view its archived assessments, or view all
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedProjectId?.toString() || "all"}
            onValueChange={(value) => setSelectedProjectId(value === "all" ? undefined : parseInt(value))}
          >
            <SelectTrigger className="w-full md:w-[400px]">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {assessmentsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !archivedAssessments || archivedAssessments.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No archived assessments</p>
              <p className="text-sm mt-2">
                {selectedProjectId
                  ? "This project has no deleted assessments"
                  : "No assessments have been deleted"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Archived Assessments ({archivedAssessments.length})</CardTitle>
              <CardDescription>
                Click restore to recover an assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {archivedAssessments.map((assessment) => (
                  <div
                    key={assessment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {assessment.componentName || assessment.componentCode || "Unknown Component"}
                        </span>
                        {assessment.condition && (
                          <Badge
                            variant={
                              assessment.condition === "good"
                                ? "default"
                                : assessment.condition === "fair"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {assessment.condition}
                          </Badge>
                        )}
                      </div>
                      {assessment.componentLocation && (
                        <p className="text-sm text-muted-foreground">
                          Location: {assessment.componentLocation}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Project ID: {assessment.projectId}</span>
                        {assessment.assetId && <span>Asset ID: {assessment.assetId}</span>}
                        {assessment.deletedAt && (
                          <span>
                            Deleted {formatDistanceToNow(new Date(assessment.deletedAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(assessment.id, assessment.projectId!)}
                      disabled={restoreMutation.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this assessment? It will be moved back to the active assessments list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore} disabled={restoreMutation.isPending}>
              {restoreMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                "Restore"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
