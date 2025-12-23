import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
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
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface BulkAccessRequestActionsProps {
  selectedRequestIds: number[];
  onClearSelection: () => void;
  onSuccess: () => void;
}

export function BulkAccessRequestActions({
  selectedRequestIds,
  onClearSelection,
  onSuccess,
}: BulkAccessRequestActionsProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const approveMutation = trpc.accessRequests.approve.useMutation({
    onSuccess: () => {
      toast.success("Access request approved successfully");
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to approve request: ${error.message}`);
    },
  });

  const rejectMutation = trpc.accessRequests.reject.useMutation({
    onSuccess: () => {
      toast.success("Access request rejected successfully");
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to reject request: ${error.message}`);
    },
  });

  const handleBulkApprove = async () => {
    let successCount = 0;
    let failCount = 0;

    for (const requestId of selectedRequestIds) {
      try {
        await approveMutation.mutateAsync({
          requestId,
          // Default values for bulk approval
          company: "Default Company", // Will need to be set by admin individually for proper approval
          city: "Default City",
          role: "viewer",
          accountStatus: "trial",
          trialDays: 30,
        });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully approved ${successCount} request(s)`);
    }
    if (failCount > 0) {
      toast.error(`Failed to approve ${failCount} request(s)`);
    }

    onClearSelection();
    setShowApproveDialog(false);
  };

  const handleBulkReject = async () => {
    let successCount = 0;
    let failCount = 0;

    for (const requestId of selectedRequestIds) {
      try {
        await rejectMutation.mutateAsync({
          requestId,
          rejectionReason: "Bulk rejection by administrator",
        });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully rejected ${successCount} request(s)`);
    }
    if (failCount > 0) {
      toast.error(`Failed to reject ${failCount} request(s)`);
    }

    onClearSelection();
    setShowRejectDialog(false);
  };

  if (selectedRequestIds.length === 0) {
    return null;
  }

  const isProcessing = approveMutation.isPending || rejectMutation.isPending;

  return (
    <>
      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border mb-4">
        <Badge variant="secondary" className="text-sm">
          {selectedRequestIds.length} selected
        </Badge>
        <div className="flex gap-2 ml-auto">
          <Button
            size="sm"
            variant="default"
            onClick={() => setShowApproveDialog(true)}
            disabled={isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Approve Selected
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowRejectDialog(true)}
            disabled={isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Reject Selected
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            disabled={isProcessing}
          >
            Clear Selection
          </Button>
        </div>
      </div>

      {/* Bulk Approve Confirmation Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve {selectedRequestIds.length} Access Requests?</AlertDialogTitle>
            <AlertDialogDescription>
              This will approve all selected access requests with default settings:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Role: Viewer</li>
                <li>Status: Trial (30 days)</li>
                <li>Company: Will need to be set individually</li>
              </ul>
              <p className="mt-3 text-amber-600 dark:text-amber-500 font-medium">
                Note: For proper approval with specific company assignments, approve requests individually.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkApprove}
              disabled={isProcessing}
              className="gap-2"
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              Approve All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {selectedRequestIds.length} Access Requests?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently reject all selected access requests. Users will be notified
              with a standard rejection message. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkReject}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              Reject All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
