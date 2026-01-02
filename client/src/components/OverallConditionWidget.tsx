import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, Building2, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface OverallConditionWidgetProps {
  projectId: number;
}

export default function OverallConditionWidget({ projectId }: OverallConditionWidgetProps) {
  const { data, isLoading } = trpc.projects.overallCondition.useQuery({ projectId });

  if (isLoading) {
    return (
      <Card className="stats-card-purple">
        <CardContent className="loading-container py-12">
          <Loader2 className="loading-spinner" />
          <p className="loading-text">Loading condition data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.assessmentCount === 0) {
    return (
      <Card className="stats-card-purple">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="stats-icon-purple">
              <Building2 className="h-5 w-5" />
            </div>
            Overall Building Condition
          </CardTitle>
          <CardDescription>
            Roll-up of all component assessments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="empty-state-container py-8 bg-muted/10 rounded-xl border-2 border-dashed">
            <div className="empty-state-icon">
              <Building2 className="h-10 w-10 text-primary" />
            </div>
            <p className="text-muted-foreground">No assessments completed yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRatingColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case "good":
        return "gradient-teal";
      case "fair":
        return "gradient-blue";
      case "poor":
        return "gradient-amber";
      default:
        return "bg-gray-500";
    }
  };

  const getRatingBadgeClass = (rating: string) => {
    switch (rating.toLowerCase()) {
      case "good":
        return "status-badge-completed";
      case "fair":
        return "status-badge-in-progress";
      case "poor":
        return "status-badge-draft";
      default:
        return "status-badge-archived";
    }
  };

  const getRatingIcon = (rating: string) => {
    switch (rating.toLowerCase()) {
      case "good":
        return <TrendingUp className="h-4 w-4" />;
      case "fair":
        return <Minus className="h-4 w-4" />;
      case "poor":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Card className="stats-card-purple">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="stats-icon-purple">
            <Building2 className="h-5 w-5" />
          </div>
          Overall Building Condition
        </CardTitle>
        <CardDescription>
          Based on {data.assessmentCount} component{data.assessmentCount !== 1 ? "s" : ""} assessed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Condition Rating */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Condition Rating</span>
            <span className={`${getRatingBadgeClass(data.overallConditionRating)} flex items-center gap-1`}>
              {getRatingIcon(data.overallConditionRating)}
              {data.overallConditionRating}
            </span>
          </div>
          {data.overallConditionScore !== null && (
            <div className="stats-value">
              {data.overallConditionScore.toFixed(2)} <span className="text-lg text-muted-foreground font-normal">/ 3.00</span>
            </div>
          )}
          <div className="progress-bar-container">
            <div
              className={`progress-bar-fill ${data.overallConditionRating.toLowerCase() === 'poor' ? 'progress-bar-fill-warning' : ''}`}
              style={{ width: `${((data.overallConditionScore || 0) / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* FCI Score */}
        {data.overallFciScore !== null && (
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Facility Condition Index (FCI)</span>
              <Badge variant="outline">{data.overallFciScore}%</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {data.overallFciScore <= 5 && "Excellent - New or recently renovated"}
              {data.overallFciScore > 5 && data.overallFciScore <= 10 && "Good - Well maintained"}
              {data.overallFciScore > 10 && data.overallFciScore <= 30 && "Fair - Moderate deficiencies"}
              {data.overallFciScore > 30 && "Poor - Significant deficiencies"}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="pt-4 border-t space-y-2">
          <div className="stats-label">Rating Scale</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-teal-500" />
              <span className="text-muted-foreground">Good (2.5-3.0)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Fair (1.5-2.5)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Poor (0-1.5)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
