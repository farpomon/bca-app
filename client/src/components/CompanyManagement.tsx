import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Users, Plus, Pencil, Trash2, Loader2, Search, AlertTriangle, Calendar } from "lucide-react";
import { toast } from "sonner";

interface CompanyUser {
  id: number;
  name: string | null;
  email: string | null;
  role: string;
  accountStatus: string;
  trialEndsAt: string | null;
  lastSignedIn: string | null;
}

export function CompanyManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [extendTrialDialogOpen, setExtendTrialDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null);
  const [trialDays, setTrialDays] = useState(30);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    notes: "",
    status: "active" as "active" | "suspended" | "inactive",
  });

  // Queries
  const companiesQuery = trpc.admin.getCompanies.useQuery();
  const companyDetailQuery = trpc.admin.getCompanyById.useQuery(
    { id: selectedCompany?.id },
    { enabled: !!selectedCompany?.id && usersDialogOpen }
  );
  const trialStatsQuery = trpc.admin.getTrialStats.useQuery();

  // Mutations
  const createCompanyMutation = trpc.admin.createCompany.useMutation({
    onSuccess: () => {
      toast.success("Company created successfully");
      setCreateDialogOpen(false);
      resetForm();
      companiesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create company: ${error.message}`);
    },
  });

  const updateCompanyMutation = trpc.admin.updateCompany.useMutation({
    onSuccess: () => {
      toast.success("Company updated successfully");
      setEditDialogOpen(false);
      resetForm();
      companiesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update company: ${error.message}`);
    },
  });

  const deleteCompanyMutation = trpc.admin.deleteCompany.useMutation({
    onSuccess: () => {
      toast.success("Company deleted successfully");
      companiesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete company: ${error.message}`);
    },
  });

  const extendTrialMutation = trpc.admin.extendUserTrial.useMutation({
    onSuccess: () => {
      toast.success("Trial extended successfully");
      setExtendTrialDialogOpen(false);
      companyDetailQuery.refetch();
      trialStatsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to extend trial: ${error.message}`);
    },
  });

  const suspendUserMutation = trpc.admin.suspendUser.useMutation({
    onSuccess: () => {
      toast.success("User suspended");
      companyDetailQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to suspend user: ${error.message}`);
    },
  });

  const activateUserMutation = trpc.admin.activateUser.useMutation({
    onSuccess: () => {
      toast.success("User activated");
      companyDetailQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to activate user: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      city: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      notes: "",
      status: "active",
    });
  };

  const handleCreate = () => {
    createCompanyMutation.mutate({
      name: formData.name,
      city: formData.city || undefined,
      contactEmail: formData.contactEmail || undefined,
      contactPhone: formData.contactPhone || undefined,
      address: formData.address || undefined,
      notes: formData.notes || undefined,
    });
  };

  const handleUpdate = () => {
    if (!selectedCompany) return;
    updateCompanyMutation.mutate({
      id: selectedCompany.id,
      name: formData.name,
      city: formData.city || undefined,
      status: formData.status,
      contactEmail: formData.contactEmail || undefined,
      contactPhone: formData.contactPhone || undefined,
      address: formData.address || undefined,
      notes: formData.notes || undefined,
    });
  };

  const handleEdit = (company: any) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      city: company.city || "",
      contactEmail: company.contactEmail || "",
      contactPhone: company.contactPhone || "",
      address: company.address || "",
      notes: company.notes || "",
      status: company.status,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (company: any) => {
    if (confirm(`Are you sure you want to delete "${company.name}"? This cannot be undone.`)) {
      deleteCompanyMutation.mutate({ id: company.id });
    }
  };

  const handleViewUsers = (company: any) => {
    setSelectedCompany(company);
    setUsersDialogOpen(true);
  };

  const handleExtendTrial = (user: CompanyUser) => {
    setSelectedUser(user);
    setTrialDays(30);
    setExtendTrialDialogOpen(true);
  };

  const confirmExtendTrial = () => {
    if (!selectedUser) return;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
    extendTrialMutation.mutate({
      userId: selectedUser.id,
      trialEndsAt: trialEndsAt.toISOString(),
    });
  };

  // Filter companies
  const filteredCompanies = companiesQuery.data?.filter((company) => {
    const matchesSearch =
      searchQuery === "" ||
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || company.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getAccountStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "trial":
        return <Badge className="bg-blue-500">Trial</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getDaysRemaining = (trialEndsAt: string | null) => {
    if (!trialEndsAt) return null;
    const now = new Date();
    const end = new Date(trialEndsAt);
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-6">
      {/* Trial Stats Cards */}
      {trialStatsQuery.data && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trial Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trialStatsQuery.data.totalTrialUsers}</div>
              <p className="text-xs text-muted-foreground">Currently on trial</p>
            </CardContent>
          </Card>

          <Card className={trialStatsQuery.data.expiringSoon > 0 ? "border-yellow-500" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{trialStatsQuery.data.expiringSoon}</div>
              <p className="text-xs text-muted-foreground">Within 7 days</p>
            </CardContent>
          </Card>

          <Card className={trialStatsQuery.data.expired > 0 ? "border-red-500" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired Trials</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{trialStatsQuery.data.expired}</div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Company List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Companies
              </CardTitle>
              <CardDescription>Manage companies and their users</CardDescription>
            </div>
            <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {companiesQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No companies found. Create your first company to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Role Breakdown</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{company.city || "-"}</TableCell>
                    <TableCell>{getStatusBadge(company.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewUsers(company)}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        {company.userCount}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {company.roleBreakdown.admin > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Admin: {company.roleBreakdown.admin}
                          </Badge>
                        )}
                        {company.roleBreakdown.project_manager > 0 && (
                          <Badge variant="outline" className="text-xs">
                            PM: {company.roleBreakdown.project_manager}
                          </Badge>
                        )}
                        {company.roleBreakdown.editor > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Editor: {company.roleBreakdown.editor}
                          </Badge>
                        )}
                        {company.roleBreakdown.viewer > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Viewer: {company.roleBreakdown.viewer}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(company)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(company)}
                          disabled={company.userCount > 0}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Create Company Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Company</DialogTitle>
            <DialogDescription>Add a new company to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Company Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter company name"
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Enter city"
              />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="Enter contact email"
              />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="Enter contact phone"
              />
            </div>
            <div>
              <Label>Address</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter address"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.name || createCompanyMutation.isPending}
            >
              {createCompanyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>Update company details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Company Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "active" | "suspended" | "inactive") =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {formData.status === "suspended" && (
                <p className="text-xs text-yellow-600 mt-1">
                  Warning: Suspending a company will also suspend all its users.
                </p>
              )}
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>
            <div>
              <Label>Address</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.name || updateCompanyMutation.isPending}
            >
              {updateCompanyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Users Dialog */}
      <Dialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedCompany?.name} - Users</DialogTitle>
            <DialogDescription>
              Manage users in this company
            </DialogDescription>
          </DialogHeader>
          {companyDetailQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : companyDetailQuery.data?.users?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users in this company
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trial Ends</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyDetailQuery.data?.users?.map((user) => {
                  const daysRemaining = getDaysRemaining(user.trialEndsAt);
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || "-"}</TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>{getAccountStatusBadge(user.accountStatus)}</TableCell>
                      <TableCell>
                        {user.accountStatus === "trial" && user.trialEndsAt ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {daysRemaining !== null && daysRemaining <= 0 ? (
                              <span className="text-red-600 font-medium">Expired</span>
                            ) : daysRemaining !== null && daysRemaining <= 7 ? (
                              <span className="text-yellow-600">{daysRemaining} days</span>
                            ) : (
                              <span>{daysRemaining} days</span>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {user.accountStatus === "trial" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExtendTrial(user)}
                            >
                              Extend Trial
                            </Button>
                          )}
                          {user.accountStatus === "suspended" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => activateUserMutation.mutate({ userId: user.id })}
                            >
                              Activate
                            </Button>
                          ) : user.accountStatus !== "pending" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => suspendUserMutation.mutate({ userId: user.id })}
                            >
                              Suspend
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Extend Trial Dialog */}
      <Dialog open={extendTrialDialogOpen} onOpenChange={setExtendTrialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Trial Period</DialogTitle>
            <DialogDescription>
              Extend the trial for {selectedUser?.name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Extend by (days)</Label>
              <Input
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                min={1}
                max={365}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              New trial end date:{" "}
              {new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendTrialDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmExtendTrial} disabled={extendTrialMutation.isPending}>
              {extendTrialMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Extend Trial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
