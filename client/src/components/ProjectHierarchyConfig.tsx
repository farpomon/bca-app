import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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

interface ProjectHierarchyConfigProps {
  projectId: number;
}

export default function ProjectHierarchyConfig({ projectId }: ProjectHierarchyConfigProps) {
  const [useCustom, setUseCustom] = useState(false);
  const [maxDepth, setMaxDepth] = useState(3);
  const [componentWeights, setComponentWeights] = useState<Record<string, number>>({});
  const [componentPriorities, setComponentPriorities] = useState<Record<string, "low" | "medium" | "high" | "critical">>({});
  const [enabledComponents, setEnabledComponents] = useState<string[]>(Object.keys(UNIFORMAT_LEVELS));

  const { data: config, isLoading, refetch } = trpc.hierarchy.project.get.useQuery({ projectId });
  const { data: defaultTemplate } = trpc.hierarchy.templates.getDefault.useQuery();
  const upsertMutation = trpc.hierarchy.project.upsert.useMutation();
  const deleteMutation = trpc.hierarchy.project.delete.useMutation();

  useEffect(() => {
    if (config) {
      setUseCustom(true);
      setMaxDepth(config.maxDepth || 3);
      setComponentWeights(config.componentWeights ? JSON.parse(config.componentWeights) : {});
      setComponentPriorities(config.componentPriorities ? JSON.parse(config.componentPriorities) : {});
      setEnabledComponents(config.enabledComponents ? JSON.parse(config.enabledComponents) : Object.keys(UNIFORMAT_LEVELS));
    } else if (defaultTemplate) {
      const templateConfig = JSON.parse(defaultTemplate.config);
      setMaxDepth(templateConfig.maxDepth || 3);
      setComponentWeights(templateConfig.componentWeights || {});
      setComponentPriorities(templateConfig.componentPriorities || {});
    }
  }, [config, defaultTemplate]);

  const handleSave = async () => {
    try {
      await upsertMutation.mutateAsync({
        projectId,
        maxDepth,
        componentWeights: Object.keys(componentWeights).length > 0 ? componentWeights : undefined,
        componentPriorities: Object.keys(componentPriorities).length > 0 ? componentPriorities : undefined,
        enabledComponents: enabledComponents.length < Object.keys(UNIFORMAT_LEVELS).length ? enabledComponents : undefined,
      });
      toast.success("Hierarchy configuration saved");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to save configuration");
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset to default template? This will remove all custom settings.")) return;

    try {
      await deleteMutation.mutateAsync({ projectId });
      toast.success("Reset to default template");
      setUseCustom(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to reset configuration");
    }
  };

  const handleWeightChange = (component: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setComponentWeights(prev => ({ ...prev, [component]: numValue }));
    } else {
      const { [component]: _, ...rest } = componentWeights;
      setComponentWeights(rest);
    }
  };

  const handlePriorityChange = (component: string, value: string) => {
    if (value) {
      setComponentPriorities(prev => ({ ...prev, [component]: value as "low" | "medium" | "high" | "critical" }));
    } else {
      const { [component]: _, ...rest } = componentPriorities;
      setComponentPriorities(rest);
    }
  };

  const toggleComponent = (component: string) => {
    setEnabledComponents(prev =>
      prev.includes(component)
        ? prev.filter(c => c !== component)
        : [...prev, component]
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hierarchy Configuration</CardTitle>
        <CardDescription>
          Customize UNIFORMAT II hierarchy for this project
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Use Custom Configuration</Label>
            <p className="text-sm text-muted-foreground">
              {useCustom ? "Using project-specific settings" : "Using default template"}
            </p>
          </div>
          <Switch
            checked={useCustom}
            onCheckedChange={setUseCustom}
          />
        </div>

        {useCustom && (
          <>
            <div className="space-y-2">
              <Label>Maximum Hierarchy Depth</Label>
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

            <div className="space-y-3">
              <Label>Enabled Components</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(UNIFORMAT_LEVELS).map(([code, name]) => (
                  <div key={code} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`enable-${code}`}
                      checked={enabledComponents.includes(code)}
                      onChange={() => toggleComponent(code)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor={`enable-${code}`} className="cursor-pointer text-sm">
                      {code} - {name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Component Weights (Optional)</Label>
              <p className="text-sm text-muted-foreground">
                Adjust relative importance for FCI calculations
              </p>
              <div className="grid gap-2">
                {Object.entries(UNIFORMAT_LEVELS)
                  .filter(([code]) => enabledComponents.includes(code))
                  .map(([code, name]) => (
                    <div key={code} className="flex items-center gap-2">
                      <Label className="w-48 text-sm">{code} - {name}</Label>
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

            <div className="space-y-3">
              <Label>Component Priorities (Optional)</Label>
              <div className="grid gap-2">
                {Object.entries(UNIFORMAT_LEVELS)
                  .filter(([code]) => enabledComponents.includes(code))
                  .map(([code, name]) => (
                    <div key={code} className="flex items-center gap-2">
                      <Label className="w-48 text-sm">{code} - {name}</Label>
                      <Select
                        value={componentPriorities[code] || ""}
                        onValueChange={(v) => handlePriorityChange(code, v)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Default" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Default</SelectItem>
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

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={upsertMutation.isPending}>
                {upsertMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Default
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
