import { AIImportDialog } from "@/components/AIImportDialog";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { BuildingCodeSelect } from "@/components/BuildingCodeSelect";
import { Building2, Plus, Calendar, MapPin, Loader2, Pencil, Trash2, MoreVertical, Mic, Search, Filter, X, ArrowUpDown, ArrowUp, ArrowDown, FileText, BarChart3 } from "lucide-react";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { FieldTooltip } from "@/components/FieldTooltip";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useFilterPersistence } from "@/hooks/useFilterPersistence";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { pageVariants, containerVariants, cardVariants } from "@/lib/animations";
import { AnimatedButton } from "@/components/AnimatedButton";

// Component to display document count badge
function ProjectDocumentBadge({ projectId }: { projectId: number }) {
  const { data: stats } = trpc.projects.stats.useQuery({ projectId });
  
  if (!stats || stats.documents === 0) return null;
  
  return (
    <Badge variant="outline" className="gap-1">
      <FileText className="h-3 w-3" />
      {stats.documents}
    </Badge>
  );
}

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
    streetAddress: "",
    city: "",
    province: "",
    postalCode: "",
    clientName: "",
    propertyType: "",
    constructionType: "",
    yearBuilt: "",
    numberOfUnits: "",
    numberOfStories: "",
    buildingCodeId: undefined as number | undefined,
    observations: "",
  });
  const [showObservationsVoice, setShowObservationsVoice] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Filter and search state with URL persistence
  const { filters, setFilter, clearFilters: clearAllFilters, activeFiltersCount } = useFilterPersistence({
    search: "",
    status: "all",
    dateStart: "",
    dateEnd: "",
  });
  
  // Derived filter values for easier access
  const searchQuery = filters.search;
  const statusFilter = filters.status;
  const dateRangeFilter = useMemo(() => ({
    start: filters.dateStart,
    end: filters.dateEnd,
  }), [filters.dateStart, filters.dateEnd]);
  
  // Setter functions that update URL
  const setSearchQuery = useCallback((value: string) => setFilter("search", value), [setFilter]);
  const setStatusFilter = useCallback((value: string) => setFilter("status", value), [setFilter]);
  const setDateRangeFilter = useCallback((value: {start: string, end: string}) => {
    setFilter("dateStart", value.start);
    setFilter("dateEnd", value.end);
  }, [setFilter]);
  
  // Sort state with localStorage persistence
  const [sortBy, setSortBy] = useState<string>(() => {
    return localStorage.getItem('projectsSortBy') || 'updatedAt';
  });
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    return (localStorage.getItem('projectsSortDirection') as 'asc' | 'desc') || 'desc';
  });
  
  // Persist sort preferences
  useEffect(() => {
    localStorage.setItem('projectsSortBy', sortBy);
    localStorage.setItem('projectsSortDirection', sortDirection);
  }, [sortBy, sortDirection]);
  
  // Toggle sort direction or change sort field
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };
  
  // Bulk selection state
  const [selectedProjects, setSelectedProjects] = useState<Set<number>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<"draft" | "in_progress" | "completed" | "archived">("draft");
  const [showArchived, setShowArchived] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [aiImportDialogOpen, setAIImportDialogOpen] = useState(false);
  const [deleteEmptyDialogOpen, setDeleteEmptyDialogOpen] = useState(false);

  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery(undefined, {
    enabled: !!user,
  });
  
  console.log("[Projects Page] Projects data:", projects?.length || 0, "projects");
  console.log("[Projects Page] IsLoading:", isLoading);
  console.log("[Projects Page] User:", user?.email);

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    if (!projects) return [];
    
    // First filter
    let filtered = projects.filter((project) => {
    // Hide archived projects by default unless showArchived is true
    if (!showArchived && project.status === "archived") {
      return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        project.name?.toLowerCase().includes(query) ||
        project.address?.toLowerCase().includes(query) ||
        project.clientName?.toLowerCase().includes(query) ||
        project.uniqueId?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== "all" && project.status !== statusFilter) {
      return false;
    }

    // Date range filter
    if (dateRangeFilter.start || dateRangeFilter.end) {
      const projectDate = new Date(project.createdAt);
      if (dateRangeFilter.start && projectDate < new Date(dateRangeFilter.start)) {
        return false;
      }
      if (dateRangeFilter.end && projectDate > new Date(dateRangeFilter.end)) {
        return false;
      }
    }

    return true;
    });
    
    // Then sort
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'clientName':
          aValue = a.clientName?.toLowerCase() || '';
          bValue = b.clientName?.toLowerCase() || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'buildingCodeId':
          aValue = String(a.buildingCodeId || '');
          bValue = String(b.buildingCodeId || '');
          break;
        case 'address':
          aValue = a.address?.toLowerCase() || '';
          bValue = b.address?.toLowerCase() || '';
          break;
        default:
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [projects, searchQuery, statusFilter, dateRangeFilter, showArchived, sortBy, sortDirection]);

  // Clear all filters (uses the hook's clearFilters)
  const clearFilters = clearAllFilters;

  // Bulk selection helpers
  const toggleProjectSelection = (projectId: number) => {
    const newSelection = new Set(selectedProjects);
    if (newSelection.has(projectId)) {
      newSelection.delete(projectId);
    } else {
      newSelection.add(projectId);
    }
    setSelectedProjects(newSelection);
  };

  const selectAllProjects = () => {
    const allIds = new Set(filteredAndSortedProjects.map(p => p.id));
    setSelectedProjects(allIds);
  };

  const clearSelection = () => {
    setSelectedProjects(new Set());
  };

  const handleBulkDelete = () => {
    bulkDeleteProjects.mutate({ ids: Array.from(selectedProjects) });
  };

  const handleBulkExport = async () => {
    try {
      const ids = Array.from(selectedProjects);
      const response = await fetch(`/api/trpc/projects.bulkExportExcel?input=${encodeURIComponent(JSON.stringify({ ids }))}`);
      if (!response.ok) throw new Error('Bulk export failed');
      const result = await response.json();
      const { data: base64Data, filename } = result.result.data;
      
      // Convert base64 to blob
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Successfully exported ${ids.length} project(s) to Excel`);
    } catch (error) {
      toast.error('Failed to export selected projects');
    }
  };

  const bulkExportMutation = {
    isPending: false, // Placeholder for loading state
  };

   const handleExportProject = async (projectId: number) => {
    try {
      // Use fetch to call the tRPC endpoint directly
      const response = await fetch(`/api/trpc/projects.export?input=${encodeURIComponent(JSON.stringify({ id: projectId }))}`);
      if (!response.ok) throw new Error('Export failed');
      const result = await response.json();
      const data = result.result.data;
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${projectId}-export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Project exported successfully');
    } catch (error) {
      toast.error('Failed to export project');
    }
  };

  const handleExportCSV = async (projectId: number, type: 'assessments' | 'deficiencies') => {
    try {
      const response = await fetch(`/api/trpc/projects.exportCSV?input=${encodeURIComponent(JSON.stringify({ id: projectId, type }))}`);
      if (!response.ok) throw new Error('Export failed');
      const result = await response.json();
      const { csv, filename } = result.result.data;
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`${type} exported to CSV successfully`);
    } catch (error) {
      toast.error(`Failed to export ${type} to CSV`);
    }
  };

  const handleExportExcel = async (projectId: number) => {
    try {
      const response = await fetch(`/api/trpc/projects.exportExcel?input=${encodeURIComponent(JSON.stringify({ id: projectId }))}`);
      if (!response.ok) throw new Error('Export failed');
      const result = await response.json();
      const { data: base64Data, filename } = result.result.data;
      
      // Convert base64 to blob
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Data exported to Excel successfully');
    } catch (error) {
      toast.error('Failed to export to Excel');
    }
  };

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

  const bulkDeleteProjects = trpc.projects.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} project(s) deleted successfully`);
      setBulkDeleteDialogOpen(false);
      setSelectedProjects(new Set());
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete projects");
    },
  });

  const deleteEmptyProjects = trpc.projects.deleteEmptyProjects.useMutation({
    onSuccess: (data) => {
      if (data.count === 0) {
        toast.info("No empty projects found to delete");
      } else {
        toast.success(`${data.count} empty project(s) deleted successfully`);
      }
      setDeleteEmptyDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete empty projects");
    },
  });

  const bulkUpdateStatus = trpc.projects.bulkUpdateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.success} project(s) status updated successfully`);
      if (data.failed > 0) {
        toast.warning(`${data.failed} project(s) failed to update`);
      }
      setBulkStatusDialogOpen(false);
      setSelectedProjects(new Set());
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete projects");
    },
  });

  const archiveProject = trpc.projects.archive.useMutation({
    onSuccess: () => {
      toast.success("Project archived successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to archive project");
    },
  });

  const unarchiveProject = trpc.projects.unarchive.useMutation({
    onSuccess: () => {
      toast.success("Project unarchived successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to unarchive project");
    },
  });

  const importProject = trpc.projects.import.useMutation({
    onSuccess: () => {
      toast.success("Project imported successfully");
      setImportDialogOpen(false);
      setImportFile(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to import project");
    },
  });

  const handleImport = async () => {
    if (!importFile) {
      toast.error("Please select a file to import");
      return;
    }

    try {
      const text = await importFile.text();
      const data = JSON.parse(text);
      importProject.mutate({ data });
    } catch (error: any) {
      toast.error("Invalid JSON file: " + error.message);
    }
  };

  const createProject = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      toast.success("Project created successfully");
      setDialogOpen(false);
      setFormData({
        name: "",
        address: "",
        streetAddress: "",
        city: "",
        province: "",
        postalCode: "",
        clientName: "",
        propertyType: "",
        constructionType: "",
        yearBuilt: "",
        numberOfUnits: "",
        numberOfStories: "",
        buildingCodeId: undefined as number | undefined,
        observations: "",
      });
      refetch();
      setLocation(`/projects/${data.id}/assets`);
    },
    onError: (error) => {
      toast.error("Failed to create project: " + error.message);
    },
  });

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    // Validate year built
    if (formData.yearBuilt) {
      const year = parseInt(formData.yearBuilt);
      const currentYear = new Date().getFullYear();
      if (year < 1800 || year > currentYear + 5) {
        errors.yearBuilt = `Year must be between 1800 and ${currentYear + 5}`;
      }
    }
    
    // Validate number of units
    if (formData.numberOfUnits) {
      const units = parseInt(formData.numberOfUnits);
      if (units < 0 || units > 10000) {
        errors.numberOfUnits = "Number of units must be between 0 and 10,000";
      }
    }
    
    // Validate number of stories
    if (formData.numberOfStories) {
      const stories = parseInt(formData.numberOfStories);
      if (stories < 0 || stories > 200) {
        errors.numberOfStories = "Number of stories must be between 0 and 200";
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix validation errors before submitting");
      return;
    }
    
    createProject.mutate({
      name: formData.name,
      address: formData.address || undefined,
      streetAddress: formData.streetAddress || undefined,
      city: formData.city || undefined,
      province: formData.province || undefined,
      postalCode: formData.postalCode || undefined,
      clientName: formData.clientName || undefined,
      propertyType: formData.propertyType || undefined,
      constructionType: formData.constructionType || undefined,
      yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : undefined,
      numberOfUnits: formData.numberOfUnits ? parseInt(formData.numberOfUnits) : undefined,
      numberOfStories: formData.numberOfStories ? parseInt(formData.numberOfStories) : undefined,
      buildingCodeId: formData.buildingCodeId,
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
      <motion.div
        className="space-y-6"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-2">Projects</h1>
            <p className="text-sm md:text-base text-muted-foreground font-normal">
              Manage your building condition assessment projects
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-3">
            <Button
              variant="outline"
              onClick={() => setLocation('/portfolio-analytics')}
              className="shadow-sm text-xs md:text-sm"
              size="sm"
            >
              <BarChart3 className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Portfolio Analytics</span>
              <span className="sm:hidden">Analytics</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteEmptyDialogOpen(true)}
              className="shadow-sm text-xs md:text-sm border-destructive/50 text-destructive hover:bg-destructive/10"
              size="sm"
            >
              <Trash2 className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Delete Empty Projects</span>
              <span className="sm:hidden">Delete Empty</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(true)}
              className="shadow-sm text-xs md:text-sm"
              size="sm"
            >
              <svg className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="hidden sm:inline">Import JSON</span>
              <span className="sm:hidden">JSON</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setAIImportDialogOpen(true)}
              className="shadow-sm border-primary/50 text-primary hover:bg-primary/10 text-xs md:text-sm"
              size="sm"
            >
              <svg className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="hidden sm:inline">AI Import from Document</span>
              <span className="sm:hidden">AI Import</span>
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <AnimatedButton className="btn-gradient shadow-md hover:shadow-lg">
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </AnimatedButton>
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
                    <Label htmlFor="name">
                      Project Name *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}

                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">
                      Property Address
                    </Label>
                    <AddressAutocomplete
                      value={formData.address}
                      onChange={(address) => setFormData(prev => ({ ...prev, address }))}
                      onPlaceSelected={(components) => {
                        console.log('[Projects] onPlaceSelected called with:', components);
                        // Combine street number and street address
                        const fullStreetAddress = components.streetNumber 
                          ? `${components.streetNumber} ${components.streetAddress}`.trim()
                          : components.streetAddress;
                        
                        setFormData(prev => ({
                          ...prev,
                          streetAddress: fullStreetAddress,
                          city: components.city,
                          province: components.province,
                          postalCode: components.postalCode,
                        }));
                        console.log('[Projects] Form data updated');
                      }}
                      placeholder="Enter property address"
                    />
                    
                    {/* Address Component Fields - Auto-populated from autocomplete */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="grid gap-2">
                        <Label htmlFor="streetAddress">Street Address</Label>
                        <Input
                          id="streetAddress"
                          value={formData.streetAddress}
                          onChange={(e) => setFormData(prev => ({ ...prev, streetAddress: e.target.value }))}
                          placeholder="Auto-filled from address above"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="Auto-filled from address above"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="province">Province</Label>
                        <Input
                          id="province"
                          value={formData.province}
                          onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
                          placeholder="Auto-filled from address above"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input
                          id="postalCode"
                          value={formData.postalCode}
                          onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                          placeholder="Auto-filled from address above"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="clientName">
                      Client Name
                    </Label>
                    <Input
                      id="clientName"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}

                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="propertyType">
                        Property Type
                      </Label>
                      <Input
                        id="propertyType"
                        value={formData.propertyType}
                        onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}

                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="constructionType">
                        Construction Type
                      </Label>
                      <Input
                        id="constructionType"
                        value={formData.constructionType}
                        onChange={(e) => setFormData({ ...formData, constructionType: e.target.value })}

                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="yearBuilt">
                        Year Built
                      </Label>
                      <Input
                        id="yearBuilt"
                        type="number"
                        value={formData.yearBuilt}
                        onChange={(e) => {
                          setFormData({ ...formData, yearBuilt: e.target.value });
                          setValidationErrors({ ...validationErrors, yearBuilt: "" });
                        }}
                        className={validationErrors.yearBuilt ? "border-red-500" : ""}
                      />
                      {validationErrors.yearBuilt && (
                        <p className="text-sm text-red-500">{validationErrors.yearBuilt}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="numberOfUnits">Number of Units</Label>
                      <Input
                        id="numberOfUnits"
                        type="number"
                        value={formData.numberOfUnits}
                        onChange={(e) => {
                          setFormData({ ...formData, numberOfUnits: e.target.value });
                          setValidationErrors({ ...validationErrors, numberOfUnits: "" });
                        }}
                        className={validationErrors.numberOfUnits ? "border-red-500" : ""}
                      />
                      {validationErrors.numberOfUnits && (
                        <p className="text-sm text-red-500">{validationErrors.numberOfUnits}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="numberOfStories">Number of Stories</Label>
                      <Input
                        id="numberOfStories"
                        type="number"
                        value={formData.numberOfStories}
                        onChange={(e) => {
                          setFormData({ ...formData, numberOfStories: e.target.value });
                          setValidationErrors({ ...validationErrors, numberOfStories: "" });
                        }}
                        className={validationErrors.numberOfStories ? "border-red-500" : ""}
                      />
                      {validationErrors.numberOfStories && (
                        <p className="text-sm text-red-500">{validationErrors.numberOfStories}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="buildingCode">Building Code</Label>
                    <BuildingCodeSelect
                      value={formData.buildingCodeId}
                      onChange={(value) => setFormData({ ...formData, buildingCodeId: value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="observations">Initial Observations</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowObservationsVoice(!showObservationsVoice)}
                        className="gap-2"
                      >
                        <Mic className="w-4 h-4" />
                        {showObservationsVoice ? "Hide" : "Voice Input"}
                      </Button>
                    </div>
                    {showObservationsVoice && (
                      <VoiceRecorder
                        onTranscriptionComplete={(text) => {
                          setFormData({ ...formData, observations: (formData.observations || "") + ((formData.observations || "") ? "\n\n" : "") + text });
                          setShowObservationsVoice(false);
                        }}
                        onCancel={() => setShowObservationsVoice(false)}
                      />
                    )}
                    <Textarea
                      id="observations"
                      value={formData.observations || ""}
                      onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                      placeholder="Enter any initial observations about the facility..."
                      rows={4}
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
        </div>

        {/* Search and Filters */}
        <div className="space-y-6">
          {/* Search Bar - Prominent */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-12 h-12 text-base border-border/50 focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Bulk Actions Toolbar */}
          {selectedProjects.size > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedProjects.size} project(s) selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllProjects}
                >
                  Select All ({filteredAndSortedProjects.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                >
                  Clear Selection
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkExport}
                disabled={bulkExportMutation.isPending}
              >
                {bulkExportMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                Export Selected
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkStatusDialogOpen(true)}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Change Status
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}

          {/* Sort and Filters - Spacious Layout */}
          <div className="flex flex-col md:flex-row flex-wrap gap-3 md:gap-4 md:items-center">
                {/* Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Sort by:</span>
                </div>
                
                <Select value={sortBy} onValueChange={(value) => handleSort(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updatedAt">
                      <div className="flex items-center gap-2">
                        <span>Last Updated</span>
                        {sortBy === 'updatedAt' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </SelectItem>
                    <SelectItem value="createdAt">
                      <div className="flex items-center gap-2">
                        <span>Date Created</span>
                        {sortBy === 'createdAt' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </SelectItem>
                    <SelectItem value="name">
                      <div className="flex items-center gap-2">
                        <span>Project Name</span>
                        {sortBy === 'name' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </SelectItem>
                    <SelectItem value="clientName">
                      <div className="flex items-center gap-2">
                        <span>Client Name</span>
                        {sortBy === 'clientName' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </SelectItem>
                    <SelectItem value="status">
                      <div className="flex items-center gap-2">
                        <span>Status</span>
                        {sortBy === 'status' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </SelectItem>
                    <SelectItem value="address">
                      <div className="flex items-center gap-2">
                        <span>Address</span>
                        {sortBy === 'address' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </SelectItem>
                    <SelectItem value="buildingCodeId">
                      <div className="flex items-center gap-2">
                        <span>Building Code</span>
                        {sortBy === 'buildingCodeId' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Sort Direction Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  className="gap-2"
                >
                  {sortDirection === 'asc' ? (
                    <><ArrowUp className="h-4 w-4" /> Ascending</>
                  ) : (
                    <><ArrowDown className="h-4 w-4" /> Descending</>
                  )}
                </Button>
                
                <div className="h-6 w-px bg-border" />

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>

                {/* Date Range Filters */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Label className="text-sm text-muted-foreground shrink-0">From:</Label>
                  <Input
                    type="date"
                    value={dateRangeFilter.start}
                    onChange={(e) => setDateRangeFilter({...dateRangeFilter, start: e.target.value})}
                    className="flex-1 md:w-[150px]"
                  />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Label className="text-sm text-muted-foreground shrink-0">To:</Label>
                  <Input
                    type="date"
                    value={dateRangeFilter.end}
                    onChange={(e) => setDateRangeFilter({...dateRangeFilter, end: e.target.value})}
                    className="flex-1 md:w-[150px]"
                  />
                </div>

                {/* Clear Filters Button */}
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-2"
                  >
                    <X className="h-3 w-3" />
                    Clear {activeFiltersCount} {activeFiltersCount === 1 ? 'filter' : 'filters'}
                  </Button>
                )}

                {/* Show Archived Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showArchived"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="showArchived" className="text-sm cursor-pointer">
                    Show Archived
                  </Label>
                </div>

            {/* Results Count */}
            <div className="ml-auto text-sm text-muted-foreground font-medium">
              Showing {filteredAndSortedProjects.length} of {projects?.length || 0} projects
            </div>
          </div>
        </div>

        {/* FCI Dashboard Summary */}
        {projects && projects.length > 0 && (
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-3">Total Projects</p>
                <div className="text-4xl font-semibold tracking-tight mb-1">{projects.length}</div>
                <p className="text-sm text-muted-foreground">Across all statuses</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-3">Active Assessments</p>
                <div className="text-4xl font-semibold tracking-tight mb-1">
                  {projects.filter(p => p.status === 'in_progress').length}
                </div>
                <p className="text-sm text-muted-foreground">Currently in progress</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-3">Completed</p>
                <div className="text-4xl font-semibold tracking-tight mb-1">
                  {projects.filter(p => p.status === 'completed').length}
                </div>
                <p className="text-sm text-muted-foreground">Finished assessments</p>
              </CardContent>
            </Card>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredAndSortedProjects && filteredAndSortedProjects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedProjects.map((project) => (
              <Card
                key={project.id}
                className="professional-card hover-lift cursor-pointer group"
                onClick={() => setLocation(`/projects/${project.id}/assets`)}
              >
                <CardHeader className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedProjects.has(project.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleProjectSelection(project.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded"
                      />
                      <div className="p-2.5 rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(project.status)}>
                        {getStatusLabel(project.status)}
                      </Badge>
                      <ProjectDocumentBadge projectId={project.id} />
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
                                streetAddress: project.streetAddress || "",
                                city: project.city || "",
                                province: project.province || "",
                                postalCode: project.postalCode || "",
                                clientName: project.clientName || "",
                                propertyType: project.propertyType || "",
                                constructionType: project.constructionType || "",
                                yearBuilt: project.yearBuilt?.toString() || "",
                                numberOfUnits: project.numberOfUnits?.toString() || "",
                                numberOfStories: project.numberOfStories?.toString() || "",
                                buildingCodeId: project.buildingCodeId ?? undefined,
                                observations: project.observations || "",
                              });
                              setEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Export
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportProject(project.id);
                                }}
                              >
                                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Full Project (JSON)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportExcel(project.id);
                                }}
                              >
                                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Data (Excel)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportCSV(project.id, 'assessments');
                                }}
                              >
                                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Assessments (CSV)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportCSV(project.id, 'deficiencies');
                                }}
                              >
                                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Deficiencies (CSV)
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          {project.status !== "archived" ? (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                archiveProject.mutate({ id: project.id });
                              }}
                            >
                              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                              </svg>
                              Archive
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                unarchiveProject.mutate({ id: project.id });
                              }}
                            >
                              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              Unarchive
                            </DropdownMenuItem>
                          )}
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
                  <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors mb-1">{project.name}</CardTitle>
                  {project.clientName && (
                    <p className="text-sm text-muted-foreground">Client: {project.clientName}</p>
                  )}
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-0">
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
        ) : projects && projects.length > 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Filter className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No projects match your filters</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Try adjusting your search query or filter criteria to find what you're looking for
              </p>
              <Button onClick={clearFilters} variant="outline">
                <X className="mr-2 h-4 w-4" />
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
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
                buildingCodeId: formData.buildingCodeId,
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
                <BuildingCodeSelect
                  value={formData.buildingCodeId}
                  onChange={(value) => setFormData({ ...formData, buildingCodeId: value })}
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

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedProjects.size} Projects?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedProjects.size} project(s) and all associated assessments, deficiencies, and photos. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkDelete}
            >
              {bulkDeleteProjects.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete {selectedProjects.size} Projects
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Status Change Dialog */}
      <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status for {selectedProjects.size} Projects</DialogTitle>
            <DialogDescription>
              Select the new status for the selected {selectedProjects.size} project(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Status</label>
              <Select value={bulkStatusValue} onValueChange={(value: any) => setBulkStatusValue(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm text-muted-foreground">
                Selected projects: {Array.from(selectedProjects).map(id => {
                  const project = projects?.find(p => p.id === id);
                  return project?.name;
                }).filter(Boolean).join(", ")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                bulkUpdateStatus.mutate({
                  projectIds: Array.from(selectedProjects),
                  status: bulkStatusValue,
                });
              }}
              disabled={bulkUpdateStatus.isPending}
            >
              {bulkUpdateStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Project Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Project</DialogTitle>
            <DialogDescription>
              Upload a JSON file exported from another BCA project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="importFile">Select JSON File</Label>
              <Input
                id="importFile"
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>
            {importFile && (
              <div className="text-sm text-muted-foreground">
                Selected: {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false);
                setImportFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={!importFile || importProject.isPending}
            >
              {importProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Import Dialog */}
      <AIImportDialog
        open={aiImportDialogOpen}
        onOpenChange={setAIImportDialogOpen}
        onSuccess={() => {
          refetch();
          setAIImportDialogOpen(false);
        }}
      />

      {/* Delete Empty Projects Dialog */}
      <AlertDialog open={deleteEmptyDialogOpen} onOpenChange={setDeleteEmptyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Empty Projects?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all projects that have no assets. This action cannot be undone.
              <br /><br />
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEmptyProjects.mutate()}
              disabled={deleteEmptyProjects.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEmptyProjects.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Empty Projects
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </motion.div>
    </DashboardLayout>
  );
}
