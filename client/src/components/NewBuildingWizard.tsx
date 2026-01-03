import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  FileText,
  Layers,
  Settings2,
  MapPin,
  Calendar,
  Ruler,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Property types
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

// Construction types
const CONSTRUCTION_TYPES = [
  "Steel Frame",
  "Concrete",
  "Wood Frame",
  "Masonry",
  "Pre-Engineered Metal",
  "Mixed",
  "Other",
];

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

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
  selected?: boolean;
}

interface NewBuildingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (projectId: number) => void;
}

export function NewBuildingWizard({ open, onOpenChange, onComplete }: NewBuildingWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  
  // Building form state
  const [buildingForm, setBuildingForm] = useState({
    name: "",
    propertyType: "",
    buildingClass: "class_b" as "class_a" | "class_b" | "class_c",
    constructionType: "",
    yearBuilt: "",
    grossFloorArea: "",
    numberOfStories: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    description: "",
  });

  // Systems to include
  const [selectedSystems, setSelectedSystems] = useState<TemplateSystem[]>([]);

  // Wizard steps
  const steps: WizardStep[] = [
    {
      id: "template",
      title: "Choose Template",
      description: "Select a building type template or start from scratch",
      icon: <FileText className="w-5 h-5" />,
    },
    {
      id: "details",
      title: "Building Details",
      description: "Enter basic building information",
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      id: "location",
      title: "Location",
      description: "Specify the building location",
      icon: <MapPin className="w-5 h-5" />,
    },
    {
      id: "systems",
      title: "Systems",
      description: "Select building systems to assess",
      icon: <Layers className="w-5 h-5" />,
    },
    {
      id: "review",
      title: "Review",
      description: "Review and create the building",
      icon: <Check className="w-5 h-5" />,
    },
  ];

  // Queries
  const templatesQuery = trpc.buildingTemplates.templates.list.useQuery({
    companyId: user?.companyId ?? undefined,
  });

  const selectedTemplateQuery = trpc.buildingTemplates.templates.get.useQuery(
    { id: selectedTemplateId! },
    { enabled: !!selectedTemplateId }
  );

  // Mutations - we'll need to create a project
  const createProjectMutation = trpc.projects.create.useMutation({
    onSuccess: (result) => {
      toast.success("Building created successfully!");
      onOpenChange(false);
      if (onComplete && result.id) {
        onComplete(result.id);
      }
    },
    onError: (error) => {
      toast.error(`Failed to create building: ${error.message}`);
    },
  });

  // Effect to populate form when template is selected
  useEffect(() => {
    if (selectedTemplateQuery.data) {
      const template = selectedTemplateQuery.data;
      setBuildingForm((prev) => ({
        ...prev,
        propertyType: template.propertyType || prev.propertyType,
        buildingClass: template.buildingClass || prev.buildingClass,
        constructionType: template.constructionType || prev.constructionType,
        grossFloorArea: template.typicalGrossFloorArea?.toString() || prev.grossFloorArea,
        numberOfStories: template.typicalNumberOfStories?.toString() || prev.numberOfStories,
      }));

      // Pre-select systems from template
      if (template.systems) {
        setSelectedSystems(
          template.systems.map((s: any) => ({
            ...s,
            selected: true,
          }))
        );
      }
    }
  }, [selectedTemplateQuery.data]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setSelectedTemplateId(null);
      setBuildingForm({
        name: "",
        propertyType: "",
        buildingClass: "class_b",
        constructionType: "",
        yearBuilt: "",
        grossFloorArea: "",
        numberOfStories: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        description: "",
      });
      setSelectedSystems([]);
    }
  }, [open]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSelectTemplate = (templateId: number | null) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      // Starting from scratch - clear systems
      setSelectedSystems([]);
    }
  };

  const toggleSystemSelection = (index: number) => {
    setSelectedSystems((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, selected: !s.selected } : s
      )
    );
  };

  const handleCreate = () => {
    // Create the project with the form data
    createProjectMutation.mutate({
      name: buildingForm.name,
      propertyType: buildingForm.propertyType,
      buildingClass: buildingForm.buildingClass,
      constructionType: buildingForm.constructionType || undefined,
      yearBuilt: buildingForm.yearBuilt ? parseInt(buildingForm.yearBuilt) : undefined,
      grossFloorArea: buildingForm.grossFloorArea ? parseInt(buildingForm.grossFloorArea) : undefined,
      numberOfStories: buildingForm.numberOfStories ? parseInt(buildingForm.numberOfStories) : undefined,
      address: buildingForm.address || undefined,
      city: buildingForm.city || undefined,
      state: buildingForm.state || undefined,
      zipCode: buildingForm.zipCode || undefined,
      description: buildingForm.description || undefined,
      templateId: selectedTemplateId || undefined,
      systems: selectedSystems.filter((s) => s.selected).map((s) => ({
        componentCode: s.componentCode,
        componentName: s.componentName,
        estimatedServiceLife: s.defaultServiceLife,
        condition: s.typicalCondition || "good",
      })),
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Template selection - always can proceed
        return true;
      case 1: // Building details
        return buildingForm.name && buildingForm.propertyType;
      case 2: // Location - optional
        return true;
      case 3: // Systems
        return true;
      case 4: // Review
        return buildingForm.name && buildingForm.propertyType;
      default:
        return false;
    }
  };

  const getBuildingClassLabel = (value: string) => {
    return BUILDING_CLASSES.find((c) => c.value === value)?.label || value;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            New Building Setup Wizard
          </DialogTitle>
          <DialogDescription>
            Create a new building with pre-populated data from templates
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-4 py-2 border-b">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-2",
                index <= currentStep ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2",
                  index < currentStep
                    ? "bg-primary border-primary text-primary-foreground"
                    : index === currentStep
                    ? "border-primary text-primary"
                    : "border-muted-foreground"
                )}
              >
                {index < currentStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-sm">{index + 1}</span>
                )}
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-medium">{step.title}</div>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground mx-2" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Template Selection */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Start from scratch option */}
                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary",
                    selectedTemplateId === null && "border-primary ring-2 ring-primary/20"
                  )}
                  onClick={() => handleSelectTemplate(null)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings2 className="w-4 h-4" />
                      Start from Scratch
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Create a custom building without a template
                    </p>
                  </CardContent>
                </Card>

                {/* Template options */}
                {templatesQuery.isLoading ? (
                  <div className="col-span-full flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  templatesQuery.data?.map((template) => (
                    <Card
                      key={template.id}
                      className={cn(
                        "cursor-pointer transition-all hover:border-primary",
                        selectedTemplateId === template.id && "border-primary ring-2 ring-primary/20"
                      )}
                      onClick={() => handleSelectTemplate(template.id)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {template.name}
                        </CardTitle>
                        <CardDescription>{template.propertyType}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">
                            {getBuildingClassLabel(template.buildingClass)}
                          </Badge>
                          {template.constructionType && (
                            <Badge variant="secondary" className="text-xs">
                              {template.constructionType}
                            </Badge>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {selectedTemplateQuery.isLoading && selectedTemplateId && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading template details...
                </div>
              )}
            </div>
          )}

          {/* Step 2: Building Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="name">Building Name *</Label>
                  <Input
                    id="name"
                    value={buildingForm.name}
                    onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
                    placeholder="e.g., Main Office Building"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="propertyType">Property Type *</Label>
                  <Select
                    value={buildingForm.propertyType}
                    onValueChange={(v) => setBuildingForm({ ...buildingForm, propertyType: v })}
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
                    value={buildingForm.buildingClass}
                    onValueChange={(v: any) => setBuildingForm({ ...buildingForm, buildingClass: v })}
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
                  <Select
                    value={buildingForm.constructionType}
                    onValueChange={(v) => setBuildingForm({ ...buildingForm, constructionType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select construction type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONSTRUCTION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearBuilt">Year Built</Label>
                  <Input
                    id="yearBuilt"
                    type="number"
                    value={buildingForm.yearBuilt}
                    onChange={(e) => setBuildingForm({ ...buildingForm, yearBuilt: e.target.value })}
                    placeholder="e.g., 1995"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grossFloorArea">Gross Floor Area (sq ft)</Label>
                  <Input
                    id="grossFloorArea"
                    type="number"
                    value={buildingForm.grossFloorArea}
                    onChange={(e) => setBuildingForm({ ...buildingForm, grossFloorArea: e.target.value })}
                    placeholder="e.g., 50000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numberOfStories">Number of Stories</Label>
                  <Input
                    id="numberOfStories"
                    type="number"
                    value={buildingForm.numberOfStories}
                    onChange={(e) => setBuildingForm({ ...buildingForm, numberOfStories: e.target.value })}
                    placeholder="e.g., 5"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={buildingForm.description}
                    onChange={(e) => setBuildingForm({ ...buildingForm, description: e.target.value })}
                    placeholder="Brief description of the building..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={buildingForm.address}
                    onChange={(e) => setBuildingForm({ ...buildingForm, address: e.target.value })}
                    placeholder="e.g., 123 Main Street"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={buildingForm.city}
                    onChange={(e) => setBuildingForm({ ...buildingForm, city: e.target.value })}
                    placeholder="e.g., San Francisco"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={buildingForm.state}
                    onChange={(e) => setBuildingForm({ ...buildingForm, state: e.target.value })}
                    placeholder="e.g., CA"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={buildingForm.zipCode}
                    onChange={(e) => setBuildingForm({ ...buildingForm, zipCode: e.target.value })}
                    placeholder="e.g., 94102"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Systems */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {selectedSystems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No systems pre-configured.</p>
                  <p className="text-sm">You can add systems after creating the building.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Select the building systems you want to include in the initial assessment:
                  </p>
                  <div className="space-y-2">
                    {selectedSystems.map((system, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center gap-4 p-3 border rounded-lg transition-colors",
                          system.selected ? "border-primary bg-primary/5" : "border-muted"
                        )}
                      >
                        <Checkbox
                          checked={system.selected}
                          onCheckedChange={() => toggleSystemSelection(index)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">
                            {system.componentCode} - {system.componentName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Service Life: {system.defaultServiceLife} years
                            {system.typicalCondition && (
                              <> • Typical Condition: {system.typicalCondition}</>
                            )}
                          </div>
                        </div>
                        {system.isRequired === 1 && (
                          <Badge variant="secondary">Required</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Building Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <span className="ml-2 font-medium">{buildingForm.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Property Type:</span>
                    <span className="ml-2 font-medium">{buildingForm.propertyType}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Building Class:</span>
                    <span className="ml-2 font-medium">{getBuildingClassLabel(buildingForm.buildingClass)}</span>
                  </div>
                  {buildingForm.constructionType && (
                    <div>
                      <span className="text-muted-foreground">Construction:</span>
                      <span className="ml-2 font-medium">{buildingForm.constructionType}</span>
                    </div>
                  )}
                  {buildingForm.yearBuilt && (
                    <div>
                      <span className="text-muted-foreground">Year Built:</span>
                      <span className="ml-2 font-medium">{buildingForm.yearBuilt}</span>
                    </div>
                  )}
                  {buildingForm.grossFloorArea && (
                    <div>
                      <span className="text-muted-foreground">Floor Area:</span>
                      <span className="ml-2 font-medium">{parseInt(buildingForm.grossFloorArea).toLocaleString()} sq ft</span>
                    </div>
                  )}
                  {buildingForm.numberOfStories && (
                    <div>
                      <span className="text-muted-foreground">Stories:</span>
                      <span className="ml-2 font-medium">{buildingForm.numberOfStories}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {(buildingForm.address || buildingForm.city) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Location</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {buildingForm.address && <div>{buildingForm.address}</div>}
                    {(buildingForm.city || buildingForm.state || buildingForm.zipCode) && (
                      <div>
                        {[buildingForm.city, buildingForm.state, buildingForm.zipCode]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {selectedSystems.filter((s) => s.selected).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Systems to Assess ({selectedSystems.filter((s) => s.selected).length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedSystems
                        .filter((s) => s.selected)
                        .map((system, index) => (
                          <Badge key={index} variant="secondary">
                            {system.componentCode} - {system.componentName}
                          </Badge>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedTemplateId && (
                <div className="text-sm text-muted-foreground">
                  Based on template: {selectedTemplateQuery.data?.name}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t pt-4">
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreate}
                  disabled={!canProceed() || createProjectMutation.isPending}
                >
                  {createProjectMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Create Building
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
