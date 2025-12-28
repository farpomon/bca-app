import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Shield, Users, FolderKanban, BarChart3, Loader2, AlertCircle, ChevronDown, Search, X, UserPlus, Building2, Mail, TrendingUp, Target, Database } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import ApproveRequestDialog from "@/components/ApproveRequestDialog";
import RejectRequestDialog from "@/components/RejectRequestDialog";
import { MFAComplianceReport } from "@/components/MFAComplianceReport";
import { AdminMFARecovery } from "@/components/AdminMFARecovery";
import { CompanyManagement } from "@/components/CompanyManagement";
import EmailDeliveryLogs from "@/components/EmailDeliveryLogs";
import EconomicIndicators from "./EconomicIndicators";
import PortfolioTargets from "./PortfolioTargets";
import { BulkUserActions } from "@/components/BulkUserActions";
import { BulkAccessRequestActions } from "@/components/BulkAccessRequestActions";
import { Checkbox } from "@/components/ui/checkbox";
import { UndoHistory } from "@/components/UndoHistory";
import { MFATimeRestrictionDialog } from "@/components/MFATimeRestrictionDialog";
import { BackupManagement } from "@/components/BackupManagement";
import { BackButton } from "@/components/BackButton";

export default function Admin() {
  const { user, loading } = useAuth();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedRequestIds, setSelectedRequestIds] = useState<number[]>([]);
  const [timeRestrictionDialogOpen, setTimeRestrictionDialogOpen] = useState(false);
  const [selectedUserForTimeRestriction, setSelectedUserForTimeRestriction] = useState<any>(null);

  // Queries
  const statsQuery = trpc.admin.getSystemStats.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  
  const usersQuery = trpc.users.list.useQuery(undefined, {
    enabled: user?.role === "admin" && selectedTab === "users",
  });

  const pendingCountQuery = trpc.accessRequests.getPendingCount.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const accessRequestsQuery = trpc.accessRequests.list.useQuery(
    { status: "all" },
    { enabled: user?.role === "admin" && selectedTab === "access-requests" }
  );
  
  const projectsQuery = trpc.admin.getAllProjects.useQuery(
    { limit: 50, offset: 0 },
    { enabled: user?.role === "admin" && selectedTab === "projects" }
  );

  // Mutations
  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated successfully");
      usersQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });

  const updateAccountStatusMutation = trpc.users.updateAccountStatus.useMutation({
    onSuccess: () => {
      toast.success("Account status updated successfully");
      usersQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update account status: ${error.message}`);
    },
  });

  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("User deleted successfully");
      usersQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete user: ${error.message}`);
    },
  });

  const requireMfaMutation = trpc.admin.requireMfaForUser.useMutation({
    onSuccess: (data, variables) => {
      if (variables.required) {
        toast.success("MFA requirement set. User has 7 days to set up MFA.");
      } else {
        toast.success("MFA requirement removed.");
      }
      usersQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update MFA requirement: ${error.message}`);
    },
  });

  // Loading state
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Access control
  if (user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <CardTitle>Access Denied</CardTitle>
            </div>
            <CardDescription>
              You don't have permission to access the admin section.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleRoleChange = (userId: number, newRole: "viewer" | "editor" | "project_manager" | "admin") => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleAccountStatusChange = (userId: number, newStatus: "pending" | "active" | "trial" | "suspended") => {
    updateAccountStatusMutation.mutate({ userId, accountStatus: newStatus });
  };

  // Filter users based on search and filters
  const filteredUsers = usersQuery.data?.filter((u) => {
    const matchesSearch =
      searchQuery === "" ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.company?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" || u.accountStatus === statusFilter;
    const matchesCompany = companyFilter === "all" || u.company === companyFilter;

    return matchesSearch && matchesRole && matchesStatus && matchesCompany;
  }) || [];

  // Get unique companies for filter
  const companies = Array.from(new Set(usersQuery.data?.map((u) => u.company).filter(Boolean))) as string[];

  // Count active filters
  const activeFiltersCount =
    (roleFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (companyFilter !== "all" ? 1 : 0) +
    (searchQuery !== "" ? 1 : 0);

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
    setCompanyFilter("all");
  };

  const handleDeleteUser = (userId: number, userName: string | null) => {
    if (confirm(`Are you sure you want to delete user "${userName || 'Unknown'}"? This action cannot be undone.`)) {
      deleteUserMutation.mutate({ userId });
    }
  };

  const handleRequireMfa = (userId: number, required: boolean) => {
    requireMfaMutation.mutate({ userId, required });
  };

  return (
    <DashboardLayout>
    <div className="container mx-auto py-8 space-y-8">
      <BackButton to="dashboard" />
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">System management and administration</p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <FolderKanban className="w-4 h-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="access-requests" className="gap-2">
            <UserPlus className="w-4 h-4" />
            Access Requests
            {pendingCountQuery.data && pendingCountQuery.data.count > 0 && (
              <Badge variant="destructive" className="ml-1">
                {pendingCountQuery.data.count}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="mfa-compliance" className="gap-2">
            <Shield className="w-4 h-4" />
            MFA Compliance
          </TabsTrigger>
          <TabsTrigger value="mfa-recovery" className="gap-2">
            <Shield className="w-4 h-4" />
            MFA Recovery
          </TabsTrigger>
          <TabsTrigger value="companies" className="gap-2">
            <Building2 className="w-4 h-4" />
            Companies
          </TabsTrigger>
          <TabsTrigger value="email-logs" className="gap-2">
            <Mail className="w-4 h-4" />
            Email Logs
          </TabsTrigger>
          <TabsTrigger value="economic-indicators" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Economic Indicators
          </TabsTrigger>
          <TabsTrigger value="portfolio-targets" className="gap-2">
            <Target className="w-4 h-4" />
            Portfolio Targets
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2">
            <Database className="w-4 h-4" />
            Backup & Restore
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <UndoHistory />
          {statsQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : statsQuery.data ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statsQuery.data.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    {statsQuery.data.adminUsers} admin{statsQuery.data.adminUsers !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statsQuery.data.totalProjects}</div>
                  <p className="text-xs text-muted-foreground">Across all users</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsQuery.data.projectsByStatus.in_progress}
                  </div>
                  <p className="text-xs text-muted-foreground">In progress</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsQuery.data.projectsByStatus.completed}
                  </div>
                  <p className="text-xs text-muted-foreground">Projects completed</p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Compliance Quick Access */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance & Security
              </CardTitle>
              <CardDescription>FOIP compliance, data residency, and audit tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/compliance">
                <Button className="w-full" variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  Open Compliance Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Status Distribution</CardTitle>
              <CardDescription>Breakdown of projects by status</CardDescription>
            </CardHeader>
            <CardContent>
              {statsQuery.data && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Draft</span>
                    <Badge variant="secondary">{statsQuery.data.projectsByStatus.draft}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">In Progress</span>
                    <Badge variant="default">{statsQuery.data.projectsByStatus.in_progress}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Completed</span>
                    <Badge variant="outline">{statsQuery.data.projectsByStatus.completed}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Archived</span>
                    <Badge variant="secondary">{statsQuery.data.projectsByStatus.archived}</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              {usersQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : usersQuery.data ? (
                <>
                  {/* Search and Filters */}
                  <div className="space-y-4 mb-6">
                    <div className="flex gap-3 items-center flex-wrap">
                      <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, email, or company..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filter by role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="project_manager">Project Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="trial">Trial</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                      {companies.length > 0 && (
                        <Select value={companyFilter} onValueChange={setCompanyFilter}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by company" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Companies</SelectItem>
                            {companies.map((company) => (
                              <SelectItem key={company} value={company}>
                                {company}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {activeFiltersCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                          <X className="h-4 w-4" />
                          Clear {activeFiltersCount} {activeFiltersCount === 1 ? "filter" : "filters"}
                        </Button>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredUsers.length} of {usersQuery.data.length} users
                    </div>
                  </div>

                <BulkUserActions
                  selectedUserIds={selectedUserIds}
                  onClearSelection={() => setSelectedUserIds([])}
                  onSuccess={() => usersQuery.refetch()}
                  currentUserId={user?.id}
                />

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedUserIds(filteredUsers.map(u => u.id));
                            else setSelectedUserIds([]);
                          }}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Account Status</TableHead>
                      <TableHead>Last Sign In</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id} className={selectedUserIds.includes(u.id) ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUserIds.includes(u.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedUserIds([...selectedUserIds, u.id]);
                              else setSelectedUserIds(selectedUserIds.filter(id => id !== u.id));
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{u.name || "—"}</TableCell>
                        <TableCell>{u.email || "—"}</TableCell>
                        <TableCell>{u.company || "—"}</TableCell>
                        <TableCell>{u.city || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                            {u.role.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              u.accountStatus === "active"
                                ? "default"
                                : u.accountStatus === "trial"
                                ? "secondary"
                                : u.accountStatus === "suspended"
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {u.accountStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 items-center flex-wrap">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-muted-foreground">Role</label>
                              <Select
                                value={u.role}
                                onValueChange={(value) => handleRoleChange(u.id, value as any)}
                                disabled={updateRoleMutation.isPending || u.id === user.id}
                              >
                                <SelectTrigger className="w-[160px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="viewer">Viewer</SelectItem>
                                  <SelectItem value="editor">Editor</SelectItem>
                                  <SelectItem value="project_manager">Project Manager</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-muted-foreground">Status</label>
                              <Select
                                value={u.accountStatus}
                                onValueChange={(value) => handleAccountStatusChange(u.id, value as any)}
                                disabled={updateAccountStatusMutation.isPending}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="trial">Trial</SelectItem>
                                  <SelectItem value="suspended">Suspended</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-muted-foreground">MFA</label>
                              <div className="flex gap-2">
                                <Button
                                  variant={u.mfaRequired ? "outline" : "default"}
                                  size="sm"
                                  onClick={() => handleRequireMfa(u.id, !u.mfaRequired)}
                                  disabled={requireMfaMutation.isPending}
                                  className="w-[140px]"
                                >
                                  {u.mfaRequired ? "Remove Requirement" : "Require MFA"}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUserForTimeRestriction(u);
                                    setTimeRestrictionDialogOpen(true);
                                  }}
                                  title="Set MFA time restrictions"
                                >
                                  <Shield className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {u.id !== user.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                disabled={deleteUserMutation.isPending}
                                className="text-destructive hover:text-destructive"
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Projects</CardTitle>
              <CardDescription>View all projects across all users</CardDescription>
            </CardHeader>
            <CardContent>
              {projectsQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : projectsQuery.data ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assessment Date</TableHead>
                      <TableHead>User ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectsQuery.data.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">
                          <Link href={`/projects/${project.id}`} className="text-primary hover:underline">
                            {project.name}
                          </Link>
                        </TableCell>
                        <TableCell>{project.address || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              project.status === "completed"
                                ? "default"
                                : project.status === "in_progress"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {project.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {project.assessmentDate
                            ? new Date(project.assessmentDate).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>{project.userId}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Requests Tab */}
        <TabsContent value="access-requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Access Requests</CardTitle>
              <CardDescription>Review and manage user access requests</CardDescription>
            </CardHeader>
            <CardContent>
              {accessRequestsQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : accessRequestsQuery.data && accessRequestsQuery.data.length > 0 ? (
                <>
                  <BulkAccessRequestActions
                    selectedRequestIds={selectedRequestIds}
                    onClearSelection={() => setSelectedRequestIds([])}
                    onSuccess={() => {
                      accessRequestsQuery.refetch();
                      pendingCountQuery.refetch();
                    }}
                  />
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={accessRequestsQuery.data.length > 0 && selectedRequestIds.length === accessRequestsQuery.data.length}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedRequestIds(accessRequestsQuery.data?.map(r => r.id) || []);
                              else setSelectedRequestIds([]);
                            }}
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessRequestsQuery.data.map((req) => (
                      <TableRow key={req.id} className={selectedRequestIds.includes(req.id) ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRequestIds.includes(req.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedRequestIds([...selectedRequestIds, req.id]);
                              else setSelectedRequestIds(selectedRequestIds.filter(id => id !== req.id));
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{req.fullName}</TableCell>
                        <TableCell>{req.email}</TableCell>
                        <TableCell>{req.companyName}</TableCell>
                        <TableCell>{req.city}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              req.status === "pending"
                                ? "secondary"
                                : req.status === "approved"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(req.submittedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {req.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setApproveDialogOpen(true);
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setRejectDialogOpen(true);
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                          {req.status !== "pending" && (
                            <span className="text-sm text-muted-foreground">
                              {req.status === "approved" ? "Approved" : "Rejected"} on{" "}
                              {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : "—"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  </Table>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No access requests found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MFA Compliance Tab */}
        <TabsContent value="mfa-compliance" className="space-y-4">
          <MFAComplianceReport />
        </TabsContent>

        {/* MFA Recovery Tab */}
        <TabsContent value="mfa-recovery" className="space-y-4">
          <AdminMFARecovery />
        </TabsContent>

        {/* Companies Tab */}
        <TabsContent value="companies" className="space-y-4">
          <CompanyManagement />
        </TabsContent>

        {/* Email Logs Tab */}
        <TabsContent value="email-logs" className="space-y-4">
          <EmailDeliveryLogs />
        </TabsContent>

        {/* Economic Indicators Tab */}
        <TabsContent value="economic-indicators" className="space-y-4">
          <EconomicIndicators />
        </TabsContent>

        {/* Portfolio Targets Tab */}
        <TabsContent value="portfolio-targets" className="space-y-4">
          <PortfolioTargets />
        </TabsContent>

        {/* Backup & Restore Tab */}
        <TabsContent value="backup" className="space-y-4">
          <BackupManagement />
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      {selectedRequest && (
        <ApproveRequestDialog
          request={selectedRequest}
          open={approveDialogOpen}
          onOpenChange={setApproveDialogOpen}
          onSuccess={() => {
            accessRequestsQuery.refetch();
            pendingCountQuery.refetch();
          }}
        />
      )}

      {/* Reject Dialog */}
      {selectedRequest && (
        <RejectRequestDialog
          request={selectedRequest}
          open={rejectDialogOpen}
          onOpenChange={setRejectDialogOpen}
          onSuccess={() => {
            accessRequestsQuery.refetch();
            pendingCountQuery.refetch();
          }}
        />
      )}

      {/* MFA Time Restriction Dialog */}
      {selectedUserForTimeRestriction && (
        <MFATimeRestrictionDialog
          open={timeRestrictionDialogOpen}
          onClose={() => {
            setTimeRestrictionDialogOpen(false);
            setSelectedUserForTimeRestriction(null);
          }}
          userId={selectedUserForTimeRestriction.id}
          userName={selectedUserForTimeRestriction.name || selectedUserForTimeRestriction.email}
        />
      )}
    </div>
    </DashboardLayout>
  );
}
