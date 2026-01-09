import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface YearlyData {
  year: number;
  totalAllocated: number;
  projectCount: number;
}

interface CapitalResultsChartsProps {
  startYear: number;
  endYear: number;
  yearlyData: YearlyData[];
  totalBudget: number;
  // Future: Add these when backend data is available
  backlogData?: { year: number; backlog: number }[];
  riskData?: { year: number; riskScore: number }[];
  unfundedCriticalRisks?: { assetName: string; risk: string; cost: number }[];
}

export function CapitalResultsCharts({
  startYear,
  endYear,
  yearlyData,
  totalBudget,
  backlogData,
  riskData,
  unfundedCriticalRisks,
}: CapitalResultsChartsProps) {
  const cycleDuration = endYear - startYear + 1;
  const years = Array.from({ length: cycleDuration }, (_, i) => startYear + i);

  // Prepare cash flow data
  const cashFlowData = {
    labels: years.map((y) => y.toString()),
    datasets: [
      {
        label: "Annual Capital Spending",
        data: years.map((year) => {
          const yearData = yearlyData.find((d) => d.year === year);
          return yearData ? yearData.totalAllocated : 0;
        }),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const cashFlowOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(context.parsed.y);
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value: any) {
            return new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              notation: "compact",
              maximumFractionDigits: 0,
            }).format(value);
          },
        },
      },
    },
  };

  // Prepare backlog reduction data (if available)
  const backlogReductionData = backlogData
    ? {
        labels: backlogData.map((d) => d.year.toString()),
        datasets: [
          {
            label: "Deferred Maintenance Backlog",
            data: backlogData.map((d) => d.backlog),
            borderColor: "rgb(245, 158, 11)",
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            fill: true,
            tension: 0.4,
          },
        ],
      }
    : null;

  const backlogOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(context.parsed.y);
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value: any) {
            return new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              notation: "compact",
              maximumFractionDigits: 0,
            }).format(value);
          },
        },
      },
    },
  };

  // Prepare risk reduction data (if available)
  const riskReductionData = riskData
    ? {
        labels: riskData.map((d) => d.year.toString()),
        datasets: [
          {
            label: "Portfolio Risk Score",
            data: riskData.map((d) => d.riskScore),
            backgroundColor: riskData.map((d) =>
              d.riskScore > 70 ? "rgba(239, 68, 68, 0.6)" : "rgba(34, 197, 94, 0.6)"
            ),
          },
        ],
      }
    : null;

  const riskOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function (value: any) {
            return value + "%";
          },
        },
      },
    },
  };

  // Calculate spending distribution
  const totalAllocated = yearlyData.reduce((sum, d) => sum + d.totalAllocated, 0);
  const avgAnnualSpending = totalAllocated / cycleDuration;
  const peakYear = yearlyData.reduce(
    (max, d) => (d.totalAllocated > max.totalAllocated ? d : max),
    yearlyData[0] || { year: startYear, totalAllocated: 0, projectCount: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Cash Flow Curve */}
      <Card>
        <CardHeader>
          <CardTitle>Annual Capital Cash Flow</CardTitle>
          <CardDescription>
            Projected spending distribution over {cycleDuration}-year planning horizon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Allocated</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(totalAllocated)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Annual Spending</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(avgAnnualSpending)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Peak Year</p>
              <p className="text-2xl font-bold">{peakYear.year}</p>
              <p className="text-xs text-muted-foreground">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(peakYear.totalAllocated)}
              </p>
            </div>
          </div>
          <div style={{ height: "300px" }}>
            <Line data={cashFlowData} options={cashFlowOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Backlog Reduction (if data available) */}
      {backlogReductionData && (
        <Card>
          <CardHeader>
            <CardTitle>Deferred Maintenance Backlog Reduction</CardTitle>
            <CardDescription>
              Projected reduction in deferred maintenance over planning horizon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-600">
                Backlog reducing over time
              </span>
            </div>
            <div style={{ height: "300px" }}>
              <Line data={backlogReductionData} options={backlogOptions} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Reduction (if data available) */}
      {riskReductionData && (
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Risk Reduction</CardTitle>
            <CardDescription>
              Facility Condition Index (FCI) improvement through capital investment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: "300px" }}>
              <Bar data={riskReductionData} options={riskOptions} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unfunded Critical Risks (if data available) */}
      {unfundedCriticalRisks && unfundedCriticalRisks.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-amber-900">Unfunded Critical Risks</CardTitle>
            </div>
            <CardDescription className="text-amber-700">
              High-priority assets requiring attention but not funded in current cycle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unfundedCriticalRisks.slice(0, 5).map((risk, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{risk.assetName}</p>
                    <p className="text-xs text-muted-foreground">{risk.risk}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200">
                      Critical
                    </Badge>
                    <p className="text-sm font-semibold mt-1">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(risk.cost)}
                    </p>
                  </div>
                </div>
              ))}
              {unfundedCriticalRisks.length > 5 && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  + {unfundedCriticalRisks.length - 5} more unfunded critical risks
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Placeholder when no data */}
      {!backlogReductionData && !riskReductionData && !unfundedCriticalRisks && (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Additional Analytics Coming Soon</h3>
            <p className="text-muted-foreground text-sm">
              Backlog reduction, risk analysis, and unfunded critical risks will be displayed here
              <br />
              once assessment data is integrated with capital planning
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
