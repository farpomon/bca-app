import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
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
import { Shield, Users, FolderKanban, BarChart3, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function Admin() {
  const { user, loading } = useAuth();
  const [selectedTab, setSelectedTab] = useState("overview");

  // Queries
  const statsQuery = trpc.admin.getSystemStats.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  
  const usersQuery = trpc.admin.getAllUsers.useQuery(undefined, {
    enabled: user?.role === "admin" && selectedTab === "users",
  });
  
  const projectsQuery = trpc.admin.getAllProjects.useQuery(
    { limit: 50, offset: 0 },
    { enabled: user?.role === "admin" && selectedTab === "projects" }
  );

  // Mutations
  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated successfully");
      usersQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update role: ${error.message}`);
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

  const handleToggleRole = (userId: number, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleDeleteUser = (userId: number, userName: string | null) => {
    if (confirm(`Are you sure you want to delete user "${userName || 'Unknown'}"? This action cannot be undone.`)) {
      deleteUserMutation.mutate({ userId });
    }
  };

  return (
    <DashboardLayout>
    <div className="container mx-auto py-8 space-y-8">
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
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Login Method</TableHead>
                      <TableHead>Last Sign In</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersQuery.data.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name || "—"}</TableCell>
                        <TableCell>{u.email || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{u.loginMethod || "—"}</TableCell>
                        <TableCell>
                          {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleRole(u.id, u.role)}
                              disabled={updateRoleMutation.isPending}
                            >
                              {u.role === "admin" ? "Demote" : "Promote"}
                            </Button>
                            {u.id !== user.id && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                disabled={deleteUserMutation.isPending}
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
                        <TableCell className="font-medium">{project.name}</TableCell>
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
      </Tabs>
    </div>
    </DashboardLayout>
  );
}
