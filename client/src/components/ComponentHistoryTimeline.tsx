import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextDisplay } from "@/components/RichTextEditor";
import { 
  Clock, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Edit, 
  Plus,
  DollarSign,
  User,
  Search,
  Filter
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ComponentHistoryTimelineProps {
  projectId: number;
  componentCode: string;
  componentName?: string;
}

const CHANGE_TYPE_ICONS: Record<string, React.ReactNode> = {
  assessment_created: <Plus className="h-4 w-4" />,
  assessment_updated: <Edit className="h-4 w-4" />,
  deficiency_created: <AlertTriangle className="h-4 w-4" />,
  deficiency_updated: <Edit className="h-4 w-4" />,
  note_added: <FileText className="h-4 w-4" />,
  specification_updated: <FileText className="h-4 w-4" />,
  recommendation_added: <CheckCircle className="h-4 w-4" />,
  recommendation_updated: <Edit className="h-4 w-4" />,
  status_changed: <CheckCircle className="h-4 w-4" />,
  cost_updated: <DollarSign className="h-4 w-4" />,
};

const CHANGE_TYPE_COLORS: Record<string, string> = {
  assessment_created: "bg-blue-500",
  assessment_updated: "bg-blue-400",
  deficiency_created: "bg-red-500",
  deficiency_updated: "bg-red-400",
  note_added: "bg-gray-500",
  specification_updated: "bg-gray-400",
  recommendation_added: "bg-green-500",
  recommendation_updated: "bg-green-400",
  status_changed: "bg-purple-500",
  cost_updated: "bg-yellow-500",
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  assessment_created: "Assessment Created",
  assessment_updated: "Assessment Updated",
  deficiency_created: "Deficiency Reported",
  deficiency_updated: "Deficiency Updated",
  note_added: "Note Added",
  specification_updated: "Specification Updated",
  recommendation_added: "Recommendation Added",
  recommendation_updated: "Recommendation Updated",
  status_changed: "Status Changed",
  cost_updated: "Cost Updated",
};

export function ComponentHistoryTimeline({
  projectId,
  componentCode,
  componentName,
}: ComponentHistoryTimelineProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const { data: history, isLoading } = trpc.history.component.useQuery({
    projectId,
    componentCode,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading history...</span>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No history recorded yet for this component.</p>
          <p className="text-sm mt-2">Changes will appear here as they occur.</p>
        </CardContent>
      </Card>
    );
  }

  // Filter history
  const filteredHistory = history.filter((entry: any) => {
    // Filter by type
    if (filterType !== "all" && entry.changeType !== filterType) {
      return false;
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        entry.summary?.toLowerCase().includes(searchLower) ||
        entry.fieldName?.toLowerCase().includes(searchLower) ||
        entry.newValue?.toLowerCase().includes(searchLower) ||
        entry.richTextContent?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Component History
          </CardTitle>
          <CardDescription>
            {componentName || componentCode} - Complete lifecycle log
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Changes</SelectItem>
                <SelectItem value="assessment_created">Assessments Created</SelectItem>
                <SelectItem value="assessment_updated">Assessments Updated</SelectItem>
                <SelectItem value="deficiency_created">Deficiencies Created</SelectItem>
                <SelectItem value="deficiency_updated">Deficiencies Updated</SelectItem>
                <SelectItem value="note_added">Notes Added</SelectItem>
                <SelectItem value="recommendation_added">Recommendations</SelectItem>
                <SelectItem value="cost_updated">Cost Changes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {filteredHistory.length} of {history.length} entries
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

        {/* Timeline entries */}
        <div className="space-y-4">
          {filteredHistory.map((entry: any, index: number) => (
            <TimelineEntry key={entry.id || index} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineEntry({ entry }: { entry: any }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const icon = CHANGE_TYPE_ICONS[entry.changeType] || <FileText className="h-4 w-4" />;
  const color = CHANGE_TYPE_COLORS[entry.changeType] || "bg-gray-500";
  const label = CHANGE_TYPE_LABELS[entry.changeType] || entry.changeType;

  return (
    <div className="relative pl-14">
      {/* Icon circle */}
      <div className={`absolute left-4 top-2 w-5 h-5 rounded-full ${color} flex items-center justify-center text-white z-10`}>
        {icon}
      </div>

      <Card>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{label}</Badge>
                  {entry.fieldName && (
                    <Badge variant="secondary" className="text-xs">
                      {entry.fieldName}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base">{entry.summary}</CardTitle>
                <CardDescription className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(entry.timestamp), "PPp")}
                  </span>
                  {entry.userName && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {entry.userName}
                    </span>
                  )}
                </CardDescription>
              </div>
              {(entry.richTextContent || entry.oldValue || entry.newValue) && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {isExpanded ? "Hide Details" : "Show Details"}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Rich text content */}
              {entry.richTextContent && (
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2">Content:</div>
                  <div className="border rounded-md p-3 bg-muted/50">
                    <RichTextDisplay content={entry.richTextContent} />
                  </div>
                </div>
              )}

              {/* Value changes */}
              {(entry.oldValue || entry.newValue) && (
                <div className="space-y-2">
                  {entry.oldValue && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Previous Value:</div>
                      <div className="border rounded-md p-2 bg-red-50 dark:bg-red-950/20 text-sm">
                        {entry.oldValue}
                      </div>
                    </div>
                  )}
                  {entry.newValue && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">New Value:</div>
                      <div className="border rounded-md p-2 bg-green-50 dark:bg-green-950/20 text-sm">
                        {entry.newValue}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
