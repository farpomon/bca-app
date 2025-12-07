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
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.assessmentCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Overall Building Condition
          </CardTitle>
          <CardDescription>
            Roll-up of all component assessments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No assessments completed yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRatingColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case "good":
        return "bg-green-500";
      case "fair":
        return "bg-yellow-500";
      case "poor":
        return "bg-red-500";
      default:
        return "bg-gray-500";
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
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
            <Badge className={`${getRatingColor(data.overallConditionRating)} text-white flex items-center gap-1`}>
              {getRatingIcon(data.overallConditionRating)}
              {data.overallConditionRating}
            </Badge>
          </div>
          {data.overallConditionScore !== null && (
            <div className="text-2xl font-bold">
              {data.overallConditionScore.toFixed(2)} / 3.00
            </div>
          )}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${getRatingColor(data.overallConditionRating)}`}
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
          <div className="text-xs font-medium text-muted-foreground">Rating Scale</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Good (2.5-3.0)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>Fair (1.5-2.5)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Poor (0-1.5)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
