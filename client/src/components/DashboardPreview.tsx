/**
 * Dashboard Preview Component for Landing Page
 * 
 * Showcases key analytics and dashboard visualizations as a marketing feature
 * Displays sample data to demonstrate the app's capabilities
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertTriangle, TrendingUp, Building2, FileText, AlertCircle } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Sample data for demonstration
const conditionData = [
  { rating: "Excellent", count: 12, percentage: 15 },
  { rating: "Good", count: 28, percentage: 35 },
  { rating: "Fair", count: 24, percentage: 30 },
  { rating: "Poor", count: 12, percentage: 15 },
  { rating: "Critical", count: 4, percentage: 5 },
];

const CONDITION_COLORS: Record<string, string> = {
  Excellent: "#10b981",
  Good: "#84cc16",
  Fair: "#eab308",
  Poor: "#f97316",
  Critical: "#ef4444",
};

const deficiencyData = [
  { priority: "Immediate", count: 8, color: "#ef4444" },
  { priority: "Short Term", count: 15, color: "#f97316" },
  { priority: "Medium Term", count: 22, color: "#eab308" },
  { priority: "Long Term", count: 18, color: "#84cc16" },
];

const trendData = [
  { month: "Jan", ci: 72, fci: 12 },
  { month: "Feb", ci: 74, fci: 11 },
  { month: "Mar", ci: 76, fci: 10 },
  { month: "Apr", ci: 78, fci: 9 },
  { month: "May", ci: 80, fci: 8 },
  { month: "Jun", ci: 82, fci: 7 },
];

const statsData = [
  { label: "Total Projects", value: "24", icon: Building2, color: "text-blue-600" },
  { label: "Assessments", value: "156", icon: FileText, color: "text-green-600" },
  { label: "Active Deficiencies", value: "63", icon: AlertCircle, color: "text-orange-600" },
];

export function DashboardPreview() {
  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* CI Card */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Condition Index (CI)</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <CardDescription>Overall facility condition rating</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-blue-600">82.0</span>
                <span className="text-muted-foreground">/ 100</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="default">Good</Badge>
                <span className="text-sm text-muted-foreground">Updated Jun 15, 2025</span>
              </div>

              <Progress value={82} className="h-2" />

              <div className="text-sm text-muted-foreground">
                <p>Higher is better. CI measures the weighted average condition of all components.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FCI Card */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Facility Condition Index (FCI)</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <CardDescription>Deferred maintenance ratio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-yellow-600">7.2%</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="default">Fair</Badge>
                <span className="text-sm text-muted-foreground">Updated Jun 15, 2025</span>
              </div>

              <Progress value={7.2} className="h-2" />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deferred Maintenance:</span>
                  <span className="font-medium">$285,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Replacement Value:</span>
                  <span className="font-medium">$3,950,000</span>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Lower is better. FCI = Deferred Maintenance / Replacement Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Condition Distribution */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Condition Distribution</CardTitle>
            <CardDescription>Component condition breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conditionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="rating" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => {
                      const percentage = props.payload.percentage;
                      return [
                        `${value} components${percentage ? ` (${percentage.toFixed(1)}%)` : ""}`,
                        "Count",
                      ];
                    }}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                    }}
                  />
                  <Bar dataKey="count" name="Components">
                    {conditionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CONDITION_COLORS[entry.rating]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Deficiency Priority */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Deficiency Priority</CardTitle>
            <CardDescription>Maintenance priorities breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deficiencyData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ priority, percent }) => `${priority} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {deficiencyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
          <CardDescription>CI and FCI changes over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" label={{ value: "CI", angle: -90, position: "insideLeft" }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: "FCI (%)", angle: 90, position: "insideRight" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                  }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="ci" stroke="#3b82f6" name="Condition Index" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="fci" stroke="#f59e0b" name="FCI (%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
