import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Ban, CheckCircle2, Calendar, Loader2, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BulkCompanyActionsProps {
  selectedCompanyIds: number[];
  onClearSelection: () => void;
  onSuccess: () => void;
}

export function BulkCompanyActions({
  selectedCompanyIds,
  onClearSelection,
  onSuccess,
}: BulkCompanyActionsProps) {
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showExtendTrialDialog, setShowExtendTrialDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [trialDays, setTrialDays] = useState("30");

  const updateStatusMutation = trpc.companies.updateStatus.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to update company status: ${error.message}`);
    },
  });

  const extendTrialMutation = trpc.companies.extendTrial.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to extend trial: ${error.message}`);
    },
  });

  const deleteCompanyMutation = trpc.companies.delete.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to delete company: ${error.message}`);
    },
  });

  const handleBulkActivate = async () => {
    let successCount = 0;
    let failCount = 0;

    for (const companyId of selectedCompanyIds) {
      try {
        await updateStatusMutation.mutateAsync({
          companyId,
          status: "active",
        });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully activated ${successCount} company(ies)`);
    }
    if (failCount > 0) {
      toast.error(`Failed to activate ${failCount} company(ies)`);
    }

    onClearSelection();
    setShowActivateDialog(false);
  };

  const handleBulkSuspend = async () => {
    let successCount = 0;
    let failCount = 0;

    for (const companyId of selectedCompanyIds) {
      try {
        await updateStatusMutation.mutateAsync({
          companyId,
          status: "suspended",
        });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully suspended ${successCount} company(ies)`);
    }
    if (failCount > 0) {
      toast.error(`Failed to suspend ${failCount} company(ies)`);
    }

    onClearSelection();
    setShowSuspendDialog(false);
  };

  const handleBulkExtendTrial = async () => {
    const days = parseInt(trialDays);
    if (isNaN(days) || days <= 0) {
      toast.error("Please enter a valid number of days");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const companyId of selectedCompanyIds) {
      try {
        await extendTrialMutation.mutateAsync({
          companyId,
          days,
        });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully extended trial for ${successCount} company(ies)`);
    }
    if (failCount > 0) {
      toast.error(`Failed to extend trial for ${failCount} company(ies)`);
    }

    onClearSelection();
    setShowExtendTrialDialog(false);
    setTrialDays("30");
  };

  const handleBulkDelete = async () => {
    let successCount = 0;
    let failCount = 0;

    for (const companyId of selectedCompanyIds) {
      try {
        await deleteCompanyMutation.mutateAsync({ companyId });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully deleted ${successCount} company(ies)`);
    }
    if (failCount > 0) {
      toast.error(`Failed to delete ${failCount} company(ies)`);
    }

    onClearSelection();
    setShowDeleteDialog(false);
  };

  if (selectedCompanyIds.length === 0) {
    return null;
  }

  const isProcessing =
    updateStatusMutation.isPending ||
    extendTrialMutation.isPending ||
    deleteCompanyMutation.isPending;

  return (
    <>
      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border mb-4">
        <Badge variant="secondary" className="text-sm">
          {selectedCompanyIds.length} selected
        </Badge>
        <div className="flex gap-2 ml-auto flex-wrap">
          <Button
            size="sm"
            variant="default"
            onClick={() => setShowActivateDialog(true)}
            disabled={isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Activate
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowSuspendDialog(true)}
            disabled={isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Ban className="h-4 w-4" />
            )}
            Suspend
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowExtendTrialDialog(true)}
            disabled={isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4" />
            )}
            Extend Trial
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
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

      {/* Bulk Activate Confirmation Dialog */}
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate {selectedCompanyIds.length} Companies?</AlertDialogTitle>
            <AlertDialogDescription>
              This will activate all selected companies, allowing their users to access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkActivate}
              disabled={isProcessing}
              className="gap-2"
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              Activate All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Suspend Confirmation Dialog */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend {selectedCompanyIds.length} Companies?</AlertDialogTitle>
            <AlertDialogDescription>
              This will suspend all selected companies, preventing their users from accessing the system.
              This action can be reversed by activating the companies again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkSuspend}
              disabled={isProcessing}
              className="gap-2"
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              Suspend All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Extend Trial Dialog */}
      <AlertDialog open={showExtendTrialDialog} onOpenChange={setShowExtendTrialDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Extend Trial for {selectedCompanyIds.length} Companies</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the number of days to extend the trial period for all selected companies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="trial-days">Trial Days</Label>
            <Input
              id="trial-days"
              type="number"
              min="1"
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              placeholder="30"
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkExtendTrial}
              disabled={isProcessing}
              className="gap-2"
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              Extend Trial
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCompanyIds.length} Companies?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="text-destructive font-semibold">
                Warning: This action cannot be undone!
              </p>
              <p>
                This will permanently delete all selected companies and all associated data including:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>All users belonging to these companies</li>
                <li>All projects and assessments</li>
                <li>All uploaded documents and photos</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
