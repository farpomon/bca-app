import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface ProjectRatingConfigProps {
  projectId: number;
}

export default function ProjectRatingConfig({ projectId }: ProjectRatingConfigProps) {
  const { data: scales, isLoading: scalesLoading } = trpc.ratings.scales.list.useQuery();
  const { data: config, isLoading: configLoading } = trpc.ratings.project.get.useQuery({ projectId });
  
  const [conditionScaleId, setConditionScaleId] = useState<string>("");
  const [priorityScaleId, setPriorityScaleId] = useState<string>("");
  const [fciScaleId, setFciScaleId] = useState<string>("");

  useEffect(() => {
    if (config) {
      setConditionScaleId(config.conditionScaleId?.toString() || "");
      setPriorityScaleId(config.priorityScaleId?.toString() || "");
      setFciScaleId(config.fciScaleId?.toString() || "");
    }
  }, [config]);

  const upsertConfig = trpc.ratings.project.upsert.useMutation({
    onSuccess: () => {
      toast.success("Rating configuration saved");
    },
    onError: (error) => {
      toast.error("Failed to save configuration: " + error.message);
    },
  });

  const handleSave = () => {
    upsertConfig.mutate({
      projectId,
      conditionScaleId: conditionScaleId ? parseInt(conditionScaleId) : undefined,
      priorityScaleId: priorityScaleId ? parseInt(priorityScaleId) : undefined,
      fciScaleId: fciScaleId ? parseInt(fciScaleId) : undefined,
      useWeightedAverage: true,
    });
  };

  if (scalesLoading || configLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const conditionScales = scales?.filter(s => s.type === "condition") || [];
  const priorityScales = scales?.filter(s => s.type === "priority") || [];
  const fciScales = scales?.filter(s => s.type === "fci") || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rating Scale Configuration</CardTitle>
        <CardDescription>
          Select which rating scales to use for this project
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="condition-scale">Condition Rating Scale</Label>
          <Select value={conditionScaleId} onValueChange={setConditionScaleId}>
            <SelectTrigger id="condition-scale">
              <SelectValue placeholder="Select condition scale" />
            </SelectTrigger>
            <SelectContent>
              {conditionScales.map((scale) => (
                <SelectItem key={scale.id} value={scale.id.toString()}>
                  {scale.name} {scale.isDefault && "(Default)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Scale used for component condition assessments
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority-scale">Deficiency Priority Scale</Label>
          <Select value={priorityScaleId} onValueChange={setPriorityScaleId}>
            <SelectTrigger id="priority-scale">
              <SelectValue placeholder="Select priority scale" />
            </SelectTrigger>
            <SelectContent>
              {priorityScales.map((scale) => (
                <SelectItem key={scale.id} value={scale.id.toString()}>
                  {scale.name} {scale.isDefault && "(Default)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Scale used for deficiency priority ratings
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fci-scale">FCI Calculation Scale</Label>
          <Select value={fciScaleId} onValueChange={setFciScaleId}>
            <SelectTrigger id="fci-scale">
              <SelectValue placeholder="Select FCI scale" />
            </SelectTrigger>
            <SelectContent>
              {fciScales.map((scale) => (
                <SelectItem key={scale.id} value={scale.id.toString()}>
                  {scale.name} {scale.isDefault && "(Default)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Scale used for overall facility condition index
          </p>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={upsertConfig.isPending}
          className="w-full"
        >
          {upsertConfig.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Configuration
        </Button>
      </CardContent>
    </Card>
  );
}
