import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, 
  Leaf, 
  Zap, 
  Droplets, 
  Flame,
  Factory,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  BarChart3,
  Building2,
  RefreshCw,
  Plus,
  Calculator,
  FileText,
  ThermometerSun,
  Wind,
  Lightbulb,
  Wrench,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Info
} from "lucide-react";
import { toast } from "sonner";

type BenchmarkLevel = "excellent" | "good" | "fair" | "poor";

const BUILDING_TYPES = [
  { value: "office", label: "Office Building" },
  { value: "retail", label: "Retail" },
  { value: "education", label: "Education" },
  { value: "healthcare", label: "Healthcare" },
  { value: "warehouse", label: "Warehouse" },
  { value: "residential", label: "Residential" },
  { value: "recreation", label: "Recreation" },
  { value: "default", label: "Other" },
];

const PROVINCES = [
  { value: "alberta", label: "Alberta" },
  { value: "ontario", label: "Ontario" },
  { value: "quebec", label: "Quebec" },
  { value: "bc", label: "British Columbia" },
];

const UPGRADE_TYPES = [
  { value: "lighting", label: "LED Lighting Upgrade", savings: "30% energy" },
  { value: "hvac", label: "HVAC System Upgrade", savings: "20% energy" },
  { value: "boiler", label: "Boiler Replacement", savings: "15% energy" },
  { value: "windows", label: "Window Upgrades", savings: "10% energy" },
  { value: "insulation", label: "Insulation Improvements", savings: "15% energy" },
  { value: "solar", label: "Solar Panel Installation", savings: "25% energy" },
  { value: "water_fixtures", label: "Low-Flow Water Fixtures", savings: "30% water" },
  { value: "building_automation", label: "Building Automation System", savings: "15% energy, 10% water" },
  { value: "roof", label: "Cool Roof Installation", savings: "8% energy" },
];

function getBenchmarkColor(level: BenchmarkLevel): string {
  switch (level) {
    case "excellent": return "text-emerald-600 bg-emerald-50";
    case "good": return "text-blue-600 bg-blue-50";
    case "fair": return "text-amber-600 bg-amber-50";
    case "poor": return "text-red-600 bg-red-50";
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-blue-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
}

export default function SustainabilityDashboard() {
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showUtilityDialog, setShowUtilityDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);

  // Form states
  const [utilityForm, setUtilityForm] = useState({
    utilityType: "electricity" as const,
    consumption: "",
    unit: "kWh",
    cost: "",
    isRenewable: false,
    notes: "",
  });

  const [upgradeForm, setUpgradeForm] = useState({
    upgradeName: "",
    upgradeType: "lighting" as const,
    cost: "",
    estimatedEnergySavings: "",
    estimatedWaterSavings: "",
    estimatedAnnualSavings: "",
    notes: "",
  });

  const [scoreParams, setScoreParams] = useState({
    buildingType: "default",
    grossFloorArea: "",
    province: "alberta",
    renewablePercentage: "0",
  });

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery();

  // Fetch LEED score
  const { data: leedScore, isLoading: scoreLoading, refetch: refetchScore } = trpc.esgLeed.calculateLEEDScore.useQuery(
    { 
      projectId: selectedProject!, 
      buildingType: scoreParams.buildingType,
      grossFloorArea: parseFloat(scoreParams.grossFloorArea) || 1000,
      province: scoreParams.province,
      renewablePercentage: parseFloat(scoreParams.renewablePercentage) || 0,
    },
    { enabled: !!selectedProject && !!scoreParams.grossFloorArea }
  );

  // Fetch utility history
  const { data: utilityHistory, refetch: refetchUtility } = trpc.esgLeed.getUtilityHistory.useQuery(
    { projectId: selectedProject! },
    { enabled: !!selectedProject }
  );

  // Fetch green upgrades
  const { data: greenUpgrades, refetch: refetchUpgrades } = trpc.esgLeed.getGreenUpgrades.useQuery(
    { projectId: selectedProject! },
    { enabled: !!selectedProject }
  );

  // Fetch sustainability goals
  const { data: sustainabilityGoals, refetch: refetchGoals } = trpc.esgLeed.getSustainabilityGoals.useQuery(
    { projectId: selectedProject },
    { enabled: !!selectedProject }
  );

  // Fetch GHG emissions
  const { data: ghgEmissions } = trpc.esgLeed.calculateGHGEmissions.useQuery(
    { projectId: selectedProject!, province: scoreParams.province },
    { enabled: !!selectedProject }
  );

  // Fetch dashboard summary
  const { data: dashboardSummary } = trpc.esgLeed.getDashboardSummary.useQuery(
    { projectId: selectedProject || undefined },
    { enabled: true }
  );

  // Fetch benchmarks
  const { data: benchmarks } = trpc.esgLeed.getBenchmarks.useQuery(
    { buildingType: scoreParams.buildingType }
  );

  // Mutations
  const recordUtility = trpc.esgLeed.recordUtilityData.useMutation({
    onSuccess: () => {
      toast.success("Utility data recorded successfully");
      setShowUtilityDialog(false);
      refetchUtility();
      refetchScore();
      setUtilityForm({
        utilityType: "electricity",
        consumption: "",
        unit: "kWh",
        cost: "",
        isRenewable: false,
        notes: "",
      });
    },
    onError: (error) => {
      toast.error(`Failed to record utility data: ${error.message}`);
    },
  });

  const recordUpgrade = trpc.esgLeed.recordGreenUpgrade.useMutation({
    onSuccess: (data) => {
      toast.success(`Green upgrade recorded. Environmental Impact Score: ${data.environmentalImpactScore}`);
      setShowUpgradeDialog(false);
      refetchUpgrades();
      setUpgradeForm({
        upgradeName: "",
        upgradeType: "lighting",
        cost: "",
        estimatedEnergySavings: "",
        estimatedWaterSavings: "",
        estimatedAnnualSavings: "",
        notes: "",
      });
    },
    onError: (error) => {
      toast.error(`Failed to record upgrade: ${error.message}`);
    },
  });

  const handleRecordUtility = () => {
    if (!selectedProject) return;
    recordUtility.mutate({
      projectId: selectedProject,
      recordDate: new Date(),
      utilityType: utilityForm.utilityType,
      consumption: parseFloat(utilityForm.consumption) || 0,
      unit: utilityForm.unit,
      cost: utilityForm.cost ? parseFloat(utilityForm.cost) : undefined,
      isRenewable: utilityForm.isRenewable,
      notes: utilityForm.notes || undefined,
    });
  };

  const handleRecordUpgrade = () => {
    if (!selectedProject) return;
    recordUpgrade.mutate({
      projectId: selectedProject,
      upgradeName: upgradeForm.upgradeName,
      upgradeType: upgradeForm.upgradeType as any,
      cost: parseFloat(upgradeForm.cost) || 0,
      estimatedEnergySavings: upgradeForm.estimatedEnergySavings ? parseFloat(upgradeForm.estimatedEnergySavings) : undefined,
      estimatedWaterSavings: upgradeForm.estimatedWaterSavings ? parseFloat(upgradeForm.estimatedWaterSavings) : undefined,
      estimatedAnnualSavings: upgradeForm.estimatedAnnualSavings ? parseFloat(upgradeForm.estimatedAnnualSavings) : undefined,
      notes: upgradeForm.notes || undefined,
      province: scoreParams.province,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Leaf className="w-8 h-8 text-emerald-500" />
              Sustainability Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              LEED-based sustainability tracking and carbon footprint reporting
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={selectedProject?.toString() || ""}
              onValueChange={(value) => setSelectedProject(value ? parseInt(value) : null)}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select a facility" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">LEED Score</p>
                  <p className={`text-2xl font-bold mt-1 ${leedScore ? getScoreColor(leedScore.compositeScore) : ''}`}>
                    {leedScore?.compositeScore.toFixed(1) || "—"}
                  </p>
                </div>
                <Award className="w-8 h-8 text-emerald-500" />
              </div>
              {leedScore && (
                <p className="text-xs text-muted-foreground mt-2">
                  Est. {leedScore.leedPoints} LEED points
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">GHG Emissions</p>
                  <p className="text-2xl font-bold mt-1">
                    {ghgEmissions?.totalEmissions.toFixed(1) || "—"}
                  </p>
                </div>
                <Factory className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                tonnes CO₂e/year
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Energy Intensity</p>
                  <p className="text-2xl font-bold mt-1">
                    {leedScore?.energyIntensity.toFixed(0) || "—"}
                  </p>
                </div>
                <Zap className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                kWh/m²/year
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Water Intensity</p>
                  <p className="text-2xl font-bold mt-1">
                    {leedScore?.waterIntensity.toFixed(0) || "—"}
                  </p>
                </div>
                <Droplets className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                L/m²/year
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Facility Configuration */}
        {selectedProject && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Facility Configuration
              </CardTitle>
              <CardDescription>
                Configure facility parameters for accurate LEED scoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Building Type</Label>
                  <Select
                    value={scoreParams.buildingType}
                    onValueChange={(value) => setScoreParams(prev => ({ ...prev, buildingType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUILDING_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Gross Floor Area (m²)</Label>
                  <Input
                    type="number"
                    value={scoreParams.grossFloorArea}
                    onChange={(e) => setScoreParams(prev => ({ ...prev, grossFloorArea: e.target.value }))}
                    placeholder="Enter floor area"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Province</Label>
                  <Select
                    value={scoreParams.province}
                    onValueChange={(value) => setScoreParams(prev => ({ ...prev, province: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVINCES.map((prov) => (
                        <SelectItem key={prov.value} value={prov.value}>
                          {prov.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Renewable Energy (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={scoreParams.renewablePercentage}
                    onChange={(e) => setScoreParams(prev => ({ ...prev, renewablePercentage: e.target.value }))}
                    placeholder="0-100"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="utilities">Utility Tracking</TabsTrigger>
            <TabsTrigger value="upgrades">Green Upgrades</TabsTrigger>
            <TabsTrigger value="emissions">Carbon Footprint</TabsTrigger>
            <TabsTrigger value="goals">Sustainability Goals</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {leedScore ? (
              <>
                {/* Score Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        Energy Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-3xl font-bold ${getScoreColor(leedScore.energyScore)}`}>
                          {leedScore.energyScore.toFixed(0)}
                        </span>
                        <Badge className={getBenchmarkColor(leedScore.benchmarkComparison.energy)}>
                          {leedScore.benchmarkComparison.energy.toUpperCase()}
                        </Badge>
                      </div>
                      <Progress value={leedScore.energyScore} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-2">
                        EUI: {leedScore.energyIntensity.toFixed(1)} kWh/m²/year
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-blue-500" />
                        Water Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-3xl font-bold ${getScoreColor(leedScore.waterScore)}`}>
                          {leedScore.waterScore.toFixed(0)}
                        </span>
                        <Badge className={getBenchmarkColor(leedScore.benchmarkComparison.water)}>
                          {leedScore.benchmarkComparison.water.toUpperCase()}
                        </Badge>
                      </div>
                      <Progress value={leedScore.waterScore} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-2">
                        WUI: {leedScore.waterIntensity.toFixed(1)} L/m²/year
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Factory className="w-4 h-4 text-slate-500" />
                        GHG Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-3xl font-bold ${getScoreColor(leedScore.ghgScore)}`}>
                          {leedScore.ghgScore.toFixed(0)}
                        </span>
                        <Badge className={getBenchmarkColor(leedScore.benchmarkComparison.ghg)}>
                          {leedScore.benchmarkComparison.ghg.toUpperCase()}
                        </Badge>
                      </div>
                      <Progress value={leedScore.ghgScore} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-2">
                        GHG: {leedScore.ghgIntensity.toFixed(1)} kg CO₂e/m²/year
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recommendations */}
                {leedScore.recommendations && leedScore.recommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-amber-500" />
                        Sustainability Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {leedScore.recommendations.map((rec, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                            {rec.priority === 'high' && <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />}
                            {rec.priority === 'medium' && <Info className="w-5 h-5 text-amber-500 mt-0.5" />}
                            {rec.priority === 'low' && <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{rec.category}</Badge>
                                <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                                  {rec.priority.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-sm">{rec.recommendation}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Potential savings: {rec.potentialSavings}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : selectedProject ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calculator className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Configure Facility Parameters</h3>
                  <p className="text-muted-foreground mb-4">
                    Enter the gross floor area above to calculate LEED sustainability scores
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a Facility</h3>
                  <p className="text-muted-foreground">
                    Choose a facility from the dropdown above to view sustainability metrics
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Utility Tracking Tab */}
          <TabsContent value="utilities" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Utility Consumption Tracking</h2>
              <Dialog open={showUtilityDialog} onOpenChange={setShowUtilityDialog}>
                <DialogTrigger asChild>
                  <Button disabled={!selectedProject}>
                    <Plus className="w-4 h-4 mr-2" />
                    Record Utility Data
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Utility Consumption</DialogTitle>
                    <DialogDescription>
                      Enter utility consumption data for GHG tracking
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Utility Type</Label>
                      <Select
                        value={utilityForm.utilityType}
                        onValueChange={(value: any) => {
                          setUtilityForm(prev => ({ 
                            ...prev, 
                            utilityType: value,
                            unit: value === 'electricity' ? 'kWh' : 
                                  value === 'natural_gas' ? 'm³' :
                                  value === 'water' ? 'm³' : 'L'
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="electricity">Electricity</SelectItem>
                          <SelectItem value="natural_gas">Natural Gas</SelectItem>
                          <SelectItem value="water">Water</SelectItem>
                          <SelectItem value="diesel">Diesel</SelectItem>
                          <SelectItem value="propane">Propane</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Consumption</Label>
                        <Input
                          type="number"
                          value={utilityForm.consumption}
                          onChange={(e) => setUtilityForm(prev => ({ ...prev, consumption: e.target.value }))}
                          placeholder="Enter amount"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Select
                          value={utilityForm.unit}
                          onValueChange={(value) => setUtilityForm(prev => ({ ...prev, unit: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {utilityForm.utilityType === 'electricity' && (
                              <SelectItem value="kWh">kWh</SelectItem>
                            )}
                            {utilityForm.utilityType === 'natural_gas' && (
                              <>
                                <SelectItem value="m³">m³</SelectItem>
                                <SelectItem value="GJ">GJ</SelectItem>
                              </>
                            )}
                            {utilityForm.utilityType === 'water' && (
                              <>
                                <SelectItem value="m³">m³</SelectItem>
                                <SelectItem value="L">Litres</SelectItem>
                              </>
                            )}
                            {(utilityForm.utilityType === 'diesel' || utilityForm.utilityType === 'propane') && (
                              <SelectItem value="L">Litres</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Cost ($) - Optional</Label>
                      <Input
                        type="number"
                        value={utilityForm.cost}
                        onChange={(e) => setUtilityForm(prev => ({ ...prev, cost: e.target.value }))}
                        placeholder="Enter cost"
                      />
                    </div>
                    {utilityForm.utilityType === 'electricity' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isRenewable"
                          checked={utilityForm.isRenewable}
                          onChange={(e) => setUtilityForm(prev => ({ ...prev, isRenewable: e.target.checked }))}
                          className="rounded"
                        />
                        <Label htmlFor="isRenewable">Renewable energy source</Label>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Notes - Optional</Label>
                      <Textarea
                        value={utilityForm.notes}
                        onChange={(e) => setUtilityForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Add any notes..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowUtilityDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleRecordUtility} disabled={recordUtility.isPending}>
                      {recordUtility.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Utility History Table */}
            {utilityHistory && utilityHistory.length > 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3">Date</th>
                          <th className="text-left py-2 px-3">Type</th>
                          <th className="text-right py-2 px-3">Consumption</th>
                          <th className="text-right py-2 px-3">Cost</th>
                          <th className="text-left py-2 px-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {utilityHistory.map((record: any) => (
                          <tr key={record.id} className="border-b">
                            <td className="py-2 px-3">
                              {new Date(record.recordDate).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-3">
                              <Badge variant="outline" className="capitalize">
                                {record.utilityType.replace('_', ' ')}
                              </Badge>
                              {record.isRenewable === 1 && (
                                <Badge variant="secondary" className="ml-1">Renewable</Badge>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {parseFloat(record.consumption).toLocaleString()} {record.unit}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {record.cost ? `$${parseFloat(record.cost).toLocaleString()}` : '—'}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">
                              {record.notes || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Utility Data</h3>
                  <p className="text-muted-foreground">
                    Start recording utility consumption to track energy and water usage
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Green Upgrades Tab */}
          <TabsContent value="upgrades" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Green Upgrades & Projects</h2>
              <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
                <DialogTrigger asChild>
                  <Button disabled={!selectedProject}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Green Upgrade
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Record Green Upgrade</DialogTitle>
                    <DialogDescription>
                      Track energy efficiency projects and their environmental impact
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Project Name</Label>
                      <Input
                        value={upgradeForm.upgradeName}
                        onChange={(e) => setUpgradeForm(prev => ({ ...prev, upgradeName: e.target.value }))}
                        placeholder="e.g., LED Lighting Retrofit - Building A"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Upgrade Type</Label>
                      <Select
                        value={upgradeForm.upgradeType}
                        onValueChange={(value: any) => setUpgradeForm(prev => ({ ...prev, upgradeType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UPGRADE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex justify-between items-center w-full">
                                <span>{type.label}</span>
                                <span className="text-xs text-muted-foreground ml-2">({type.savings})</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Project Cost ($)</Label>
                        <Input
                          type="number"
                          value={upgradeForm.cost}
                          onChange={(e) => setUpgradeForm(prev => ({ ...prev, cost: e.target.value }))}
                          placeholder="Total cost"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Est. Annual Savings ($)</Label>
                        <Input
                          type="number"
                          value={upgradeForm.estimatedAnnualSavings}
                          onChange={(e) => setUpgradeForm(prev => ({ ...prev, estimatedAnnualSavings: e.target.value }))}
                          placeholder="$/year"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Energy Savings (kWh/year)</Label>
                        <Input
                          type="number"
                          value={upgradeForm.estimatedEnergySavings}
                          onChange={(e) => setUpgradeForm(prev => ({ ...prev, estimatedEnergySavings: e.target.value }))}
                          placeholder="kWh/year"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Water Savings (L/year)</Label>
                        <Input
                          type="number"
                          value={upgradeForm.estimatedWaterSavings}
                          onChange={(e) => setUpgradeForm(prev => ({ ...prev, estimatedWaterSavings: e.target.value }))}
                          placeholder="L/year"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes - Optional</Label>
                      <Textarea
                        value={upgradeForm.notes}
                        onChange={(e) => setUpgradeForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Additional details..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleRecordUpgrade} disabled={recordUpgrade.isPending}>
                      {recordUpgrade.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Upgrades List */}
            {greenUpgrades && greenUpgrades.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {greenUpgrades.map((upgrade: any) => (
                  <Card key={upgrade.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{upgrade.upgradeName}</CardTitle>
                        <Badge variant={
                          upgrade.status === 'completed' ? 'default' :
                          upgrade.status === 'in_progress' ? 'secondary' :
                          upgrade.status === 'planned' ? 'outline' : 'destructive'
                        }>
                          {upgrade.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <CardDescription className="capitalize">
                        {upgrade.upgradeType.replace('_', ' ')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Cost</p>
                          <p className="font-medium">${parseFloat(upgrade.cost).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Annual Savings</p>
                          <p className="font-medium">
                            {upgrade.estimatedAnnualSavings 
                              ? `$${parseFloat(upgrade.estimatedAnnualSavings).toLocaleString()}`
                              : '—'}
                          </p>
                        </div>
                        {upgrade.co2ReductionMt && (
                          <div>
                            <p className="text-muted-foreground">CO₂ Reduction</p>
                            <p className="font-medium text-emerald-600">
                              {parseFloat(upgrade.co2ReductionMt).toFixed(2)} tonnes/year
                            </p>
                          </div>
                        )}
                        {upgrade.paybackPeriod && (
                          <div>
                            <p className="text-muted-foreground">Payback Period</p>
                            <p className="font-medium">
                              {parseFloat(upgrade.paybackPeriod).toFixed(1)} years
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Wrench className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Green Upgrades</h3>
                  <p className="text-muted-foreground">
                    Track energy efficiency projects to monitor environmental impact
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Carbon Footprint Tab */}
          <TabsContent value="emissions" className="space-y-6 mt-6">
            <h2 className="text-xl font-semibold">Carbon Footprint Analysis</h2>

            {ghgEmissions ? (
              <>
                {/* Total Emissions Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Factory className="w-5 h-5" />
                      Total GHG Emissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-8">
                      <div>
                        <p className="text-4xl font-bold">{ghgEmissions.totalEmissions}</p>
                        <p className="text-muted-foreground">tonnes CO₂e/year</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-2">
                          Province: {ghgEmissions.province.charAt(0).toUpperCase() + ghgEmissions.province.slice(1)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Grid Emission Factor: {ghgEmissions.emissionFactor} kg CO₂e/kWh
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Emissions by Source */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Emissions by Source</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(ghgEmissions.emissionsBySource).map(([source, value]) => (
                        <div key={source} className="flex items-center gap-4">
                          <div className="w-32 capitalize">{source.replace('_', ' ')}</div>
                          <div className="flex-1">
                            <Progress 
                              value={(value as number / ghgEmissions.totalEmissions) * 100} 
                              className="h-4"
                            />
                          </div>
                          <div className="w-24 text-right font-medium">
                            {(value as number).toFixed(2)} t
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Emission Factors Reference */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Canadian Emission Factors</CardTitle>
                    <CardDescription>
                      Based on Environment and Climate Change Canada - National Inventory Report
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="p-3 border rounded-lg">
                        <p className="text-muted-foreground">Alberta Grid</p>
                        <p className="font-medium">0.54 kg CO₂e/kWh</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-muted-foreground">Ontario Grid</p>
                        <p className="font-medium">0.03 kg CO₂e/kWh</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-muted-foreground">Natural Gas</p>
                        <p className="font-medium">1.89 kg CO₂e/m³</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-muted-foreground">Water</p>
                        <p className="font-medium">0.34 kg CO₂e/m³</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Factory className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Emissions Data</h3>
                  <p className="text-muted-foreground">
                    Record utility consumption to calculate carbon footprint
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Sustainability Goals Tab */}
          <TabsContent value="goals" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Sustainability Goals & Targets</h2>
              <Button disabled={!selectedProject} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Goal
              </Button>
            </div>

            {sustainabilityGoals && sustainabilityGoals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sustainabilityGoals.map((goal: any) => (
                  <Card key={goal.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base capitalize">
                          {goal.goalType.replace('_', ' ')}
                        </CardTitle>
                        <Badge variant={
                          goal.status === 'achieved' ? 'default' :
                          goal.status === 'active' ? 'secondary' :
                          goal.status === 'missed' ? 'destructive' : 'outline'
                        }>
                          {goal.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Baseline ({goal.baselineYear})</span>
                          <span className="font-medium">{parseFloat(goal.baselineValue).toLocaleString()} {goal.unit}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Target ({goal.targetYear})</span>
                          <span className="font-medium text-emerald-600">{parseFloat(goal.targetValue).toLocaleString()} {goal.unit}</span>
                        </div>
                        <Progress value={goal.expectedProgress || 0} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{goal.reductionPercentage?.toFixed(1)}% reduction target</span>
                          <span>{goal.yearsRemaining} years remaining</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Sustainability Goals</h3>
                  <p className="text-muted-foreground">
                    Set targets for energy, water, and emissions reduction
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
