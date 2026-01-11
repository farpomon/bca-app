import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackButton } from "@/components/BackButton";
import { Shield, FileText, Database, AlertTriangle, Play, Download } from "lucide-react";
import { AuditLogsTable } from "@/components/governance/AuditLogsTable";
import { DataIntegrityDashboard } from "@/components/governance/DataIntegrityDashboard";
import { CleanupReportsTable } from "@/components/governance/CleanupReportsTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminGovernance() {
  const { user, loading } = useAuth();
  const [selectedTab, setSelectedTab] = useState("audit-logs");

  // Run cleanup job mutation
  const runCleanupMutation = trpc.cleanupJobs.runJob.useMutation({
    onSuccess: (result) => {
      toast.success(`Cleanup job completed: ${result.totalIssuesCount} issues found`);
      // Refresh data
      if (selectedTab === 'cleanup-reports') {
        // Trigger refetch
      }
    },
    onError: (error) => {
      toast.error(`Cleanup job failed: ${error.message}`);
    },
  });

  // Check if user is admin
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You need admin privileges to access this page.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Shield className="h-8 w-8" />
                Admin Governance Suite
              </h1>
              <p className="text-muted-foreground mt-1">
                Audit logs, data integrity monitoring, and cleanup reports
              </p>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Audit Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">Track all actions</p>
              <p className="text-xs text-muted-foreground mt-1">
                Complete audit trail of system operations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Data Integrity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">Monitor health</p>
              <p className="text-xs text-muted-foreground mt-1">
                Real-time integrity metrics and alerts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Cleanup Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">Weekly sweeps</p>
              <p className="text-xs text-muted-foreground mt-1">
                Automated integrity checks and fixes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="audit-logs">
              <FileText className="h-4 w-4 mr-2" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger value="integrity">
              <Database className="h-4 w-4 mr-2" />
              Data Integrity
            </TabsTrigger>
            <TabsTrigger value="cleanup-reports">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Cleanup Reports
            </TabsTrigger>
            <TabsTrigger value="jobs">
              <Play className="h-4 w-4 mr-2" />
              Jobs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audit-logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>
                  View and search all system actions with complete audit trail
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AuditLogsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrity" className="space-y-4">
            <DataIntegrityDashboard />
          </TabsContent>

          <TabsContent value="cleanup-reports" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Cleanup Reports</CardTitle>
                    <CardDescription>
                      View historical cleanup reports and run manual jobs
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => runCleanupMutation.mutate({ mode: 'read_only' })}
                    disabled={runCleanupMutation.isPending}
                  >
                    {runCleanupMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run Cleanup Now
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <CleanupReportsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Jobs & Notifications</CardTitle>
                <CardDescription>
                  Monitor automated jobs and notification status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Weekly Cleanup Job</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Runs every Sunday at 2:00 AM (America/Toronto)
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Next run: Check server logs
                      </span>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Email Notifications</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Admin users receive weekly cleanup reports via email
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Enabled
                      </span>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-muted/50">
                    <h3 className="font-semibold mb-2">Manual Actions</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => runCleanupMutation.mutate({ mode: 'read_only' })}
                        disabled={runCleanupMutation.isPending}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Run Cleanup (Read-Only)
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => runCleanupMutation.mutate({ mode: 'auto_fix' })}
                        disabled={runCleanupMutation.isPending}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Run Cleanup (Auto-Fix)
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Auto-fix mode will automatically resolve certain issues (use with caution)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
