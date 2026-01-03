import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Trash2 } from "lucide-react";

interface BulkCompanyActionsProps {
  selectedCompanyIds: number[];
  onSuccess: () => void;
  onClearSelection: () => void;
}

export function BulkCompanyActions({
  selectedCompanyIds,
  onSuccess,
  onClearSelection,
}: BulkCompanyActionsProps) {
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showExtendTrialDialog, setShowExtendTrialDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [trialDays, setTrialDays] = useState("30");

  const updateCompanyMutation = trpc.admin.updateCompany.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to update company: ${error.message}`);
    },
  });

  const deleteCompanyMutation = trpc.admin.deleteCompany.useMutation({
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
        await updateCompanyMutation.mutateAsync({
          id: companyId,
          status: "active",
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    toast.success(`Activated ${successCount} companies${failCount > 0 ? `, ${failCount} failed` : ""}`);
    setShowActivateDialog(false);
    onClearSelection();
  };

  const handleBulkSuspend = async () => {
    let successCount = 0;
    let failCount = 0;

    for (const companyId of selectedCompanyIds) {
      try {
        await updateCompanyMutation.mutateAsync({
          id: companyId,
          status: "suspended",
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    toast.success(`Suspended ${successCount} companies${failCount > 0 ? `, ${failCount} failed` : ""}`);
    setShowSuspendDialog(false);
    onClearSelection();
  };

  const handleBulkExtendTrial = async () => {
    // Note: Trial extension would need a separate procedure or field
    // For now, just show a message
    toast.info("Trial extension requires individual company updates");
    setShowExtendTrialDialog(false);
  };

  const handleBulkDelete = async () => {
    let successCount = 0;
    let failCount = 0;

    for (const companyId of selectedCompanyIds) {
      try {
        await deleteCompanyMutation.mutateAsync({ id: companyId });
        successCount++;
      } catch {
        failCount++;
      }
    }

    toast.success(`Deleted ${successCount} companies${failCount > 0 ? `, ${failCount} failed` : ""}`);
    setShowDeleteDialog(false);
    onClearSelection();
  };

  if (selectedCompanyIds.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
        <span className="text-sm font-medium">
          {selectedCompanyIds.length} selected
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowActivateDialog(true)}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Activate
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowSuspendDialog(true)}
        >
          <XCircle className="h-4 w-4 mr-1" />
          Suspend
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowExtendTrialDialog(true)}
        >
          <Clock className="h-4 w-4 mr-1" />
          Extend Trial
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
        <Button size="sm" variant="ghost" onClick={onClearSelection}>
          Clear
        </Button>
      </div>

      {/* Activate Dialog */}
      <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Companies</DialogTitle>
            <DialogDescription>
              Are you sure you want to activate {selectedCompanyIds.length} companies?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkActivate}>Activate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Companies</DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend {selectedCompanyIds.length} companies?
              This will also suspend all users in these companies.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkSuspend}>
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Trial Dialog */}
      <Dialog open={showExtendTrialDialog} onOpenChange={setShowExtendTrialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Trial</DialogTitle>
            <DialogDescription>
              Extend trial period for {selectedCompanyIds.length} companies.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="trialDays">Additional Days</Label>
            <Input
              id="trialDays"
              type="number"
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              min="1"
              max="365"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtendTrialDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkExtendTrial}>Extend Trial</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Companies</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCompanyIds.length} companies?
              This action cannot be undone. Companies with existing users cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
