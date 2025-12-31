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
import { CompanySelector } from "@/components/CompanySelector";
import { UserPlus, Trash2, Edit, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

export default function CompanyUsersPage() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>();
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newUserId, setNewUserId] = useState("");
  const [newUserRole, setNewUserRole] = useState<"company_admin" | "project_manager" | "editor" | "viewer">("viewer");

  const utils = trpc.useUtils();

  // Get companies user belongs to
  const { data: myCompanies } = trpc.companyRoles.myCompanies.useQuery();

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

  const addUserMutation = trpc.companyRoles.addUserToCompany.useMutation({
    onSuccess: () => {
      toast.success("User added successfully");
      utils.companyRoles.getCompanyUsers.invalidate();
      setAddUserDialogOpen(false);
      setNewUserId("");
      setNewUserRole("viewer");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

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

  const handleAddUser = () => {
    if (!selectedCompanyId || !newUserId) {
      toast.error("Please fill in all fields");
      return;
    }

    addUserMutation.mutate({
      companyId: selectedCompanyId,
      userId: parseInt(newUserId),
      role: newUserRole,
    });
  };

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

  // Auto-select first company if user has companies
  if (!selectedCompanyId && myCompanies && myCompanies.length > 0) {
    setSelectedCompanyId(myCompanies[0].id);
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Company Users</h1>
          <p className="text-muted-foreground mt-2">
            Manage users and roles within your company
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle>Select Company</CardTitle>
              <CardDescription>
                Choose a company to manage its users
              </CardDescription>
            </div>
            {isAdmin && (
              <Button onClick={() => setAddUserDialogOpen(true)} size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <CompanySelector
            value={selectedCompanyId}
            onChange={setSelectedCompanyId}
          />
        </CardContent>
      </Card>

      {selectedCompanyId && (
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
                No users found in this company
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
                        <Badge variant={user.status === "active" ? "default" : "secondary"}>
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
      )}

      {/* Add User Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User to Company</DialogTitle>
            <DialogDescription>
              Add a user to the company and assign them a role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                type="number"
                placeholder="Enter user ID"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newUserRole} onValueChange={(val: any) => setNewUserRole(val)}>
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
            <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={addUserMutation.isPending}>
              {addUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
