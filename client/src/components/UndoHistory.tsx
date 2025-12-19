import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Undo2, Clock, AlertCircle } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function UndoHistory() {
  const { data: operations, refetch } = trpc.undo.listUndoable.useQuery(undefined, {
    refetchInterval: 10000, // Refresh every 10 seconds
  });
  const undoMutation = trpc.undo.undo.useMutation();

  const handleUndo = async (operationId: number) => {
    try {
      const result = await undoMutation.mutateAsync({ operationId });
      if (result.success) {
        toast.success(`Successfully restored ${result.restoredCount} record(s)`);
        refetch();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to undo operation");
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getOperationLabel = (type: string) => {
    const labels: Record<string, string> = {
      delete_users: "Delete Users",
      suspend_users: "Suspend Users",
      activate_users: "Activate Users",
      change_role: "Change Role",
      extend_trial: "Extend Trial",
      delete_companies: "Delete Companies",
      suspend_companies: "Suspend Companies",
      activate_companies: "Activate Companies",
      approve_requests: "Approve Requests",
      reject_requests: "Reject Requests",
    };
    return labels[type] || type;
  };

  if (!operations || operations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5" />
            Recent Bulk Operations
          </CardTitle>
          <CardDescription>No recent bulk operations to undo</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Undo2 className="h-5 w-5" />
          Recent Bulk Operations
        </CardTitle>
        <CardDescription>
          You can undo bulk operations within 30 minutes of execution
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {operations.map((operation) => (
            <div
              key={operation.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-card"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary">{getOperationLabel(operation.operationType)}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {operation.affectedCount} items
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    Expires in {formatTime(operation.timeRemainingMs)}
                  </span>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={undoMutation.isPending}
                    className="gap-1"
                  >
                    <Undo2 className="h-3 w-3" />
                    Undo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                      Confirm Undo Operation
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to undo this {getOperationLabel(operation.operationType).toLowerCase()}? 
                      This will restore {operation.affectedCount} record(s) to their previous state.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleUndo(operation.id)}>
                      Yes, Undo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
