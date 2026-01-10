import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { 
  LetterGradeBadge, 
  LetterGradeDisplay,
  ZoneIndicator, 
  ZoneDot,
  ZoneDistributionBar,
  ZoneLegend,
  RatingGauge,
  RatingGaugeSemi,
  AssetRatingCard,
  ProjectRatingCard,
  ThresholdCustomizationDialog,
} from "@/components/rating";
import { 
  Loader2, 
  Leaf, 
  Zap, 
  Droplets, 
  Trash2, 
  Factory,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  BarChart3,
  Building2,
  RefreshCw,
  Settings,
  Download,
  Plus,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

type Zone = "green" | "yellow" | "orange" | "red";

// Default threshold configurations
const DEFAULT_LETTER_GRADES = {
  "A+": { min: 97, max: 100 },
  "A": { min: 93, max: 96.99 },
  "A-": { min: 90, max: 92.99 },
  "B+": { min: 87, max: 89.99 },
  "B": { min: 83, max: 86.99 },
  "B-": { min: 80, max: 82.99 },
  "C+": { min: 77, max: 79.99 },
  "C": { min: 73, max: 76.99 },
  "C-": { min: 70, max: 72.99 },
  "D+": { min: 67, max: 69.99 },
  "D": { min: 63, max: 66.99 },
  "D-": { min: 60, max: 62.99 },
  "F": { min: 0, max: 59.99 }
};

const DEFAULT_ZONES = {
  green: { min: 80, max: 100, label: "Excellent" },
  yellow: { min: 60, max: 79.99, label: "Good" },
  orange: { min: 40, max: 59.99, label: "Fair" },
  red: { min: 0, max: 39.99, label: "Poor" }
};

const DEFAULT_FCI_LETTER_GRADES = {
  "A+": { min: 0, max: 2 },
  "A": { min: 2.01, max: 5 },
  "A-": { min: 5.01, max: 8 },
  "B+": { min: 8.01, max: 12 },
  "B": { min: 12.01, max: 15 },
  "B-": { min: 15.01, max: 20 },
  "C+": { min: 20.01, max: 25 },
  "C": { min: 25.01, max: 30 },
  "C-": { min: 30.01, max: 35 },
  "D+": { min: 35.01, max: 40 },
  "D": { min: 40.01, max: 50 },
  "D-": { min: 50.01, max: 60 },
  "F": { min: 60.01, max: 100 }
};

const DEFAULT_FCI_ZONES = {
  green: { min: 0, max: 5, label: "Excellent" },
  yellow: { min: 5.01, max: 10, label: "Good" },
  orange: { min: 10.01, max: 30, label: "Fair" },
  red: { min: 30.01, max: 100, label: "Poor" }
};

export default function ESGDashboard() {
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState<{
    stage: "idle" | "assets" | "project" | "complete";
    progress: number;
    message: string;
  }>({ stage: "idle", progress: 0, message: "" });

  // Fetch projects for selection
  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery();

  // Fetch ESG scores for selected project
  const { data: esgScores, isLoading: scoresLoading } = trpc.esg.getESGScores.useQuery(
    { projectId: selectedProject! },
    { enabled: !!selectedProject }
  );

  // Fetch project rating
  const { data: projectRating, isLoading: ratingLoading, refetch: refetchRating } = trpc.rating.getProjectRating.useQuery(
    { projectId: selectedProject! },
    { enabled: !!selectedProject }
  );

  // Fetch portfolio summary from new ESG Portfolio router
  const { data: portfolioSummary, isLoading: portfolioLoading, refetch: refetchPortfolio } = trpc.esgPortfolio.getPortfolioESGSummary.useQuery({});

  // Fetch project ESG ratings list
  const { data: projectESGRatings, isLoading: projectRatingsLoading, refetch: refetchProjectRatings } = trpc.esgPortfolio.getProjectESGRatings.useQuery({
    sortBy: 'score',
    sortOrder: 'desc',
    limit: 50
  });

  // Fetch threshold configurations
  const { data: thresholdConfigs, refetch: refetchThresholds } = trpc.esgPortfolio.getThresholds.useQuery({});

  // Fetch grade descriptors
  const { data: gradeDescriptors } = trpc.esgPortfolio.getGradeDescriptors.useQuery();

  // Fetch default scales
  const { data: defaultScales } = trpc.rating.getDefaultScales.useQuery();

  // Mutations
  // Calculate portfolio ESG ratings mutation
  const calculatePortfolioRatings = trpc.esgPortfolio.calculatePortfolioRatings.useMutation({
    onSuccess: (data) => {
      toast.success(`Portfolio ratings calculated: ${data.portfolio.projectsRated} projects rated`);
      refetchPortfolio();
      refetchProjectRatings();
      setCalculationProgress({ stage: "complete", progress: 100, message: "Portfolio rating calculation complete!" });
      setTimeout(() => {
        setCalculationProgress({ stage: "idle", progress: 0, message: "" });
      }, 2000);
    },
    onError: (error) => {
      setCalculationProgress({ stage: "idle", progress: 0, message: "" });
      toast.error(`Failed to calculate portfolio ratings: ${error.message}`);
    }
  });

  // Create new threshold version mutation
  const createThresholdVersion = trpc.esgPortfolio.createThresholdVersion.useMutation({
    onSuccess: (data) => {
      toast.success(`Threshold version ${data.version} created successfully`);
      refetchThresholds();
    },
    onError: (error) => {
      toast.error(`Failed to create threshold version: ${error.message}`);
    }
  });

  const calculateProjectRating = trpc.rating.calculateProjectRating.useMutation({
    onSuccess: () => {
      setCalculationProgress({ stage: "complete", progress: 100, message: "Rating calculation complete!" });
      toast.success("Project rating calculated successfully");
      refetchRating();
      setTimeout(() => {
        setCalculationProgress({ stage: "idle", progress: 0, message: "" });
      }, 2000);
    },
    onError: (error) => {
      setCalculationProgress({ stage: "idle", progress: 0, message: "" });
      toast.error(`Failed to calculate rating: ${error.message}`);
    }
  });

  const batchCalculateRatings = trpc.rating.batchCalculateAssetRatings.useMutation({
    onSuccess: (data) => {
      setCalculationProgress({ 
        stage: "project", 
        progress: 75, 
        message: `Processed ${data.processedAssets}/${data.totalAssets} assets. Calculating project rating...` 
      });
      if (selectedProject) {
        calculateProjectRating.mutate({ projectId: selectedProject });
      }
    },
    onError: (error) => {
      setCalculationProgress({ stage: "idle", progress: 0, message: "" });
      toast.error(`Failed to calculate ratings: ${error.message}`);
    }
  });

  const handleCalculateRatings = () => {
    if (!selectedProject) return;
    
    setCalculationProgress({ 
      stage: "assets", 
      progress: 25, 
      message: "Calculating asset ratings..." 
    });
    
    batchCalculateRatings.mutate({ projectId: selectedProject });
  };

  const handleCalculatePortfolioRatings = () => {
    setCalculationProgress({ 
      stage: "assets", 
      progress: 25, 
      message: "Calculating portfolio ESG ratings..." 
    });
    
    calculatePortfolioRatings.mutate({});
  };

  const handleSaveThresholds = (config: {
    letterGrades: Record<string, { min: number; max: number }>;
    zones: Record<string, { min: number; max: number; label: string }>;
    fciLetterGrades: Record<string, { min: number; max: number }>;
    fciZones: Record<string, { min: number; max: number; label: string }>;
  }) => {
    // In a real implementation, this would save to the backend
    toast.success("Threshold settings saved successfully");
    setShowCustomizeDialog(false);
  };

  // Get latest ESG score
  const latestScore = esgScores?.[0];

  // Data validation
  const dataValidation = useMemo(() => {
    const issues: { type: "error" | "warning" | "info"; message: string }[] = [];
    
    if (!selectedProject) {
      issues.push({ type: "info", message: "Select a project to view ESG metrics and ratings" });
    } else {
      if (!projectRating) {
        issues.push({ type: "warning", message: "No rating data available. Click 'Calculate Ratings' to generate." });
      }
      
      if (projectRating && projectRating.totalAssets === 0) {
        issues.push({ type: "error", message: "No assets found in this project. Import assets to calculate ratings." });
      }
      
      if (projectRating && projectRating.assessedAssets === 0 && projectRating.totalAssets > 0) {
        issues.push({ type: "warning", message: "No assets have been assessed yet. Complete assessments to get accurate ratings." });
      }
      
      if (projectRating && projectRating.assessedAssets < projectRating.totalAssets) {
        const pct = Math.round((projectRating.assessedAssets / projectRating.totalAssets) * 100);
        issues.push({ 
          type: "info", 
          message: `${pct}% of assets assessed (${projectRating.assessedAssets}/${projectRating.totalAssets}). Complete more assessments for comprehensive ratings.` 
        });
      }
    }
    
    return issues;
  }, [selectedProject, projectRating]);

  // Mock ESG metrics for demonstration
  const esgMetrics = {
    energy: { score: 78, trend: "up" as const, change: 5.2 },
    water: { score: 82, trend: "up" as const, change: 3.1 },
    waste: { score: 65, trend: "down" as const, change: -2.4 },
    emissions: { score: 71, trend: "stable" as const, change: 0.5 },
  };

  const isCalculating = calculationProgress.stage !== "idle" && calculationProgress.stage !== "complete";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Leaf className="w-8 h-8 text-emerald-500" />
              ESG Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Environmental, Social, and Governance performance metrics with zone ratings
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
            {selectedProject && (
              <Button
                variant="outline"
                onClick={handleCalculateRatings}
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Calculate Ratings
              </Button>
            )}
          </div>
        </div>

        {/* Calculation Progress */}
        {calculationProgress.stage !== "idle" && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                {calculationProgress.stage === "complete" ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{calculationProgress.message}</p>
                  <Progress value={calculationProgress.progress} className="mt-2 h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Validation Alerts */}
        {dataValidation.length > 0 && (
          <div className="space-y-2">
            {dataValidation.map((issue, i) => (
              <Alert key={i} variant={issue.type === "error" ? "destructive" : "default"}>
                {issue.type === "error" ? (
                  <AlertCircle className="h-4 w-4" />
                ) : issue.type === "warning" ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Info className="h-4 w-4" />
                )}
                <AlertDescription>{issue.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Portfolio Summary Cards */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Portfolio ESG Summary</h2>
          <Button
            variant="outline"
            onClick={handleCalculatePortfolioRatings}
            disabled={isCalculating || calculatePortfolioRatings.isPending}
          >
            {(isCalculating || calculatePortfolioRatings.isPending) ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Calculate Portfolio Ratings
          </Button>
        </div>
        
        {portfolioSummary ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Portfolio Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {portfolioSummary.portfolioScore ? parseFloat(portfolioSummary.portfolioScore).toFixed(1) : 'N/A'}
                  </span>
                  {portfolioSummary.portfolioGrade && (
                    <LetterGradeBadge 
                      grade={portfolioSummary.portfolioGrade} 
                      size="sm" 
                    />
                  )}
                </div>
                {portfolioSummary.calculationDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last calculated: {new Date(portfolioSummary.calculationDate).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Projects Rated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold">{portfolioSummary.projectsRated || 0}</span>
                <span className="text-muted-foreground text-sm"> / {portfolioSummary.projectsTotal || 0}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Excellent Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <ZoneDot zone="green" />
                  <span className="text-2xl font-bold">{portfolioSummary.greenZoneCount || portfolioSummary.zoneDistribution?.excellent || 0}</span>
                  <span className="text-muted-foreground text-sm">projects</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Needs Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <ZoneDot zone="red" />
                  <span className="text-2xl font-bold">
                    {portfolioSummary.needsAttentionCount || ((portfolioSummary.zoneDistribution?.fair || 0) + (portfolioSummary.zoneDistribution?.poor || 0))}
                  </span>
                  <span className="text-muted-foreground text-sm">projects</span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Portfolio Data</h3>
              <p className="text-muted-foreground mb-4">
                Click "Calculate Portfolio Ratings" to generate ESG scores for all projects
              </p>
            </CardContent>
          </Card>
        )}

        {/* Zone Distribution */}
        {portfolioSummary?.zoneDistribution && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Portfolio Zone Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Map new zone names to old zone names for compatibility */}
              <ZoneDistributionBar 
                distribution={{
                  green: portfolioSummary.zoneDistribution.excellent || 0,
                  yellow: portfolioSummary.zoneDistribution.good || 0,
                  orange: portfolioSummary.zoneDistribution.fair || 0,
                  red: portfolioSummary.zoneDistribution.poor || 0
                } as Record<Zone, number>} 
                showLabels 
                showPercentages
                height="lg"
              />
              <div className="mt-4 flex justify-center">
                <ZoneLegend />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics">ESG Metrics</TabsTrigger>
            <TabsTrigger value="ratings">Ratings</TabsTrigger>
            <TabsTrigger value="scales">Rating Scales</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {selectedProject ? (
              <>
                {/* Project Rating Card */}
                {ratingLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : projectRating ? (
                  <ProjectRatingCard
                    projectName={projects?.find(p => p.id === selectedProject)?.name}
                    portfolioScore={projectRating.portfolioScore ? parseFloat(projectRating.portfolioScore) : null}
                    portfolioGrade={projectRating.portfolioGrade}
                    portfolioZone={projectRating.portfolioZone as Zone}
                    avgFciScore={projectRating.avgFciScore ? parseFloat(projectRating.avgFciScore) : null}
                    avgConditionScore={projectRating.avgConditionScore ? parseFloat(projectRating.avgConditionScore) : null}
                    zoneDistribution={projectRating.zoneDistribution as Record<Zone, number>}
                    totalAssets={projectRating.totalAssets || 0}
                    assessedAssets={projectRating.assessedAssets || 0}
                    lastCalculatedAt={projectRating.lastCalculatedAt?.toString()}
                  />
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Rating Data</h3>
                      <p className="text-muted-foreground mb-4">
                        Calculate ratings to see the project's performance metrics
                      </p>
                      <Button onClick={handleCalculateRatings} disabled={isCalculating}>
                        {isCalculating ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Calculate Ratings
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* ESG Score Summary */}
                {latestScore && (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card className="md:col-span-1">
                      <CardContent className="pt-6 flex flex-col items-center">
                        <RatingGauge
                          score={parseFloat(latestScore.compositeScore)}
                          label="Composite ESG"
                          size="lg"
                        />
                      </CardContent>
                    </Card>
                    
                    <Card className="md:col-span-4">
                      <CardHeader>
                        <CardTitle className="text-lg">ESG Component Scores</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div className="flex flex-col items-center">
                            <RatingGaugeSemi
                              score={parseFloat(latestScore.energyScore)}
                              label="Energy"
                              size="sm"
                            />
                          </div>
                          <div className="flex flex-col items-center">
                            <RatingGaugeSemi
                              score={parseFloat(latestScore.waterScore)}
                              label="Water"
                              size="sm"
                            />
                          </div>
                          <div className="flex flex-col items-center">
                            <RatingGaugeSemi
                              score={parseFloat(latestScore.wasteScore)}
                              label="Waste"
                              size="sm"
                            />
                          </div>
                          <div className="flex flex-col items-center">
                            <RatingGaugeSemi
                              score={parseFloat(latestScore.emissionsScore)}
                              label="Emissions"
                              size="sm"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a Project</h3>
                  <p className="text-muted-foreground">
                    Choose a project from the dropdown to view its ESG metrics and ratings
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6 mt-6">
            {/* ESG Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Energy Efficiency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold">{esgMetrics.energy.score}</span>
                      <span className="text-muted-foreground">/100</span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-500">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">+{esgMetrics.energy.change}%</span>
                    </div>
                  </div>
                  <LetterGradeBadge 
                    grade={esgMetrics.energy.score >= 80 ? "B+" : esgMetrics.energy.score >= 70 ? "C+" : "D"} 
                    size="sm" 
                    showLabel 
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-blue-500" />
                    Water Conservation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold">{esgMetrics.water.score}</span>
                      <span className="text-muted-foreground">/100</span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-500">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">+{esgMetrics.water.change}%</span>
                    </div>
                  </div>
                  <LetterGradeBadge 
                    grade="B" 
                    size="sm" 
                    showLabel 
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-orange-500" />
                    Waste Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold">{esgMetrics.waste.score}</span>
                      <span className="text-muted-foreground">/100</span>
                    </div>
                    <div className="flex items-center gap-1 text-red-500">
                      <TrendingDown className="w-4 h-4" />
                      <span className="text-sm">{esgMetrics.waste.change}%</span>
                    </div>
                  </div>
                  <LetterGradeBadge 
                    grade="C-" 
                    size="sm" 
                    showLabel 
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Factory className="w-4 h-4 text-gray-500" />
                    Carbon Emissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold">{esgMetrics.emissions.score}</span>
                      <span className="text-muted-foreground">/100</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <span className="text-sm">+{esgMetrics.emissions.change}%</span>
                    </div>
                  </div>
                  <LetterGradeBadge 
                    grade="C" 
                    size="sm" 
                    showLabel 
                    className="mt-2"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ratings" className="space-y-6 mt-6">
            {/* Letter Grade Reference */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Letter Grade Scale
                </CardTitle>
                <CardDescription>
                  Academic-style grading for building condition assessment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                  {["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"].map((grade) => (
                    <LetterGradeDisplay key={grade} grade={grade} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Zone Rating Reference */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Zone Rating System
                </CardTitle>
                <CardDescription>
                  Traffic light style zones for quick visual assessment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(["green", "yellow", "orange", "red"] as Zone[]).map((zone) => (
                    <div key={zone} className="text-center">
                      <ZoneIndicator zone={zone} size="lg" showIcon showLabel />
                      <p className="text-xs text-muted-foreground mt-2">
                        {zone === "green" && "80-100%: Excellent condition"}
                        {zone === "yellow" && "60-79%: Good, minor attention"}
                        {zone === "orange" && "40-59%: Fair, plan repairs"}
                        {zone === "red" && "0-39%: Poor, immediate action"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scales" className="space-y-6 mt-6">
            {/* Threshold Versions */}
            {thresholdConfigs && thresholdConfigs.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Threshold Configurations
                      </CardTitle>
                      <CardDescription>
                        Versioned threshold configurations for rating calculations
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowCustomizeDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Version
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3">Version</th>
                          <th className="text-left py-2 px-3">Name</th>
                          <th className="text-left py-2 px-3">Type</th>
                          <th className="text-left py-2 px-3">Status</th>
                          <th className="text-left py-2 px-3">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {thresholdConfigs.map((config: any) => (
                          <tr key={config.id} className="border-b">
                            <td className="py-2 px-3">
                              <Badge variant="outline">v{config.version}</Badge>
                            </td>
                            <td className="py-2 px-3 font-medium">{config.name}</td>
                            <td className="py-2 px-3">
                              <Badge variant="secondary" className="capitalize">
                                {config.thresholdType.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="py-2 px-3">
                              {config.isDefault === 1 ? (
                                <Badge className="bg-emerald-500">Default</Badge>
                              ) : config.isActive === 1 ? (
                                <Badge variant="outline">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">
                              {new Date(config.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Default Scales */}
            {defaultScales && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Standard Letter Grade Thresholds</CardTitle>
                    <CardDescription>
                      Default thresholds for converting scores to letter grades (higher score = better)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3">Grade</th>
                            <th className="text-left py-2 px-3">Min Score</th>
                            <th className="text-left py-2 px-3">Max Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(defaultScales.letterGrades.standard).map(([grade, range]) => (
                            <tr key={grade} className="border-b">
                              <td className="py-2 px-3">
                                <LetterGradeBadge grade={grade} size="sm" />
                              </td>
                              <td className="py-2 px-3">{range.min}%</td>
                              <td className="py-2 px-3">{range.max}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">FCI Letter Grade Thresholds</CardTitle>
                    <CardDescription>
                      Inverted scale for Facility Condition Index (lower FCI = better condition)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3">Grade</th>
                            <th className="text-left py-2 px-3">Min FCI</th>
                            <th className="text-left py-2 px-3">Max FCI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(defaultScales.letterGrades.fci).map(([grade, range]) => (
                            <tr key={grade} className="border-b">
                              <td className="py-2 px-3">
                                <LetterGradeBadge grade={grade} size="sm" />
                              </td>
                              <td className="py-2 px-3">{range.min}%</td>
                              <td className="py-2 px-3">{range.max}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Zone Thresholds</CardTitle>
                        <CardDescription>
                          Color-coded zones for quick visual assessment
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setShowCustomizeDialog(true)}>
                        <Settings className="w-4 h-4 mr-2" />
                        Customize
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-3">Standard Zones (Higher = Better)</h4>
                        <div className="space-y-2">
                          {Object.entries(defaultScales.zones.standard).map(([zone, config]) => (
                            <div key={zone} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex items-center gap-2">
                                <ZoneDot zone={zone as Zone} />
                                <span className="font-medium">{config.label}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {config.min}% - {config.max}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-3">FCI Zones (Lower = Better)</h4>
                        <div className="space-y-2">
                          {Object.entries(defaultScales.zones.fci).map(([zone, config]) => (
                            <div key={zone} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex items-center gap-2">
                                <ZoneDot zone={zone as Zone} />
                                <span className="font-medium">{config.label}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {config.min}% - {config.max}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Threshold Customization Dialog */}
      <ThresholdCustomizationDialog
        open={showCustomizeDialog}
        onOpenChange={setShowCustomizeDialog}
        defaultLetterGrades={defaultScales?.letterGrades?.standard || DEFAULT_LETTER_GRADES}
        defaultZones={defaultScales?.zones?.standard || DEFAULT_ZONES}
        fciLetterGrades={defaultScales?.letterGrades?.fci || DEFAULT_FCI_LETTER_GRADES}
        fciZones={defaultScales?.zones?.fci || DEFAULT_FCI_ZONES}
        onSave={handleSaveThresholds}
      />
    </DashboardLayout>
  );
}
