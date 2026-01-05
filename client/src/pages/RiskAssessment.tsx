import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Plus, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type RiskLevel = "low" | "medium" | "high" | "critical";

const riskColors: Record<RiskLevel, string> = {
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

const riskTextColors: Record<RiskLevel, string> = {
  low: "text-green-600",
  medium: "text-yellow-600",
  high: "text-orange-600",
  critical: "text-red-600",
};

export default function RiskAssessment() {
  const { user, loading: authLoading } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    buildingId: "",
    riskCategory: "",
    likelihood: "",
    impact: "",
    description: "",
    mitigationPlan: "",
  });

  const { data: buildings } = trpc.buildings.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: risks, refetch: refetchRisks } = trpc.risks.list.useQuery(
    formData.buildingId ? { buildingId: parseInt(formData.buildingId) } : undefined,
    {
      enabled: !!user && !!formData.buildingId,
    }
  );

  const createRisk = trpc.risks.create.useMutation({
    onSuccess: () => {
      toast.success("Risk assessment created successfully");
      refetchRisks();
      setIsDialogOpen(false);
      setFormData({
        buildingId: formData.buildingId,
        riskCategory: "",
        likelihood: "",
        impact: "",
        description: "",
        mitigationPlan: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create risk assessment");
    },
  });

  const calculateRiskLevel = (likelihood: number, impact: number): RiskLevel => {
    const score = likelihood * impact;
    if (score >= 16) return "critical";
    if (score >= 9) return "high";
    if (score >= 4) return "medium";
    return "low";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.buildingId || !formData.riskCategory || !formData.likelihood || !formData.impact) {
      toast.error("Please fill in all required fields");
      return;
    }

    const likelihood = parseInt(formData.likelihood);
    const impact = parseInt(formData.impact);
    const riskLevel = calculateRiskLevel(likelihood, impact);

    createRisk.mutate({
      buildingId: parseInt(formData.buildingId),
      riskCategory: formData.riskCategory,
      likelihood,
      impact,
      riskLevel,
      description: formData.description,
      mitigationPlan: formData.mitigationPlan,
    });
  };

  const riskStats = risks?.reduce(
    (acc, risk) => {
      acc[risk.riskLevel]++;
      return acc;
    },
    { low: 0, medium: 0, high: 0, critical: 0 } as Record<RiskLevel, number>
  );

  if (authLoading) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Risk Assessment</h1>
            <p className="text-muted-foreground mt-1">Identify and manage building risks</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Risk Assessment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Risk Assessment</DialogTitle>
                <DialogDescription>Assess potential risks for a building</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="building">Building *</Label>
                  <Select value={formData.buildingId} onValueChange={(value) => setFormData({ ...formData, buildingId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select building" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings?.map((building) => (
                        <SelectItem key={building.id} value={building.id.toString()}>
                          {building.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Risk Category *</Label>
                  <Select value={formData.riskCategory} onValueChange={(value) => setFormData({ ...formData, riskCategory: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="structural">Structural</SelectItem>
                      <SelectItem value="fire_safety">Fire Safety</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="hvac">HVAC</SelectItem>
                      <SelectItem value="accessibility">Accessibility</SelectItem>
                      <SelectItem value="environmental">Environmental</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="likelihood">Likelihood (1-5) *</Label>
                    <Select value={formData.likelihood} onValueChange={(value) => setFormData({ ...formData, likelihood: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Rare</SelectItem>
                        <SelectItem value="2">2 - Unlikely</SelectItem>
                        <SelectItem value="3">3 - Possible</SelectItem>
                        <SelectItem value="4">4 - Likely</SelectItem>
                        <SelectItem value="5">5 - Almost Certain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="impact">Impact (1-5) *</Label>
                    <Select value={formData.impact} onValueChange={(value) => setFormData({ ...formData, impact: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Insignificant</SelectItem>
                        <SelectItem value="2">2 - Minor</SelectItem>
                        <SelectItem value="3">3 - Moderate</SelectItem>
                        <SelectItem value="4">4 - Major</SelectItem>
                        <SelectItem value="5">5 - Severe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Risk Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the risk in detail..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mitigation">Mitigation Plan</Label>
                  <Textarea
                    id="mitigation"
                    value={formData.mitigationPlan}
                    onChange={(e) => setFormData({ ...formData, mitigationPlan: e.target.value })}
                    placeholder="Describe how to mitigate this risk..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createRisk.isPending}>
                    {createRisk.isPending ? "Creating..." : "Create Assessment"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Building Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Building</CardTitle>
            <CardDescription>Choose a building to view its risk assessments</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={formData.buildingId} onValueChange={(value) => setFormData({ ...formData, buildingId: value })}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Select a building" />
              </SelectTrigger>
              <SelectContent>
                {buildings?.map((building) => (
                  <SelectItem key={building.id} value={building.id.toString()}>
                    {building.name} - {building.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {formData.buildingId && (
          <>
            {/* Risk Statistics */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Critical Risks</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{riskStats?.critical || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">High Risks</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{riskStats?.high || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Medium Risks</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{riskStats?.medium || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Risks</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{riskStats?.low || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Matrix</CardTitle>
                <CardDescription>Visual representation of risk likelihood vs impact</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full">
                    <div className="grid grid-cols-6 gap-1 text-sm">
                      {/* Header */}
                      <div className="font-semibold p-2"></div>
                      <div className="font-semibold p-2 text-center">1 - Rare</div>
                      <div className="font-semibold p-2 text-center">2 - Unlikely</div>
                      <div className="font-semibold p-2 text-center">3 - Possible</div>
                      <div className="font-semibold p-2 text-center">4 - Likely</div>
                      <div className="font-semibold p-2 text-center">5 - Certain</div>

                      {/* Rows */}
                      {[5, 4, 3, 2, 1].map((impact) => (
                        <>
                          <div key={`label-${impact}`} className="font-semibold p-2 flex items-center">
                            {impact} - {impact === 5 ? "Severe" : impact === 4 ? "Major" : impact === 3 ? "Moderate" : impact === 2 ? "Minor" : "Insignificant"}
                          </div>
                          {[1, 2, 3, 4, 5].map((likelihood) => {
                            const level = calculateRiskLevel(likelihood, impact);
                            const count = risks?.filter((r) => r.likelihood === likelihood && r.impact === impact).length || 0;
                            return (
                              <div
                                key={`${likelihood}-${impact}`}
                                className={`${riskColors[level]} p-4 rounded flex items-center justify-center text-white font-semibold min-h-[60px]`}
                              >
                                {count > 0 ? count : ""}
                              </div>
                            );
                          })}
                        </>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded ${riskColors.low}`}></div>
                    <span>Low</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded ${riskColors.medium}`}></div>
                    <span>Medium</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded ${riskColors.high}`}></div>
                    <span>High</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded ${riskColors.critical}`}></div>
                    <span>Critical</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk List */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Assessments</CardTitle>
                <CardDescription>Detailed list of identified risks</CardDescription>
              </CardHeader>
              <CardContent>
                {!risks || risks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No risk assessments found for this building</p>
                    <p className="text-sm mt-2">Click "New Risk Assessment" to create one</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {risks.map((risk) => (
                      <div key={risk.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold capitalize">{risk.riskCategory.replace(/_/g, " ")}</h3>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${riskTextColors[risk.riskLevel]} bg-opacity-10`}>
                                {risk.riskLevel.toUpperCase()}
                              </span>
                            </div>
                            {risk.description && <p className="text-sm text-muted-foreground mt-1">{risk.description}</p>}
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <div>L: {risk.likelihood} × I: {risk.impact}</div>
                            <div className="text-xs">{new Date(risk.assessmentDate).toLocaleDateString()}</div>
                          </div>
                        </div>
                        {risk.mitigationPlan && (
                          <div className="bg-muted p-3 rounded text-sm">
                            <p className="font-medium mb-1">Mitigation Plan:</p>
                            <p className="text-muted-foreground">{risk.mitigationPlan}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
