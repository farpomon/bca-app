import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar,
  BarChart3,
  RefreshCw,
  Loader2
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ESGTrendsChartProps {
  projectId?: number;
  className?: string;
}

type DateRange = "3m" | "6m" | "1y" | "2y" | "all";
type MetricType = "composite" | "energy" | "water" | "waste" | "emissions";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "3m", label: "3 Months" },
  { value: "6m", label: "6 Months" },
  { value: "1y", label: "1 Year" },
  { value: "2y", label: "2 Years" },
  { value: "all", label: "All Time" },
];

const METRIC_OPTIONS: { value: MetricType; label: string; color: string }[] = [
  { value: "composite", label: "Composite ESG", color: "rgb(34, 197, 94)" },
  { value: "energy", label: "Energy Efficiency", color: "rgb(234, 179, 8)" },
  { value: "water", label: "Water Conservation", color: "rgb(59, 130, 246)" },
  { value: "waste", label: "Waste Management", color: "rgb(249, 115, 22)" },
  { value: "emissions", label: "Carbon Emissions", color: "rgb(107, 114, 128)" },
];

export default function ESGTrendsChart({ projectId, className }: ESGTrendsChartProps) {
  const [dateRange, setDateRange] = useState<DateRange>("1y");
  const [selectedMetrics, setSelectedMetrics] = useState<MetricType[]>(["composite"]);

  // Calculate date range
  const dateFilter = useMemo(() => {
    const now = new Date();
    let startDate: Date | undefined;
    
    switch (dateRange) {
      case "3m":
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case "6m":
        startDate = new Date(now.setMonth(now.getMonth() - 6));
        break;
      case "1y":
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case "2y":
        startDate = new Date(now.setFullYear(now.getFullYear() - 2));
        break;
      default:
        startDate = undefined;
    }
    
    return { startDate, endDate: new Date() };
  }, [dateRange]);

  // Fetch ESG score history
  const { data: scoreHistory, isLoading, refetch } = trpc.esg.getESGScoreHistory.useQuery(
    { 
      projectId: projectId || 0,
      startDate: dateFilter.startDate,
      endDate: dateFilter.endDate,
    },
    { enabled: !!projectId }
  );

  // Fetch portfolio-level trends if no project selected
  const { data: portfolioTrends, isLoading: portfolioLoading } = trpc.esgPortfolio.getPortfolioESGTrends.useQuery(
    {
      startDate: dateFilter.startDate,
      endDate: dateFilter.endDate,
    },
    { enabled: !projectId }
  );

  const trendData = projectId ? scoreHistory : portfolioTrends;
  const isLoadingData = projectId ? isLoading : portfolioLoading;

  // Toggle metric selection
  const toggleMetric = (metric: MetricType) => {
    if (selectedMetrics.includes(metric)) {
      if (selectedMetrics.length > 1) {
        setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
      }
    } else {
      setSelectedMetrics([...selectedMetrics, metric]);
    }
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!trendData || trendData.length === 0) {
      return null;
    }

    // Sort by date
    const sortedData = [...trendData].sort((a, b) => 
      new Date(a.scoreDate).getTime() - new Date(b.scoreDate).getTime()
    );

    const labels = sortedData.map(d => {
      const date = new Date(d.scoreDate);
      return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    });

    const datasets = selectedMetrics.map(metric => {
      const metricConfig = METRIC_OPTIONS.find(m => m.value === metric)!;
      let data: number[];

      switch (metric) {
        case "composite":
          data = sortedData.map(d => parseFloat(d.compositeScore || "0"));
          break;
        case "energy":
          data = sortedData.map(d => parseFloat(d.energyScore || "0"));
          break;
        case "water":
          data = sortedData.map(d => parseFloat(d.waterScore || "0"));
          break;
        case "waste":
          data = sortedData.map(d => parseFloat(d.wasteScore || "0"));
          break;
        case "emissions":
          data = sortedData.map(d => parseFloat(d.emissionsScore || "0"));
          break;
        default:
          data = [];
      }

      return {
        label: metricConfig.label,
        data,
        borderColor: metricConfig.color,
        backgroundColor: metricConfig.color.replace("rgb", "rgba").replace(")", ", 0.1)"),
        fill: selectedMetrics.length === 1,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      };
    });

    return { labels, datasets };
  }, [trendData, selectedMetrics]);

  // Calculate trend direction
  const trendDirection = useMemo(() => {
    if (!trendData || trendData.length < 2) return null;

    const sortedData = [...trendData].sort((a, b) => 
      new Date(a.scoreDate).getTime() - new Date(b.scoreDate).getTime()
    );

    const firstScore = parseFloat(sortedData[0].compositeScore || "0");
    const lastScore = parseFloat(sortedData[sortedData.length - 1].compositeScore || "0");
    const change = lastScore - firstScore;
    const percentChange = firstScore > 0 ? ((change / firstScore) * 100).toFixed(1) : "0";

    return {
      direction: change > 0.5 ? "up" : change < -0.5 ? "down" : "stable",
      change: Math.abs(change).toFixed(1),
      percentChange,
    };
  }, [trendData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}`;
          },
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          callback: (value: number) => `${value}`,
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
    interaction: {
      mode: "nearest" as const,
      axis: "x" as const,
      intersect: false,
    },
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              ESG Score Trends
            </CardTitle>
            <CardDescription>
              Track how your ESG scores change over time
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-[130px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => refetch()}
              disabled={isLoadingData}
            >
              {isLoadingData ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Metric toggles */}
        <div className="flex flex-wrap gap-2 mt-4">
          {METRIC_OPTIONS.map(metric => (
            <Badge
              key={metric.value}
              variant={selectedMetrics.includes(metric.value) ? "default" : "outline"}
              className="cursor-pointer transition-colors"
              style={{
                backgroundColor: selectedMetrics.includes(metric.value) ? metric.color : undefined,
                borderColor: metric.color,
                color: selectedMetrics.includes(metric.value) ? "white" : metric.color,
              }}
              onClick={() => toggleMetric(metric.value)}
            >
              {metric.label}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {isLoadingData ? (
          <div className="h-[300px] flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        ) : !chartData ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
            <BarChart3 className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No Historical Data</p>
            <p className="text-sm">
              Calculate ESG scores over time to see trends
            </p>
          </div>
        ) : (
          <>
            {/* Trend Summary */}
            {trendDirection && (
              <div className="flex items-center gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  {trendDirection.direction === "up" && (
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  )}
                  {trendDirection.direction === "down" && (
                    <TrendingDown className="w-5 h-5 text-red-500" />
                  )}
                  {trendDirection.direction === "stable" && (
                    <Minus className="w-5 h-5 text-gray-500" />
                  )}
                  <span className="font-medium">
                    {trendDirection.direction === "up" && "Improving"}
                    {trendDirection.direction === "down" && "Declining"}
                    {trendDirection.direction === "stable" && "Stable"}
                  </span>
                </div>
                <Badge 
                  variant="secondary"
                  className={
                    trendDirection.direction === "up" 
                      ? "bg-emerald-100 text-emerald-700" 
                      : trendDirection.direction === "down"
                      ? "bg-red-100 text-red-700"
                      : ""
                  }
                >
                  {trendDirection.direction === "up" ? "+" : trendDirection.direction === "down" ? "-" : ""}
                  {trendDirection.change} pts ({trendDirection.percentChange}%)
                </Badge>
                <span className="text-sm text-muted-foreground">
                  over {DATE_RANGE_OPTIONS.find(o => o.value === dateRange)?.label.toLowerCase()}
                </span>
              </div>
            )}

            {/* Chart */}
            <div className="h-[300px]">
              <Line data={chartData} options={chartOptions} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
