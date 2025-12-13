/**
 * MFA Compliance Report Component
 * Shows MFA adoption statistics and allows downloading compliance reports
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, Shield, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export function MFAComplianceReport() {
  const [timePeriod, setTimePeriod] = useState<"7days" | "30days" | "90days" | "all">("all");

  const { data: report, isLoading } = trpc.admin.getMfaComplianceReport.useQuery({ timePeriod });

  const handleDownloadCSV = () => {
    if (!report) return;

    // Generate CSV content
    const headers = [
      "User ID",
      "Name",
      "Email",
      "Role",
      "Company",
      "MFA Enabled",
      "MFA Required",
      "MFA Enforced At",
      "Grace Period End",
      "Created At",
    ];

    const rows = report.userDetails.map((user) => [
      user.id,
      user.name,
      user.email,
      user.role,
      user.company,
      user.mfaEnabled ? "Yes" : "No",
      user.mfaRequired ? "Yes" : "No",
      user.mfaEnforcedAt || "N/A",
      user.gracePeriodEnd || "N/A",
      user.createdAt,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mfa-compliance-report-${timePeriod}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Compliance report downloaded successfully");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>MFA Compliance Report</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">MFA Compliance Report</h3>
          <p className="text-sm text-muted-foreground">
            Track Multi-Factor Authentication adoption across your organization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as typeof timePeriod)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleDownloadCSV} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.totalUsers}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MFA Enabled</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.totalEnabled}</div>
            <p className="text-xs text-muted-foreground">
              {report.totalUsers > 0 ? Math.round((report.totalEnabled / report.totalUsers) * 100) : 0}% of users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MFA Required</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.totalRequired}</div>
            <p className="text-xs text-muted-foreground">Users with MFA enforced</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adoption Rate</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(report.overallAdoptionRate)}%</div>
            <p className="text-xs text-muted-foreground">Overall compliance</p>
          </CardContent>
        </Card>
      </div>

      {/* Adoption by Role */}
      <Card>
        <CardHeader>
          <CardTitle>Adoption by Role</CardTitle>
          <CardDescription>MFA adoption statistics broken down by user role</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Total Users</TableHead>
                <TableHead className="text-right">MFA Enabled</TableHead>
                <TableHead className="text-right">MFA Required</TableHead>
                <TableHead className="text-right">Adoption Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(report.adoptionByRole).map(([role, stats]) => (
                <TableRow key={role}>
                  <TableCell className="font-medium capitalize">{role.replace("_", " ")}</TableCell>
                  <TableCell className="text-right">{stats.total}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {stats.enabled}
                      {stats.enabled > 0 && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{stats.required}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={stats.adoptionRate >= 80 ? "default" : stats.adoptionRate >= 50 ? "secondary" : "destructive"}
                    >
                      {Math.round(stats.adoptionRate)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Details */}
      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>Detailed MFA status for all users in the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>MFA Status</TableHead>
                  <TableHead>Grace Period</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.userDetails.map((user) => {
                  const gracePeriodEnd = user.gracePeriodEnd ? new Date(user.gracePeriodEnd) : null;
                  const now = new Date();
                  const inGracePeriod = gracePeriodEnd && now < gracePeriodEnd;
                  const gracePeriodExpired = gracePeriodEnd && now >= gracePeriodEnd;

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="capitalize">{user.role.replace("_", " ")}</TableCell>
                      <TableCell>{user.company}</TableCell>
                      <TableCell>
                        {user.mfaEnabled ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Enabled
                          </Badge>
                        ) : user.mfaRequired ? (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Required
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Not Required</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {inGracePeriod ? (
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Active
                          </Badge>
                        ) : gracePeriodExpired ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
