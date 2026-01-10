import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, 
  Leaf, 
  Zap, 
  Droplets, 
  Factory,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  BarChart3,
  Building2,
  RefreshCw,
  Download,
  MapPin,
  Globe,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  ChevronRight,
  Info,
  Sparkles,
  Wind,
  Sun,
  Flame,
  Plus
} from "lucide-react";
import { toast } from "sonner";

// Canadian provinces with grid carbon intensity data
const CANADIAN_PROVINCES = [
  { code: "AB", name: "Alberta", factor: 0.54, color: "#ef4444", renewable: 18 },
  { code: "BC", name: "British Columbia", factor: 0.01, color: "#22c55e", renewable: 98 },
  { code: "MB", name: "Manitoba", factor: 0.002, color: "#22c55e", renewable: 99 },
  { code: "NB", name: "New Brunswick", factor: 0.29, color: "#f59e0b", renewable: 35 },
  { code: "NL", name: "Newfoundland", factor: 0.02, color: "#22c55e", renewable: 96 },
  { code: "NS", name: "Nova Scotia", factor: 0.69, color: "#ef4444", renewable: 12 },
  { code: "ON", name: "Ontario", factor: 0.03, color: "#22c55e", renewable: 94 },
  { code: "PE", name: "Prince Edward Island", factor: 0.30, color: "#f59e0b", renewable: 30 },
  { code: "QC", name: "Quebec", factor: 0.002, color: "#22c55e", renewable: 99 },
  { code: "SK", name: "Saskatchewan", factor: 0.65, color: "#ef4444", renewable: 25 },
  { code: "NT", name: "Northwest Territories", factor: 0.15, color: "#f59e0b", renewable: 40 },
  { code: "NU", name: "Nunavut", factor: 0.85, color: "#ef4444", renewable: 5 },
  { code: "YT", name: "Yukon", factor: 0.08, color: "#22c55e", renewable: 92 },
];

// LEED v5 certification thresholds
const LEED_THRESHOLDS = {
  certified: 40,
  silver: 50,
  gold: 60,
  platinum: 80,
};

// LEED credit categories
const LEED_CATEGORIES = [
  { code: "IP", name: "Integrative Process", maxPoints: 1, color: "#8b5cf6" },
  { code: "LT", name: "Location & Transportation", maxPoints: 16, color: "#3b82f6" },
  { code: "SS", name: "Sustainable Sites", maxPoints: 10, color: "#22c55e" },
  { code: "WE", name: "Water Efficiency", maxPoints: 11, color: "#06b6d4" },
  { code: "EA", name: "Energy & Atmosphere", maxPoints: 33, color: "#f59e0b" },
  { code: "MR", name: "Materials & Resources", maxPoints: 13, color: "#a855f7" },
  { code: "EQ", name: "Indoor Environmental Quality", maxPoints: 16, color: "#ec4899" },
  { code: "IN", name: "Innovation", maxPoints: 6, color: "#6366f1" },
  { code: "RP", name: "Regional Priority", maxPoints: 4, color: "#14b8a6" },
];

type LeedCategory = "IP" | "LT" | "SS" | "WE" | "EA" | "MR" | "EQ" | "IN" | "RP";

function getCertificationLevel(points: number): { level: string; color: string; next: string | null; pointsToNext: number } {
  if (points >= LEED_THRESHOLDS.platinum) {
    return { level: "Platinum", color: "bg-slate-700 text-white", next: null, pointsToNext: 0 };
  } else if (points >= LEED_THRESHOLDS.gold) {
    return { level: "Gold", color: "bg-amber-500 text-white", next: "Platinum", pointsToNext: LEED_THRESHOLDS.platinum - points };
  } else if (points >= LEED_THRESHOLDS.silver) {
    return { level: "Silver", color: "bg-slate-400 text-white", next: "Gold", pointsToNext: LEED_THRESHOLDS.gold - points };
  } else if (points >= LEED_THRESHOLDS.certified) {
    return { level: "Certified", color: "bg-emerald-600 text-white", next: "Silver", pointsToNext: LEED_THRESHOLDS.silver - points };
  }
  return { level: "Not Certified", color: "bg-gray-200 text-gray-700", next: "Certified", pointsToNext: LEED_THRESHOLDS.certified - points };
}

function getIntensityColor(factor: number): string {
  if (factor <= 0.05) return "text-emerald-600 bg-emerald-50";
  if (factor <= 0.2) return "text-green-600 bg-green-50";
  if (factor <= 0.4) return "text-amber-600 bg-amber-50";
  if (factor <= 0.6) return "text-orange-600 bg-orange-50";
  return "text-red-600 bg-red-50";
}

// Simple Canada Map Component with database-backed data
function CanadaGridMap({ 
  selectedProvince, 
  onProvinceSelect,
  gridData,
  selectedYear,
  onYearChange,
  availableYears
}: { 
  selectedProvince: string | null;
  onProvinceSelect: (code: string) => void;
  gridData?: Array<{ provinceCode: string; emissionFactor: string; renewablePercent: number }>;
  selectedYear?: number;
  onYearChange?: (year: number) => void;
  availableYears?: number[];
}) {
  // Merge database data with static fallback
  const provinceData = CANADIAN_PROVINCES.map(province => {
    const dbData = gridData?.find(d => d.provinceCode === province.code);
    const factor = dbData ? parseFloat(dbData.emissionFactor) : province.factor;
    const renewable = dbData?.renewablePercent ?? province.renewable;
    
    // Determine color based on emission factor
    let color = "#22c55e"; // green
    if (factor > 0.4) color = "#ef4444"; // red
    else if (factor > 0.1) color = "#f59e0b"; // amber
    
    return { ...province, factor, renewable, color };
  });

  return (
    <div className="relative w-full">
      {/* Year Selector */}
      {availableYears && availableYears.length > 0 && onYearChange && (
        <div className="flex items-center justify-end gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Data Year:</span>
          <Select
            value={selectedYear?.toString() || ""}
            onValueChange={(value) => onYearChange(parseInt(value))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="grid grid-cols-5 gap-2 p-4">
        {provinceData.map((province) => (
          <button
            key={province.code}
            onClick={() => onProvinceSelect(province.code)}
            className={`
              p-3 rounded-lg border-2 transition-all
              ${selectedProvince === province.code 
                ? 'border-primary ring-2 ring-primary/20' 
                : 'border-transparent hover:border-gray-200'}
            `}
            style={{ backgroundColor: `${province.color}20` }}
          >
            <div className="text-center">
              <div className="font-bold text-sm">{province.code}</div>
              <div 
                className="text-xs font-medium mt-1 px-2 py-0.5 rounded"
                style={{ backgroundColor: province.color, color: 'white' }}
              >
                {province.factor.toFixed(3)} kg
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {province.renewable}% renewable
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span>Low Carbon (&lt;0.1 kg CO₂e/kWh)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span>Medium (0.1-0.4 kg)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>High (&gt;0.4 kg)</span>
        </div>
      </div>
      {gridData && (
        <p className="text-xs text-center text-muted-foreground mt-2">
          Source: Environment and Climate Change Canada, National Inventory Report {selectedYear || 2024}
        </p>
      )}
    </div>
  );
}

// LEED Credit Progress Component
function LeedCreditProgress({ 
  category, 
  achieved, 
  targeted, 
  maxPoints 
}: { 
  category: typeof LEED_CATEGORIES[0];
  achieved: number;
  targeted: number;
  maxPoints: number;
}) {
  const achievedPercent = (achieved / maxPoints) * 100;
  const targetedPercent = (targeted / maxPoints) * 100;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: category.color }}
          />
          <span className="font-medium">{category.code}</span>
          <span className="text-muted-foreground">{category.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold">{achieved}</span>
          <span className="text-muted-foreground">/ {maxPoints}</span>
        </div>
      </div>
      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className="absolute h-full rounded-full opacity-30"
          style={{ 
            width: `${targetedPercent}%`,
            backgroundColor: category.color 
          }}
        />
        <div 
          className="absolute h-full rounded-full"
          style={{ 
            width: `${achievedPercent}%`,
            backgroundColor: category.color 
          }}
        />
      </div>
    </div>
  );
}

// Embodied Carbon Assessment Card
function EmbodiedCarbonCard({ 
  assessment 
}: { 
  assessment: {
    assessmentType: string;
    gwpTotal: number;
    gwpPerSqm: number | null;
    reductionPercent: number | null;
    leedPointsEarned: number;
    materialBreakdown: Record<string, number> | null;
  };
}) {
  const materialColors: Record<string, string> = {
    concrete: "#64748b",
    steel: "#3b82f6",
    wood: "#a16207",
    insulation: "#f59e0b",
    glass: "#06b6d4",
    other: "#8b5cf6",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base capitalize">{assessment.assessmentType} Assessment</CardTitle>
          {assessment.leedPointsEarned > 0 && (
            <Badge className="bg-emerald-500">
              +{assessment.leedPointsEarned} LEED Points
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Total GWP</p>
            <p className="text-xl font-bold">{(assessment.gwpTotal / 1000).toFixed(1)} t CO₂e</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Intensity</p>
            <p className="text-xl font-bold">{assessment.gwpPerSqm?.toFixed(1) || "—"} kg/m²</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Reduction</p>
            <p className={`text-xl font-bold ${(assessment.reductionPercent || 0) > 0 ? 'text-emerald-600' : ''}`}>
              {assessment.reductionPercent ? `${assessment.reductionPercent.toFixed(1)}%` : "—"}
            </p>
          </div>
        </div>
        
        {assessment.materialBreakdown && Object.keys(assessment.materialBreakdown).length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Material Breakdown</p>
            <div className="flex h-4 rounded-full overflow-hidden">
              {Object.entries(assessment.materialBreakdown).map(([material, value]) => {
                const total = Object.values(assessment.materialBreakdown!).reduce((a, b) => a + b, 0);
                const percent = (value / total) * 100;
                return (
                  <div
                    key={material}
                    className="h-full"
                    style={{ 
                      width: `${percent}%`,
                      backgroundColor: materialColors[material] || materialColors.other
                    }}
                    title={`${material}: ${value.toFixed(0)} kg CO₂e (${percent.toFixed(1)}%)`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              {Object.entries(assessment.materialBreakdown).map(([material, value]) => (
                <div key={material} className="flex items-center gap-1">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: materialColors[material] || materialColors.other }}
                  />
                  <span className="capitalize">{material}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ESGLeedDashboard() {
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>("AB");
  const [activeTab, setActiveTab] = useState("overview");
  const [showRecommendationsDialog, setShowRecommendationsDialog] = useState(false);
  const [selectedGridYear, setSelectedGridYear] = useState<number>(2024);

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery();

  // Fetch LEED tracking for selected project
  const { data: leedTracking, isLoading: leedLoading, refetch: refetchLeed } = trpc.esgLeed.getProjectLeedTracking.useQuery(
    { projectId: selectedProject! },
    { enabled: !!selectedProject }
  ) as any;

  // Fetch embodied carbon assessments
  const { data: embodiedCarbon, isLoading: embodiedLoading } = trpc.esgLeed.getProjectEmbodiedCarbon.useQuery(
    { projectId: selectedProject! },
    { enabled: !!selectedProject }
  ) as any;

  // Fetch operational carbon history
  const { data: operationalCarbon } = trpc.esgLeed.getOperationalCarbonHistory.useQuery(
    { projectId: selectedProject! },
    { enabled: !!selectedProject }
  ) as any;

  // Fetch grid carbon intensity data
  const { data: gridIntensity } = trpc.esgLeed.getGridCarbonIntensity.useQuery(
    { region: selectedProvince || undefined },
    { enabled: !!selectedProvince }
  ) as any;

  // Fetch all grid carbon data for the map from esgPortfolio router
  const { data: allGridCarbonData } = trpc.esgPortfolio.getGridCarbonData.useQuery(
    { year: selectedGridYear }
  );

  // Get available years for grid carbon data
  const availableGridYears = useMemo(() => {
    // Default years available in the database
    return [2022, 2023, 2024];
  }, []);

  // Fetch AI recommendations
  const { data: aiRecommendations, isLoading: recommendationsLoading } = trpc.esgLeed.getAICarbonRecommendations.useQuery(
    { projectId: selectedProject!, province: selectedProvince || "AB" },
    { enabled: !!selectedProject }
  ) as any;

  // Initialize LEED tracking mutation
  const initializeLeed = trpc.esgLeed.initializeProjectLeedTracking.useMutation({
    onSuccess: () => {
      toast.success("LEED tracking initialized");
      refetchLeed();
    },
    onError: (error) => {
      toast.error(`Failed to initialize: ${error.message}`);
    },
  });

  // Calculate LEED summary
  const leedSummary = useMemo(() => {
    if (!leedTracking?.credits) return null;
    
    const byCategory: Record<string, { achieved: number; targeted: number; total: number }> = {};
    let totalAchieved = 0;
    let totalTargeted = 0;
    let prerequisitesMet = 0;
    let prerequisitesTotal = 0;
    
    for (const credit of leedTracking.credits as any[]) {
      const cat = credit.category as string;
      if (!byCategory[cat]) {
        byCategory[cat] = { achieved: 0, targeted: 0, total: 0 };
      }
      
      if (credit.creditType === 'prerequisite') {
        prerequisitesTotal++;
        if (credit.status === 'achieved') prerequisitesMet++;
      } else {
        byCategory[cat].achieved += credit.pointsAchieved || 0;
        byCategory[cat].targeted += credit.pointsTargeted || 0;
        byCategory[cat].total += credit.maxPoints || 0;
        totalAchieved += credit.pointsAchieved || 0;
        totalTargeted += credit.pointsTargeted || 0;
      }
    }
    
    return {
      byCategory,
      totalAchieved,
      totalTargeted,
      prerequisitesMet,
      prerequisitesTotal,
      certification: getCertificationLevel(totalAchieved),
    };
  }, [leedTracking]);

  // Get selected province info
  const selectedProvinceInfo = CANADIAN_PROVINCES.find(p => p.code === selectedProvince);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Leaf className="w-8 h-8 text-emerald-500" />
              ESG & LEED Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Grid carbon intensity, embodied carbon assessments, and LEED v5 credit tracking
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={selectedProject?.toString() || ""}
              onValueChange={(value) => setSelectedProject(value ? parseInt(value) : null)}
            >
              <SelectTrigger className="w-[250px]">
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
            {selectedProject && aiRecommendations && aiRecommendations.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowRecommendationsDialog(true)}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                AI Recommendations
                <Badge variant="secondary" className="ml-1">
                  {aiRecommendations.length}
                </Badge>
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">LEED Points</p>
                  <p className="text-2xl font-bold mt-1">
                    {leedSummary?.totalAchieved || 0}
                    <span className="text-sm font-normal text-muted-foreground"> / 110</span>
                  </p>
                </div>
                <Award className="w-8 h-8 text-emerald-500" />
              </div>
              {leedSummary && (
                <Badge className={`mt-2 ${leedSummary.certification.color}`}>
                  {leedSummary.certification.level}
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Grid Carbon Intensity</p>
                  <p className="text-2xl font-bold mt-1">
                    {selectedProvinceInfo?.factor || "—"}
                    <span className="text-sm font-normal text-muted-foreground"> kg CO₂e/kWh</span>
                  </p>
                </div>
                <Globe className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {selectedProvinceInfo?.name || "Select province"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Embodied Carbon</p>
                  <p className="text-2xl font-bold mt-1">
                    {embodiedCarbon && embodiedCarbon.length > 0 
                      ? `${((embodiedCarbon[0] as any).gwpTotal / 1000).toFixed(1)} t`
                      : "—"}
                  </p>
                </div>
                <Factory className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Total GWP (A1-C4)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Operational Carbon</p>
                  <p className="text-2xl font-bold mt-1">
                    {operationalCarbon?.summary?.totalEmissions?.toFixed(1) || "—"}
                    <span className="text-sm font-normal text-muted-foreground"> t/yr</span>
                  </p>
                </div>
                <Zap className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Scope 1 + 2 emissions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="carbon-map">Grid Carbon Map</TabsTrigger>
            <TabsTrigger value="embodied">Embodied Carbon</TabsTrigger>
            <TabsTrigger value="leed">LEED Credits</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEED Progress Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-500" />
                    LEED v5 Progress
                  </CardTitle>
                  <CardDescription>
                    Credit achievement by category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedProject ? (
                    <p className="text-muted-foreground text-center py-8">
                      Select a project to view LEED progress
                    </p>
                  ) : leedLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : !leedTracking?.credits?.length ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">
                        LEED tracking not initialized for this project
                      </p>
                      <Button
                        onClick={() => initializeLeed.mutate({
                          projectId: selectedProject,
                          targetCertification: "gold",
                        })}
                        disabled={initializeLeed.isPending}
                      >
                        {initializeLeed.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Initialize LEED Tracking
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {LEED_CATEGORIES.map((cat) => {
                        const data = leedSummary?.byCategory[cat.code];
                        return (
                          <LeedCreditProgress
                            key={cat.code}
                            category={cat}
                            achieved={data?.achieved || 0}
                            targeted={data?.targeted || 0}
                            maxPoints={cat.maxPoints}
                          />
                        );
                      })}
                      <Separator className="my-4" />
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Prerequisites</span>
                        <div className="flex items-center gap-2">
                          {leedSummary?.prerequisitesMet === leedSummary?.prerequisitesTotal ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          )}
                          <span>
                            {leedSummary?.prerequisitesMet} / {leedSummary?.prerequisitesTotal} met
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Carbon Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Factory className="w-5 h-5 text-slate-500" />
                    Carbon Summary
                  </CardTitle>
                  <CardDescription>
                    Operational and embodied carbon overview
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedProject ? (
                    <p className="text-muted-foreground text-center py-8">
                      Select a project to view carbon data
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {/* Operational Carbon */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Operational Carbon</span>
                          <span className="text-sm text-muted-foreground">
                            {operationalCarbon?.summary?.totalEmissions?.toFixed(2) || 0} t CO₂e/yr
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="p-2 bg-red-50 rounded">
                            <p className="text-red-600 font-medium">Scope 1</p>
                            <p className="text-red-800">{operationalCarbon?.summary?.totalScope1?.toFixed(2) || 0} t</p>
                          </div>
                          <div className="p-2 bg-amber-50 rounded">
                            <p className="text-amber-600 font-medium">Scope 2</p>
                            <p className="text-amber-800">{operationalCarbon?.summary?.totalScope2?.toFixed(2) || 0} t</p>
                          </div>
                          <div className="p-2 bg-blue-50 rounded">
                            <p className="text-blue-600 font-medium">Scope 3</p>
                            <p className="text-blue-800">{operationalCarbon?.summary?.totalScope3?.toFixed(2) || 0} t</p>
                          </div>
                        </div>
                      </div>

                      {/* Embodied Carbon */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Embodied Carbon</span>
                          <span className="text-sm text-muted-foreground">
                            {embodiedCarbon && embodiedCarbon.length > 0 
                              ? `${((embodiedCarbon[0] as any).gwpTotal / 1000).toFixed(2)} t CO₂e`
                              : "No data"}
                          </span>
                        </div>
                        {embodiedCarbon && embodiedCarbon.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-slate-50 rounded">
                              <p className="text-slate-600 font-medium">Product Stage (A1-A3)</p>
                              <p className="text-slate-800">
                                {((embodiedCarbon[0] as any).gwpModuleA1A3 / 1000).toFixed(2) || 0} t
                              </p>
                            </div>
                            <div className="p-2 bg-slate-50 rounded">
                              <p className="text-slate-600 font-medium">End of Life (C1-C4)</p>
                              <p className="text-slate-800">
                                {((embodiedCarbon[0] as any).gwpModuleC1C4 / 1000).toFixed(2) || 0} t
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Regional Context */}
                      {selectedProvinceInfo && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{selectedProvinceInfo.name} Grid</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Emission Factor</span>
                            <Badge className={getIntensityColor(selectedProvinceInfo.factor)}>
                              {selectedProvinceInfo.factor} kg CO₂e/kWh
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm mt-1">
                            <span className="text-muted-foreground">Renewable %</span>
                            <span className="font-medium">{selectedProvinceInfo.renewable}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Carbon Map Tab */}
          <TabsContent value="carbon-map" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  Canadian Grid Carbon Intensity Map
                </CardTitle>
                <CardDescription>
                  Provincial electricity grid emission factors (kg CO₂e/kWh)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CanadaGridMap
                  selectedProvince={selectedProvince}
                  onProvinceSelect={setSelectedProvince}
                  gridData={allGridCarbonData}
                  selectedYear={selectedGridYear}
                  onYearChange={setSelectedGridYear}
                  availableYears={availableGridYears}
                />
              </CardContent>
            </Card>

            {selectedProvinceInfo && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-amber-100">
                        <Zap className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Emission Factor</p>
                        <p className="text-xl font-bold">{selectedProvinceInfo.factor} kg CO₂e/kWh</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-emerald-100">
                        <Wind className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Renewable Energy</p>
                        <p className="text-xl font-bold">{selectedProvinceInfo.renewable}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-blue-100">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Province</p>
                        <p className="text-xl font-bold">{selectedProvinceInfo.name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Grid Intensity Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Provinces Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Province</th>
                        <th className="text-right py-2 font-medium">Emission Factor</th>
                        <th className="text-right py-2 font-medium">Renewable %</th>
                        <th className="text-right py-2 font-medium">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CANADIAN_PROVINCES.sort((a, b) => a.factor - b.factor).map((prov) => (
                        <tr 
                          key={prov.code} 
                          className={`border-b hover:bg-muted/50 cursor-pointer ${selectedProvince === prov.code ? 'bg-primary/5' : ''}`}
                          onClick={() => setSelectedProvince(prov.code)}
                        >
                          <td className="py-2 font-medium">{prov.name}</td>
                          <td className="text-right py-2">{prov.factor} kg CO₂e/kWh</td>
                          <td className="text-right py-2">{prov.renewable}%</td>
                          <td className="text-right py-2">
                            <Badge className={getIntensityColor(prov.factor)}>
                              {prov.factor <= 0.05 ? "Excellent" : prov.factor <= 0.2 ? "Good" : prov.factor <= 0.4 ? "Fair" : "Poor"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Embodied Carbon Tab */}
          <TabsContent value="embodied" className="space-y-6 mt-6">
            {!selectedProject ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Factory className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Select a project to view embodied carbon assessments
                  </p>
                </CardContent>
              </Card>
            ) : embodiedLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : embodiedCarbon && embodiedCarbon.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(embodiedCarbon as any[]).map((assessment, idx) => (
                  <EmbodiedCarbonCard key={idx} assessment={assessment} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Factory className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No embodied carbon assessments found for this project
                  </p>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Assessment
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* LEED Credits Tab */}
          <TabsContent value="leed" className="space-y-6 mt-6">
            {!selectedProject ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Award className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Select a project to view LEED credit tracking
                  </p>
                </CardContent>
              </Card>
            ) : leedLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : !leedTracking?.credits?.length ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Award className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    LEED tracking not initialized for this project
                  </p>
                  <Button
                    onClick={() => initializeLeed.mutate({
                      projectId: selectedProject,
                      targetCertification: "gold",
                    })}
                    disabled={initializeLeed.isPending}
                  >
                    {initializeLeed.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Initialize LEED v5 Tracking
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Certification Status */}
                <Card>
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Projected Certification</p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge className={`text-lg px-4 py-1 ${leedSummary?.certification.color}`}>
                            {leedSummary?.certification.level}
                          </Badge>
                          <span className="text-2xl font-bold">
                            {leedSummary?.totalAchieved} points
                          </span>
                        </div>
                      </div>
                      {leedSummary?.certification.next && (
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Next Level</p>
                          <p className="font-medium">{leedSummary.certification.next}</p>
                          <p className="text-sm text-muted-foreground">
                            {leedSummary.certification.pointsToNext} more points needed
                          </p>
                        </div>
                      )}
                    </div>
                    <Progress 
                      value={(leedSummary?.totalAchieved || 0) / 110 * 100} 
                      className="mt-4 h-3"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>0</span>
                      <span>Certified (40)</span>
                      <span>Silver (50)</span>
                      <span>Gold (60)</span>
                      <span>Platinum (80)</span>
                      <span>110</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Credits by Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {LEED_CATEGORIES.map((cat) => {
                    const categoryCredits = (leedTracking.credits as any[]).filter(
                      c => c.category === cat.code
                    );
                    const achieved = categoryCredits.reduce((sum, c) => sum + (c.pointsAchieved || 0), 0);
                    const prerequisites = categoryCredits.filter(c => c.creditType === 'prerequisite');
                    const prereqsMet = prerequisites.filter(c => c.status === 'achieved').length;
                    
                    return (
                      <Card key={cat.code}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: cat.color }}
                              />
                              {cat.code}
                            </CardTitle>
                            <Badge variant="outline">
                              {achieved} / {cat.maxPoints}
                            </Badge>
                          </div>
                          <CardDescription>{cat.name}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Progress 
                            value={(achieved / cat.maxPoints) * 100}
                            className="h-2"
                            style={{ 
                              ["--progress-background" as any]: cat.color 
                            }}
                          />
                          {prerequisites.length > 0 && (
                            <div className="flex items-center gap-2 mt-3 text-xs">
                              {prereqsMet === prerequisites.length ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                              )}
                              <span>
                                Prerequisites: {prereqsMet}/{prerequisites.length}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* AI Recommendations Dialog */}
        <Dialog open={showRecommendationsDialog} onOpenChange={setShowRecommendationsDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                AI Carbon Reduction Recommendations
              </DialogTitle>
              <DialogDescription>
                Personalized suggestions based on your project data and regional factors
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              {recommendationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : aiRecommendations && aiRecommendations.length > 0 ? (
                <div className="space-y-4">
                  {(aiRecommendations as any[]).map((rec, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            rec.priority === 'high' ? 'bg-red-100' :
                            rec.priority === 'medium' ? 'bg-amber-100' : 'bg-blue-100'
                          }`}>
                            <Lightbulb className={`w-5 h-5 ${
                              rec.priority === 'high' ? 'text-red-600' :
                              rec.priority === 'medium' ? 'text-amber-600' : 'text-blue-600'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{rec.title}</h4>
                              <Badge variant="outline" className="capitalize">
                                {rec.priority} priority
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {rec.description}
                            </p>
                            <div className="flex items-center gap-4 mt-3 text-sm">
                              {rec.estimatedSavings && (
                                <div className="flex items-center gap-1 text-emerald-600">
                                  <TrendingDown className="w-4 h-4" />
                                  <span>{rec.estimatedSavings} t CO₂e/yr</span>
                                </div>
                              )}
                              {rec.estimatedCost && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <span>${rec.estimatedCost.toLocaleString()}</span>
                                </div>
                              )}
                              {rec.paybackYears && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="w-4 h-4" />
                                  <span>{rec.paybackYears} yr payback</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No recommendations available. Add more project data to receive personalized suggestions.
                </p>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
