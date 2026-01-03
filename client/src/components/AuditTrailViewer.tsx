import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2, History, User, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";

interface AuditTrailViewerProps {
  entityType: "assessment" | "deficiency" | "project";
  entityId: number;
  title?: string;
}

export default function AuditTrailViewer({ entityType, entityId, title }: AuditTrailViewerProps) {
  // Note: This component needs to be updated to use the new audit.list endpoint
  // For now, we'll show a placeholder
  const logs: any[] = [];
  const isLoading = false;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {title || "Change History"}
          </CardTitle>
          <CardDescription>
            No changes recorded yet
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "create":
        return "bg-green-500";
      case "update":
        return "bg-blue-500";
      case "delete":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          {title || "Change History"}
        </CardTitle>
        <CardDescription>
          {logs.length} change{logs.length !== 1 ? "s" : ""} recorded
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {logs.map((log: any) => {
            const changes = JSON.parse(log.changes);
            const metadata = log.metadata ? JSON.parse(log.metadata) : {};
            
            return (
              <div key={log.id} className="border-l-2 border-gray-200 pl-4 py-2">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={`${getActionColor(log.action)} text-white`}>
                      {log.action}
                    </Badge>
                    <span className="text-sm font-medium">
                      {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                  </div>
                </div>

                {metadata.changeDescription && (
                  <div className="flex items-start gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm text-muted-foreground">{metadata.changeDescription}</p>
                  </div>
                )}

                {log.action === "update" && changes.before && changes.after && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Changes:</p>
                    <div className="bg-gray-50 rounded p-2 text-xs space-y-1">
                      {Object.keys(changes.after).map((key) => {
                        if (changes.before[key] !== changes.after[key]) {
                          return (
                            <div key={key} className="flex gap-2">
                              <span className="font-medium">{key}:</span>
                              <span className="text-red-600 line-through">{String(changes.before[key])}</span>
                              <span>→</span>
                              <span className="text-green-600">{String(changes.after[key])}</span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>User ID: {log.userId}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
