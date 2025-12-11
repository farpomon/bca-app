import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, RefreshCw, Mail } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import RequestAccessForm from "@/components/RequestAccessForm";

export default function PendingApproval() {
  const { user, loading } = useAuth();
  const [showRequestForm, setShowRequestForm] = useState(false);

  const requestQuery = trpc.accessRequests.getMyRequest.useQuery(
    { openId: user?.openId || "" },
    { enabled: !!user?.openId, refetchInterval: 30000 } // Auto-refresh every 30 seconds
  );

  useEffect(() => {
    // If no request exists, show the form
    if (!loading && !requestQuery.isLoading && !requestQuery.data) {
      setShowRequestForm(true);
    }
  }, [loading, requestQuery.isLoading, requestQuery.data]);

  if (loading || requestQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show request form if no request exists
  if (showRequestForm || !requestQuery.data) {
    return (
      <RequestAccessForm
        userOpenId={user?.openId || ""}
        userName={user?.name}
        userEmail={user?.email}
        onSuccess={() => {
          setShowRequestForm(false);
          requestQuery.refetch();
        }}
      />
    );
  }

  const request = requestQuery.data;
  const submittedDate = new Date(request.submittedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {request.status === "pending" && <Clock className="w-5 h-5 text-yellow-500" />}
                {request.status === "approved" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                {request.status === "rejected" && <XCircle className="w-5 h-5 text-red-500" />}
                Access Request Status
              </CardTitle>
              <CardDescription>Submitted on {submittedDate}</CardDescription>
            </div>
            <Badge
              variant={
                request.status === "pending"
                  ? "secondary"
                  : request.status === "approved"
                  ? "default"
                  : "destructive"
              }
            >
              {request.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {request.status === "pending" && (
            <>
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  Your request is being reviewed
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  An administrator will review your access request within 24-48 hours. You'll be notified once a
                  decision has been made.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Request Details</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <p className="font-medium">{request.fullName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{request.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Company:</span>
                    <p className="font-medium">{request.companyName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">City:</span>
                    <p className="font-medium">{request.city}</p>
                  </div>
                </div>
              </div>

              <Button onClick={() => requestQuery.refetch()} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Status
              </Button>
            </>
          )}

          {request.status === "approved" && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                ✓ Your request has been approved!
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200 mb-4">
                Please log out and log back in to access the system.
              </p>
              <Button onClick={() => window.location.reload()} className="w-full">
                Refresh Page
              </Button>
            </div>
          )}

          {request.status === "rejected" && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">Request Rejected</h3>
              {request.rejectionReason && (
                <p className="text-sm text-red-800 dark:text-red-200 mb-4">{request.rejectionReason}</p>
              )}
              <p className="text-sm text-red-800 dark:text-red-200">
                If you believe this was a mistake, please contact support.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t">
            <Mail className="w-4 h-4" />
            <span>Need help? Contact your administrator</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
