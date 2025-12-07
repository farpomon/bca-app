import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2, History, Shield, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

export default function AuditTrailDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [limit, setLimit] = useState(100);

  const { data: logs, isLoading, refetch } = trpc.audit.allLogs.useQuery(
    { limit },
    { enabled: !!user && user.role === "admin" }
  );

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="container py-8">
          <Card>
            <CardContent className="flex items-center gap-4 py-12">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <h2 className="text-xl font-semibold">Access Denied</h2>
                <p className="text-muted-foreground">
                  You need administrator privileges to view the audit trail.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "create":
        return "bg-green-500";
      case "update":
        return "bg-blue-500";
      case "delete":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getEntityIcon = (entityType: string) => {
    // You can customize icons based on entity type
    return "📄";
  };

  return (
    <DashboardLayout>
      <div className="container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Audit Trail Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              System-wide change history and activity log
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLimit(50)}
              disabled={limit === 50}
            >
              Last 50
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLimit(100)}
              disabled={limit === 100}
            >
              Last 100
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLimit(500)}
              disabled={limit === 500}
            >
              Last 500
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              {logs ? `Showing ${logs.length} most recent changes` : "Loading..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No audit logs found
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => {
                  const changes = JSON.parse(log.changes);
                  const metadata = log.metadata ? JSON.parse(log.metadata) : {};

                  return (
                    <div
                      key={log.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getEntityIcon(log.entityType)}</span>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={`${getActionColor(log.action)} text-white`}>
                                {log.action}
                              </Badge>
                              <span className="font-medium">
                                {log.entityType} #{log.entityId}
                              </span>
                            </div>
                            {metadata.changeDescription && (
                              <p className="text-sm text-muted-foreground">
                                {metadata.changeDescription}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>User ID: {log.userId}</span>
                              <span>•</span>
                              <span>{format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {log.action === "update" && changes.before && changes.after && (
                        <div className="mt-3 pt-3 border-t">
                          <details className="text-xs">
                            <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                              View changes
                            </summary>
                            <div className="mt-2 bg-gray-50 rounded p-2 space-y-1">
                              {Object.keys(changes.after).map((key) => {
                                if (changes.before[key] !== changes.after[key]) {
                                  return (
                                    <div key={key} className="flex gap-2">
                                      <span className="font-medium min-w-[100px]">{key}:</span>
                                      <span className="text-red-600 line-through">
                                        {String(changes.before[key])}
                                      </span>
                                      <span>→</span>
                                      <span className="text-green-600">
                                        {String(changes.after[key])}
                                      </span>
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
