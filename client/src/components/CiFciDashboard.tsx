/**
 * CI/FCI Dashboard Component
 * 
 * Displays Condition Index (CI) and Facility Condition Index (FCI)
 * with real-time updates, visual indicators, and historical trends.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface CiFciDashboardProps {
  projectId: number;
}

function getCIColor(ci: number): string {
  if (ci >= 90) return "text-green-600";
  if (ci >= 75) return "text-blue-600";
  if (ci >= 50) return "text-yellow-600";
  if (ci >= 25) return "text-orange-600";
  return "text-red-600";
}

function getCIRating(ci: number): string {
  if (ci >= 90) return "Excellent";
  if (ci >= 75) return "Good";
  if (ci >= 50) return "Fair";
  if (ci >= 25) return "Poor";
  return "Critical";
}

function getCIIcon(ci: number) {
  if (ci >= 75) return <CheckCircle className="h-5 w-5 text-green-600" />;
  if (ci >= 50) return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
  return <AlertCircle className="h-5 w-5 text-red-600" />;
}

function getFCIColor(fci: number): string {
  if (fci <= 0.05) return "text-green-600";
  if (fci <= 0.10) return "text-yellow-600";
  if (fci <= 0.30) return "text-orange-600";
  return "text-red-600";
}

function getFCIRating(fci: number): string {
  if (fci <= 0.05) return "Good";
  if (fci <= 0.10) return "Fair";
  if (fci <= 0.30) return "Poor";
  return "Critical";
}

function getFCIIcon(fci: number) {
  if (fci <= 0.10) return <CheckCircle className="h-5 w-5 text-green-600" />;
  if (fci <= 0.30) return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
  return <AlertCircle className="h-5 w-5 text-red-600" />;
}

export function CiFciDashboard({ projectId }: CiFciDashboardProps) {
  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery({ id: projectId });
  const { data: snapshots, isLoading: snapshotsLoading } = trpc.cifci.getSnapshots.useQuery({ projectId });

  if (projectLoading || snapshotsLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  const ci = project.ci ? parseFloat(project.ci) : null;
  const fci = project.fci ? parseFloat(project.fci) : null;
  const deferredCost = project.deferredMaintenanceCost ? parseFloat(project.deferredMaintenanceCost) : 0;
  const replacementValue = project.currentReplacementValue ? parseFloat(project.currentReplacementValue) : 0;

  // Prepare historical data for charts
  const historicalData = (snapshots || []).reverse().map((snapshot: any) => ({
    date: format(new Date(snapshot.calculatedAt), "MMM dd"),
    ci: snapshot.ci ? parseFloat(snapshot.ci) : null,
    fci: snapshot.fci ? parseFloat(snapshot.fci) * 100 : null, // Convert to percentage
  }));

  return (
    <div className="space-y-6">
      {/* Current Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* CI Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Condition Index (CI)</CardTitle>
              {ci !== null && getCIIcon(ci)}
            </div>
            <CardDescription>Overall facility condition rating</CardDescription>
          </CardHeader>
          <CardContent>
            {ci !== null ? (
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-bold ${getCIColor(ci)}`}>
                    {ci.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">/ 100</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={ci >= 75 ? "default" : ci >= 50 ? "secondary" : "destructive"}>
                    {getCIRating(ci)}
                  </Badge>
                  {project.lastCalculatedAt && (
                    <span className="text-sm text-muted-foreground">
                      Updated {format(new Date(project.lastCalculatedAt), "MMM dd, yyyy")}
                    </span>
                  )}
                </div>

                <Progress value={ci} className="h-2" />

                <div className="text-sm text-muted-foreground">
                  <p>Higher is better. CI measures the weighted average condition of all components.</p>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">
                No assessments yet. CI will be calculated automatically when you add component assessments.
              </div>
            )}
          </CardContent>
        </Card>

        {/* FCI Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Facility Condition Index (FCI)</CardTitle>
              {fci !== null && getFCIIcon(fci)}
            </div>
            <CardDescription>Deferred maintenance ratio</CardDescription>
          </CardHeader>
          <CardContent>
            {fci !== null ? (
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-bold ${getFCIColor(fci)}`}>
                    {(fci * 100).toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={fci <= 0.10 ? "default" : fci <= 0.30 ? "secondary" : "destructive"}>
                    {getFCIRating(fci)}
                  </Badge>
                  {project.lastCalculatedAt && (
                    <span className="text-sm text-muted-foreground">
                      Updated {format(new Date(project.lastCalculatedAt), "MMM dd, yyyy")}
                    </span>
                  )}
                </div>

                <Progress value={Math.min(fci * 100, 100)} className="h-2" />

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deferred Maintenance:</span>
                    <span className="font-medium">${deferredCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Replacement Value:</span>
                    <span className="font-medium">${replacementValue.toLocaleString()}</span>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>Lower is better. FCI = Deferred Maintenance / Replacement Value</p>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">
                No data yet. FCI will be calculated automatically when you add assessments and deficiencies.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historical Trends */}
      {historicalData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Historical Trends</CardTitle>
            <CardDescription>CI and FCI changes over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" label={{ value: "CI", angle: -90, position: "insideLeft" }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: "FCI (%)", angle: 90, position: "insideRight" }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="ci" stroke="#3b82f6" name="Condition Index" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="fci" stroke="#f59e0b" name="FCI (%)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rating Scale Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Rating Scale Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">Condition Index (CI)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-16 text-green-600 font-medium">90-100</div>
                  <div>Excellent</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 text-blue-600 font-medium">75-89</div>
                  <div>Good</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 text-yellow-600 font-medium">50-74</div>
                  <div>Fair</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 text-orange-600 font-medium">25-49</div>
                  <div>Poor</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 text-red-600 font-medium">0-24</div>
                  <div>Critical</div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Facility Condition Index (FCI)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-16 text-green-600 font-medium">0-5%</div>
                  <div>Good</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 text-yellow-600 font-medium">5-10%</div>
                  <div>Fair</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 text-orange-600 font-medium">10-30%</div>
                  <div>Poor</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 text-red-600 font-medium">30%+</div>
                  <div>Critical</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
