import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, AlertTriangle, Building, Filter, Download } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function PortfolioBIDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [periodType, setPeriodType] = useState<"month" | "quarter" | "year">("month");
  const [filters, setFilters] = useState<any>({});

  const { data: kpis, isLoading: kpisLoading } = trpc.dashboards.getPortfolioKPIs.useQuery(
    { filters },
    { enabled: !!user }
  );

  const { data: trends, isLoading: trendsLoading } = trpc.dashboards.getTrends.useQuery(
    { periodType, periods: 12 },
    { enabled: !!user }
  );

  const { data: comparisons, isLoading: comparisonsLoading } = trpc.dashboards.getFacilityComparisons.useQuery(
    { filters },
    { enabled: !!user }
  );

  if (authLoading || kpisLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Portfolio Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time KPIs and insights across your entire facility portfolio
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Portfolio FCI</p>
                <p className="text-3xl font-bold">{kpis?.portfolioFCI.toFixed(2)}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis?.facilityCount} facilities
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Maintenance Backlog</p>
                <p className="text-3xl font-bold">
                  ${((kpis?.maintenanceBacklog || 0) / 1000000).toFixed(1)}M
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ${((kpis?.deferredMaintenance || 0) / 1000000).toFixed(1)}M deferred
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Deficiencies</p>
                <p className="text-3xl font-bold">{kpis?.criticalDeficiencies}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Immediate attention required
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Budget Utilization</p>
                <p className="text-3xl font-bold">{kpis?.budgetUtilization.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis?.completedProjects} projects completed
                </p>
              </div>
              <Building className="h-8 w-8 text-green-500" />
            </div>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Cost Trends</h2>
            <Select value={periodType} onValueChange={(value: any) => setPeriodType(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="quarter">Quarterly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {trendsLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="totalCosts" stroke="#8884d8" name="Total Costs" />
                <Line type="monotone" dataKey="maintenanceCosts" stroke="#82ca9d" name="Maintenance" />
                <Line type="monotone" dataKey="capitalCosts" stroke="#ffc658" name="Capital" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Facility Comparisons */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Facility Comparisons</h2>

          {comparisonsLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisons || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="projectName" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="fci" fill="#8884d8" name="FCI %" />
                  <Bar dataKey="portfolioAvgFCI" fill="#82ca9d" name="Portfolio Avg FCI %" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Facility</th>
                      <th className="text-right p-2">FCI</th>
                      <th className="text-right p-2">CI</th>
                      <th className="text-right p-2">Replacement Value</th>
                      <th className="text-right p-2">Repair Costs</th>
                      <th className="text-right p-2">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisons?.map((facility) => (
                      <tr key={facility.projectId} className="border-b hover:bg-muted/50">
                        <td className="p-2">{facility.projectName}</td>
                        <td className="text-right p-2">{facility.fci.toFixed(2)}%</td>
                        <td className="text-right p-2">{facility.ci.toFixed(2)}%</td>
                        <td className="text-right p-2">
                          ${facility.replacementValue.toLocaleString()}
                        </td>
                        <td className="text-right p-2">
                          ${facility.repairCosts.toLocaleString()}
                        </td>
                        <td className={`text-right p-2 ${facility.variance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {facility.variance > 0 ? '+' : ''}{facility.variance.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
