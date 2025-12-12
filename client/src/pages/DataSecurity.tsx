import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Key, 
  Clock, 
  Trash2, 
  Lock, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Database
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DataSecurity() {
  const [disposalDialogOpen, setDisposalDialogOpen] = useState(false);
  const [disposalType, setDisposalType] = useState<string>("project");
  const [disposalReason, setDisposalReason] = useState("");

  const { data: summary } = trpc.dataSecurity.getSecuritySummary.useQuery();
  const { data: retentionPolicies } = trpc.dataSecurity.getRetentionPolicies.useQuery();
  const { data: encryptionKeys } = trpc.dataSecurity.getEncryptionKeys.useQuery();
  const { data: disposalRequests } = trpc.dataSecurity.getDisposalRequests.useQuery();

  const requestDisposal = trpc.dataSecurity.requestDataDisposal.useMutation({
    onSuccess: () => {
      toast.success("Data disposal request submitted");
      setDisposalDialogOpen(false);
      setDisposalReason("");
    },
    onError: (error) => {
      toast.error(`Failed to submit request: ${error.message}`);
    },
  });

  const approveDisposal = trpc.dataSecurity.approveDisposalRequest.useMutation({
    onSuccess: () => {
      toast.success("Disposal request approved");
    },
  });

  const rejectDisposal = trpc.dataSecurity.rejectDisposalRequest.useMutation({
    onSuccess: () => {
      toast.success("Disposal request rejected");
    },
  });

  const handleRequestDisposal = () => {
    if (!disposalReason.trim()) {
      toast.error("Please provide a reason for data disposal");
      return;
    }

    requestDisposal.mutate({
      requestType: disposalType as any,
      reason: disposalReason,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Data Security & Encryption
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage encryption, data retention policies, and secure data disposal
          </p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.activePolicies}</div>
                <p className="text-xs text-muted-foreground">Retention policies</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Default Retention</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.defaultRetentionYears} years</div>
                <p className="text-xs text-muted-foreground">Municipal requirement</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Encryption Keys</CardTitle>
                <Key className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.activeEncryptionKeys}</div>
                <p className="text-xs text-muted-foreground">Active keys</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Disposals</CardTitle>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.pendingDisposals}</div>
                <p className="text-xs text-muted-foreground">Awaiting approval</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="encryption" className="space-y-4">
          <TabsList>
            <TabsTrigger value="encryption">Encryption</TabsTrigger>
            <TabsTrigger value="retention">Data Retention</TabsTrigger>
            <TabsTrigger value="disposal">Data Disposal</TabsTrigger>
          </TabsList>

          {/* Encryption Tab */}
          <TabsContent value="encryption" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Encryption Keys & Methods
                </CardTitle>
                <CardDescription>
                  Encryption keys are owned by the City and managed by the Manus platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {encryptionKeys?.map((key) => (
                    <div key={key.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{key.keyIdentifier}</h3>
                            <Badge variant={key.keyStatus === "active" ? "default" : "secondary"}>
                              {key.keyStatus}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Type:</span>{" "}
                              <span className="font-medium capitalize">{key.keyType.replace(/_/g, " ")}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Algorithm:</span>{" "}
                              <span className="font-medium">{key.algorithm}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Owner:</span>{" "}
                              <span className="font-medium">{key.keyOwner}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Created:</span>{" "}
                              <span className="font-medium">
                                {new Date(key.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          {key.notes && (
                            <p className="text-sm text-muted-foreground mt-2">{key.notes}</p>
                          )}
                        </div>
                        <Key className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-4" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Encryption Standards
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Data in transit: TLS 1.3 with perfect forward secrecy</li>
                    <li>• Data at rest: AES-256-GCM encryption for database and backups</li>
                    <li>• File storage: S3-compatible storage with server-side encryption</li>
                    <li>• Key management: Customer-owned keys managed by Manus platform</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Retention Tab */}
          <TabsContent value="retention" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Data Retention Policies
                </CardTitle>
                <CardDescription>
                  Default 7-year retention period for municipal compliance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {retentionPolicies?.map((policy) => (
                    <div key={policy.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{policy.policyName}</h3>
                            <Badge variant={policy.isActive ? "default" : "secondary"}>
                              {policy.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{policy.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Data Type:</span>{" "}
                              <span className="font-medium capitalize">{policy.dataType}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Retention:</span>{" "}
                              <span className="font-medium">{policy.retentionPeriodYears} years</span>
                            </div>
                          </div>
                        </div>
                        <Database className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-4" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-900 dark:text-amber-100">
                    <AlertTriangle className="h-4 w-4" />
                    Retention Policy Enforcement
                  </h4>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Data older than the retention period will be flagged for review and disposal. 
                    Administrators will be notified before automatic deletion occurs.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Disposal Tab */}
          <TabsContent value="disposal" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Trash2 className="h-5 w-5" />
                      Data Disposal Requests
                    </CardTitle>
                    <CardDescription>
                      Secure data deletion with backup purging and verification
                    </CardDescription>
                  </div>
                  <Button onClick={() => setDisposalDialogOpen(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Request Disposal
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {disposalRequests && disposalRequests.length > 0 ? (
                    disposalRequests.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold capitalize">
                                {request.requestType.replace(/_/g, " ")} Disposal
                              </h3>
                              <Badge
                                variant={
                                  request.status === "completed"
                                    ? "default"
                                    : request.status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {request.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{request.reason}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                          <div>
                            <span className="text-muted-foreground">Requested:</span>{" "}
                            <span>{new Date(request.requestedAt).toLocaleDateString()}</span>
                          </div>
                          {request.disposalMethod && (
                            <div>
                              <span className="text-muted-foreground">Method:</span>{" "}
                              <span className="capitalize">{request.disposalMethod.replace(/_/g, " ")}</span>
                            </div>
                          )}
                          {request.backupPurgeStatus && request.backupPurgeStatus !== "not_started" && (
                            <div>
                              <span className="text-muted-foreground">Backup Purge:</span>{" "}
                              <span className="capitalize">{request.backupPurgeStatus}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No disposal requests found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Disposal Request Dialog */}
      <Dialog open={disposalDialogOpen} onOpenChange={setDisposalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Data Disposal</DialogTitle>
            <DialogDescription>
              Submit a request to securely delete data. This will include purging from backups.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="disposalType">Data Type</Label>
              <Select value={disposalType} onValueChange={setDisposalType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Project Data</SelectItem>
                  <SelectItem value="user_data">User Data</SelectItem>
                  <SelectItem value="audit_logs">Audit Logs</SelectItem>
                  <SelectItem value="backups">Backups Only</SelectItem>
                  <SelectItem value="full_account">Full Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Disposal</Label>
              <Textarea
                id="reason"
                value={disposalReason}
                onChange={(e) => setDisposalReason(e.target.value)}
                placeholder="Explain why this data needs to be deleted..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisposalDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRequestDisposal}
              disabled={requestDisposal.isPending}
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
