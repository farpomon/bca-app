import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Clock,
  Search,
  FileText,
  Layers,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";

// Property types for templates
const PROPERTY_TYPES = [
  "Office",
  "School",
  "Hospital",
  "Residential - Multi-Family",
  "Residential - Single Family",
  "Industrial",
  "Retail",
  "Warehouse",
  "Recreation Center",
  "Library",
  "Fire Station",
  "Police Station",
  "Government",
  "Mixed Use",
  "Other",
];

// Building classes
const BUILDING_CLASSES = [
  { value: "class_a", label: "Class A - Premium" },
  { value: "class_b", label: "Class B - Standard" },
  { value: "class_c", label: "Class C - Economy" },
];

// Common UNIFORMAT II components for templates
const COMMON_COMPONENTS = [
  { code: "A10", name: "Foundations" },
  { code: "A20", name: "Basement Construction" },
  { code: "B10", name: "Superstructure" },
  { code: "B20", name: "Exterior Enclosure" },
  { code: "B30", name: "Roofing" },
  { code: "C10", name: "Interior Construction" },
  { code: "C20", name: "Stairs" },
  { code: "C30", name: "Interior Finishes" },
  { code: "D10", name: "Conveying Systems" },
  { code: "D20", name: "Plumbing" },
  { code: "D30", name: "HVAC" },
  { code: "D40", name: "Fire Protection" },
  { code: "D50", name: "Electrical" },
  { code: "E10", name: "Equipment" },
  { code: "E20", name: "Furnishings" },
  { code: "F10", name: "Special Construction" },
  { code: "G10", name: "Site Preparation" },
  { code: "G20", name: "Site Improvements" },
  { code: "G30", name: "Site Civil/Mechanical Utilities" },
  { code: "G40", name: "Site Electrical Utilities" },
];

interface TemplateSystem {
  id?: number;
  componentCode: string;
  componentName: string;
  defaultServiceLife: number;
  defaultReplacementCost?: string;
  defaultCostUnit?: string;
  typicalCondition?: "good" | "fair" | "poor";
  priority?: number;
  isRequired?: number;
  notes?: string;
}

export default function BuildingTemplates() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState("templates");
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>("all");
  const [buildingClassFilter, setBuildingClassFilter] = useState<string>("all");
  
  // Template dialog state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    buildingClass: "class_b" as "class_a" | "class_b" | "class_c",
    propertyType: "",
    constructionType: "",
    typicalYearBuiltRange: "",
    typicalGrossFloorArea: "",
    typicalNumberOfStories: "",
  });
  const [templateSystems, setTemplateSystems] = useState<TemplateSystem[]>([]);

  // Service life dialog state
  const [serviceLifeDialogOpen, setServiceLifeDialogOpen] = useState(false);
  const [editingServiceLife, setEditingServiceLife] = useState<any>(null);
  const [serviceLifeForm, setServiceLifeForm] = useState({
    componentCode: "",
    componentName: "",
    buildingClass: "all" as "class_a" | "class_b" | "class_c" | "all",
    propertyType: "",
    designServiceLife: "",
    minServiceLife: "",
    maxServiceLife: "",
    bestCaseServiceLife: "",
    worstCaseServiceLife: "",
    dataSource: "",
    notes: "",
  });

  // Queries
  const templatesQuery = trpc.buildingTemplates.templates.list.useQuery({
    companyId: user?.companyId ?? undefined,
  });

  const serviceLifeValuesQuery = trpc.buildingTemplates.serviceLifeValues.list.useQuery({
    companyId: user?.companyId ?? undefined,
  });

  // Mutations
  const createTemplateMutation = trpc.buildingTemplates.templates.create.useMutation({
    onSuccess: () => {
      toast.success("Template created successfully");
      templatesQuery.refetch();
      setTemplateDialogOpen(false);
      resetTemplateForm();
    },
    onError: (error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });

  const updateTemplateMutation = trpc.buildingTemplates.templates.update.useMutation({
    onSuccess: () => {
      toast.success("Template updated successfully");
      templatesQuery.refetch();
      setTemplateDialogOpen(false);
      resetTemplateForm();
    },
    onError: (error) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });

  const deleteTemplateMutation = trpc.buildingTemplates.templates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted successfully");
      templatesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });

  const createServiceLifeMutation = trpc.buildingTemplates.serviceLifeValues.create.useMutation({
    onSuccess: () => {
      toast.success("Service life value created successfully");
      serviceLifeValuesQuery.refetch();
      setServiceLifeDialogOpen(false);
      resetServiceLifeForm();
    },
    onError: (error) => {
      toast.error(`Failed to create service life value: ${error.message}`);
    },
  });

  const updateServiceLifeMutation = trpc.buildingTemplates.serviceLifeValues.update.useMutation({
    onSuccess: () => {
      toast.success("Service life value updated successfully");
      serviceLifeValuesQuery.refetch();
      setServiceLifeDialogOpen(false);
      resetServiceLifeForm();
    },
    onError: (error) => {
      toast.error(`Failed to update service life value: ${error.message}`);
    },
  });

  const deleteServiceLifeMutation = trpc.buildingTemplates.serviceLifeValues.delete.useMutation({
    onSuccess: () => {
      toast.success("Service life value deleted successfully");
      serviceLifeValuesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete service life value: ${error.message}`);
    },
  });

  // Helper functions
  const resetTemplateForm = () => {
    setTemplateForm({
      name: "",
      description: "",
      buildingClass: "class_b",
      propertyType: "",
      constructionType: "",
      typicalYearBuiltRange: "",
      typicalGrossFloorArea: "",
      typicalNumberOfStories: "",
    });
    setTemplateSystems([]);
    setEditingTemplate(null);
  };

  const resetServiceLifeForm = () => {
    setServiceLifeForm({
      componentCode: "",
      componentName: "",
      buildingClass: "all",
      propertyType: "",
      designServiceLife: "",
      minServiceLife: "",
      maxServiceLife: "",
      bestCaseServiceLife: "",
      worstCaseServiceLife: "",
      dataSource: "",
      notes: "",
    });
    setEditingServiceLife(null);
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || "",
      buildingClass: template.buildingClass,
      propertyType: template.propertyType,
      constructionType: template.constructionType || "",
      typicalYearBuiltRange: template.typicalYearBuiltRange || "",
      typicalGrossFloorArea: template.typicalGrossFloorArea?.toString() || "",
      typicalNumberOfStories: template.typicalNumberOfStories?.toString() || "",
    });
    setTemplateSystems(template.systems || []);
    setTemplateDialogOpen(true);
  };

  const handleEditServiceLife = (value: any) => {
    setEditingServiceLife(value);
    setServiceLifeForm({
      componentCode: value.componentCode,
      componentName: value.componentName,
      buildingClass: value.buildingClass,
      propertyType: value.propertyType || "",
      designServiceLife: value.designServiceLife.toString(),
      minServiceLife: value.minServiceLife?.toString() || "",
      maxServiceLife: value.maxServiceLife?.toString() || "",
      bestCaseServiceLife: value.bestCaseServiceLife?.toString() || "",
      worstCaseServiceLife: value.worstCaseServiceLife?.toString() || "",
      dataSource: value.dataSource || "",
      notes: value.notes || "",
    });
    setServiceLifeDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    const data = {
      name: templateForm.name,
      description: templateForm.description || undefined,
      buildingClass: templateForm.buildingClass,
      propertyType: templateForm.propertyType,
      constructionType: templateForm.constructionType || undefined,
      typicalYearBuiltRange: templateForm.typicalYearBuiltRange || undefined,
      typicalGrossFloorArea: templateForm.typicalGrossFloorArea ? parseInt(templateForm.typicalGrossFloorArea) : undefined,
      typicalNumberOfStories: templateForm.typicalNumberOfStories ? parseInt(templateForm.typicalNumberOfStories) : undefined,
      systems: templateSystems.map((s) => ({
        componentCode: s.componentCode,
        componentName: s.componentName,
        defaultServiceLife: s.defaultServiceLife,
        defaultReplacementCost: s.defaultReplacementCost,
        defaultCostUnit: s.defaultCostUnit,
        typicalCondition: s.typicalCondition,
        priority: s.priority,
        isRequired: s.isRequired || 0,
        notes: s.notes,
      })),
    };

    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, ...data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const handleSaveServiceLife = () => {
    const data = {
      componentCode: serviceLifeForm.componentCode,
      componentName: serviceLifeForm.componentName,
      buildingClass: serviceLifeForm.buildingClass,
      propertyType: serviceLifeForm.propertyType || undefined,
      designServiceLife: parseInt(serviceLifeForm.designServiceLife),
      minServiceLife: serviceLifeForm.minServiceLife ? parseInt(serviceLifeForm.minServiceLife) : undefined,
      maxServiceLife: serviceLifeForm.maxServiceLife ? parseInt(serviceLifeForm.maxServiceLife) : undefined,
      bestCaseServiceLife: serviceLifeForm.bestCaseServiceLife ? parseInt(serviceLifeForm.bestCaseServiceLife) : undefined,
      worstCaseServiceLife: serviceLifeForm.worstCaseServiceLife ? parseInt(serviceLifeForm.worstCaseServiceLife) : undefined,
      dataSource: serviceLifeForm.dataSource || undefined,
      notes: serviceLifeForm.notes || undefined,
    };

    if (editingServiceLife) {
      updateServiceLifeMutation.mutate({ id: editingServiceLife.id, ...data });
    } else {
      createServiceLifeMutation.mutate(data);
    }
  };

  const addSystemToTemplate = () => {
    setTemplateSystems([
      ...templateSystems,
      {
        componentCode: "",
        componentName: "",
        defaultServiceLife: 25,
        typicalCondition: "good",
        priority: templateSystems.length + 1,
      },
    ]);
  };

  const updateTemplateSystem = (index: number, field: string, value: any) => {
    const updated = [...templateSystems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-fill component name when code is selected
    if (field === "componentCode") {
      const component = COMMON_COMPONENTS.find((c) => c.code === value);
      if (component) {
        updated[index].componentName = component.name;
      }
    }
    
    setTemplateSystems(updated);
  };

  const removeTemplateSystem = (index: number) => {
    setTemplateSystems(templateSystems.filter((_, i) => i !== index));
  };

  // Filter templates
  const filteredTemplates = templatesQuery.data?.filter((t) => {
    const matchesSearch =
      searchQuery === "" ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.propertyType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPropertyType = propertyTypeFilter === "all" || t.propertyType === propertyTypeFilter;
    const matchesBuildingClass = buildingClassFilter === "all" || t.buildingClass === buildingClassFilter;
    return matchesSearch && matchesPropertyType && matchesBuildingClass;
  }) || [];

  // Filter service life values
  const filteredServiceLifeValues = serviceLifeValuesQuery.data?.filter((v) => {
    const matchesSearch =
      searchQuery === "" ||
      v.componentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.componentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBuildingClass = buildingClassFilter === "all" || v.buildingClass === buildingClassFilter || v.buildingClass === "all";
    return matchesSearch && matchesBuildingClass;
  }) || [];

  const getBuildingClassLabel = (value: string) => {
    return BUILDING_CLASSES.find((c) => c.value === value)?.label || value;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-8">
        <BackButton to="dashboard" />
        
        <div className="flex items-center gap-3">
          <Building2 className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Building Templates & Service Life</h1>
            <p className="text-muted-foreground">
              Manage building type templates and design service life values
            </p>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="templates" className="gap-2">
              <Layers className="w-4 h-4" />
              Building Templates
            </TabsTrigger>
            <TabsTrigger value="service-life" className="gap-2">
              <Clock className="w-4 h-4" />
              Service Life Values
            </TabsTrigger>
          </TabsList>

          {/* Building Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Building Type Templates</CardTitle>
                    <CardDescription>
                      Pre-defined templates for different building types with standard systems and service life values
                    </CardDescription>
                  </div>
                  <Button onClick={() => {
                    resetTemplateForm();
                    setTemplateDialogOpen(true);
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Property Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Property Types</SelectItem>
                      {PROPERTY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={buildingClassFilter} onValueChange={setBuildingClassFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Building Class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {BUILDING_CLASSES.map((cls) => (
                        <SelectItem key={cls.value} value={cls.value}>{cls.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Templates Table */}
                {templatesQuery.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No templates found. Create your first template to get started.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Property Type</TableHead>
                        <TableHead>Building Class</TableHead>
                        <TableHead>Construction Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTemplates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">
                            {template.name}
                            {template.isDefault === 1 && (
                              <Badge variant="secondary" className="ml-2">Default</Badge>
                            )}
                          </TableCell>
                          <TableCell>{template.propertyType}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getBuildingClassLabel(template.buildingClass)}
                            </Badge>
                          </TableCell>
                          <TableCell>{template.constructionType || "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTemplate(template)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this template?")) {
                                  deleteTemplateMutation.mutate({ id: template.id });
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Service Life Values Tab */}
          <TabsContent value="service-life" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Design Service Life Values</CardTitle>
                    <CardDescription>
                      Standard service life values by component, building class, and property type
                    </CardDescription>
                  </div>
                  <Button onClick={() => {
                    resetServiceLifeForm();
                    setServiceLifeDialogOpen(true);
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Service Life Value
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by component code or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Select value={buildingClassFilter} onValueChange={setBuildingClassFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Building Class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {BUILDING_CLASSES.map((cls) => (
                        <SelectItem key={cls.value} value={cls.value}>{cls.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Service Life Values Table */}
                {serviceLifeValuesQuery.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : filteredServiceLifeValues.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No service life values found. Add values to define standard service life by component.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Component Code</TableHead>
                        <TableHead>Component Name</TableHead>
                        <TableHead>Building Class</TableHead>
                        <TableHead>Property Type</TableHead>
                        <TableHead className="text-right">Design Life (yrs)</TableHead>
                        <TableHead className="text-right">Range (yrs)</TableHead>
                        <TableHead>Data Source</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredServiceLifeValues.map((value) => (
                        <TableRow key={value.id}>
                          <TableCell className="font-mono">{value.componentCode}</TableCell>
                          <TableCell>{value.componentName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {value.buildingClass === "all" ? "All Classes" : getBuildingClassLabel(value.buildingClass)}
                            </Badge>
                          </TableCell>
                          <TableCell>{value.propertyType || "All"}</TableCell>
                          <TableCell className="text-right font-medium">
                            {value.designServiceLife}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {value.minServiceLife && value.maxServiceLife
                              ? `${value.minServiceLife} - ${value.maxServiceLife}`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {value.dataSource || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditServiceLife(value)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this service life value?")) {
                                  deleteServiceLifeMutation.mutate({ id: value.id });
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Template Dialog */}
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Building Template" : "Create Building Template"}
              </DialogTitle>
              <DialogDescription>
                Define a template with pre-configured systems and service life values
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g., Standard Office Building"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="propertyType">Property Type *</Label>
                  <Select
                    value={templateForm.propertyType}
                    onValueChange={(v) => setTemplateForm({ ...templateForm, propertyType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buildingClass">Building Class *</Label>
                  <Select
                    value={templateForm.buildingClass}
                    onValueChange={(v: any) => setTemplateForm({ ...templateForm, buildingClass: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select building class" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUILDING_CLASSES.map((cls) => (
                        <SelectItem key={cls.value} value={cls.value}>{cls.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="constructionType">Construction Type</Label>
                  <Input
                    id="constructionType"
                    value={templateForm.constructionType}
                    onChange={(e) => setTemplateForm({ ...templateForm, constructionType: e.target.value })}
                    placeholder="e.g., Steel Frame"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="typicalGrossFloorArea">Typical Gross Floor Area (sq ft)</Label>
                  <Input
                    id="typicalGrossFloorArea"
                    type="number"
                    value={templateForm.typicalGrossFloorArea}
                    onChange={(e) => setTemplateForm({ ...templateForm, typicalGrossFloorArea: e.target.value })}
                    placeholder="e.g., 50000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="typicalNumberOfStories">Typical Number of Stories</Label>
                  <Input
                    id="typicalNumberOfStories"
                    type="number"
                    value={templateForm.typicalNumberOfStories}
                    onChange={(e) => setTemplateForm({ ...templateForm, typicalNumberOfStories: e.target.value })}
                    placeholder="e.g., 5"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                    placeholder="Describe this template..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Systems */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Template Systems</Label>
                  <Button variant="outline" size="sm" onClick={addSystemToTemplate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add System
                  </Button>
                </div>
                
                {templateSystems.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground border rounded-lg">
                    No systems added. Click "Add System" to include building components.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {templateSystems.map((system, index) => (
                      <div key={index} className="flex gap-2 items-end p-3 border rounded-lg">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Component</Label>
                          <Select
                            value={system.componentCode}
                            onValueChange={(v) => updateTemplateSystem(index, "componentCode", v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select component" />
                            </SelectTrigger>
                            <SelectContent>
                              {COMMON_COMPONENTS.map((c) => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.code} - {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24 space-y-1">
                          <Label className="text-xs">Service Life</Label>
                          <Input
                            type="number"
                            value={system.defaultServiceLife}
                            onChange={(e) => updateTemplateSystem(index, "defaultServiceLife", parseInt(e.target.value) || 0)}
                            placeholder="Years"
                          />
                        </div>
                        <div className="w-28 space-y-1">
                          <Label className="text-xs">Condition</Label>
                          <Select
                            value={system.typicalCondition || "good"}
                            onValueChange={(v: any) => updateTemplateSystem(index, "typicalCondition", v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="good">Good</SelectItem>
                              <SelectItem value="fair">Fair</SelectItem>
                              <SelectItem value="poor">Poor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTemplateSystem(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={!templateForm.name || !templateForm.propertyType || createTemplateMutation.isPending || updateTemplateMutation.isPending}
              >
                {(createTemplateMutation.isPending || updateTemplateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingTemplate ? "Update Template" : "Create Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Service Life Value Dialog */}
        <Dialog open={serviceLifeDialogOpen} onOpenChange={setServiceLifeDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingServiceLife ? "Edit Service Life Value" : "Add Service Life Value"}
              </DialogTitle>
              <DialogDescription>
                Define design service life for a component by building class and property type
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slComponentCode">Component Code *</Label>
                  <Select
                    value={serviceLifeForm.componentCode}
                    onValueChange={(v) => {
                      const component = COMMON_COMPONENTS.find((c) => c.code === v);
                      setServiceLifeForm({
                        ...serviceLifeForm,
                        componentCode: v,
                        componentName: component?.name || "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select component" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_COMPONENTS.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} - {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slComponentName">Component Name *</Label>
                  <Input
                    id="slComponentName"
                    value={serviceLifeForm.componentName}
                    onChange={(e) => setServiceLifeForm({ ...serviceLifeForm, componentName: e.target.value })}
                    placeholder="Component name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slBuildingClass">Building Class *</Label>
                  <Select
                    value={serviceLifeForm.buildingClass}
                    onValueChange={(v: any) => setServiceLifeForm({ ...serviceLifeForm, buildingClass: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select building class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {BUILDING_CLASSES.map((cls) => (
                        <SelectItem key={cls.value} value={cls.value}>{cls.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slPropertyType">Property Type</Label>
                  <Select
                    value={serviceLifeForm.propertyType || "all"}
                    onValueChange={(v) => setServiceLifeForm({ ...serviceLifeForm, propertyType: v === "all" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All property types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Property Types</SelectItem>
                      {PROPERTY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="designServiceLife">Design Service Life (years) *</Label>
                  <Input
                    id="designServiceLife"
                    type="number"
                    value={serviceLifeForm.designServiceLife}
                    onChange={(e) => setServiceLifeForm({ ...serviceLifeForm, designServiceLife: e.target.value })}
                    placeholder="25"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minServiceLife">Minimum (years)</Label>
                  <Input
                    id="minServiceLife"
                    type="number"
                    value={serviceLifeForm.minServiceLife}
                    onChange={(e) => setServiceLifeForm({ ...serviceLifeForm, minServiceLife: e.target.value })}
                    placeholder="20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxServiceLife">Maximum (years)</Label>
                  <Input
                    id="maxServiceLife"
                    type="number"
                    value={serviceLifeForm.maxServiceLife}
                    onChange={(e) => setServiceLifeForm({ ...serviceLifeForm, maxServiceLife: e.target.value })}
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bestCaseServiceLife">Best Case (years)</Label>
                  <Input
                    id="bestCaseServiceLife"
                    type="number"
                    value={serviceLifeForm.bestCaseServiceLife}
                    onChange={(e) => setServiceLifeForm({ ...serviceLifeForm, bestCaseServiceLife: e.target.value })}
                    placeholder="35"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="worstCaseServiceLife">Worst Case (years)</Label>
                  <Input
                    id="worstCaseServiceLife"
                    type="number"
                    value={serviceLifeForm.worstCaseServiceLife}
                    onChange={(e) => setServiceLifeForm({ ...serviceLifeForm, worstCaseServiceLife: e.target.value })}
                    placeholder="15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataSource">Data Source</Label>
                  <Input
                    id="dataSource"
                    value={serviceLifeForm.dataSource}
                    onChange={(e) => setServiceLifeForm({ ...serviceLifeForm, dataSource: e.target.value })}
                    placeholder="e.g., BOMA, ASHRAE, Industry Standard"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slNotes">Notes</Label>
                  <Input
                    id="slNotes"
                    value={serviceLifeForm.notes}
                    onChange={(e) => setServiceLifeForm({ ...serviceLifeForm, notes: e.target.value })}
                    placeholder="Additional notes"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setServiceLifeDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveServiceLife}
                disabled={
                  !serviceLifeForm.componentCode ||
                  !serviceLifeForm.componentName ||
                  !serviceLifeForm.designServiceLife ||
                  createServiceLifeMutation.isPending ||
                  updateServiceLifeMutation.isPending
                }
              >
                {(createServiceLifeMutation.isPending || updateServiceLifeMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingServiceLife ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
