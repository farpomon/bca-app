import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

interface AssessmentProgressWidgetProps {
  projectId: number;
}

export default function AssessmentProgressWidget({ projectId }: AssessmentProgressWidgetProps) {
  const { data: statusCounts, isLoading } = trpc.assessments.statusCounts.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assessment Progress</CardTitle>
          <CardDescription>Track assessment completion status</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const total = (statusCounts?.initial || 0) + (statusCounts?.active || 0) + (statusCounts?.completed || 0);
  const initialPercent = total > 0 ? Math.round(((statusCounts?.initial || 0) / total) * 100) : 0;
  const activePercent = total > 0 ? Math.round(((statusCounts?.active || 0) / total) * 100) : 0;
  const completedPercent = total > 0 ? Math.round(((statusCounts?.completed || 0) / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assessment Progress</CardTitle>
        <CardDescription>
          {total} total assessment{total !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="w-full h-8 bg-gray-100 rounded-lg overflow-hidden flex">
          {completedPercent > 0 && (
            <div 
              className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${completedPercent}%` }}
            >
              {completedPercent > 10 && `${completedPercent}%`}
            </div>
          )}
          {activePercent > 0 && (
            <div 
              className="bg-orange-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${activePercent}%` }}
            >
              {activePercent > 10 && `${activePercent}%`}
            </div>
          )}
          {initialPercent > 0 && (
            <div 
              className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${initialPercent}%` }}
            >
              {initialPercent > 10 && `${initialPercent}%`}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <div>
              <div className="font-medium">{statusCounts?.completed || 0}</div>
              <div className="text-muted-foreground text-xs">Completed</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <div>
              <div className="font-medium">{statusCounts?.active || 0}</div>
              <div className="text-muted-foreground text-xs">Active</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <div>
              <div className="font-medium">{statusCounts?.initial || 0}</div>
              <div className="text-muted-foreground text-xs">Initial</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
