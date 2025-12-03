import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Building2, Plus, Calendar, MapPin, Loader2, Pencil, Trash2, MoreVertical } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Projects() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    clientName: "",
    propertyType: "",
    constructionType: "",
    yearBuilt: "",
    numberOfUnits: "",
    numberOfStories: "",
    buildingCode: "",
  });

  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery(undefined, {
    enabled: !!user,
  });

  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => {
      toast.success("Project updated successfully");
      setEditDialogOpen(false);
      setSelectedProject(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update project");
    },
  });

  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedProject(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete project");
    },
  });

  const createProject = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      toast.success("Project created successfully");
      setDialogOpen(false);
      setFormData({
        name: "",
        address: "",
        clientName: "",
        propertyType: "",
        constructionType: "",
        yearBuilt: "",
        numberOfUnits: "",
        numberOfStories: "",
        buildingCode: "",
      });
      refetch();
      setLocation(`/projects/${data.id}`);
    },
    onError: (error) => {
      toast.error("Failed to create project: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProject.mutate({
      name: formData.name,
      address: formData.address || undefined,
      clientName: formData.clientName || undefined,
      propertyType: formData.propertyType || undefined,
      constructionType: formData.constructionType || undefined,
      yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : undefined,
      numberOfUnits: formData.numberOfUnits ? parseInt(formData.numberOfUnits) : undefined,
      numberOfStories: formData.numberOfStories ? parseInt(formData.numberOfStories) : undefined,
      buildingCode: formData.buildingCode || undefined,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in_progress":
        return "bg-blue-500";
      case "draft":
        return "bg-gray-500";
      case "archived":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">
              Manage your building condition assessment projects
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-gradient shadow-md hover:shadow-lg">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Enter the details for your building condition assessment project
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Project Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., 1729 Comox Avenue BCA"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Property Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="e.g., 1729 Comox Ave, V9M 3M1, BC"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="clientName">Client Name</Label>
                    <Input
                      id="clientName"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      placeholder="e.g., Town of Comox"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="propertyType">Property Type</Label>
                      <Input
                        id="propertyType"
                        value={formData.propertyType}
                        onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                        placeholder="e.g., Mixed Use"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="constructionType">Construction Type</Label>
                      <Input
                        id="constructionType"
                        value={formData.constructionType}
                        onChange={(e) => setFormData({ ...formData, constructionType: e.target.value })}
                        placeholder="e.g., Wood Framing"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="yearBuilt">Year Built</Label>
                      <Input
                        id="yearBuilt"
                        type="number"
                        value={formData.yearBuilt}
                        onChange={(e) => setFormData({ ...formData, yearBuilt: e.target.value })}
                        placeholder="e.g., 1973"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="numberOfUnits">Number of Units</Label>
                      <Input
                        id="numberOfUnits"
                        type="number"
                        value={formData.numberOfUnits}
                        onChange={(e) => setFormData({ ...formData, numberOfUnits: e.target.value })}
                        placeholder="e.g., 1"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="numberOfStories">Number of Stories</Label>
                      <Input
                        id="numberOfStories"
                        type="number"
                        value={formData.numberOfStories}
                        onChange={(e) => setFormData({ ...formData, numberOfStories: e.target.value })}
                        placeholder="e.g., 2"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="buildingCode">Building Code</Label>
                    <Input
                      id="buildingCode"
                      value={formData.buildingCode}
                      onChange={(e) => setFormData({ ...formData, buildingCode: e.target.value })}
                      placeholder="e.g., BC Building Code 2024"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createProject.isPending}>
                    {createProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Project
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* FCI Dashboard Summary */}
        {projects && projects.length > 0 && (
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="stat-card stat-card-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Total Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold tracking-tight">{projects.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Across all statuses</p>
              </CardContent>
            </Card>
            <Card className="stat-card stat-card-warning">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Active Assessments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold tracking-tight">
                  {projects.filter(p => p.status === 'in_progress').length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Currently in progress</p>
              </CardContent>
            </Card>
            <Card className="stat-card stat-card-success">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold tracking-tight">
                  {projects.filter(p => p.status === 'completed').length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Finished assessments</p>
              </CardContent>
            </Card>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="project-card cursor-pointer group"
                onClick={() => setLocation(`/projects/${project.id}`)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(project.status)}>
                        {getStatusLabel(project.status)}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProject(project);
                              setFormData({
                                name: project.name,
                                address: project.address || "",
                                clientName: project.clientName || "",
                                propertyType: project.propertyType || "",
                                constructionType: project.constructionType || "",
                                yearBuilt: project.yearBuilt?.toString() || "",
                                numberOfUnits: project.numberOfUnits?.toString() || "",
                                numberOfStories: project.numberOfStories?.toString() || "",
                                buildingCode: project.buildingCode || "",
                              });
                              setEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProject(project);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <CardTitle className="mt-4 text-lg group-hover:text-primary transition-colors">{project.name}</CardTitle>
                  <CardDescription>
                    {project.clientName && <div>Client: {project.clientName}</div>}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2.5 text-sm text-muted-foreground">
                    {project.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{project.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>
                    {project.yearBuilt && (
                      <div>Built: {project.yearBuilt}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Building2 className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Get started by creating your first building condition assessment project and begin tracking facility conditions
              </p>
              <Button onClick={() => setDialogOpen(true)} className="btn-gradient shadow-md hover:shadow-lg">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update the project information below.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedProject) return;
              updateProject.mutate({
                id: selectedProject.id,
                name: formData.name,
                address: formData.address || undefined,
                clientName: formData.clientName || undefined,
                propertyType: formData.propertyType || undefined,
                constructionType: formData.constructionType || undefined,
                yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : undefined,
                numberOfUnits: formData.numberOfUnits ? parseInt(formData.numberOfUnits) : undefined,
                numberOfStories: formData.numberOfStories ? parseInt(formData.numberOfStories) : undefined,
                buildingCode: formData.buildingCode || undefined,
              });
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Project Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-clientName">Client Name</Label>
                <Input
                  id="edit-clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-propertyType">Property Type</Label>
                  <Select value={formData.propertyType} onValueChange={(value) => setFormData({ ...formData, propertyType: value })}>
                    <SelectTrigger id="edit-propertyType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                      <SelectItem value="mixed-use">Mixed Use</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-constructionType">Construction Type</Label>
                  <Select value={formData.constructionType} onValueChange={(value) => setFormData({ ...formData, constructionType: value })}>
                    <SelectTrigger id="edit-constructionType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wood-frame">Wood Frame</SelectItem>
                      <SelectItem value="concrete">Concrete</SelectItem>
                      <SelectItem value="steel">Steel</SelectItem>
                      <SelectItem value="masonry">Masonry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-yearBuilt">Year Built</Label>
                  <Input
                    id="edit-yearBuilt"
                    type="number"
                    value={formData.yearBuilt}
                    onChange={(e) => setFormData({ ...formData, yearBuilt: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-numberOfUnits">Number of Units</Label>
                  <Input
                    id="edit-numberOfUnits"
                    type="number"
                    value={formData.numberOfUnits}
                    onChange={(e) => setFormData({ ...formData, numberOfUnits: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-numberOfStories">Number of Stories</Label>
                  <Input
                    id="edit-numberOfStories"
                    type="number"
                    value={formData.numberOfStories}
                    onChange={(e) => setFormData({ ...formData, numberOfStories: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-buildingCode">Building Code</Label>
                <Input
                  id="edit-buildingCode"
                  value={formData.buildingCode}
                  onChange={(e) => setFormData({ ...formData, buildingCode: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateProject.isPending}>
                {updateProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project "{selectedProject?.name}" and all associated assessments, deficiencies, and photos. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (selectedProject) {
                  deleteProject.mutate({ id: selectedProject.id });
                }
              }}
            >
              {deleteProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
