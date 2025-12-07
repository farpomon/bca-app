import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Plus, Edit, Trash2, Building2, Calendar, Ruler, Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BuildingSectionsManagerProps {
  projectId: number;
}

export default function BuildingSectionsManager({ projectId }: BuildingSectionsManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<any>(null);
  
  const { data: sections, isLoading, refetch } = trpc.buildingSections.list.useQuery({ projectId });
  const createMutation = trpc.buildingSections.create.useMutation();
  const updateMutation = trpc.buildingSections.update.useMutation();
  const deleteMutation = trpc.buildingSections.delete.useMutation();
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sectionType: "original" as "original" | "extension" | "addition" | "renovation",
    installDate: "",
    expectedLifespan: "",
    grossFloorArea: "",
    numberOfStories: "",
    constructionType: "",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      sectionType: "original",
      installDate: "",
      expectedLifespan: "",
      grossFloorArea: "",
      numberOfStories: "",
      constructionType: "",
      notes: "",
    });
    setEditingSection(null);
  };

  const handleOpenDialog = (section?: any) => {
    if (section) {
      setEditingSection(section);
      setFormData({
        name: section.name || "",
        description: section.description || "",
        sectionType: section.sectionType || "original",
        installDate: section.installDate ? new Date(section.installDate).toISOString().split('T')[0] : "",
        expectedLifespan: section.expectedLifespan?.toString() || "",
        grossFloorArea: section.grossFloorArea?.toString() || "",
        numberOfStories: section.numberOfStories?.toString() || "",
        constructionType: section.constructionType || "",
        notes: section.notes || "",
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Section name is required");
      return;
    }

    try {
      const data: any = {
        projectId,
        name: formData.name,
        sectionType: formData.sectionType,
      };

      if (formData.description) data.description = formData.description;
      if (formData.installDate) data.installDate = formData.installDate;
      if (formData.expectedLifespan) data.expectedLifespan = parseInt(formData.expectedLifespan);
      if (formData.grossFloorArea) data.grossFloorArea = parseInt(formData.grossFloorArea);
      if (formData.numberOfStories) data.numberOfStories = parseInt(formData.numberOfStories);
      if (formData.constructionType) data.constructionType = formData.constructionType;
      if (formData.notes) data.notes = formData.notes;

      if (editingSection) {
        await updateMutation.mutateAsync({ sectionId: editingSection.id, ...data });
        toast.success("Section updated successfully");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Section created successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to save section");
    }
  };

  const handleDelete = async (sectionId: number) => {
    if (!confirm("Are you sure you want to delete this section? All associated assessments will remain but will no longer be linked to this section.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ sectionId });
      toast.success("Section deleted successfully");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete section");
    }
  };

  const getSectionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      original: "Original Building",
      extension: "Extension",
      addition: "Addition",
      renovation: "Renovation",
    };
    return labels[type] || type;
  };

  const getSectionTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      original: "bg-blue-100 text-blue-800",
      extension: "bg-green-100 text-green-800",
      addition: "bg-purple-100 text-purple-800",
      renovation: "bg-orange-100 text-orange-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Building Sections & Extensions</h3>
          <p className="text-sm text-muted-foreground">
            Manage different sections, extensions, and additions within this facility
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </div>

      {sections && sections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No building sections defined yet. Add sections to track extensions, additions, and renovations separately.
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Section
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections?.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {section.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getSectionTypeBadgeColor(section.sectionType)}`}>
                        {getSectionTypeLabel(section.sectionType)}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(section)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(section.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {section.description && (
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                )}
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {section.installDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Install Date</div>
                        <div className="font-medium">{new Date(section.installDate).toLocaleDateString()}</div>
                      </div>
                    </div>
                  )}
                  
                  {section.expectedLifespan && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Expected Lifespan</div>
                        <div className="font-medium">{section.expectedLifespan} years</div>
                      </div>
                    </div>
                  )}
                  
                  {section.grossFloorArea && (
                    <div className="flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Floor Area</div>
                        <div className="font-medium">{section.grossFloorArea.toLocaleString()} sq ft</div>
                      </div>
                    </div>
                  )}
                  
                  {section.numberOfStories && (
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Stories</div>
                        <div className="font-medium">{section.numberOfStories}</div>
                      </div>
                    </div>
                  )}
                </div>

                {section.constructionType && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Construction: </span>
                    <span className="font-medium">{section.constructionType}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSection ? "Edit Building Section" : "Add Building Section"}</DialogTitle>
            <DialogDescription>
              Define a section, extension, or addition within this facility with its own lifecycle tracking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Section Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., East Wing Addition, 2015 Renovation"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="sectionType">Section Type</Label>
                <Select value={formData.sectionType} onValueChange={(value: any) => setFormData({ ...formData, sectionType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Original Building</SelectItem>
                    <SelectItem value="extension">Extension</SelectItem>
                    <SelectItem value="addition">Addition</SelectItem>
                    <SelectItem value="renovation">Renovation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this section"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="installDate">Install Date</Label>
                <Input
                  id="installDate"
                  type="date"
                  value={formData.installDate}
                  onChange={(e) => setFormData({ ...formData, installDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="expectedLifespan">Expected Lifespan (years)</Label>
                <Input
                  id="expectedLifespan"
                  type="number"
                  placeholder="e.g., 50"
                  value={formData.expectedLifespan}
                  onChange={(e) => setFormData({ ...formData, expectedLifespan: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="grossFloorArea">Gross Floor Area (sq ft)</Label>
                <Input
                  id="grossFloorArea"
                  type="number"
                  placeholder="e.g., 5000"
                  value={formData.grossFloorArea}
                  onChange={(e) => setFormData({ ...formData, grossFloorArea: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="numberOfStories">Number of Stories</Label>
                <Input
                  id="numberOfStories"
                  type="number"
                  placeholder="e.g., 2"
                  value={formData.numberOfStories}
                  onChange={(e) => setFormData({ ...formData, numberOfStories: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="constructionType">Construction Type</Label>
                <Input
                  id="constructionType"
                  placeholder="e.g., Steel Frame, Concrete"
                  value={formData.constructionType}
                  onChange={(e) => setFormData({ ...formData, constructionType: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes about this section"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingSection ? "Update" : "Create"} Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
