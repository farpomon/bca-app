import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Trash2, Edit, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const UNIFORMAT_LEVELS = {
  A: "Substructure",
  B: "Shell",
  C: "Interiors",
  D: "Services",
  E: "Equipment & Furnishings",
  F: "Special Construction",
  G: "Building Sitework",
  Z: "General",
};

export default function HierarchySettings() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxDepth, setMaxDepth] = useState(3);
  const [isDefault, setIsDefault] = useState(false);
  const [componentWeights, setComponentWeights] = useState<Record<string, number>>({});
  const [componentPriorities, setComponentPriorities] = useState<Record<string, "low" | "medium" | "high" | "critical">>({});

  const { data: templates, isLoading, refetch } = trpc.hierarchy.templates.list.useQuery();
  const createMutation = trpc.hierarchy.templates.create.useMutation();
  const updateMutation = trpc.hierarchy.templates.update.useMutation();
  const deleteMutation = trpc.hierarchy.templates.delete.useMutation();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    setLocation("/");
    return null;
  }

  const resetForm = () => {
    setName("");
    setDescription("");
    setMaxDepth(3);
    setIsDefault(false);
    setComponentWeights({});
    setComponentPriorities({});
    setEditingTemplate(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleOpenEdit = (template: any) => {
    const config = JSON.parse(template.config);
    setName(template.name);
    setDescription(template.description || "");
    setMaxDepth(config.maxDepth || 3);
    setIsDefault(template.isDefault);
    setComponentWeights(config.componentWeights || {});
    setComponentPriorities(config.componentPriorities || {});
    setEditingTemplate(template);
    setIsCreateDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    const config = {
      maxDepth,
      componentWeights: Object.keys(componentWeights).length > 0 ? componentWeights : undefined,
      componentPriorities: Object.keys(componentPriorities).length > 0 ? componentPriorities : undefined,
    };

    try {
      if (editingTemplate) {
        await updateMutation.mutateAsync({
          id: editingTemplate.id,
          name,
          description,
          isDefault,
          config,
        });
        toast.success("Template updated successfully");
      } else {
        await createMutation.mutateAsync({
          name,
          description,
          isDefault,
          config,
        });
        toast.success("Template created successfully");
      }
      
      refetch();
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to save template");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Template deleted successfully");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete template");
    }
  };

  const handleWeightChange = (component: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setComponentWeights(prev => ({ ...prev, [component]: numValue }));
    }
  };

  const handlePriorityChange = (component: string, value: string) => {
    setComponentPriorities(prev => ({ ...prev, [component]: value as "low" | "medium" | "high" | "critical" }));
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Hierarchy Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage UNIFORMAT II hierarchy templates for building assessments
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4">
          {templates && templates.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No templates yet. Create your first template to get started.</p>
              </CardContent>
            </Card>
          )}

          {templates?.map((template: any) => {
            const config = JSON.parse(template.config);
            return (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {template.name}
                        {template.isDefault && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                            Default
                          </span>
                        )}
                      </CardTitle>
                      {template.description && (
                        <CardDescription className="mt-2">{template.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenEdit(template)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 text-sm">
                    <div>
                      <span className="font-medium">Max Depth:</span> Level {config.maxDepth}
                    </div>
                    {config.componentWeights && Object.keys(config.componentWeights).length > 0 && (
                      <div>
                        <span className="font-medium">Component Weights:</span>
                        <div className="mt-2 grid grid-cols-4 gap-2">
                          {Object.entries(config.componentWeights).map(([key, value]: [string, any]) => (
                            <div key={key} className="text-xs">
                              {key}: {value}×
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {config.componentPriorities && Object.keys(config.componentPriorities).length > 0 && (
                      <div>
                        <span className="font-medium">Component Priorities:</span>
                        <div className="mt-2 grid grid-cols-4 gap-2">
                          {Object.entries(config.componentPriorities).map(([key, value]: [string, any]) => (
                            <div key={key} className="text-xs capitalize">
                              {key}: {value}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Hierarchy Template"}</DialogTitle>
            <DialogDescription>
              Configure UNIFORMAT II hierarchy settings for building assessments
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Standard Commercial Building"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe when to use this template..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="maxDepth">Maximum Hierarchy Depth</Label>
              <Select value={maxDepth.toString()} onValueChange={(v) => setMaxDepth(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Level 1 - Major Group Only</SelectItem>
                  <SelectItem value="2">Level 2 - Group Systems</SelectItem>
                  <SelectItem value="3">Level 3 - Individual Elements</SelectItem>
                  <SelectItem value="4">Level 4 - Sub-Elements</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="isDefault" className="cursor-pointer">
                Set as default template
              </Label>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Component Weights (Optional)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Adjust relative importance for FCI calculations. Default is 1.0 for all components.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(UNIFORMAT_LEVELS).map(([code, name]) => (
                  <div key={code} className="flex items-center gap-2">
                    <Label className="w-32 text-sm">{code} - {name}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="1.0"
                      value={componentWeights[code] || ""}
                      onChange={(e) => handleWeightChange(code, e.target.value)}
                      className="w-24"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Component Priorities (Optional)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Set priority levels for different component groups.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(UNIFORMAT_LEVELS).map(([code, name]) => (
                  <div key={code} className="flex items-center gap-2">
                    <Label className="w-32 text-sm">{code} - {name}</Label>
                    <Select
                      value={componentPriorities[code] || ""}
                      onValueChange={(v) => handlePriorityChange(code, v)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingTemplate ? "Update" : "Create"} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
