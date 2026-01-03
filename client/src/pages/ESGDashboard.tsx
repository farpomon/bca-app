import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Plus
} from "lucide-react";
import { toast } from "sonner";

type Zone = "green" | "yellow" | "orange" | "red";

export default function ESGDashboard() {
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

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

  // Fetch portfolio summary
  const { data: portfolioSummary, isLoading: portfolioLoading } = trpc.rating.getPortfolioSummary.useQuery({});

  // Fetch default scales
  const { data: defaultScales } = trpc.rating.getDefaultScales.useQuery();

  // Mutations
  const calculateProjectRating = trpc.rating.calculateProjectRating.useMutation({
    onSuccess: () => {
      toast.success("Project rating calculated successfully");
      refetchRating();
    },
    onError: (error) => {
      toast.error(`Failed to calculate rating: ${error.message}`);
    }
  });

  const batchCalculateRatings = trpc.rating.batchCalculateAssetRatings.useMutation({
    onSuccess: (data) => {
      toast.success(`Calculated ratings for ${data.processedAssets} of ${data.totalAssets} assets`);
      refetchRating();
    },
    onError: (error) => {
      toast.error(`Failed to calculate ratings: ${error.message}`);
    }
  });

  const handleCalculateRatings = () => {
    if (!selectedProject) return;
    
    // First calculate all asset ratings, then project rating
    batchCalculateRatings.mutate({ projectId: selectedProject }, {
      onSuccess: () => {
        calculateProjectRating.mutate({ projectId: selectedProject });
      }
    });
  };

  // Get latest ESG score
  const latestScore = esgScores?.[0];

  // Mock ESG metrics for demonstration
  const esgMetrics = {
    energy: { score: 78, trend: "up" as const, change: 5.2 },
    water: { score: 82, trend: "up" as const, change: 3.1 },
    waste: { score: 65, trend: "down" as const, change: -2.4 },
    emissions: { score: 71, trend: "stable" as const, change: 0.5 },
  };

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
                disabled={batchCalculateRatings.isPending || calculateProjectRating.isPending}
              >
                {(batchCalculateRatings.isPending || calculateProjectRating.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Calculate Ratings
              </Button>
            )}
          </div>
        </div>

        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Portfolio Score</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold">
                      {portfolioSummary?.avgPortfolioScore?.toFixed(1) || "—"}
                    </span>
                    {portfolioSummary?.overallGrade && (
                      <LetterGradeBadge grade={portfolioSummary.overallGrade} size="sm" />
                    )}
                  </div>
                </div>
                {portfolioSummary?.overallZone && (
                  <ZoneIndicator zone={portfolioSummary.overallZone as Zone} showLabel={false} size="lg" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Projects Rated</p>
                  <p className="text-2xl font-bold mt-1">
                    {portfolioSummary?.ratedProjects || 0} / {portfolioSummary?.totalProjects || 0}
                  </p>
                </div>
                <Building2 className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Green Zone</p>
                  <p className="text-2xl font-bold mt-1 text-emerald-600">
                    {portfolioSummary?.zoneDistribution?.green || 0}
                  </p>
                </div>
                <ZoneDot zone="green" size="lg" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Needs Attention</p>
                  <p className="text-2xl font-bold mt-1 text-red-600">
                    {(portfolioSummary?.zoneDistribution?.orange || 0) + (portfolioSummary?.zoneDistribution?.red || 0)}
                  </p>
                </div>
                <ZoneDot zone="red" size="lg" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Zone Distribution */}
        {portfolioSummary?.zoneDistribution && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Portfolio Zone Distribution</CardTitle>
              <CardDescription>Distribution of projects across condition zones</CardDescription>
            </CardHeader>
            <CardContent>
              <ZoneDistributionBar 
                distribution={portfolioSummary.zoneDistribution as Record<Zone, number>} 
                showCounts={true}
              />
              <div className="mt-4">
                <ZoneLegend />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs for different views */}
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
                      <Button onClick={handleCalculateRatings}>
                        <RefreshCw className="w-4 h-4 mr-2" />
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
            {/* Default Scales */}
            {defaultScales && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Standard Letter Grade Thresholds</CardTitle>
                    <CardDescription>
                      Default thresholds for converting scores to letter grades
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
                      Inverted scale for Facility Condition Index (lower is better)
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
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Customize
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-3">Standard Zones</h4>
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
                        <h4 className="font-medium mb-3">FCI Zones (Inverted)</h4>
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
    </DashboardLayout>
  );
}
