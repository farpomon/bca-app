import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

interface Scenario {
  id: string;
  name: string;
  interventionYear: number;
  interventionCost: number;
  lifeExtension: number;
  maintenanceStrategy: "reactive" | "preventive" | "predictive";
}

interface ScenarioComparisonProps {
  componentCode: string;
  baselineFailureYear: number;
  baselineRemainingLife: number;
  estimatedReplacementCost: number;
}

export function ScenarioComparison({
  componentCode,
  baselineFailureYear,
  baselineRemainingLife,
  estimatedReplacementCost,
}: ScenarioComparisonProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([
    {
      id: "baseline",
      name: "Baseline (No Intervention)",
      interventionYear: 0,
      interventionCost: 0,
      lifeExtension: 0,
      maintenanceStrategy: "reactive",
    },
  ]);

  const [newScenario, setNewScenario] = useState<Partial<Scenario>>({
    name: "",
    interventionYear: new Date().getFullYear() + 1,
    interventionCost: 0,
    lifeExtension: 5,
    maintenanceStrategy: "preventive",
  });

  const calculateScenarioMetrics = (scenario: Scenario) => {
    const currentYear = new Date().getFullYear();
    const yearsUntilIntervention = scenario.interventionYear - currentYear;
    const extendedFailureYear = baselineFailureYear + scenario.lifeExtension;
    const extendedRemainingLife = baselineRemainingLife + scenario.lifeExtension;
    const totalCost = scenario.interventionCost + (scenario.interventionCost > 0 ? 0 : estimatedReplacementCost);
    const costPerYear = extendedRemainingLife > 0 ? totalCost / extendedRemainingLife : 0;
    const riskReduction = scenario.lifeExtension > 0 ? "High" : "None";

    return {
      extendedFailureYear,
      extendedRemainingLife,
      totalCost,
      costPerYear,
      riskReduction,
      yearsUntilIntervention,
    };
  };

  const handleAddScenario = () => {
    if (!newScenario.name || !newScenario.interventionYear || !newScenario.interventionCost || !newScenario.lifeExtension) {
      toast.error("Please fill in all scenario fields");
      return;
    }

    const scenario: Scenario = {
      id: `scenario-${Date.now()}`,
      name: newScenario.name,
      interventionYear: newScenario.interventionYear,
      interventionCost: newScenario.interventionCost,
      lifeExtension: newScenario.lifeExtension,
      maintenanceStrategy: newScenario.maintenanceStrategy || "preventive",
    };

    setScenarios([...scenarios, scenario]);
    setNewScenario({
      name: "",
      interventionYear: new Date().getFullYear() + 1,
      interventionCost: 0,
      lifeExtension: 5,
      maintenanceStrategy: "preventive",
    });
    toast.success("Scenario added");
  };

  const handleRemoveScenario = (id: string) => {
    if (id === "baseline") {
      toast.error("Cannot remove baseline scenario");
      return;
    }
    setScenarios(scenarios.filter((s) => s.id !== id));
    toast.success("Scenario removed");
  };

  const handleExport = () => {
    const data = scenarios.map((scenario) => {
      const metrics = calculateScenarioMetrics(scenario);
      return {
        Scenario: scenario.name,
        Strategy: scenario.maintenanceStrategy,
        "Intervention Year": scenario.interventionYear || "N/A",
        "Intervention Cost": `$${scenario.interventionCost.toLocaleString()}`,
        "Life Extension": `${scenario.lifeExtension} years`,
        "Extended Failure Year": metrics.extendedFailureYear,
        "Extended Remaining Life": `${metrics.extendedRemainingLife} years`,
        "Total Cost": `$${metrics.totalCost.toLocaleString()}`,
        "Cost Per Year": `$${metrics.costPerYear.toLocaleString()}`,
        "Risk Reduction": metrics.riskReduction,
      };
    });

    const csv = [
      Object.keys(data[0]).join(","),
      ...data.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scenario-comparison-${componentCode}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Scenario comparison exported");
  };

  const getStrategyBadgeVariant = (strategy: string) => {
    switch (strategy) {
      case "predictive":
        return "default";
      case "preventive":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>What-If Scenario Analysis</CardTitle>
          <CardDescription>
            Compare different maintenance strategies and their impact on lifecycle and costs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Scenario */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="font-semibold">Add New Scenario</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Scenario Name</Label>
                <Input
                  placeholder="e.g., Early Repair"
                  value={newScenario.name || ""}
                  onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Intervention Year</Label>
                <Input
                  type="number"
                  value={newScenario.interventionYear || ""}
                  onChange={(e) => setNewScenario({ ...newScenario, interventionYear: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Intervention Cost ($)</Label>
                <Input
                  type="number"
                  value={newScenario.interventionCost || ""}
                  onChange={(e) => setNewScenario({ ...newScenario, interventionCost: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Life Extension (years)</Label>
                <Input
                  type="number"
                  value={newScenario.lifeExtension || ""}
                  onChange={(e) => setNewScenario({ ...newScenario, lifeExtension: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Strategy</Label>
                <Select
                  value={newScenario.maintenanceStrategy || "preventive"}
                  onValueChange={(v: any) => setNewScenario({ ...newScenario, maintenanceStrategy: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reactive">Reactive</SelectItem>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="predictive">Predictive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAddScenario} className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Scenario
            </Button>
          </div>

          {/* Scenario Comparison Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Scenario Comparison</h3>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scenario</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Intervention Year</TableHead>
                    <TableHead>Intervention Cost</TableHead>
                    <TableHead>Life Extension</TableHead>
                    <TableHead>Extended Failure Year</TableHead>
                    <TableHead>Extended Remaining Life</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Cost/Year</TableHead>
                    <TableHead>Risk Reduction</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scenarios.map((scenario) => {
                    const metrics = calculateScenarioMetrics(scenario);
                    return (
                      <TableRow key={scenario.id}>
                        <TableCell className="font-medium">{scenario.name}</TableCell>
                        <TableCell>
                          <Badge variant={getStrategyBadgeVariant(scenario.maintenanceStrategy)}>
                            {scenario.maintenanceStrategy}
                          </Badge>
                        </TableCell>
                        <TableCell>{scenario.interventionYear || "N/A"}</TableCell>
                        <TableCell>${scenario.interventionCost.toLocaleString()}</TableCell>
                        <TableCell>{scenario.lifeExtension} years</TableCell>
                        <TableCell>{metrics.extendedFailureYear}</TableCell>
                        <TableCell>{metrics.extendedRemainingLife} years</TableCell>
                        <TableCell className="font-semibold">${metrics.totalCost.toLocaleString()}</TableCell>
                        <TableCell>${metrics.costPerYear.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={metrics.riskReduction === "High" ? "default" : "outline"}>
                            {metrics.riskReduction}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {scenario.id !== "baseline" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveScenario(scenario.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Summary Stats */}
          {scenarios.length > 1 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Best Cost Efficiency</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const best = scenarios
                      .filter((s) => s.id !== "baseline")
                      .map((s) => ({ name: s.name, costPerYear: calculateScenarioMetrics(s).costPerYear }))
                      .sort((a, b) => a.costPerYear - b.costPerYear)[0];
                    return (
                      <div>
                        <div className="text-lg font-bold">{best?.name || "N/A"}</div>
                        <div className="text-sm text-muted-foreground">
                          ${best?.costPerYear.toLocaleString() || "0"}/year
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Maximum Life Extension</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const best = scenarios
                      .filter((s) => s.id !== "baseline")
                      .sort((a, b) => b.lifeExtension - a.lifeExtension)[0];
                    return (
                      <div>
                        <div className="text-lg font-bold">{best?.name || "N/A"}</div>
                        <div className="text-sm text-muted-foreground">
                          +{best?.lifeExtension || 0} years
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Lowest Total Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const best = scenarios
                      .map((s) => ({ name: s.name, totalCost: calculateScenarioMetrics(s).totalCost }))
                      .sort((a, b) => a.totalCost - b.totalCost)[0];
                    return (
                      <div>
                        <div className="text-lg font-bold">{best?.name || "N/A"}</div>
                        <div className="text-sm text-muted-foreground">
                          ${best?.totalCost.toLocaleString() || "0"}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
