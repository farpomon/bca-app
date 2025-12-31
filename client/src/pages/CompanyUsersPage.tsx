import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Trash2, Edit, Loader2, Shield, ArrowLeft, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { InviteUserDialog } from "@/components/InviteUserDialog";
import DashboardLayout from "@/components/DashboardLayout";
import { useLocation } from "wouter";

export default function CompanyUsersPage() {
  const [, setLocation] = useLocation();
  const { selectedCompanyId, selectedCompany } = useCompany();
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  // Get users in selected company
  const { data: companyUsers, isLoading } = trpc.companyRoles.getCompanyUsers.useQuery(
    { companyId: selectedCompanyId! },
    { enabled: !!selectedCompanyId }
  );

  // Get current user's role in selected company
  const { data: myRole } = trpc.companyRoles.myRoleInCompany.useQuery(
    { companyId: selectedCompanyId! },
    { enabled: !!selectedCompanyId }
  );

  const updateRoleMutation = trpc.companyRoles.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated successfully");
      utils.companyRoles.getCompanyUsers.invalidate();
      setEditUserDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeUserMutation = trpc.companyRoles.removeUserFromCompany.useMutation({
    onSuccess: () => {
      toast.success("User removed successfully");
      utils.companyRoles.getCompanyUsers.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleUpdateRole = () => {
    if (!selectedCompanyId || !selectedUser) return;

    updateRoleMutation.mutate({
      companyId: selectedCompanyId,
      userId: selectedUser.id,
      newRole: selectedUser.role,
    });
  };

  const handleRemoveUser = (userId: number) => {
    if (!selectedCompanyId) return;

    if (confirm("Are you sure you want to remove this user from the company?")) {
      removeUserMutation.mutate({
        companyId: selectedCompanyId,
        userId,
      });
    }
  };

  const isAdmin = myRole?.companyRole === "company_admin";

  if (!selectedCompanyId || !selectedCompany) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="text-xl font-semibold">No Company Selected</h2>
                <p className="text-muted-foreground">
                  Please select a company from the sidebar to manage its users.
                </p>
                <Button variant="outline" onClick={() => setLocation("/projects")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Projects
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/projects")}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
            <h1 className="text-3xl font-bold">{selectedCompany.name}</h1>
            <p className="text-muted-foreground mt-2">
              Manage users and roles within your company
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Company Members</CardTitle>
            <CardDescription>
              {myRole && (
                <div className="flex items-center gap-2 mt-2">
                  <Shield className="h-4 w-4" />
                  <span>Your role: <strong>{getRoleLabel(myRole.companyRole)}</strong></span>
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !companyUsers || companyUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No users found in this company</p>
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setInviteDialogOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite the first user
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                      <TableCell>{user.email || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : "N/A"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setEditUserDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveUser(user.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Invite User Dialog */}
        <InviteUserDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          companyId={selectedCompanyId}
          companyName={selectedCompany.name}
        />

        {/* Edit User Role Dialog */}
        <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Role</DialogTitle>
              <DialogDescription>
                Change the role for {selectedUser?.name || "this user"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editRole">Role</Label>
                <Select
                  value={selectedUser?.role}
                  onValueChange={(val) => setSelectedUser({ ...selectedUser, role: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="project_manager">Project Manager</SelectItem>
                    <SelectItem value="company_admin">Company Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditUserDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRole} disabled={updateRoleMutation.isPending}>
                {updateRoleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    company_admin: "Company Admin",
    project_manager: "Project Manager",
    editor: "Editor",
    viewer: "Viewer",
  };
  return labels[role] || role;
}

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  if (role === "company_admin") return "default";
  if (role === "project_manager") return "secondary";
  return "outline";
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "active") return "default";
  if (status === "pending") return "secondary";
  if (status === "inactive") return "destructive";
  return "outline";
}
