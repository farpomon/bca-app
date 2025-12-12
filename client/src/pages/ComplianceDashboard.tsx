import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Shield, Database, FileText, Users, CheckCircle, AlertTriangle, Download } from "lucide-react";
import { format } from "date-fns";

export default function ComplianceDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: metrics, isLoading: metricsLoading } = trpc.compliance.getComplianceMetrics.useQuery();
  const { data: dataResidency } = trpc.compliance.getDataResidency.useQuery();
  const { data: dataRequests } = trpc.compliance.getAllDataRequests.useQuery();
  const { data: auditLogs } = trpc.compliance.getAuditLog.useQuery({
    limit: 50,
    offset: 0,
  });

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Compliance & Security Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            FOIP compliance, data residency, and audit tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => window.location.href = '/admin/data-security'}>
            <Shield className="h-4 w-4" />
            Data Security
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Compliance Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-3xl font-bold mt-1">{metrics?.totalUsers || 0}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Consent Rate</p>
              <p className="text-3xl font-bold mt-1">{metrics?.consentRate || 0}%</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Requests</p>
              <p className="text-3xl font-bold mt-1">{metrics?.pendingDataRequests || 0}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Audit Logs (30d)</p>
              <p className="text-3xl font-bold mt-1">{metrics?.auditLogsLast30Days || 0}</p>
            </div>
            <FileText className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="data-requests">Data Requests</TabsTrigger>
          <TabsTrigger value="audit-log">Audit Log</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Residency & Compliance
            </h2>
            <div className="space-y-4">
              {dataResidency && Object.entries(dataResidency).map(([key, data]: [string, any]) => (
                <div key={key} className="border-b pb-3 last:border-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium capitalize">
                        {key.replace(/_/g, " ")}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {data.description}
                      </p>
                      <p className="text-sm mt-2 bg-muted p-2 rounded">
                        {data.value}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-4">
                      {format(new Date(data.updatedAt), "MMM d, yyyy")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Compliance Certifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">FOIP Compliant</p>
                  <p className="text-sm text-green-700">Freedom of Information and Protection of Privacy</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">ISO 27001</p>
                  <p className="text-sm text-blue-700">Information Security Management</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <Shield className="h-6 w-6 text-purple-600" />
                <div>
                  <p className="font-medium text-purple-900">SOC 2 Type II</p>
                  <p className="text-sm text-purple-700">Security, Availability, Confidentiality</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Database className="h-6 w-6 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">Data Sovereignty</p>
                  <p className="text-sm text-amber-700">Manus Cloud Infrastructure</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Data Requests Tab */}
        <TabsContent value="data-requests">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">User Data Access Requests</h2>
            {dataRequests && dataRequests.length > 0 ? (
              <div className="space-y-3">
                {dataRequests.map((item) => (
                  <div key={item.request.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium">{item.user?.name || "Unknown User"}</p>
                          <Badge variant={
                            item.request.status === "completed" ? "default" :
                            item.request.status === "rejected" ? "destructive" :
                            item.request.status === "processing" ? "secondary" :
                            "outline"
                          }>
                            {item.request.status}
                          </Badge>
                          <Badge variant="outline">
                            {item.request.requestType}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.user?.email}
                        </p>
                        {item.request.requestDetails && (
                          <p className="text-sm mt-2">{item.request.requestDetails}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Requested: {format(new Date(item.request.requestedAt), "PPP")}
                        </p>
                      </div>
                      {item.request.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive">
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No data access requests
              </p>
            )}
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit-log">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Audit Log</h2>
            {auditLogs && auditLogs.length > 0 ? (
              <div className="space-y-2">
                {auditLogs.map((item) => (
                  <div key={item.log.id} className="border-b pb-2 last:border-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.log.action}</Badge>
                          <span className="text-sm">{item.log.entityType}</span>
                          <span className="text-sm text-muted-foreground">
                            by {item.user?.name || "Unknown"}
                          </span>
                        </div>
                        {item.log.ipAddress && (
                          <p className="text-xs text-muted-foreground mt-1">
                            IP: {item.log.ipAddress}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.log.createdAt), "PPp")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No audit logs available
              </p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
