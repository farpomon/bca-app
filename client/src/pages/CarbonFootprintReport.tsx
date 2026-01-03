import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, 
  Factory,
  TrendingDown,
  Building2,
  Download,
  Leaf,
  Zap,
  Droplets,
  Flame,
  BarChart3,
  PieChart,
  Target,
  AlertTriangle,
  CheckCircle2,
  ArrowDown,
  ArrowUp
} from "lucide-react";

const PROVINCES = [
  { value: "alberta", label: "Alberta", factor: 0.54 },
  { value: "ontario", label: "Ontario", factor: 0.03 },
  { value: "quebec", label: "Quebec", factor: 0.002 },
  { value: "bc", label: "British Columbia", factor: 0.01 },
];

export default function CarbonFootprintReport() {
  const [selectedProvince, setSelectedProvince] = useState("alberta");

  // Fetch portfolio carbon footprint
  const { data: portfolioData, isLoading } = trpc.esgLeed.getPortfolioCarbonFootprint.useQuery({
    province: selectedProvince,
  });

  // Fetch projects with environmental impact
  const { data: projectsWithImpact } = trpc.prioritization.getProjectsWithEnvironmentalImpact.useQuery();

  // Fetch dashboard summary
  const { data: dashboardSummary } = trpc.esgLeed.getDashboardSummary.useQuery({});

  // Calculate totals from green upgrades
  const totalPlannedReduction = projectsWithImpact?.reduce((sum, p) => sum + p.ghgReduction, 0) || 0;
  const totalEnergySavings = projectsWithImpact?.reduce((sum, p) => sum + p.energySavings, 0) || 0;
  const totalWaterSavings = projectsWithImpact?.reduce((sum, p) => sum + p.waterSavings, 0) || 0;

  const currentProvince = PROVINCES.find(p => p.value === selectedProvince);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Factory className="w-8 h-8 text-slate-600" />
              Carbon Footprint Report
            </h1>
            <p className="text-muted-foreground mt-1">
              Portfolio-wide GHG emissions tracking and reduction planning
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={selectedProvince}
              onValueChange={setSelectedProvince}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                {PROVINCES.map((prov) => (
                  <SelectItem key={prov.value} value={prov.value}>
                    {prov.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Emissions</p>
                  <p className="text-2xl font-bold mt-1">
                    {portfolioData?.totalPortfolioEmissions.toFixed(1) || "—"}
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
                  <p className="text-sm text-muted-foreground">Planned Reduction</p>
                  <p className="text-2xl font-bold mt-1 text-emerald-600">
                    -{totalPlannedReduction.toFixed(1)}
                  </p>
                </div>
                <TrendingDown className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                tonnes CO₂e/year from upgrades
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Energy Savings</p>
                  <p className="text-2xl font-bold mt-1">
                    {(totalEnergySavings / 1000).toFixed(0)}
                  </p>
                </div>
                <Zap className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                MWh/year planned
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Facilities Tracked</p>
                  <p className="text-2xl font-bold mt-1">
                    {portfolioData?.projectCount || 0}
                  </p>
                </div>
                <Building2 className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                with utility data
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Emission Factor Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Grid Emission Factor</CardTitle>
            <CardDescription>
              Based on Environment and Climate Change Canada - National Inventory Report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {currentProvince?.label}
                  </Badge>
                  <span className="text-2xl font-bold">{currentProvince?.factor} kg CO₂e/kWh</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentProvince?.value === 'alberta' && "Alberta's grid has high emissions due to coal and natural gas generation."}
                  {currentProvince?.value === 'ontario' && "Ontario's grid is relatively clean due to nuclear and hydro power."}
                  {currentProvince?.value === 'quebec' && "Quebec has one of the cleanest grids in North America due to hydroelectric power."}
                  {currentProvince?.value === 'bc' && "British Columbia benefits from abundant hydroelectric resources."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {PROVINCES.map((prov) => (
                  <div 
                    key={prov.value} 
                    className={`p-2 rounded border ${prov.value === selectedProvince ? 'border-primary bg-primary/5' : ''}`}
                  >
                    <p className="font-medium">{prov.label}</p>
                    <p className="text-muted-foreground">{prov.factor} kg CO₂e/kWh</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emissions by Facility */}
        {portfolioData && portfolioData.projectEmissions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Emissions by Facility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {portfolioData.projectEmissions
                  .sort((a, b) => b.emissions.total - a.emissions.total)
                  .slice(0, 10)
                  .map((project) => (
                    <div key={project.projectId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{project.projectName}</span>
                        <span className="text-sm font-bold">
                          {project.emissions.total.toFixed(2)} t CO₂e
                        </span>
                      </div>
                      <div className="flex gap-1 h-4">
                        {project.emissions.electricity > 0 && (
                          <div 
                            className="bg-amber-500 rounded-l"
                            style={{ 
                              width: `${(project.emissions.electricity / project.emissions.total) * 100}%`,
                              minWidth: '4px'
                            }}
                            title={`Electricity: ${project.emissions.electricity.toFixed(2)} t`}
                          />
                        )}
                        {project.emissions.gas > 0 && (
                          <div 
                            className="bg-orange-500"
                            style={{ 
                              width: `${(project.emissions.gas / project.emissions.total) * 100}%`,
                              minWidth: '4px'
                            }}
                            title={`Natural Gas: ${project.emissions.gas.toFixed(2)} t`}
                          />
                        )}
                        {project.emissions.water > 0 && (
                          <div 
                            className="bg-blue-500 rounded-r"
                            style={{ 
                              width: `${(project.emissions.water / project.emissions.total) * 100}%`,
                              minWidth: '4px'
                            }}
                            title={`Water: ${project.emissions.water.toFixed(2)} t`}
                          />
                        )}
                      </div>
                    </div>
                  ))}
              </div>
              <div className="flex items-center gap-6 mt-6 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-amber-500 rounded" />
                  <span className="text-sm">Electricity</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded" />
                  <span className="text-sm">Natural Gas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded" />
                  <span className="text-sm">Water</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projects with Environmental Impact */}
        {projectsWithImpact && projectsWithImpact.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Leaf className="w-5 h-5 text-emerald-500" />
                Green Upgrades Impact Summary
              </CardTitle>
              <CardDescription>
                Projects with planned or completed sustainability improvements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Project</th>
                      <th className="text-right py-2 px-3">Energy Savings</th>
                      <th className="text-right py-2 px-3">Water Savings</th>
                      <th className="text-right py-2 px-3">GHG Reduction</th>
                      <th className="text-right py-2 px-3">Total Cost</th>
                      <th className="text-right py-2 px-3">Payback</th>
                      <th className="text-center py-2 px-3">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectsWithImpact
                      .sort((a, b) => b.ghgReduction - a.ghgReduction)
                      .map((project) => (
                        <tr key={project.projectId} className="border-b">
                          <td className="py-2 px-3 font-medium">{project.projectName}</td>
                          <td className="py-2 px-3 text-right">
                            {project.energySavings > 0 
                              ? `${project.energySavings.toLocaleString()} kWh`
                              : '—'}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {project.waterSavings > 0 
                              ? `${project.waterSavings.toLocaleString()} gal`
                              : '—'}
                          </td>
                          <td className="py-2 px-3 text-right text-emerald-600 font-medium">
                            {project.ghgReduction > 0 
                              ? `${project.ghgReduction.toFixed(2)} t`
                              : '—'}
                          </td>
                          <td className="py-2 px-3 text-right">
                            ${project.totalCost.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {project.paybackPeriod 
                              ? `${project.paybackPeriod.toFixed(1)} yrs`
                              : '—'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Badge 
                              variant={project.environmentalScore >= 70 ? 'default' : 
                                       project.environmentalScore >= 40 ? 'secondary' : 'outline'}
                            >
                              {project.environmentalScore}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50 font-medium">
                      <td className="py-2 px-3">Total</td>
                      <td className="py-2 px-3 text-right">
                        {totalEnergySavings.toLocaleString()} kWh
                      </td>
                      <td className="py-2 px-3 text-right">
                        {totalWaterSavings.toLocaleString()} gal
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-600">
                        {totalPlannedReduction.toFixed(2)} t
                      </td>
                      <td className="py-2 px-3 text-right">
                        ${projectsWithImpact.reduce((sum, p) => sum + p.totalCost, 0).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right">—</td>
                      <td className="py-2 px-3 text-center">—</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Net Zero Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5" />
              Net Zero Progress
            </CardTitle>
            <CardDescription>
              Track progress toward Edmonton's climate targets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Current Portfolio Emissions</span>
                  <span className="text-lg font-bold">
                    {portfolioData?.totalPortfolioEmissions.toFixed(1) || 0} t CO₂e
                  </span>
                </div>
                <Progress value={100} className="h-3" />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">After Planned Upgrades</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {((portfolioData?.totalPortfolioEmissions || 0) - totalPlannedReduction).toFixed(1)} t CO₂e
                  </span>
                </div>
                <Progress 
                  value={portfolioData?.totalPortfolioEmissions 
                    ? ((portfolioData.totalPortfolioEmissions - totalPlannedReduction) / portfolioData.totalPortfolioEmissions) * 100
                    : 0
                  } 
                  className="h-3" 
                />
              </div>

              {portfolioData && totalPlannedReduction > 0 && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <ArrowDown className="w-5 h-5" />
                    <span className="font-medium">
                      {((totalPlannedReduction / portfolioData.totalPortfolioEmissions) * 100).toFixed(1)}% reduction planned
                    </span>
                  </div>
                  <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">
                    Green upgrades will reduce emissions by {totalPlannedReduction.toFixed(1)} tonnes CO₂e annually
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        {(!portfolioData || portfolioData.projectEmissions.length === 0) && !isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Factory className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Emissions Data</h3>
              <p className="text-muted-foreground mb-4">
                Start recording utility consumption in the Sustainability Dashboard to track carbon footprint
              </p>
              <Button onClick={() => window.location.href = '/sustainability'}>
                Go to Sustainability Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
