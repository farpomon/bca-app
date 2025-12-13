/**
 * MFA Recovery Request Component
 * Allows users to request MFA recovery with admin approval
 */

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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function MFARecoveryRequest() {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [lastLoginDate, setLastLoginDate] = useState("");
  const [recentActivity, setRecentActivity] = useState("");

  const utils = trpc.useUtils();

  const { data: existingRequest } = trpc.mfaRecovery.getMyRequest.useQuery();

  const submitRequestMutation = trpc.mfaRecovery.submitRequest.useMutation({
    onSuccess: (data) => {
      toast.success("Recovery request submitted", {
        description: data.message,
      });
      utils.mfaRecovery.getMyRequest.invalidate();
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to submit request", {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setReason("");
    setLastLoginDate("");
    setRecentActivity("");
  };

  const handleSubmit = () => {
    if (reason.length < 10) {
      toast.error("Please provide a detailed reason (at least 10 characters)");
      return;
    }

    submitRequestMutation.mutate({
      reason,
      identityVerification: {
        lastLoginDate: lastLoginDate || undefined,
        recentActivity: recentActivity || undefined,
      },
    });
  };

  // Show existing request status
  if (existingRequest) {
    return (
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertTitle>Recovery Request Pending</AlertTitle>
        <AlertDescription>
          Your MFA recovery request is being reviewed by an administrator.
          <div className="mt-2 text-sm">
            <p><strong>Submitted:</strong> {new Date(existingRequest.submittedAt).toLocaleString()}</p>
            <p><strong>Status:</strong> {existingRequest.status}</p>
            {existingRequest.rejectionReason && (
              <p className="text-red-600 mt-2">
                <strong>Rejection Reason:</strong> {existingRequest.rejectionReason}
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        Request MFA Recovery
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Request MFA Recovery</DialogTitle>
            <DialogDescription>
              If you've lost access to your MFA device, submit a recovery request for admin review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Your request will be reviewed by an administrator within 24-48 hours. You'll need to provide
                identity verification information to prove you own this account.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Recovery Request *</Label>
              <Textarea
                id="reason"
                placeholder="Explain why you need MFA recovery (e.g., lost phone, device stolen, authenticator app deleted)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters. Be specific and detailed.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastLogin">Last Login Date (if you remember)</Label>
              <Input
                id="lastLogin"
                type="date"
                value={lastLoginDate}
                onChange={(e) => setLastLoginDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recentActivity">Recent Account Activity</Label>
              <Textarea
                id="recentActivity"
                placeholder="Describe recent actions you took in your account (e.g., created a project, uploaded documents)"
                value={recentActivity}
                onChange={(e) => setRecentActivity(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This helps verify your identity.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={submitRequestMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitRequestMutation.isPending}>
              {submitRequestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
