import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  DollarSign, 
  Calendar, 
  Users, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Mail,
  Phone
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface FacilitySummaryTabProps {
  projectId: number;
}

export default function FacilitySummaryTab({ projectId }: FacilitySummaryTabProps) {
  const { data: summary, isLoading } = trpc.facility.getSummary.useQuery({ projectId });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No facility summary data available
      </div>
    );
  }

  const getTrendIcon = () => {
    if (summary.condition.trend === "improving") return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (summary.condition.trend === "declining") return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getConditionBadgeColor = (rating: string) => {
    if (rating === "Excellent") return "bg-green-100 text-green-800";
    if (rating === "Good") return "bg-blue-100 text-blue-800";
    if (rating === "Fair") return "bg-yellow-100 text-yellow-800";
    if (rating === "Poor") return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const getLifecycleBadgeColor = (stage: string) => {
    if (stage === "new") return "bg-green-100 text-green-800";
    if (stage === "mid_life") return "bg-blue-100 text-blue-800";
    if (stage === "aging") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Health Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Facility Summary</CardTitle>
              <CardDescription>Consolidated operational and financial metrics</CardDescription>
            </div>
            <div className="text-center">
              <div className={`text-5xl font-bold ${getHealthColor(summary.condition.healthScore)}`}>
                {summary.condition.healthScore}
              </div>
              <div className="text-sm text-muted-foreground">Health Score</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* General Condition Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            General Condition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Condition Index (CI)</div>
              <div className="text-3xl font-bold">{summary.condition.ci.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">out of 100</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Facility Condition Index (FCI)</div>
              <div className="text-3xl font-bold">{(summary.condition.fci * 100).toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">lower is better</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Condition Rating</div>
              <Badge className={getConditionBadgeColor(summary.condition.conditionRating)}>
                {summary.condition.conditionRating}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Trend</div>
              <div className="flex items-center gap-2">
                {getTrendIcon()}
                <span className="capitalize">{summary.condition.trend}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Metrics Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Identified Costs</div>
              <div className="text-2xl font-bold">{formatCurrency(summary.financial.identifiedCosts)}</div>
              <div className="text-xs text-muted-foreground">Deferred maintenance</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Planned Costs</div>
              <div className="text-2xl font-bold">{formatCurrency(summary.financial.plannedCosts)}</div>
              <div className="text-xs text-muted-foreground">Approved renovations</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Executed Costs</div>
              <div className="text-2xl font-bold">{formatCurrency(summary.financial.executedCosts)}</div>
              <div className="text-xs text-muted-foreground">Completed work</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Budget Utilization</div>
              <div className="text-2xl font-bold">{summary.financial.budgetUtilization}%</div>
              <div className="text-xs text-muted-foreground">Executed vs planned</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Costs</span>
              <span className="text-xl font-bold">{formatCurrency(summary.financial.totalCosts)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lifecycle Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Lifecycle Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Facility Age</div>
              <div className="text-2xl font-bold">{summary.lifecycle.age} years</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Design Life</div>
              <div className="text-2xl font-bold">{summary.lifecycle.designLife} years</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Remaining Years</div>
              <div className="text-2xl font-bold">{summary.lifecycle.remainingYears} years</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Lifecycle Stage</div>
              <Badge className={getLifecycleBadgeColor(summary.lifecycle.lifecycleStage)}>
                {summary.lifecycle.lifecycleStage.replace("_", " ")}
              </Badge>
            </div>
          </div>
          {summary.lifecycle.endOfLifeDate && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">End of Design Life</span>
                <span className="text-lg font-semibold">{formatDate(summary.lifecycle.endOfLifeDate)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Administrative Details Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Administrative Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Holding Department</div>
              <div className="font-medium">{summary.administrative.holdingDepartment || "Not specified"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Facility Type</div>
              <div className="font-medium">{summary.administrative.facilityType || "Not specified"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Property Manager</div>
              <div className="font-medium">{summary.administrative.propertyManager || "Not assigned"}</div>
              {summary.administrative.managerEmail && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Mail className="h-3 w-3" />
                  <a href={`mailto:${summary.administrative.managerEmail}`} className="hover:underline">
                    {summary.administrative.managerEmail}
                  </a>
                </div>
              )}
              {summary.administrative.managerPhone && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Phone className="h-3 w-3" />
                  <a href={`tel:${summary.administrative.managerPhone}`} className="hover:underline">
                    {summary.administrative.managerPhone}
                  </a>
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Occupancy Status</div>
              <div className="font-medium capitalize">{summary.administrative.occupancyStatus || "Not specified"}</div>
              {summary.administrative.criticalityLevel && (
                <div className="mt-2">
                  <Badge variant="outline" className="capitalize">
                    {summary.administrative.criticalityLevel} Criticality
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Component Condition Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Excellent</span>
                <span className="font-medium">{summary.stats.componentsByCondition.excellent}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Good</span>
                <span className="font-medium">{summary.stats.componentsByCondition.good}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Fair</span>
                <span className="font-medium">{summary.stats.componentsByCondition.fair}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Poor</span>
                <span className="font-medium">{summary.stats.componentsByCondition.poor}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Critical</span>
                <span className="font-medium text-red-600">{summary.stats.componentsByCondition.critical}</span>
              </div>
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between font-semibold">
                  <span>Total Components</span>
                  <span>{summary.stats.totalComponents}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deficiencies by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Immediate</span>
                <span className="font-medium text-red-600">{summary.stats.deficienciesByPriority.immediate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">High</span>
                <span className="font-medium text-orange-600">{summary.stats.deficienciesByPriority.high}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Medium</span>
                <span className="font-medium text-yellow-600">{summary.stats.deficienciesByPriority.medium}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Low</span>
                <span className="font-medium">{summary.stats.deficienciesByPriority.low}</span>
              </div>
              <div className="pt-3 border-t">
                <div className="text-sm text-muted-foreground">Last Assessment</div>
                <div className="font-medium">{formatDate(summary.stats.lastAssessmentDate)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Action Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{summary.actionItems.upcomingMaintenance}</div>
              <div className="text-sm text-muted-foreground mt-1">Upcoming Maintenance</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-orange-600">{summary.actionItems.overdueItems}</div>
              <div className="text-sm text-muted-foreground mt-1">Overdue Items</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-red-600">{summary.actionItems.criticalDeficiencies}</div>
              <div className="text-sm text-muted-foreground mt-1">Critical Deficiencies</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-yellow-600">{summary.actionItems.budgetAlerts}</div>
              <div className="text-sm text-muted-foreground mt-1">Budget Alerts</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export to PDF
        </Button>
      </div>
    </div>
  );
}
