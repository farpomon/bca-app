import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Shield, Download, Trash2, FileText, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PrivacySettings() {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [exportReason, setExportReason] = useState("");
  const [deleteReason, setDeleteReason] = useState("");

  const { data: consents } = trpc.compliance.getMyConsents.useQuery();
  const { data: dataRequests } = trpc.compliance.getMyDataRequests.useQuery();
  const { data: dataResidency } = trpc.compliance.getDataResidency.useQuery();

  const requestExportMutation = trpc.compliance.requestDataExport.useMutation({
    onSuccess: () => {
      toast.success("Data export request submitted. You'll be notified when ready.");
      setShowExportDialog(false);
      setExportReason("");
    },
    onError: (error) => {
      toast.error(`Failed to request export: ${error.message}`);
    },
  });

  const requestDeletionMutation = trpc.compliance.requestAccountDeletion.useMutation({
    onSuccess: () => {
      toast.success("Account deletion request submitted. An admin will review your request.");
      setShowDeleteDialog(false);
      setDeleteReason("");
    },
    onError: (error) => {
      toast.error(`Failed to request deletion: ${error.message}`);
    },
  });

  const handleExportRequest = () => {
    requestExportMutation.mutate({
      requestDetails: exportReason || undefined,
    });
  };

  const handleDeleteRequest = () => {
    requestDeletionMutation.mutate({
      requestDetails: deleteReason || undefined,
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Privacy & Data Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your privacy preferences and data access rights
        </p>
      </div>

      {/* Data Residency Information */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Where Your Data is Stored
        </h2>
        <div className="space-y-3">
          {dataResidency && Object.entries(dataResidency).map(([key, data]: [string, any]) => (
            <div key={key} className="flex items-start justify-between border-b pb-3 last:border-0">
              <div>
                <p className="font-medium capitalize">{key.replace(/_/g, " ")}</p>
                <p className="text-sm text-muted-foreground mt-1">{data.description}</p>
              </div>
              <Badge variant="outline" className="ml-4">{data.value}</Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Your Rights */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Your Data Rights (FOIP Compliance)</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Download className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900">Right to Data Portability</h3>
              <p className="text-sm text-blue-700 mt-1">
                You can request a copy of all your personal data in a machine-readable format.
              </p>
              <Button
                onClick={() => setShowExportDialog(true)}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                <Download className="h-4 w-4 mr-2" />
                Request Data Export
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <Trash2 className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-900">Right to Deletion</h3>
              <p className="text-sm text-amber-700 mt-1">
                You can request permanent deletion of your account and all associated data.
              </p>
              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Request Account Deletion
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Active Requests */}
      {dataRequests && dataRequests.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Your Data Requests</h2>
          <div className="space-y-3">
            {dataRequests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={
                        request.status === "completed" ? "default" :
                        request.status === "rejected" ? "destructive" :
                        request.status === "processing" ? "secondary" :
                        "outline"
                      }>
                        {request.status}
                      </Badge>
                      <Badge variant="outline">{request.requestType}</Badge>
                    </div>
                    {request.requestDetails && (
                      <p className="text-sm mb-2">{request.requestDetails}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Requested: {format(new Date(request.requestedAt), "PPP")}
                    </p>
                    {request.status === "rejected" && request.rejectionReason && (
                      <p className="text-sm text-destructive mt-2">
                        Reason: {request.rejectionReason}
                      </p>
                    )}
                  </div>
                  {request.status === "pending" && (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                  {request.status === "completed" && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Consent History */}
      {consents && consents.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Consent History</h2>
          <div className="space-y-2">
            {consents.map((consent) => (
              <div key={consent.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <p className="font-medium capitalize">
                    {consent.consentType.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Version {consent.consentVersion}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={consent.consentGiven ? "default" : "secondary"}>
                    {consent.consentGiven ? "Accepted" : "Declined"}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(consent.consentedAt), "PPP")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Data Export</DialogTitle>
            <DialogDescription>
              We'll prepare a complete copy of your personal data. You'll be notified when it's ready to download.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Reason for request (optional)</label>
              <Textarea
                value={exportReason}
                onChange={(e) => setExportReason(e.target.value)}
                placeholder="Tell us why you're requesting your data..."
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExportRequest} disabled={requestExportMutation.isPending}>
              {requestExportMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Account Deletion</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all associated data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">⚠️ Warning</p>
              <p className="text-sm text-destructive/80 mt-1">
                All your projects, assessments, and data will be permanently deleted.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Reason for deletion (optional)</label>
              <Textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Tell us why you're deleting your account..."
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRequest}
              disabled={requestDeletionMutation.isPending}
            >
              {requestDeletionMutation.isPending ? "Submitting..." : "Request Deletion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
