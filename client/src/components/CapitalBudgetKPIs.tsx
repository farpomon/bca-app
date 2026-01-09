import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, TrendingUp, FileText, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BudgetCycle {
  id: number;
  name: string;
  startYear: number;
  endYear: number;
  status: string;
  totalBudget?: string;
  projectCount?: number;
}

interface CapitalBudgetKPIsProps {
  cycles: BudgetCycle[];
  activeCycle: BudgetCycle | undefined;
  allocatedProjectsCount: number;
  // Future: Add these when backend data is available
  assessmentCoverage?: number; // % of assets assessed
  dataConfidence?: "high" | "medium" | "low";
  capitalNeedFunded?: number; // % of total capital need that is funded
  deferredBacklog?: number; // $ amount of deferred maintenance
  highRiskAddressed?: number; // % of high-risk assets addressed
  fundedVsProposed?: { funded: number; proposed: number };
}

export function CapitalBudgetKPIs({
  cycles,
  activeCycle,
  allocatedProjectsCount,
  assessmentCoverage,
  dataConfidence = "medium",
  capitalNeedFunded,
  deferredBacklog,
  highRiskAddressed,
  fundedVsProposed,
}: CapitalBudgetKPIsProps) {
  const totalBudget = activeCycle ? parseFloat(activeCycle.totalBudget || "0") : 0;
  const cycleDuration = activeCycle
    ? activeCycle.endYear - activeCycle.startYear + 1
    : 0;

  const activeCyclesCount = cycles.filter((c) => c.status === "active").length;
  const approvedCyclesCount = cycles.filter((c) => c.status === "approved").length;
  const testDraftCyclesCount = cycles.filter(
    (c) => c.status === "draft" || c.status === "test"
  ).length;

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "text-green-600";
      case "medium":
        return "text-amber-600";
      case "low":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case "high":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "medium":
        return <Info className="h-4 w-4 text-amber-600" />;
      case "low":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Active Cycle Card - Enhanced */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Cycle</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold">
            {activeCycle ? `${activeCycle.startYear}-${activeCycle.endYear}` : "None"}
          </div>
          <div className="flex items-center gap-2">
            {activeCycle && (
              <>
                <Badge variant="outline" className="text-xs">
                  {cycleDuration} {cycleDuration === 1 ? "year" : "years"}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {activeCycle.status}
                </Badge>
              </>
            )}
          </div>
          {assessmentCoverage !== undefined && (
            <div className="pt-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{assessmentCoverage}% assets assessed</span>
                    {getConfidenceIcon(dataConfidence)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Assessment coverage indicates the percentage of assets</p>
                  <p>that have current condition assessments (ASTM E2018)</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
          {!activeCycle && (
            <p className="text-xs text-muted-foreground">Create a budget cycle</p>
          )}
        </CardContent>
      </Card>

      {/* Total Budget Card - Enhanced */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold">
            {totalBudget > 0
              ? new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(totalBudget)
              : "—"}
          </div>
          {activeCycle && (
            <p className="text-xs text-muted-foreground">
              {cycleDuration}-year allocation
            </p>
          )}
          {capitalNeedFunded !== undefined && (
            <div className="pt-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(capitalNeedFunded, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">{capitalNeedFunded}%</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Percentage of estimated capital need funded</p>
                  <p>based on current facility condition index (FCI)</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
          {deferredBacklog !== undefined && deferredBacklog > 0 && (
            <div className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              <span>
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(deferredBacklog)}{" "}
                deferred
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allocated Projects Card - Enhanced */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Allocated Projects</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold">{allocatedProjectsCount}</div>
          {fundedVsProposed ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {fundedVsProposed.funded} funded / {fundedVsProposed.proposed} proposed
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${
                            (fundedVsProposed.funded / fundedVsProposed.proposed) * 100
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium">
                      {Math.round(
                        (fundedVsProposed.funded / fundedVsProposed.proposed) * 100
                      )}
                      %
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Funding rate: percentage of proposed projects</p>
                  <p>that received budget allocation</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Projects funded</p>
          )}
          {highRiskAddressed !== undefined && (
            <div className="pt-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-xs flex items-center gap-1">
                    {highRiskAddressed >= 80 ? (
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                    )}
                    <span className={highRiskAddressed >= 80 ? "text-green-600" : "text-amber-600"}>
                      {highRiskAddressed}% high-risk addressed
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Percentage of Poor/Critical condition assets</p>
                  <p>included in funded capital projects</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Cycles Card - Enhanced */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Budget Cycles</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold">{cycles.length}</div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Active</span>
              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">
                {activeCyclesCount}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Approved</span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200">
                {approvedCyclesCount}
              </Badge>
            </div>
            {testDraftCyclesCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Draft/Test</span>
                    <Badge variant="outline" className="bg-gray-500/10 text-gray-700 border-gray-200">
                      {testDraftCyclesCount}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Draft and test cycles are excluded from</p>
                  <p>executive metrics and reporting</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
