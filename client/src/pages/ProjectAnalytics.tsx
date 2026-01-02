import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/BackButton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  AlertTriangle, 
  BarChart3, 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download,
  Calculator,
  Clock,
  Target,
  Percent,
  ChevronRight,
  Activity,
  PieChart,
  Wrench,
  Calendar,
  Info
} from "lucide-react";
import { useParams, Link } from "wouter";
import { 
  Chart as ChartJS, 
  ArcElement, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement, 
  PointElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Pie, Bar, Line, Doughnut } from 'react-chartjs-2';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Color palette
const COLORS = {
  primary: "#3b82f6",
  secondary: "#8b5cf6",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#06b6d4",
  muted: "#6b7280",
};

const CONDITION_COLORS: Record<string, string> = {
  good: "#22c55e",
  fair: "#f59e0b",
  poor: "#ef4444",
  not_assessed: "#6b7280",
};

// Format currency
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

// Format percentage
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Calculate NPV (Net Present Value)
function calculateNPV(cashFlows: number[], discountRate: number): number {
  return cashFlows.reduce((npv, cf, year) => {
    return npv + cf / Math.pow(1 + discountRate, year);
  }, 0);
}

// Calculate IRR (Internal Rate of Return) using Newton-Raphson method
function calculateIRR(cashFlows: number[], guess: number = 0.1): number {
  const maxIterations = 100;
  const tolerance = 0.0001;
  let rate = guess;
  
  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivative = 0;
    
    for (let j = 0; j < cashFlows.length; j++) {
      npv += cashFlows[j] / Math.pow(1 + rate, j);
      derivative -= j * cashFlows[j] / Math.pow(1 + rate, j + 1);
    }
    
    if (Math.abs(npv) < tolerance) break;
    if (derivative === 0) break;
    
    rate = rate - npv / derivative;
  }
  
  return rate;
}

// Calculate Simple Payback Period
function calculatePaybackPeriod(initialCost: number, annualSavings: number): number {
  if (annualSavings <= 0) return Infinity;
  return initialCost / annualSavings;
}

// Calculate Facility Condition Index (FCI)
function calculateFCI(deferredMaintenance: number, currentReplacementValue: number): number {
  if (currentReplacementValue <= 0) return 0;
  return (deferredMaintenance / currentReplacementValue) * 100;
}

// Get FCI rating
function getFCIRating(fci: number): { label: string; color: string; description: string } {
  if (fci <= 5) return { label: "Good", color: COLORS.success, description: "Well-maintained facility" };
  if (fci <= 10) return { label: "Fair", color: COLORS.warning, description: "Some deferred maintenance" };
  if (fci <= 30) return { label: "Poor", color: COLORS.danger, description: "Significant deferred maintenance" };
  return { label: "Critical", color: "#7f1d1d", description: "Major renovation or replacement needed" };
}

export default function ProjectAnalytics() {
  const { id } = useParams();
  const projectId = parseInt(id!);

  // Fetch project data
  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery(
    { id: projectId },
    { enabled: !isNaN(projectId) }
  );

  // Fetch assets for this project
  const { data: assets, isLoading: assetsLoading } = trpc.assets.list.useQuery(
    { projectId },
    { enabled: !isNaN(projectId) }
  );

  // Fetch analytics data
  const { data: overview, isLoading: overviewLoading } = trpc.analytics.getDashboardOverview.useQuery({
    projectId,
  });

  const { data: trends, isLoading: trendsLoading } = trpc.analytics.getAssessmentTrends.useQuery({
    projectId,
    months: 12,
  });

  const { data: componentAnalysis, isLoading: componentLoading } = trpc.analytics.getComponentAnalysis.useQuery({
    projectId,
  });

  // Fetch cost analysis
  const { data: costAnalysis, isLoading: costLoading } = trpc.analytics.getCostAnalysis.useQuery({
    projectId,
  });

  // State for selected condition filter (for interactive donut chart)
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);

  // Fetch components filtered by condition
  const { data: filteredComponents, isLoading: filteredComponentsLoading } = trpc.analytics.getComponentsByCondition.useQuery(
    {
      projectId,
      condition: selectedCondition as 'good' | 'fair' | 'poor' | 'not_assessed' | undefined,
    },
    { enabled: !isNaN(projectId) && selectedCondition !== null }
  );

  const isLoading = projectLoading || assetsLoading || overviewLoading || trendsLoading || componentLoading || costLoading;

  // Calculate project-level metrics
  const totalAssets = assets?.length || 0;
  const totalDeficiencies = overview?.deficiencyBreakdown?.reduce((acc, d) => acc + d.count, 0) || 0;
  const totalRepairCost = costAnalysis?.totalRepairCost || 0;
  const totalReplacementCost = costAnalysis?.totalReplacementCost || 0;
  
  // Calculate condition score
  const avgCondition = overview?.conditionDistribution?.reduce((acc, d) => {
    const weight = d.condition === 'good' ? 4 : d.condition === 'fair' ? 3 : d.condition === 'poor' ? 2 : 1;
    return acc + (weight * d.count);
  }, 0) || 0;
  const totalAssessments = overview?.conditionDistribution?.reduce((acc, d) => acc + d.count, 0) || 1;
  const avgScore = (avgCondition / totalAssessments / 4) * 100;

  // Calculate FCI (Facility Condition Index)
  // FCI = Deferred Maintenance / Current Replacement Value
  // Using repair cost as deferred maintenance proxy
  const estimatedReplacementValue = totalReplacementCost > 0 ? totalReplacementCost : totalRepairCost * 5; // Estimate if not available
  const fci = calculateFCI(totalRepairCost, estimatedReplacementValue);
  const fciRating = getFCIRating(fci);

  // Economic Analysis Calculations
  // Assume 5% discount rate (industry standard for public infrastructure)
  const discountRate = 0.05;
  // Assume repairs extend asset life by 15 years on average
  const assetLifeExtension = 15;
  // Estimate annual operational savings from repairs (2% of repair cost)
  const annualOperationalSavings = totalRepairCost * 0.02;
  // Estimate avoided replacement cost (30% of replacement value if repairs done)
  const avoidedReplacementCost = totalReplacementCost * 0.30;
  
  // Build cash flow for NPV calculation
  // Year 0: Initial repair investment (negative)
  // Years 1-15: Annual savings + avoided costs spread over time
  const annualBenefit = (avoidedReplacementCost / assetLifeExtension) + annualOperationalSavings;
  const cashFlows = [-totalRepairCost];
  for (let i = 1; i <= assetLifeExtension; i++) {
    cashFlows.push(annualBenefit);
  }
  
  const npv = totalRepairCost > 0 ? calculateNPV(cashFlows, discountRate) : 0;
  const irr = totalRepairCost > 0 ? calculateIRR(cashFlows) : 0;
  const paybackPeriod = calculatePaybackPeriod(totalRepairCost, annualBenefit);
  const roi = totalRepairCost > 0 ? ((annualBenefit * assetLifeExtension - totalRepairCost) / totalRepairCost) * 100 : 0;

  // Priority cost breakdown
  const priorityCosts = overview?.deficiencyBreakdown?.reduce((acc, d) => {
    acc[d.priority] = d.totalCost;
    return acc;
  }, {} as Record<string, number>) || {};

  const immediateCost = priorityCosts['immediate'] || 0;
  const shortTermCost = priorityCosts['short_term'] || 0;
  const mediumTermCost = priorityCosts['medium_term'] || 0;
  const longTermCost = priorityCosts['long_term'] || 0;

  // Prepare chart data
  const conditionChartData = overview?.conditionDistribution ? {
    labels: overview.conditionDistribution.map(d => d.condition.replace('_', ' ').toUpperCase()),
    datasets: [{
      data: overview.conditionDistribution.map(d => d.count),
      backgroundColor: overview.conditionDistribution.map(d => CONDITION_COLORS[d.condition] || COLORS.muted),
      borderColor: overview.conditionDistribution.map(d => CONDITION_COLORS[d.condition] || COLORS.muted),
      borderWidth: 2,
    }],
  } : null;

  const deficiencyChartData = overview?.deficiencyBreakdown ? {
    labels: overview.deficiencyBreakdown.map(d => d.priority.replace('_', ' ').toUpperCase()),
    datasets: [{
      label: 'Count',
      data: overview.deficiencyBreakdown.map(d => d.count),
      backgroundColor: [
        COLORS.danger,
        COLORS.warning,
        COLORS.primary,
        COLORS.success,
      ],
      borderColor: [
        COLORS.danger,
        COLORS.warning,
        COLORS.primary,
        COLORS.success,
      ],
      borderWidth: 2,
    }],
  } : null;

  const trendsChartData = trends ? {
    labels: trends.map(t => t.month),
    datasets: [
      {
        label: 'Assessments',
        data: trends.map(t => t.count),
        borderColor: COLORS.primary,
        backgroundColor: `${COLORS.primary}20`,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Avg Condition Score',
        data: trends.map(t => t.avgConditionScore),
        borderColor: COLORS.success,
        backgroundColor: `${COLORS.success}20`,
        fill: true,
        tension: 0.4,
        yAxisID: 'y1',
      },
    ],
  } : null;

  const componentChartData = componentAnalysis ? {
    labels: componentAnalysis.slice(0, 10).map(c => c.componentName.length > 20 ? c.componentName.substring(0, 20) + '...' : c.componentName),
    datasets: [{
      label: 'Assessments',
      data: componentAnalysis.slice(0, 10).map(c => c.assessmentCount),
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
      borderWidth: 1,
    }],
  } : null;

  // Cost projection chart (5-year horizon)
  const costProjectionData = {
    labels: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'],
    datasets: [
      {
        label: 'Immediate Priority',
        data: [immediateCost, 0, 0, 0, 0],
        backgroundColor: COLORS.danger,
      },
      {
        label: 'Short-term (1-2 years)',
        data: [shortTermCost * 0.5, shortTermCost * 0.5, 0, 0, 0],
        backgroundColor: COLORS.warning,
      },
      {
        label: 'Medium-term (3-5 years)',
        data: [0, 0, mediumTermCost * 0.33, mediumTermCost * 0.33, mediumTermCost * 0.34],
        backgroundColor: COLORS.primary,
      },
      {
        label: 'Long-term (5+ years)',
        data: [0, 0, 0, 0, longTermCost * 0.2],
        backgroundColor: COLORS.success,
      },
    ],
  };

  // Asset breakdown by type
  const assetTypeBreakdown = assets?.reduce((acc, asset) => {
    const type = asset.assetType || 'Other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const assetTypeChartData = {
    labels: Object.keys(assetTypeBreakdown),
    datasets: [{
      data: Object.values(assetTypeBreakdown),
      backgroundColor: [
        COLORS.primary,
        COLORS.secondary,
        COLORS.success,
        COLORS.warning,
        COLORS.danger,
        COLORS.info,
      ],
      borderWidth: 2,
    }],
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Project not found</h2>
          <BackButton to="dashboard" label="Back to Projects" preserveFilters={true} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <BackButton to={`/projects/${projectId}/assets`} label="Back to Assets" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <BarChart3 className="h-8 w-8" />
                Project Analytics
              </h1>
              <p className="text-muted-foreground">{project.name}</p>
            </div>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAssets}</div>
              <p className="text-xs text-muted-foreground">
                In this project
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deficiencies</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDeficiencies}</div>
              <p className="text-xs text-muted-foreground">
                Across all assets
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deferred Maintenance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRepairCost)}</div>
              <p className="text-xs text-muted-foreground">
                Total repair costs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                FCI Score
                <UITooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Facility Condition Index (FCI) = Deferred Maintenance / Replacement Value. Lower is better.</p>
                  </TooltipContent>
                </UITooltip>
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: fciRating.color }}>
                {fci.toFixed(1)}%
              </div>
              <p className="text-xs" style={{ color: fciRating.color }}>
                {fciRating.label} - {fciRating.description}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="economic">Economic Analysis</TabsTrigger>
            <TabsTrigger value="operational">Operational Metrics</TabsTrigger>
            <TabsTrigger value="conditions">Conditions</TabsTrigger>
            <TabsTrigger value="deficiencies">Deficiencies</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Asset Types</CardTitle>
                  <CardDescription>Distribution of assets by type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    {Object.keys(assetTypeBreakdown).length > 0 ? (
                      <Doughnut
                        data={assetTypeChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                            },
                          },
                        }}
                      />
                    ) : (
                      <p className="text-muted-foreground">No asset data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Condition Distribution</CardTitle>
                  <CardDescription>Overall condition of assessed components</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    {conditionChartData ? (
                      <Pie
                        data={conditionChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                            },
                          },
                        }}
                      />
                    ) : (
                      <p className="text-muted-foreground">No condition data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Economic Analysis Tab */}
          <TabsContent value="economic" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-1">
                    Net Present Value
                    <UITooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">NPV of repair investments over 15 years at 5% discount rate. Positive NPV indicates value creation.</p>
                      </TooltipContent>
                    </UITooltip>
                  </CardTitle>
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${npv >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(npv)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {npv >= 0 ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-green-600" />
                        <span>Positive return expected</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3 text-red-600" />
                        <span>Review investment priorities</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-1">
                    Internal Rate of Return
                    <UITooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">IRR represents the expected annual return rate. Compare to your cost of capital (typically 5-8%).</p>
                      </TooltipContent>
                    </UITooltip>
                  </CardTitle>
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${irr > 0.05 ? 'text-green-600' : 'text-amber-600'}`}>
                    {formatPercent(irr * 100)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {irr > 0.08 ? 'Excellent return' : irr > 0.05 ? 'Good return' : 'Below target rate'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-1">
                    Payback Period
                    <UITooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Time to recover initial repair investment through operational savings and avoided costs.</p>
                      </TooltipContent>
                    </UITooltip>
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {paybackPeriod === Infinity ? 'N/A' : `${paybackPeriod.toFixed(1)} yrs`}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {paybackPeriod <= 5 ? 'Quick recovery' : paybackPeriod <= 10 ? 'Moderate recovery' : 'Long-term investment'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-1">
                    Return on Investment
                    <UITooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Total ROI over the asset life extension period (15 years).</p>
                      </TooltipContent>
                    </UITooltip>
                  </CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(roi)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Over 15-year period
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>5-Year Capital Budget Projection</CardTitle>
                  <CardDescription>Recommended spending by priority level</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <Bar
                      data={costProjectionData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                          },
                        },
                        scales: {
                          x: {
                            stacked: true,
                          },
                          y: {
                            stacked: true,
                            ticks: {
                              callback: (value) => formatCurrency(Number(value)),
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Investment Summary</CardTitle>
                  <CardDescription>Key financial metrics and assumptions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Deferred Maintenance</span>
                      <span className="font-semibold">{formatCurrency(totalRepairCost)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Current Replacement Value</span>
                      <span className="font-semibold">{formatCurrency(totalReplacementCost || estimatedReplacementValue)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Est. Annual Savings</span>
                      <span className="font-semibold">{formatCurrency(annualBenefit)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Discount Rate Used</span>
                      <span className="font-semibold">{formatPercent(discountRate * 100)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Analysis Period</span>
                      <span className="font-semibold">{assetLifeExtension} years</span>
                    </div>
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        <strong>Note:</strong> Economic analysis uses industry-standard assumptions including 5% discount rate (PWGSC guideline), 
                        2% annual operational savings, and 30% avoided replacement costs. Actual returns may vary based on project specifics.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Operational Metrics Tab */}
          <TabsContent value="operational" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Facility Condition Index
                  </CardTitle>
                  <CardDescription>Industry-standard facility health metric</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold" style={{ color: fciRating.color }}>
                        {fci.toFixed(1)}%
                      </div>
                      <Badge 
                        variant="outline" 
                        className="mt-2"
                        style={{ borderColor: fciRating.color, color: fciRating.color }}
                      >
                        {fciRating.label}
                      </Badge>
                    </div>
                    <Progress value={Math.min(fci, 100)} className="h-3" />
                    <div className="grid grid-cols-4 gap-1 text-xs text-center">
                      <div className="text-green-600">0-5%<br/>Good</div>
                      <div className="text-amber-600">5-10%<br/>Fair</div>
                      <div className="text-red-600">10-30%<br/>Poor</div>
                      <div className="text-red-900">30%+<br/>Critical</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Condition Score
                  </CardTitle>
                  <CardDescription>Weighted average of all assessments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold">
                        {avgScore.toFixed(0)}%
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Based on {totalAssessments} assessments
                      </p>
                    </div>
                    <Progress value={avgScore} className="h-3" />
                    <div className="space-y-2">
                      {overview?.conditionDistribution?.map((d) => (
                        <div key={d.condition} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: CONDITION_COLORS[d.condition] }}
                            />
                            <span className="capitalize">{d.condition.replace('_', ' ')}</span>
                          </div>
                          <span>{d.count} ({d.percentage.toFixed(0)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Maintenance Backlog
                  </CardTitle>
                  <CardDescription>Deferred maintenance by priority</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <span className="text-sm">Immediate</span>
                        </div>
                        <span className="font-semibold">{formatCurrency(immediateCost)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-amber-500" />
                          <span className="text-sm">Short-term (1-2 yrs)</span>
                        </div>
                        <span className="font-semibold">{formatCurrency(shortTermCost)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span className="text-sm">Medium-term (3-5 yrs)</span>
                        </div>
                        <span className="font-semibold">{formatCurrency(mediumTermCost)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <span className="text-sm">Long-term (5+ yrs)</span>
                        </div>
                        <span className="font-semibold">{formatCurrency(longTermCost)}</span>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between font-semibold">
                      <span>Total Backlog</span>
                      <span>{formatCurrency(totalRepairCost)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Component Performance Analysis</CardTitle>
                <CardDescription>Top components by assessment count and repair needs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {componentAnalysis?.slice(0, 8).map((comp, idx) => (
                    <div key={comp.componentCode || idx} className="flex items-center gap-4">
                      <div className="w-8 text-sm text-muted-foreground font-mono">
                        {comp.componentCode || `C${idx + 1}`}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{comp.componentName}</span>
                          <span className="text-sm text-muted-foreground">
                            {comp.assessmentCount} assessments
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={(comp.avgConditionScore / 4) * 100} 
                            className="h-2 flex-1"
                          />
                          <span className="text-xs text-muted-foreground w-20 text-right">
                            {formatCurrency(comp.totalRepairCost)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!componentAnalysis || componentAnalysis.length === 0) && (
                    <p className="text-muted-foreground text-center py-4">No component data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conditions" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Condition Breakdown</CardTitle>
                  <CardDescription>Click on a section to filter components by condition</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    {conditionChartData ? (
                      <Doughnut
                        data={conditionChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                            },
                          },
                          onClick: (event, elements) => {
                            if (elements.length > 0) {
                              const index = elements[0].index;
                              const conditionLabel = overview?.conditionDistribution?.[index]?.condition;
                              if (conditionLabel) {
                                // Toggle selection - if same condition clicked, clear filter
                                setSelectedCondition(prev => prev === conditionLabel ? null : conditionLabel);
                              }
                            }
                          },
                          onHover: (event, elements) => {
                            const canvas = event.native?.target as HTMLCanvasElement;
                            if (canvas) {
                              canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                            }
                          },
                        }}
                      />
                    ) : (
                      <p className="text-muted-foreground">No condition data available</p>
                    )}
                  </div>
                  {selectedCondition && (
                    <div className="mt-4 flex items-center justify-between">
                      <Badge 
                        variant="secondary" 
                        className="text-sm"
                        style={{ backgroundColor: CONDITION_COLORS[selectedCondition] + '20', color: CONDITION_COLORS[selectedCondition] }}
                      >
                        Showing: {selectedCondition.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedCondition(null)}>
                        Clear Filter
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Assessed Components</CardTitle>
                  <CardDescription>Most frequently assessed building components</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] overflow-y-auto">
                    {componentAnalysis && componentAnalysis.length > 0 ? (
                      <div className="space-y-2">
                        {componentAnalysis.slice(0, 10).map((comp, index) => (
                          <div 
                            key={`${comp.componentCode}-${index}`} 
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div 
                                className="w-2 h-8 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: COLORS.primary }}
                              />
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{comp.componentName || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{comp.componentCode}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <p className="font-semibold text-sm">{comp.assessmentCount}</p>
                              <p className="text-xs text-muted-foreground">assessments</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">No component data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filtered Components List */}
            {selectedCondition && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: CONDITION_COLORS[selectedCondition] }}
                    />
                    {selectedCondition.replace('_', ' ').toUpperCase()} Components
                  </CardTitle>
                  <CardDescription>
                    {filteredComponentsLoading 
                      ? 'Loading components...' 
                      : `${filteredComponents?.length || 0} components with ${selectedCondition.replace('_', ' ')} condition`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredComponentsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredComponents && filteredComponents.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="p-3 font-medium">Component</th>
                            <th className="p-3 font-medium">Asset</th>
                            <th className="p-3 font-medium text-right">Repair Cost</th>
                            <th className="p-3 font-medium text-right">Replacement Cost</th>
                            <th className="p-3 font-medium text-right">Assessed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredComponents.map((comp) => (
                            <tr key={comp.id} className="border-b hover:bg-muted/50">
                              <td className="p-3">
                                <div>
                                  <p className="font-medium">{comp.componentName}</p>
                                  <p className="text-xs text-muted-foreground">{comp.componentCode}</p>
                                </div>
                              </td>
                              <td className="p-3">
                                <Link href={`/assets/${comp.assetId}`}>
                                  <span className="text-primary hover:underline cursor-pointer">
                                    {comp.assetName}
                                  </span>
                                </Link>
                              </td>
                              <td className="p-3 text-right">
                                {comp.repairCost > 0 ? formatCurrency(comp.repairCost) : '-'}
                              </td>
                              <td className="p-3 text-right">
                                {comp.replacementCost > 0 ? formatCurrency(comp.replacementCost) : '-'}
                              </td>
                              <td className="p-3 text-right text-muted-foreground text-sm">
                                {comp.assessedAt ? new Date(comp.assessedAt).toLocaleDateString() : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No components found with {selectedCondition.replace('_', ' ')} condition
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="deficiencies" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Deficiency Priority</CardTitle>
                  <CardDescription>Breakdown by priority level</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    {deficiencyChartData ? (
                      <Pie
                        data={deficiencyChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                            },
                          },
                        }}
                      />
                    ) : (
                      <p className="text-muted-foreground">No deficiency data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Priority Summary</CardTitle>
                  <CardDescription>Deficiencies requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {overview?.deficiencyBreakdown?.map((item) => (
                      <div key={item.priority} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ 
                              backgroundColor: item.priority === 'immediate' ? COLORS.danger :
                                item.priority === 'short_term' ? COLORS.warning :
                                item.priority === 'medium_term' ? COLORS.primary : COLORS.success
                            }}
                          />
                          <span className="capitalize">{item.priority.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{item.count}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(item.totalCost)}
                          </span>
                        </div>
                      </div>
                    )) || (
                      <p className="text-muted-foreground">No deficiency data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Trends</CardTitle>
                <CardDescription>Assessment activity over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  {trendsChartData ? (
                    <Line
                      data={trendsChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            position: 'left',
                            title: {
                              display: true,
                              text: 'Assessment Count',
                            },
                          },
                          y1: {
                            beginAtZero: true,
                            position: 'right',
                            max: 4,
                            title: {
                              display: true,
                              text: 'Condition Score (1-4)',
                            },
                            grid: {
                              drawOnChartArea: false,
                            },
                          },
                        },
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No trend data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Asset List Summary - Now Clickable */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Summary</CardTitle>
            <CardDescription>Quick overview of all assets in this project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assets?.map((asset) => (
                <Link 
                  key={asset.id} 
                  href={`/projects/${projectId}/assets/${asset.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">{asset.name}</p>
                        <p className="text-sm text-muted-foreground">{asset.assetType || 'Unknown type'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={asset.status === 'active' ? 'default' : 'secondary'}>
                        {asset.status}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
              {(!assets || assets.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No assets found in this project</p>
                  <Button variant="outline" className="mt-4" asChild>
                    <Link href={`/projects/${projectId}/assets`}>Add Assets</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
