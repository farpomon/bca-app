import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface StatusHistoryTimelineProps {
  projectId: number;
}

export default function StatusHistoryTimeline({ projectId }: StatusHistoryTimelineProps) {
  const { data: history, isLoading } = trpc.projects.statusHistory.useQuery({ projectId });

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "in_progress":
        return <Badge variant="default">In Progress</Badge>;
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "archived":
        return <Badge variant="secondary">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status Change History</CardTitle>
          <CardDescription>Track all status changes for this project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status Change History</CardTitle>
          <CardDescription>Track all status changes for this project</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No status changes recorded yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Change History</CardTitle>
        <CardDescription>
          {history.length} status change{history.length !== 1 ? 's' : ''} recorded
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {/* Timeline line */}
          <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />
          
          {history.map((entry, index) => (
            <div key={entry.id} className="relative pl-10">
              {/* Timeline dot */}
              <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {entry.previousStatus && (
                      <>
                        {getStatusBadge(entry.previousStatus)}
                        <span className="text-sm text-muted-foreground">→</span>
                      </>
                    )}
                    {getStatusBadge(entry.newStatus)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.changedAt), { addSuffix: true })}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{entry.userName}</span>
                  {entry.userEmail && (
                    <span className="text-xs">({entry.userEmail})</span>
                  )}
                </div>
                
                {entry.notes && (
                  <p className="text-sm mt-2 pt-2 border-t border-border">
                    {entry.notes}
                  </p>
                )}
                
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.changedAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
