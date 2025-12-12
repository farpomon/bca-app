import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
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

export default function DeletedProjects() {
  const utils = trpc.useUtils();
  const { data: deletedProjects, isLoading } = trpc.projects.listDeleted.useQuery();
  const restoreMutation = trpc.projects.restore.useMutation({
    onSuccess: () => {
      toast.success("Project restored successfully");
      utils.projects.listDeleted.invalidate();
      utils.projects.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to restore project: ${error.message}`);
    },
  });

  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  const handleRestore = (projectId: number) => {
    setSelectedProject(projectId);
    setRestoreDialogOpen(true);
  };

  const confirmRestore = () => {
    if (selectedProject) {
      restoreMutation.mutate({ id: selectedProject });
    }
    setRestoreDialogOpen(false);
    setSelectedProject(null);
  };

  const getDaysRemaining = (deletedAt: string | null) => {
    if (!deletedAt) return 0;
    const now = new Date();
    const deleted = new Date(deletedAt);
    const diffTime = 90 * 24 * 60 * 60 * 1000 - (now.getTime() - deleted.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading deleted projects...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Deleted Projects</h1>
        <p className="text-muted-foreground">
          Projects deleted within the last 90 days can be restored. After 90 days, they will be permanently deleted.
        </p>
      </div>

      {!deletedProjects || deletedProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trash2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">No deleted projects</p>
            <p className="text-sm text-muted-foreground">
              Projects you delete will appear here for 90 days before being permanently removed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deletedProjects.map((project) => {
            const daysRemaining = getDaysRemaining(project.deletedAt);
            const isExpiringSoon = daysRemaining <= 7;

            return (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-xl">{project.name}</CardTitle>
                        <Badge variant="destructive">Deleted</Badge>
                        {isExpiringSoon && (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Expiring Soon
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        {project.address && <span className="block">{project.address}</span>}
                        {project.clientName && <span className="block">Client: {project.clientName}</span>}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(project.id)}
                      disabled={restoreMutation.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Deleted:</span>{" "}
                      {project.deletedAt ? new Date(project.deletedAt).toLocaleDateString() : "Unknown"}
                    </div>
                    <div>
                      <span className="font-medium">Days remaining:</span>{" "}
                      <span className={isExpiringSoon ? "text-orange-600 font-semibold" : ""}>
                        {daysRemaining} {daysRemaining === 1 ? "day" : "days"}
                      </span>
                    </div>
                  </div>
                  {isExpiringSoon && (
                    <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-md">
                      <p className="text-sm text-orange-800 dark:text-orange-200">
                        <AlertCircle className="h-4 w-4 inline mr-1" />
                        This project will be permanently deleted in {daysRemaining}{" "}
                        {daysRemaining === 1 ? "day" : "days"}. Restore it now to prevent data loss.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this project? It will be moved back to your active projects with a
              "Draft" status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>Restore Project</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
