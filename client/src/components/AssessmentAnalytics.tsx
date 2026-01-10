import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, TrendingDown, AlertTriangle, DollarSign, RefreshCw, Database } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AssessmentAnalyticsProps {
  cycleId: number;
}

export function AssessmentAnalytics({ cycleId }: AssessmentAnalyticsProps) {
  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const { data: backlogData, isLoading: backlogLoading } = trpc.capitalPlanning.getBacklogSummary.useQuery({
    cycleId,
    filters: {
      ...(facilityFilter !== "all" && { facilityId: parseInt(facilityFilter) }),
      ...(categoryFilter !== "all" && { assetCategory: categoryFilter }),
      ...(severityFilter !== "all" && { severityLevel: severityFilter as any }),
    },
  });

  const { data: trendData, isLoading: trendLoading } = trpc.capitalPlanning.getBacklogReductionTrend.useQuery({
    cycleId,
  });

  const { data: riskData, isLoading: riskLoading } = trpc.capitalPlanning.getRiskAnalysis.useQuery({
    cycleId,
  });

  const { data: unfundedRisks, isLoading: unfundedLoading } = trpc.capitalPlanning.getUnfundedCriticalRisks.useQuery({
    cycleId,
  });

  const utils = trpc.useUtils();

  const refreshAnalytics = () => {
    utils.capitalPlanning.getBacklogSummary.invalidate();
    utils.capitalPlanning.getBacklogReductionTrend.invalidate();
    utils.capitalPlanning.getRiskAnalysis.invalidate();
    utils.capitalPlanning.getUnfundedCriticalRisks.invalidate();
  };

  const hasData = backlogData || trendData || riskData || unfundedRisks;

  if (!hasData && !backlogLoading && !trendLoading && !riskLoading && !unfundedLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Assessment Analytics</h2>
          <Button variant="outline" size="sm" onClick={refreshAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Assessment Data Available</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Connect assessment data to see backlog analysis, risk profiles, and funding impact.
            </p>
            <div className="flex gap-3">
              <Button variant="default">Connect Assessment Data</Button>
              <Button variant="outline">View Assessment Coverage</Button>
              <Button variant="outline">Map Projects to Deficiencies</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Assessment Analytics</h2>
        <Button variant="outline" size="sm" onClick={refreshAnalytics}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Facility</label>
              <Select value={facilityFilter} onValueChange={setFacilityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Facilities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Facilities</SelectItem>
                  {/* Add facility options dynamically */}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Asset Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="B2010">Envelope</SelectItem>
                  <SelectItem value="D3020">HVAC</SelectItem>
                  <SelectItem value="D5010">Electrical</SelectItem>
                  <SelectItem value="C1010">Structural</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Severity</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backlog Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Backlog Summary</CardTitle>
          <CardDescription>Total deferred maintenance backlog by severity</CardDescription>
        </CardHeader>
        <CardContent>
          {backlogLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : backlogData ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">
                  ${parseFloat(backlogData.totalBacklog || "0").toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Backlog</div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-red-50 dark:bg-red-950">
                <div className="text-2xl font-bold text-red-600">
                  ${parseFloat(backlogData.criticalBacklog || "0").toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Critical</div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-orange-50 dark:bg-orange-950">
                <div className="text-2xl font-bold text-orange-600">
                  ${parseFloat(backlogData.highBacklog || "0").toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">High</div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
                <div className="text-2xl font-bold text-yellow-600">
                  ${parseFloat(backlogData.mediumBacklog || "0").toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Medium</div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                <div className="text-2xl font-bold text-green-600">
                  ${parseFloat(backlogData.lowBacklog || "0").toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Low</div>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No backlog data available</p>
          )}
        </CardContent>
      </Card>

      {/* Backlog Reduction Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Backlog Reduction Over Time</CardTitle>
          <CardDescription>Annual and cumulative backlog reduction</CardDescription>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : trendData && trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip formatter={(value) => `$${parseFloat(value as string).toLocaleString()}`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="backlogReduced"
                  stroke="#8884d8"
                  name="Annual Reduction"
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeReduction"
                  stroke="#82ca9d"
                  name="Cumulative Reduction"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">No trend data available</p>
          )}
        </CardContent>
      </Card>

      {/* Risk Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Exposure</CardTitle>
          <CardDescription>Risk profile before and after funding</CardDescription>
        </CardHeader>
        <CardContent>
          {riskLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : riskData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {parseFloat(riskData.before?.avgRiskScore || "0").toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Risk Score (Before)</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {parseFloat(riskData.after?.avgRiskScore || "0").toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Risk Score (After)</div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                  <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-2">
                    <TrendingDown className="h-6 w-6" />
                    {parseFloat(riskData.riskReduction || "0").toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Risk Reduction</div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No risk data available</p>
          )}
        </CardContent>
      </Card>

      {/* Unfunded Critical Risks */}
      <Card>
        <CardHeader>
          <CardTitle>Unfunded Critical Risks</CardTitle>
          <CardDescription>High-priority items not yet funded</CardDescription>
        </CardHeader>
        <CardContent>
          {unfundedLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : unfundedRisks ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {unfundedRisks.summary.totalCount}
                  </div>
                  <div className="text-sm text-muted-foreground">Unfunded Critical Items</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    ${parseFloat(unfundedRisks.summary.totalValue || "0").toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Value</div>
                </div>
              </div>

              {unfundedRisks.summary.topDrivers && unfundedRisks.summary.topDrivers.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Top Risk Drivers</h4>
                  <div className="flex flex-wrap gap-2">
                    {unfundedRisks.summary.topDrivers.map((driver: any) => (
                      <Badge key={driver.driver} variant="outline">
                        {driver.driver}: {driver.count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {unfundedRisks.items && unfundedRisks.items.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Top Unfunded Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Facility</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Component</TableHead>
                        <TableHead>Risk Driver</TableHead>
                        <TableHead>Risk Score</TableHead>
                        <TableHead className="text-right">Est. Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unfundedRisks.items.slice(0, 10).map((item: any) => (
                        <TableRow key={item.deficiencyId}>
                          <TableCell className="font-medium">{item.facilityName}</TableCell>
                          <TableCell>{item.assetName}</TableCell>
                          <TableCell>{item.componentType}</TableCell>
                          <TableCell>
                            <Badge variant={item.riskDriver === "Life Safety" ? "destructive" : "outline"}>
                              {item.riskDriver}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.riskLevel === "critical" ? "destructive" : "default"}>
                              {parseFloat(item.riskScore || "0").toFixed(2)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            ${parseFloat(item.estimatedCost || "0").toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No unfunded critical risks</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
