import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Building2,
  Calendar,
  Target,
  Gauge,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Wallet,
  Calculator,
  LineChart,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  Area,
  AreaChart,
  ComposedChart,
} from "recharts";

interface Assessment {
  id: number;
  componentCode: string | null;
  componentName: string | null;
  condition: string | null;
  estimatedRepairCost: number | null;
  replacementValue: number | null;
  actionYear: number | null;
  remainingUsefulLife: number | null;
  expectedUsefulLife: number | null;
}

interface Deficiency {
  id: number;
  severity: string;
  priority: string;
  estimatedCost: number | null;
}

interface AssetFinancialTabProps {
  asset: {
    id: number;
    name: string;
    yearBuilt?: number | null;
    grossFloorArea?: number | null;
    currentReplacementValue?: string | null;
    replacementValue?: string | null;
  };
  assessments: Assessment[] | undefined;
  deficiencies: Deficiency[] | undefined;
}

// UNIFORMAT Level 1 Categories
const UNIFORMAT_CATEGORIES: Record<string, string> = {
  A: "Substructure",
  B: "Shell",
  C: "Interiors",
  D: "Services (MEP)",
  E: "Equipment & Furnishings",
  F: "Special Construction",
  G: "Site",
};

// Color palette for charts
const CATEGORY_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
];

const FCI_COLORS = {
  good: "#10b981",
  fair: "#f59e0b",
  poor: "#f97316",
  critical: "#ef4444",
};

export function AssetFinancialTab({ asset, assessments, deficiencies }: AssetFinancialTabProps) {
  // Calculate financial metrics
  const metrics = useMemo(() => {
    const totalRepairCost = assessments?.reduce((sum, a) => sum + (a.estimatedRepairCost || 0), 0) || 0;
    const totalReplacementValue = assessments?.reduce((sum, a) => sum + (a.replacementValue || 0), 0) || 0;
    
    // Use asset's CRV if available, otherwise use sum from assessments
    const assetCRV = asset.currentReplacementValue ? parseFloat(asset.currentReplacementValue) : 0;
    const assetRV = asset.replacementValue ? parseFloat(asset.replacementValue) : 0;
    const currentReplacementValue = assetCRV > 0 ? assetCRV : (assetRV > 0 ? assetRV : totalReplacementValue);
    
    // Calculate FCI (Facility Condition Index)
    const fci = currentReplacementValue > 0 ? (totalRepairCost / currentReplacementValue) * 100 : 0;
    
    // FCI Rating
    let fciRating: "good" | "fair" | "poor" | "critical" = "good";
    if (fci > 30) fciRating = "critical";
    else if (fci > 10) fciRating = "poor";
    else if (fci > 5) fciRating = "fair";
    
    // Calculate deficiency costs
    const deficiencyCost = deficiencies?.reduce((sum, d) => sum + (d.estimatedCost || 0), 0) || 0;
    
    // Priority breakdown
    const immediateCost = deficiencies?.filter(d => d.priority === "immediate").reduce((sum, d) => sum + (d.estimatedCost || 0), 0) || 0;
    const shortTermCost = deficiencies?.filter(d => d.priority === "short_term").reduce((sum, d) => sum + (d.estimatedCost || 0), 0) || 0;
    const mediumTermCost = deficiencies?.filter(d => d.priority === "medium_term").reduce((sum, d) => sum + (d.estimatedCost || 0), 0) || 0;
    const longTermCost = deficiencies?.filter(d => d.priority === "long_term").reduce((sum, d) => sum + (d.estimatedCost || 0), 0) || 0;
    
    // Asset age
    const currentYear = new Date().getFullYear();
    const assetAge = asset.yearBuilt ? currentYear - asset.yearBuilt : null;
    
    // Cost per square foot
    const costPerSqFt = asset.grossFloorArea && asset.grossFloorArea > 0 
      ? totalRepairCost / asset.grossFloorArea 
      : null;
    
    // Average component age factor
    const avgRemainingLife = assessments && assessments.length > 0
      ? assessments.reduce((sum, a) => sum + (a.remainingUsefulLife || 0), 0) / assessments.length
      : null;
    
    return {
      totalRepairCost,
      totalReplacementValue,
      currentReplacementValue,
      fci,
      fciRating,
      deficiencyCost,
      immediateCost,
      shortTermCost,
      mediumTermCost,
      longTermCost,
      assetAge,
      costPerSqFt,
      avgRemainingLife,
      assessmentCount: assessments?.length || 0,
      deficiencyCount: deficiencies?.length || 0,
    };
  }, [asset, assessments, deficiencies]);

  // Capital planning forecast data
  const capitalForecast = useMemo(() => {
    if (!assessments || assessments.length === 0) return [];
    
    const currentYear = new Date().getFullYear();
    const yearlyData: Record<number, number> = {};
    
    // Group costs by action year
    assessments.forEach(a => {
      if (a.actionYear && a.estimatedRepairCost) {
        yearlyData[a.actionYear] = (yearlyData[a.actionYear] || 0) + a.estimatedRepairCost;
      }
    });
    
    // Create 20-year forecast
    const forecast = [];
    let cumulativeCost = 0;
    
    for (let i = 0; i < 20; i++) {
      const year = currentYear + i;
      const cost = yearlyData[year] || 0;
      cumulativeCost += cost;
      
      forecast.push({
        year: year.toString(),
        cost,
        cumulative: cumulativeCost,
      });
    }
    
    return forecast;
  }, [assessments]);

  // Cost breakdown by category with component details
  const categoryBreakdown = useMemo(() => {
    if (!assessments || assessments.length === 0) return [];
    
    const categoryData: Record<string, { 
      repairCost: number; 
      replacementValue: number; 
      count: number;
      components: Assessment[];
    }> = {};
    
    assessments.forEach(a => {
      const categoryCode = a.componentCode?.charAt(0) || "Z";
      if (!categoryData[categoryCode]) {
        categoryData[categoryCode] = { repairCost: 0, replacementValue: 0, count: 0, components: [] };
      }
      categoryData[categoryCode].repairCost += a.estimatedRepairCost || 0;
      categoryData[categoryCode].replacementValue += a.replacementValue || 0;
      categoryData[categoryCode].count += 1;
      categoryData[categoryCode].components.push(a);
    });
    
    return Object.entries(categoryData)
      .map(([code, data]) => ({
        code,
        name: UNIFORMAT_CATEGORIES[code] || "Other",
        repairCost: data.repairCost,
        replacementValue: data.replacementValue,
        count: data.count,
        fci: data.replacementValue > 0 ? (data.repairCost / data.replacementValue) * 100 : 0,
        components: data.components.sort((a, b) => (b.estimatedRepairCost || 0) - (a.estimatedRepairCost || 0)),
      }))
      .filter(c => c.repairCost > 0)
      .sort((a, b) => b.repairCost - a.repairCost);
  }, [assessments]);

  // State for expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (code: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  // Get condition color
  const getConditionColor = (condition: string | null) => {
    switch (condition) {
      case 'good': return '#10b981';
      case 'fair': return '#f59e0b';
      case 'poor': return '#f97316';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getConditionLabel = (condition: string | null) => {
    switch (condition) {
      case 'good': return 'Good';
      case 'fair': return 'Fair';
      case 'poor': return 'Poor';
      case 'critical': return 'Critical';
      case 'not_assessed': return 'Not Assessed';
      default: return 'N/A';
    }
  };

  // Priority distribution for pie chart
  const priorityDistribution = useMemo(() => {
    return [
      { name: "Immediate", value: metrics.immediateCost, color: "#ef4444" },
      { name: "Short-term", value: metrics.shortTermCost, color: "#f97316" },
      { name: "Medium-term", value: metrics.mediumTermCost, color: "#f59e0b" },
      { name: "Long-term", value: metrics.longTermCost, color: "#10b981" },
    ].filter(d => d.value > 0);
  }, [metrics]);

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  // FCI Gauge Component
  const FCIGauge = () => {
    const fciPercent = Math.min(metrics.fci, 50); // Cap at 50% for display
    const gaugePercent = (fciPercent / 50) * 100;
    
    return (
      <div className="relative flex flex-col items-center">
        <div className="relative w-48 h-24 overflow-hidden">
          {/* Background arc */}
          <div className="absolute inset-0 rounded-t-full border-8 border-muted" />
          {/* Colored arc */}
          <div 
            className="absolute inset-0 rounded-t-full border-8 transition-all duration-1000"
            style={{
              borderColor: FCI_COLORS[metrics.fciRating],
              clipPath: `polygon(0 100%, 0 0, ${gaugePercent}% 0, ${gaugePercent}% 100%)`,
            }}
          />
          {/* Center display */}
          <div className="absolute inset-0 flex items-end justify-center pb-2">
            <div className="text-center">
              <span className="text-3xl font-bold" style={{ color: FCI_COLORS[metrics.fciRating] }}>
                {metrics.fci.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Badge 
            variant="outline" 
            className="text-sm font-semibold"
            style={{ 
              borderColor: FCI_COLORS[metrics.fciRating],
              color: FCI_COLORS[metrics.fciRating],
            }}
          >
            {metrics.fciRating.charAt(0).toUpperCase() + metrics.fciRating.slice(1)} Condition
          </Badge>
        </div>
        {/* Scale labels */}
        <div className="flex justify-between w-48 mt-2 text-xs text-muted-foreground">
          <span>0%</span>
          <span>5%</span>
          <span>10%</span>
          <span>30%</span>
          <span>50%+</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Section with Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deferred Maintenance */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Deferred Maintenance</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(metrics.totalRepairCost)}</p>
                {metrics.costPerSqFt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ${metrics.costPerSqFt.toFixed(2)}/sq ft
                  </p>
                )}
              </div>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Wallet className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Replacement Value */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Replacement Value</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(metrics.currentReplacementValue)}</p>
                {asset.grossFloorArea && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ${(metrics.currentReplacementValue / asset.grossFloorArea).toFixed(0)}/sq ft
                  </p>
                )}
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FCI Score */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Facility Condition Index</p>
                <p className="text-2xl font-bold mt-1" style={{ color: FCI_COLORS[metrics.fciRating] }}>
                  {metrics.fci.toFixed(1)}%
                </p>
                <Badge 
                  variant="outline" 
                  className="mt-1 text-xs"
                  style={{ 
                    borderColor: FCI_COLORS[metrics.fciRating],
                    color: FCI_COLORS[metrics.fciRating],
                  }}
                >
                  {metrics.fciRating.charAt(0).toUpperCase() + metrics.fciRating.slice(1)}
                </Badge>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${FCI_COLORS[metrics.fciRating]}20` }}>
                <Gauge className="h-5 w-5" style={{ color: FCI_COLORS[metrics.fciRating] }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Immediate Needs */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Immediate Needs</p>
                <p className="text-2xl font-bold mt-1 text-red-600">{formatCurrency(metrics.immediateCost)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.deficiencyCount} deficiencies identified
                </p>
              </div>
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="forecast">Capital Forecast</TabsTrigger>
          <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* FCI Gauge Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Facility Condition Index (FCI)
                </CardTitle>
                <CardDescription>
                  Industry-standard metric: Deferred Maintenance ÷ Replacement Value
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center py-4">
                  <FCIGauge />
                  <div className="mt-6 w-full space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        Good (0-5%)
                      </span>
                      <span className="text-muted-foreground">Routine maintenance only</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        Fair (5-10%)
                      </span>
                      <span className="text-muted-foreground">Plan for repairs</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        Poor (10-30%)
                      </span>
                      <span className="text-muted-foreground">Prioritize repairs</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        Critical (&gt;30%)
                      </span>
                      <span className="text-muted-foreground">Major investment needed</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Financial Summary
                </CardTitle>
                <CardDescription>
                  Key financial metrics and cost allocation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Total Assessments</span>
                    <span className="font-semibold">{metrics.assessmentCount}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Total Deficiencies</span>
                    <span className="font-semibold">{metrics.deficiencyCount}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Deferred Maintenance</span>
                    <span className="font-semibold">{formatCurrency(metrics.totalRepairCost)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Current Replacement Value</span>
                    <span className="font-semibold">{formatCurrency(metrics.currentReplacementValue)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">FCI Score</span>
                    <span className="font-semibold" style={{ color: FCI_COLORS[metrics.fciRating] }}>
                      {metrics.fci.toFixed(2)}%
                    </span>
                  </div>
                  {metrics.assetAge && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Asset Age</span>
                      <span className="font-semibold">{metrics.assetAge} years</span>
                    </div>
                  )}
                  {metrics.avgRemainingLife && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Avg. Remaining Life</span>
                      <span className="font-semibold">{metrics.avgRemainingLife.toFixed(1)} years</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Priority Distribution */}
          {priorityDistribution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Cost Distribution by Priority
                </CardTitle>
                <CardDescription>
                  Breakdown of repair costs by urgency level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={priorityDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {priorityDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ 
                            borderRadius: '8px', 
                            border: 'none', 
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4">
                    {priorityDistribution.map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{item.name}</span>
                            <span className="font-semibold">{formatCurrency(item.value)}</span>
                          </div>
                          <Progress 
                            value={(item.value / metrics.totalRepairCost) * 100} 
                            className="h-2 mt-1"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Capital Forecast Tab */}
        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                20-Year Capital Renewal Forecast
              </CardTitle>
              <CardDescription>
                Projected capital expenditures based on component action years
              </CardDescription>
            </CardHeader>
            <CardContent>
              {capitalForecast.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={capitalForecast} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                      <XAxis 
                        dataKey="year" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        interval={1}
                      />
                      <YAxis 
                        yAxisId="left"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => formatCurrency(val)}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => formatCurrency(val)}
                      />
                      <RechartsTooltip 
                        formatter={(val: number, name: string) => [formatCurrency(val), name === 'cost' ? 'Annual Cost' : 'Cumulative']}
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: 'none', 
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          backgroundColor: 'hsl(var(--background))',
                        }}
                      />
                      <Legend />
                      <Bar 
                        yAxisId="left"
                        dataKey="cost" 
                        name="Annual Cost"
                        fill="#3b82f6" 
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="cumulative" 
                        name="Cumulative"
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg border-2 border-dashed">
                  <div className="text-center">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No forecast data available.</p>
                    <p className="text-sm text-muted-foreground">Add action years and costs to assessments.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5-Year Period Summary */}
          {capitalForecast.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>5-Year Period Summary</CardTitle>
                <CardDescription>Capital expenditure grouped by planning periods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: "Years 1-5", start: 0, end: 5 },
                    { label: "Years 6-10", start: 5, end: 10 },
                    { label: "Years 11-15", start: 10, end: 15 },
                    { label: "Years 16-20", start: 15, end: 20 },
                  ].map((period, index) => {
                    const periodTotal = capitalForecast
                      .slice(period.start, period.end)
                      .reduce((sum, d) => sum + d.cost, 0);
                    const percentOfTotal = metrics.totalRepairCost > 0 
                      ? (periodTotal / metrics.totalRepairCost) * 100 
                      : 0;
                    
                    return (
                      <Card key={index} className="bg-muted/30">
                        <CardContent className="pt-4">
                          <p className="text-sm font-medium text-muted-foreground">{period.label}</p>
                          <p className="text-xl font-bold mt-1">{formatCurrency(periodTotal)}</p>
                          <Progress value={percentOfTotal} className="h-1.5 mt-2" />
                          <p className="text-xs text-muted-foreground mt-1">{percentOfTotal.toFixed(1)}% of total</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Cost Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Cost Breakdown by Building System
              </CardTitle>
              <CardDescription>
                UNIFORMAT II classification cost distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryBreakdown.length > 0 ? (
                <>
                  <div className="h-72 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={categoryBreakdown} 
                        layout="vertical"
                        margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-muted" />
                        <XAxis 
                          type="number"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(val) => formatCurrency(val)}
                        />
                        <YAxis 
                          type="category"
                          dataKey="name"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          width={90}
                        />
                        <RechartsTooltip 
                          formatter={(val: number) => formatCurrency(val)}
                          contentStyle={{ 
                            borderRadius: '8px', 
                            border: 'none', 
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            backgroundColor: 'hsl(var(--background))',
                          }}
                        />
                        <Bar 
                          dataKey="repairCost" 
                          name="Repair Cost"
                          radius={[0, 4, 4, 0]}
                        >
                          {categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Detailed Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-3 px-4 text-left font-semibold">Category</th>
                          <th className="py-3 px-4 text-right font-semibold">Components</th>
                          <th className="py-3 px-4 text-right font-semibold">Repair Cost</th>
                          <th className="py-3 px-4 text-right font-semibold">Replacement Value</th>
                          <th className="py-3 px-4 text-right font-semibold">Category FCI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryBreakdown.map((category, index) => {
                          const isExpanded = expandedCategories.has(category.code);
                          return (
                            <>
                              <tr 
                                key={category.code} 
                                className="border-b hover:bg-muted/20 cursor-pointer transition-colors"
                                onClick={() => toggleCategory(category.code)}
                              >
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                                    />
                                    <span className="font-medium">{category.code} - {category.name}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right">{category.count}</td>
                                <td className="py-3 px-4 text-right font-semibold">{formatCurrency(category.repairCost)}</td>
                                <td className="py-3 px-4 text-right text-muted-foreground">{formatCurrency(category.replacementValue)}</td>
                                <td className="py-3 px-4 text-right">
                                  <Badge 
                                    variant="outline"
                                    style={{ 
                                      borderColor: category.fci > 30 ? FCI_COLORS.critical : category.fci > 10 ? FCI_COLORS.poor : category.fci > 5 ? FCI_COLORS.fair : FCI_COLORS.good,
                                      color: category.fci > 30 ? FCI_COLORS.critical : category.fci > 10 ? FCI_COLORS.poor : category.fci > 5 ? FCI_COLORS.fair : FCI_COLORS.good,
                                    }}
                                  >
                                    {category.fci.toFixed(1)}%
                                  </Badge>
                                </td>
                              </tr>
                              {/* Expanded component assessments */}
                              {isExpanded && category.components.map((component) => (
                                <tr 
                                  key={`${category.code}-${component.id}`} 
                                  className="bg-muted/10 border-b border-muted/30"
                                >
                                  <td className="py-2 px-4 pl-12">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono text-muted-foreground">
                                        {component.componentCode || 'N/A'}
                                      </span>
                                      <span className="text-sm">{component.componentName || 'Unknown Component'}</span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-4 text-right">
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs"
                                      style={{ 
                                        borderColor: getConditionColor(component.condition),
                                        color: getConditionColor(component.condition),
                                      }}
                                    >
                                      {getConditionLabel(component.condition)}
                                    </Badge>
                                  </td>
                                  <td className="py-2 px-4 text-right text-sm">
                                    {component.estimatedRepairCost ? formatCurrency(component.estimatedRepairCost) : '-'}
                                  </td>
                                  <td className="py-2 px-4 text-right text-sm text-muted-foreground">
                                    {component.replacementValue ? formatCurrency(component.replacementValue) : '-'}
                                  </td>
                                  <td className="py-2 px-4 text-right text-xs text-muted-foreground">
                                    {component.remainingUsefulLife !== null ? `${component.remainingUsefulLife} yrs RUL` : '-'}
                                  </td>
                                </tr>
                              ))}
                            </>
                          );
                        })}
                        <tr className="font-bold bg-muted/50">
                          <td className="py-3 px-4">Total</td>
                          <td className="py-3 px-4 text-right">{metrics.assessmentCount}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(metrics.totalRepairCost)}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(metrics.currentReplacementValue)}</td>
                          <td className="py-3 px-4 text-right">
                            <Badge 
                              style={{ 
                                backgroundColor: FCI_COLORS[metrics.fciRating],
                                color: 'white',
                              }}
                            >
                              {metrics.fci.toFixed(1)}%
                            </Badge>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg border-2 border-dashed">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No cost breakdown data available.</p>
                    <p className="text-sm text-muted-foreground">Add repair costs to assessments.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Analysis Tab */}
        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Financial Risk Indicators */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Financial Risk Indicators
                </CardTitle>
                <CardDescription>
                  Key risk metrics based on asset condition
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* FCI Risk */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">FCI Risk Level</span>
                    <Badge 
                      style={{ 
                        backgroundColor: FCI_COLORS[metrics.fciRating],
                        color: 'white',
                      }}
                    >
                      {metrics.fciRating.charAt(0).toUpperCase() + metrics.fciRating.slice(1)}
                    </Badge>
                  </div>
                  <Progress 
                    value={Math.min(metrics.fci / 50 * 100, 100)} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {metrics.fci <= 5 && "Asset is in good condition with minimal deferred maintenance."}
                    {metrics.fci > 5 && metrics.fci <= 10 && "Some deferred maintenance exists. Plan for repairs within 1-3 years."}
                    {metrics.fci > 10 && metrics.fci <= 30 && "Significant deferred maintenance. Prioritize capital investment."}
                    {metrics.fci > 30 && "Critical condition. Major capital investment required immediately."}
                  </p>
                </div>

                {/* Immediate Needs Ratio */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Immediate Needs Ratio</span>
                    <span className="font-semibold">
                      {metrics.totalRepairCost > 0 
                        ? ((metrics.immediateCost / metrics.totalRepairCost) * 100).toFixed(1) 
                        : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={metrics.totalRepairCost > 0 ? (metrics.immediateCost / metrics.totalRepairCost) * 100 : 0} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatCurrency(metrics.immediateCost)} of {formatCurrency(metrics.totalRepairCost)} requires immediate attention
                  </p>
                </div>

                {/* Age Factor */}
                {metrics.assetAge && (
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Age Risk Factor</span>
                      <span className="font-semibold">{metrics.assetAge} years</span>
                    </div>
                    <Progress 
                      value={Math.min((metrics.assetAge / 50) * 100, 100)} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {metrics.assetAge < 20 && "Relatively new asset with lower age-related risk."}
                      {metrics.assetAge >= 20 && metrics.assetAge < 40 && "Mature asset. Monitor component lifecycles closely."}
                      {metrics.assetAge >= 40 && "Aging asset. Expect increased maintenance and renewal needs."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Funding Gap Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Funding Scenarios
                </CardTitle>
                <CardDescription>
                  Impact analysis for different funding levels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Full Funding", percent: 100, description: "Address all deferred maintenance" },
                  { label: "75% Funding", percent: 75, description: "Focus on critical and high-priority items" },
                  { label: "50% Funding", percent: 50, description: "Address immediate and short-term needs only" },
                  { label: "25% Funding", percent: 25, description: "Emergency repairs only" },
                ].map((scenario, index) => {
                  const fundingAmount = metrics.totalRepairCost * (scenario.percent / 100);
                  const remainingDeferred = metrics.totalRepairCost - fundingAmount;
                  const projectedFCI = metrics.currentReplacementValue > 0 
                    ? (remainingDeferred / metrics.currentReplacementValue) * 100 
                    : 0;
                  
                  return (
                    <div key={index} className="p-4 rounded-lg border hover:bg-muted/20 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium">{scenario.label}</span>
                          <p className="text-xs text-muted-foreground">{scenario.description}</p>
                        </div>
                        <span className="font-semibold text-lg">{formatCurrency(fundingAmount)}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Remaining:</span>
                          <span className="font-medium">{formatCurrency(remainingDeferred)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Projected FCI:</span>
                          <Badge 
                            variant="outline"
                            style={{ 
                              borderColor: projectedFCI > 30 ? FCI_COLORS.critical : projectedFCI > 10 ? FCI_COLORS.poor : projectedFCI > 5 ? FCI_COLORS.fair : FCI_COLORS.good,
                              color: projectedFCI > 30 ? FCI_COLORS.critical : projectedFCI > 10 ? FCI_COLORS.poor : projectedFCI > 5 ? FCI_COLORS.fair : FCI_COLORS.good,
                            }}
                          >
                            {projectedFCI.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Financial Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metrics.fci > 30 && (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800 dark:text-red-200">Critical Investment Required</p>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          FCI exceeds 30%. Immediate capital planning and budget allocation is essential to prevent further deterioration.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {metrics.immediateCost > 0 && (
                  <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-orange-800 dark:text-orange-200">Immediate Needs</p>
                        <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                          {formatCurrency(metrics.immediateCost)} in immediate repairs identified. Prioritize these items in the next budget cycle.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {metrics.fci <= 10 && (
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">Good Standing</p>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          Asset is in {metrics.fci <= 5 ? 'good' : 'fair'} condition. Maintain current preventive maintenance program.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800 dark:text-blue-200">Annual Reserve Target</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Recommended annual reserve: {formatCurrency(metrics.currentReplacementValue * 0.02)} - {formatCurrency(metrics.currentReplacementValue * 0.04)} (2-4% of CRV)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AssetFinancialTab;
