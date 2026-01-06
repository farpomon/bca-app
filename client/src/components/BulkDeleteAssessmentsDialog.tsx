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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface BulkDeleteAssessmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssessmentIds: number[];
  projectId: number;
  onSuccess: () => void;
}

export function BulkDeleteAssessmentsDialog({
  open,
  onOpenChange,
  selectedAssessmentIds,
  projectId,
  onSuccess,
}: BulkDeleteAssessmentsDialogProps) {
  const [reason, setReason] = useState("");

  const bulkDeleteMutation = trpc.assessments.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || `${data.deletedCount} assessments deleted successfully`);
      onSuccess();
      onOpenChange(false);
      setReason("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete assessments");
    },
  });

  const handleDelete = () => {
    if (selectedAssessmentIds.length === 0) {
      toast.error("No assessments selected");
      return;
    }

    bulkDeleteMutation.mutate({
      assessmentIds: selectedAssessmentIds,
      projectId,
      reason: reason || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete {selectedAssessmentIds.length} Assessment{selectedAssessmentIds.length !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            This action will soft-delete the selected assessments. They can be restored from the Archive within a time window.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for deletion (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for deleting these assessments..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={bulkDeleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={bulkDeleteMutation.isPending}
          >
            {bulkDeleteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {selectedAssessmentIds.length} Assessment{selectedAssessmentIds.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
