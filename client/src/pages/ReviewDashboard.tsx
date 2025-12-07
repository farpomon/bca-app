import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, Eye, FileSpreadsheet, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function ReviewDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedSubmission, setSelectedSubmission] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { data: pendingSubmissions, refetch } = trpc.consultant.pendingSubmissions.useQuery();
  const { data: submissionDetails } = trpc.consultant.getSubmission.useQuery(
    { submissionId: selectedSubmission! },
    { enabled: !!selectedSubmission }
  );

  const approveMutation = trpc.consultant.approveSubmission.useMutation();
  const rejectMutation = trpc.consultant.rejectSubmission.useMutation();

  // Redirect if not admin
  if (user && user.role !== "admin") {
    setLocation("/");
    return null;
  }

  const handleApprove = async () => {
    if (!selectedSubmission) return;

    try {
      await approveMutation.mutateAsync({
        submissionId: selectedSubmission,
        reviewNotes: reviewNotes || undefined,
      });

      toast.success("Submission approved and data finalized");
      setShowApproveDialog(false);
      setSelectedSubmission(null);
      setReviewNotes("");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve submission");
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission || !reviewNotes.trim()) {
      toast.error("Please provide rejection notes");
      return;
    }

    try {
      await rejectMutation.mutateAsync({
        submissionId: selectedSubmission,
        reviewNotes,
      });

      toast.success("Submission rejected");
      setShowRejectDialog(false);
      setSelectedSubmission(null);
      setReviewNotes("");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject submission");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending_review: { label: "Pending Review", color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
      under_review: { label: "Under Review", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
      approved: { label: "Approved", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
      rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_review;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="container max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Consultant Submission Review</h1>
          <p className="text-slate-600 mt-2">
            Review and approve data submissions from 3rd party consultants
          </p>
        </div>

        {/* Pending Submissions List */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Submissions</CardTitle>
            <CardDescription>
              Submissions awaiting review and approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!pendingSubmissions || pendingSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">All caught up!</p>
                <p className="text-slate-500 text-sm">No pending submissions to review</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-900">
                            {submission.consultantName || "Unknown Consultant"}
                          </p>
                          <p className="text-sm text-slate-500">
                            {submission.fileName} • {submission.submissionId}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Submitted {new Date(submission.submittedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <p className="text-slate-600">
                          <span className="font-medium text-green-600">{submission.validItems}</span> valid
                        </p>
                        {submission.invalidItems > 0 && (
                          <p className="text-red-600 font-medium">{submission.invalidItems} errors</p>
                        )}
                        <p className="text-slate-500 text-xs mt-1">{submission.totalItems} total items</p>
                      </div>

                      {getStatusBadge(submission.status)}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSubmission(submission.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submission Details Dialog */}
        {selectedSubmission && submissionDetails && (
          <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Review Submission</DialogTitle>
                <DialogDescription>
                  {submissionDetails.submission.fileName} •{" "}
                  {submissionDetails.submission.submissionId}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Submission Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Submission Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Consultant</p>
                      <p className="font-medium">{submissionDetails.submission.consultantName}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Email</p>
                      <p className="font-medium">{submissionDetails.submission.consultantEmail}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Data Type</p>
                      <p className="font-medium capitalize">{submissionDetails.submission.dataType}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Submitted</p>
                      <p className="font-medium">
                        {new Date(submissionDetails.submission.submittedAt).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Items Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Data Items ({submissionDetails.items.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {submissionDetails.items.map((item) => {
                        const data = JSON.parse(item.data);
                        const isError = item.validationStatus === "error";

                        return (
                          <div
                            key={item.id}
                            className={`p-3 rounded-lg border ${
                              isError ? "bg-red-50 border-red-200" : "bg-white"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">
                                  {isError ? (
                                    <span className="text-red-600">Row {item.rowNumber}: Error</span>
                                  ) : (
                                    <>
                                      {data.componentCode || data.title}
                                      {data.componentName && (
                                        <span className="text-slate-500 ml-2">
                                          {data.componentName}
                                        </span>
                                      )}
                                    </>
                                  )}
                                </p>
                                {isError ? (
                                  <p className="text-sm text-red-600 mt-1">{data.error}</p>
                                ) : (
                                  <div className="text-xs text-slate-500 mt-1 space-y-1">
                                    {data.condition && <p>Condition: {data.condition}</p>}
                                    {data.priority && <p>Priority: {data.priority}</p>}
                                    {data.description && (
                                      <p className="line-clamp-2">{data.description}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                {item.validationStatus === "valid" && (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                )}
                                {item.validationStatus === "warning" && (
                                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                                )}
                                {item.validationStatus === "error" && (
                                  <XCircle className="h-5 w-5 text-red-600" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {submissionDetails.submission.validItems}
                    </p>
                    <p className="text-sm text-slate-600">Valid Items</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">
                      {submissionDetails.items.filter((i) => i.validationStatus === "warning").length}
                    </p>
                    <p className="text-sm text-slate-600">Warnings</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">
                      {submissionDetails.submission.invalidItems}
                    </p>
                    <p className="text-sm text-slate-600">Errors</p>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={rejectMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => setShowApproveDialog(true)}
                  disabled={submissionDetails.submission.validItems === 0 || approveMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve & Finalize
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Approve Confirmation Dialog */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Submission</DialogTitle>
              <DialogDescription>
                This will finalize the data and add it to the project. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Review Notes (Optional)</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes or comments for the consultant..."
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={approveMutation.isPending}>
                {approveMutation.isPending ? "Approving..." : "Approve & Finalize"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Confirmation Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Submission</DialogTitle>
              <DialogDescription>
                Provide feedback to the consultant about why this submission is being rejected.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Rejection Notes (Required)</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Explain what needs to be corrected..."
                  rows={4}
                  required
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
                disabled={!reviewNotes.trim() || rejectMutation.isPending}
              >
                {rejectMutation.isPending ? "Rejecting..." : "Reject Submission"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
