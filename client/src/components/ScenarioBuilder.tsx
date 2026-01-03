import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ScenarioBuilderProps {
  projectId: number;
  onScenarioCreated: (scenarioId: number) => void;
  onCancel: () => void;
}

export function ScenarioBuilder({ projectId, onScenarioCreated, onCancel }: ScenarioBuilderProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budgetConstraint, setBudgetConstraint] = useState("");
  const [budgetType, setBudgetType] = useState<"hard" | "soft">("hard");
  const [timeHorizon, setTimeHorizon] = useState("10");
  const [discountRate, setDiscountRate] = useState("0.03");
  const [optimizationGoal, setOptimizationGoal] = useState<
    "minimize_cost" | "maximize_ci" | "maximize_roi" | "minimize_risk"
  >("maximize_roi");

  const createMutation = trpc.optimization.create.useMutation({
    onSuccess: (data) => {
      toast.success("Scenario created successfully");
      runMutation.mutate({ scenarioId: data.scenarioId });
    },
    onError: (error) => {
      toast.error(`Failed to create scenario: ${error.message}`);
    },
  });

  const runMutation = trpc.optimization.run.useMutation({
    onSuccess: (data, variables) => {
      toast.success("Optimization completed successfully");
      onScenarioCreated(variables.scenarioId);
    },
    onError: (error) => {
      toast.error(`Optimization failed: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a scenario name");
      return;
    }

    const budgetValue = budgetConstraint ? parseFloat(budgetConstraint) : undefined;
    if (budgetConstraint && (isNaN(budgetValue!) || budgetValue! <= 0)) {
      toast.error("Please enter a valid budget amount");
      return;
    }

    const horizonValue = parseInt(timeHorizon);
    if (isNaN(horizonValue) || horizonValue < 1 || horizonValue > 50) {
      toast.error("Time horizon must be between 1 and 50 years");
      return;
    }

    const rateValue = parseFloat(discountRate);
    if (isNaN(rateValue) || rateValue < 0 || rateValue > 0.2) {
      toast.error("Discount rate must be between 0 and 0.2 (20%)");
      return;
    }

    createMutation.mutate({
      projectId,
      name,
      description: description || undefined,
      budgetConstraint: budgetValue,
      budgetType,
      timeHorizon: horizonValue,
      discountRate: rateValue,
      optimizationGoal,
    });
  };

  const isLoading = createMutation.isPending || runMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Scenario Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., 5-Year Budget Plan"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description of this scenario..."
          rows={3}
          disabled={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="optimizationGoal">Optimization Goal *</Label>
          <Select
            value={optimizationGoal}
            onValueChange={(value: any) => setOptimizationGoal(value)}
            disabled={isLoading}
          >
            <SelectTrigger id="optimizationGoal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="maximize_roi">Maximize ROI</SelectItem>
              <SelectItem value="maximize_ci">Maximize Condition Index</SelectItem>
              <SelectItem value="minimize_cost">Minimize Cost</SelectItem>
              <SelectItem value="minimize_risk">Minimize Risk</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeHorizon">Time Horizon (years) *</Label>
          <Input
            id="timeHorizon"
            type="number"
            min="1"
            max="50"
            value={timeHorizon}
            onChange={(e) => setTimeHorizon(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="budgetConstraint">Budget Constraint ($)</Label>
          <Input
            id="budgetConstraint"
            type="number"
            min="0"
            step="1000"
            value={budgetConstraint}
            onChange={(e) => setBudgetConstraint(e.target.value)}
            placeholder="Optional budget limit"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty for no budget constraint
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="budgetType">Budget Type</Label>
          <Select
            value={budgetType}
            onValueChange={(value: any) => setBudgetType(value)}
            disabled={isLoading}
          >
            <SelectTrigger id="budgetType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hard">Hard (strict limit)</SelectItem>
              <SelectItem value="soft">Soft (flexible)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="discountRate">Discount Rate</Label>
        <Input
          id="discountRate"
          type="number"
          min="0"
          max="0.2"
          step="0.001"
          value={discountRate}
          onChange={(e) => setDiscountRate(e.target.value)}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Typical values: 0.03 (3%) for public sector, 0.05-0.10 for private sector
        </p>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isLoading ? "Creating & Optimizing..." : "Create & Run Optimization"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
