import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, 
  Sparkles, 
  Lightbulb,
  TrendingDown,
  Clock,
  DollarSign,
  Zap,
  Flame,
  Droplets,
  Sun,
  Wind,
  Building2,
  Factory,
  Leaf,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Download,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

// Canadian provinces
const CANADIAN_PROVINCES = [
  { code: "AB", name: "Alberta", factor: 540 },
  { code: "BC", name: "British Columbia", factor: 10 },
  { code: "MB", name: "Manitoba", factor: 2 },
  { code: "NB", name: "New Brunswick", factor: 290 },
  { code: "NL", name: "Newfoundland", factor: 20 },
  { code: "NS", name: "Nova Scotia", factor: 690 },
  { code: "ON", name: "Ontario", factor: 30 },
  { code: "PE", name: "Prince Edward Island", factor: 300 },
  { code: "QC", name: "Quebec", factor: 2 },
  { code: "SK", name: "Saskatchewan", factor: 650 },
];

const RECOMMENDATION_ICONS: Record<string, React.ReactNode> = {
  "LED Lighting Retrofit": <Lightbulb className="w-5 h-5" />,
  "Building Automation System": <Building2 className="w-5 h-5" />,
  "Rooftop Solar PV Installation": <Sun className="w-5 h-5" />,
  "High-Efficiency Condensing Boiler": <Flame className="w-5 h-5" />,
  "Electric Heat Pump Conversion": <Wind className="w-5 h-5" />,
  "Low-Flow Water Fixtures": <Droplets className="w-5 h-5" />,
  "Building Envelope Improvements": <Building2 className="w-5 h-5" />,
  "Low-Carbon Material Specifications": <Factory className="w-5 h-5" />,
};

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "high": return "bg-red-100 text-red-700 border-red-200";
    case "medium": return "bg-amber-100 text-amber-700 border-amber-200";
    case "low": return "bg-blue-100 text-blue-700 border-blue-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function getCategoryColor(category: string): string {
  switch (category) {
    case "operational": return "bg-emerald-50 border-emerald-200";
    case "embodied": return "bg-purple-50 border-purple-200";
    case "renewable": return "bg-amber-50 border-amber-200";
    default: return "bg-gray-50 border-gray-200";
  }
}

function getCategoryIcon(category: string): React.ReactNode {
  switch (category) {
    case "operational": return <Zap className="w-4 h-4 text-emerald-600" />;
    case "embodied": return <Factory className="w-4 h-4 text-purple-600" />;
    case "renewable": return <Sun className="w-4 h-4 text-amber-600" />;
    default: return <Leaf className="w-4 h-4 text-gray-600" />;
  }
}

export default function AICarbonRecommendations() {
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedProvince, setSelectedProvince] = useState("AB");
  const [expandedRec, setExpandedRec] = useState<number | null>(null);

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery();

  // Fetch AI recommendations
  const { 
    data: recommendations, 
    isLoading: recommendationsLoading,
    refetch: refetchRecommendations
  } = trpc.esgLeed.getAICarbonRecommendations.useQuery(
    { projectId: selectedProject!, province: selectedProvince },
    { enabled: !!selectedProject }
  ) as any;

  // Fetch utility data for context
  const { data: utilityHistory } = trpc.esgLeed.getUtilityHistory.useQuery(
    { projectId: selectedProject! },
    { enabled: !!selectedProject }
  ) as any;

  // Calculate summary stats
  const summaryStats = recommendations ? {
    totalRecommendations: recommendations.length,
    highPriority: recommendations.filter((r: any) => r.priority === "high").length,
    totalSavings: recommendations.reduce((sum: number, r: any) => sum + (r.estimatedSavings || 0), 0),
    totalCost: recommendations.reduce((sum: number, r: any) => sum + (r.estimatedCost || 0), 0),
  } : null;

  const selectedProvinceInfo = CANADIAN_PROVINCES.find(p => p.code === selectedProvince);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-amber-500" />
              AI Carbon Recommendations
            </h1>
            <p className="text-muted-foreground mt-1">
              Personalized suggestions for reducing operational and embodied carbon
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={selectedProject?.toString() || ""}
              onValueChange={(value) => setSelectedProject(value ? parseInt(value) : null)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedProvince}
              onValueChange={setSelectedProvince}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                {CANADIAN_PROVINCES.map((prov) => (
                  <SelectItem key={prov.code} value={prov.code}>
                    {prov.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProject && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetchRecommendations()}
                disabled={recommendationsLoading}
              >
                <RefreshCw className={`w-4 h-4 ${recommendationsLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>

        {!selectedProject ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Sparkles className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a Project</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Choose a project to receive AI-powered carbon reduction recommendations 
                based on utility data, regional factors, and industry best practices.
              </p>
            </CardContent>
          </Card>
        ) : recommendationsLoading ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Analyzing project data and generating recommendations...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Recommendations</p>
                      <p className="text-2xl font-bold mt-1">{summaryStats?.totalRecommendations || 0}</p>
                    </div>
                    <Lightbulb className="w-8 h-8 text-amber-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {summaryStats?.highPriority || 0} high priority
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Potential Savings</p>
                      <p className="text-2xl font-bold mt-1 text-emerald-600">
                        {summaryStats?.totalSavings?.toFixed(1) || 0}
                      </p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-emerald-500" />
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
                      <p className="text-sm text-muted-foreground">Est. Investment</p>
                      <p className="text-2xl font-bold mt-1">
                        ${((summaryStats?.totalCost || 0) / 1000).toFixed(0)}K
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-blue-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    combined implementation
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Grid Factor</p>
                      <p className="text-2xl font-bold mt-1">
                        {selectedProvinceInfo?.factor || "—"}
                      </p>
                    </div>
                    <Zap className="w-8 h-8 text-amber-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    g CO₂e/kWh ({selectedProvinceInfo?.name})
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Regional Context */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Regional Context: {selectedProvinceInfo?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">
                      Recommendations are tailored based on {selectedProvinceInfo?.name}'s electricity grid 
                      carbon intensity of <strong>{selectedProvinceInfo?.factor} g CO₂e/kWh</strong>.
                    </p>
                    {selectedProvinceInfo && selectedProvinceInfo.factor > 200 ? (
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm">
                          High-carbon grid - electrification may not reduce emissions significantly. 
                          Focus on efficiency and on-site renewables.
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm">
                          Low-carbon grid - electrification (heat pumps) is highly effective for reducing emissions.
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="w-48">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{selectedProvinceInfo?.factor}</div>
                      <div className="text-sm text-muted-foreground">g CO₂e/kWh</div>
                    </div>
                    <Progress 
                      value={Math.min((selectedProvinceInfo?.factor || 0) / 700 * 100, 100)} 
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Clean</span>
                      <span>High Carbon</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Recommendations</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="bg-red-50 text-red-700">High</Badge>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700">Medium</Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">Low</Badge>
                </div>
              </div>

              {recommendations && recommendations.length > 0 ? (
                <div className="grid gap-4">
                  {(recommendations as any[]).map((rec, idx) => (
                    <Card 
                      key={idx} 
                      className={`transition-all cursor-pointer hover:shadow-md ${getCategoryColor(rec.category)}`}
                      onClick={() => setExpandedRec(expandedRec === idx ? null : idx)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${getPriorityColor(rec.priority)}`}>
                            {RECOMMENDATION_ICONS[rec.title] || <Lightbulb className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-lg">{rec.title}</h3>
                              <div className="flex items-center gap-2">
                                <Badge className={getPriorityColor(rec.priority)}>
                                  {rec.priority} priority
                                </Badge>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  {getCategoryIcon(rec.category)}
                                  <span className="capitalize">{rec.category}</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-muted-foreground mb-4">{rec.description}</p>
                            
                            <div className="flex items-center gap-6 text-sm">
                              {rec.estimatedSavings && (
                                <div className="flex items-center gap-2">
                                  <TrendingDown className="w-4 h-4 text-emerald-600" />
                                  <span className="font-medium text-emerald-600">
                                    {rec.estimatedSavings} t CO₂e/yr
                                  </span>
                                </div>
                              )}
                              {rec.estimatedCost && (
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                                  <span>${rec.estimatedCost.toLocaleString()}</span>
                                </div>
                              )}
                              {rec.paybackYears && (
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <span>{rec.paybackYears} yr payback</span>
                                </div>
                              )}
                            </div>

                            {expandedRec === idx && (
                              <div className="mt-4 pt-4 border-t">
                                <h4 className="font-medium mb-2">Implementation Steps</h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                    <span>Conduct detailed assessment of current systems and baseline performance</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                    <span>Obtain quotes from qualified contractors and compare options</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                    <span>Apply for available incentives and rebates (federal, provincial, utility)</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                    <span>Schedule implementation to minimize operational disruption</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                    <span>Monitor and verify savings post-implementation</span>
                                  </li>
                                </ul>
                                <div className="mt-4 flex gap-2">
                                  <Button size="sm" variant="outline">
                                    Add to Green Upgrades
                                  </Button>
                                  <Button size="sm" variant="outline">
                                    <Download className="w-4 h-4 mr-2" />
                                    Export Details
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                          <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${expandedRec === idx ? 'rotate-90' : ''}`} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No recommendations available. Add utility consumption data to receive personalized suggestions.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Data Sources */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Data Sources & Methodology</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Recommendations are generated based on: project utility consumption data, 
                  Environment and Climate Change Canada National Inventory Report grid emission factors, 
                  Natural Resources Canada energy efficiency benchmarks, and industry-standard 
                  payback calculations. Actual savings may vary based on implementation quality, 
                  building characteristics, and operational factors.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
