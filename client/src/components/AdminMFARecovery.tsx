/**
 * Admin MFA Recovery Dashboard
 * Allows admins to review and approve/reject MFA recovery requests
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Eye, Copy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AdminMFARecovery() {
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: requests = [], isLoading } = trpc.mfaRecovery.getPendingRequests.useQuery();

  const approveMutation = trpc.mfaRecovery.approveRequest.useMutation({
    onSuccess: (data) => {
      setRecoveryCode(data.recoveryCode);
      toast.success("Recovery request approved", {
        description: "Recovery code generated successfully",
      });
      utils.mfaRecovery.getPendingRequests.invalidate();
      utils.mfaRecovery.getPendingCount.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to approve request", {
        description: error.message,
      });
    },
  });

  const rejectMutation = trpc.mfaRecovery.rejectRequest.useMutation({
    onSuccess: () => {
      toast.success("Recovery request rejected");
      utils.mfaRecovery.getPendingRequests.invalidate();
      utils.mfaRecovery.getPendingCount.invalidate();
      setShowRejectDialog(false);
      setRejectionReason("");
      setAdminNotes("");
      setSelectedRequest(null);
    },
    onError: (error) => {
      toast.error("Failed to reject request", {
        description: error.message,
      });
    },
  });

  const handleApprove = () => {
    if (!selectedRequest) return;

    approveMutation.mutate({
      requestId: selectedRequest.id,
      adminNotes: adminNotes || undefined,
    });
  };

  const handleReject = () => {
    if (!selectedRequest) return;

    if (rejectionReason.length < 10) {
      toast.error("Please provide a detailed rejection reason");
      return;
    }

    rejectMutation.mutate({
      requestId: selectedRequest.id,
      rejectionReason,
      adminNotes: adminNotes || undefined,
    });
  };

  const copyRecoveryCode = () => {
    if (recoveryCode) {
      navigator.clipboard.writeText(recoveryCode);
      toast.success("Recovery code copied to clipboard");
    }
  };

  const closeApproveDialog = () => {
    setShowApproveDialog(false);
    setAdminNotes("");
    setSelectedRequest(null);
    setRecoveryCode(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>MFA Recovery Requests</CardTitle>
          <CardDescription>
            Review and approve or reject user MFA recovery requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No pending recovery requests
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request: any) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.userId}</TableCell>
                    <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                    <TableCell>{new Date(request.submittedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{request.ipAddress || "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowApproveDialog(true);
                          }}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowRejectDialog(true);
                          }}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={closeApproveDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Approve MFA Recovery Request</DialogTitle>
            <DialogDescription>
              {recoveryCode ? "Recovery code generated" : "Review the request and approve if verified"}
            </DialogDescription>
          </DialogHeader>

          {recoveryCode ? (
            <div className="space-y-4 py-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Recovery code generated successfully. Send this code to the user via a secure channel.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Recovery Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={recoveryCode}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={copyRecoveryCode}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This code expires in 24 hours. The user can use it to disable MFA.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {selectedRequest && (
                <div className="space-y-2">
                  <div>
                    <Label>User ID</Label>
                    <p className="text-sm">{selectedRequest.userId}</p>
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <p className="text-sm">{selectedRequest.reason}</p>
                  </div>
                  {selectedRequest.identityVerification && (
                    <div>
                      <Label>Identity Verification</Label>
                      <pre className="text-xs bg-muted p-2 rounded mt-1">
                        {JSON.stringify(selectedRequest.identityVerification, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="admin-notes">Admin Notes (Internal)</Label>
                <Textarea
                  id="admin-notes"
                  placeholder="Optional notes for internal records"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {recoveryCode ? (
              <Button onClick={closeApproveDialog}>Close</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleApprove} disabled={approveMutation.isPending}>
                  {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Approve & Generate Code
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reject MFA Recovery Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection that will be shown to the user
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason (Shown to User) *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explain why the request was rejected"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-notes-reject">Admin Notes (Internal)</Label>
              <Textarea
                id="admin-notes-reject"
                placeholder="Optional notes for internal records"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
