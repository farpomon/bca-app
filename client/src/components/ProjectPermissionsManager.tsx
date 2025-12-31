import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Loader2, 
  Shield, 
  UserPlus, 
  UserMinus, 
  Search,
  FolderKanban,
  Users,
  Eye,
  Edit,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface ProjectPermissionsManagerProps {
  companyName?: string;
}

export function ProjectPermissionsManager({ companyName }: ProjectPermissionsManagerProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [permissionLevel, setPermissionLevel] = useState<"view" | "edit">("view");

  // Queries
  const projectsQuery = trpc.projectPermissions.getCompanyProjects.useQuery();
  const usersQuery = trpc.projectPermissions.getCompanyUsers.useQuery(
    { projectId: selectedProjectId || undefined },
    { enabled: !!selectedProjectId }
  );
  const permissionsQuery = trpc.projectPermissions.listByProject.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  // Mutations
  const grantMutation = trpc.projectPermissions.grant.useMutation({
    onSuccess: () => {
      toast.success("Permission granted successfully");
      permissionsQuery.refetch();
      usersQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to grant permission: ${error.message}`);
    },
  });

  const revokeMutation = trpc.projectPermissions.revoke.useMutation({
    onSuccess: () => {
      toast.success("Permission revoked successfully");
      permissionsQuery.refetch();
      usersQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to revoke permission: ${error.message}`);
    },
  });

  const bulkGrantMutation = trpc.projectPermissions.bulkGrant.useMutation({
    onSuccess: (data) => {
      toast.success(`Permissions updated: ${data.granted} granted, ${data.updated} updated`);
      permissionsQuery.refetch();
      usersQuery.refetch();
      setGrantDialogOpen(false);
      setSelectedUserIds([]);
    },
    onError: (error) => {
      toast.error(`Failed to grant permissions: ${error.message}`);
    },
  });

  const handleGrantPermission = (userId: number) => {
    if (!selectedProjectId) return;
    grantMutation.mutate({
      projectId: selectedProjectId,
      userId,
      permission: permissionLevel,
    });
  };

  const handleRevokePermission = (userId: number) => {
    if (!selectedProjectId) return;
    if (confirm("Are you sure you want to revoke this user's access to the project?")) {
      revokeMutation.mutate({
        projectId: selectedProjectId,
        userId,
      });
    }
  };

  const handleBulkGrant = () => {
    if (!selectedProjectId || selectedUserIds.length === 0) return;
    bulkGrantMutation.mutate({
      projectId: selectedProjectId,
      userIds: selectedUserIds,
      permission: permissionLevel,
    });
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    const usersWithoutAccess = usersQuery.data?.filter(u => !u.hasAccess) || [];
    setSelectedUserIds(usersWithoutAccess.map(u => u.id));
  };

  const clearSelection = () => {
    setSelectedUserIds([]);
  };

  // Filter users based on search
  const filteredUsers = usersQuery.data?.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  }) || [];

  const usersWithAccess = filteredUsers.filter(u => u.hasAccess);
  const usersWithoutAccess = filteredUsers.filter(u => !u.hasAccess);

  const selectedProject = projectsQuery.data?.find(p => p.id === selectedProjectId);

  return (
    <div className="space-y-6">
      {/* Project Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5" />
            Select Project
          </CardTitle>
          <CardDescription>
            Choose a project to manage user access permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projectsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : projectsQuery.data?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>No projects found in your company</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {projectsQuery.data?.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    selectedProjectId === project.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{project.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Status: <Badge variant="outline" className="ml-1">{project.status}</Badge>
                      </p>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${
                      selectedProjectId === project.id ? "rotate-90" : ""
                    }`} />
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{project.permissionCount} user{project.permissionCount !== 1 ? "s" : ""} with access</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission Management */}
      {selectedProjectId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Manage Access: {selectedProject?.name}
                </CardTitle>
                <CardDescription>
                  Grant or revoke user access to this project
                </CardDescription>
              </div>
              <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Users
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Grant Project Access</DialogTitle>
                    <DialogDescription>
                      Select users to grant access to "{selectedProject?.name}"
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* Permission Level Selection */}
                    <div className="space-y-2">
                      <Label>Permission Level</Label>
                      <Select value={permissionLevel} onValueChange={(v) => setPermissionLevel(v as "view" | "edit")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              View Only
                            </div>
                          </SelectItem>
                          <SelectItem value="edit">
                            <div className="flex items-center gap-2">
                              <Edit className="w-4 h-4" />
                              View & Edit
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* User Selection */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Select Users</Label>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={selectAllUsers}>
                            Select All
                          </Button>
                          <Button variant="outline" size="sm" onClick={clearSelection}>
                            Clear
                          </Button>
                        </div>
                      </div>
                      
                      <div className="border rounded-lg max-h-64 overflow-y-auto">
                        {usersWithoutAccess.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">
                            All users already have access to this project
                          </div>
                        ) : (
                          usersWithoutAccess.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50"
                            >
                              <Checkbox
                                checked={selectedUserIds.includes(user.id)}
                                onCheckedChange={() => toggleUserSelection(user.id)}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{user.name || "Unnamed User"}</p>
                                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                              </div>
                              <Badge variant="outline">{user.role}</Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {selectedUserIds.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {selectedUserIds.length} user{selectedUserIds.length !== 1 ? "s" : ""} selected
                      </p>
                    )}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setGrantDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleBulkGrant}
                      disabled={selectedUserIds.length === 0 || bulkGrantMutation.isPending}
                    >
                      {bulkGrantMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Grant Access
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Users with Access */}
            {permissionsQuery.isLoading || usersQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : usersWithAccess.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <Users className="w-8 h-8 mx-auto mb-2" />
                <p>No users have access to this project yet</p>
                <p className="text-sm mt-1">Click "Add Users" to grant access</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Permission</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersWithAccess.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.name || "Unnamed User"}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.permission === "edit" ? "default" : "secondary"}>
                          {user.permission === "edit" ? (
                            <><Edit className="w-3 h-3 mr-1" /> Edit</>
                          ) : (
                            <><Eye className="w-3 h-3 mr-1" /> View</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Select
                            value={user.permission || "view"}
                            onValueChange={(value) => {
                              grantMutation.mutate({
                                projectId: selectedProjectId,
                                userId: user.id,
                                permission: value as "view" | "edit",
                              });
                            }}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view">View</SelectItem>
                              <SelectItem value="edit">Edit</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRevokePermission(user.id)}
                            disabled={revokeMutation.isPending}
                          >
                            <UserMinus className="w-4 h-4 text-destructive" />
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
      )}
    </div>
  );
}
