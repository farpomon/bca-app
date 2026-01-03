import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Calendar, DollarSign } from "lucide-react";
import { MaintenanceEntryDialog } from "./MaintenanceEntryDialog";
import { toast } from "sonner";

interface MaintenanceEntriesTableProps {
  projectId: number;
  componentName?: string;
}

export function MaintenanceEntriesTable({ projectId, componentName }: MaintenanceEntriesTableProps) {
  const [entryTypeFilter, setEntryTypeFilter] = useState<"all" | "identified" | "executed">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  const { data: entries, isLoading, refetch } = trpc.maintenance.getEntries.useQuery({
    projectId,
    componentName,
    entryType: entryTypeFilter === "all" ? undefined : entryTypeFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const { data: costSummary } = trpc.maintenance.getCostSummary.useQuery({
    projectId,
    componentName,
  });

  const deleteEntry = trpc.maintenance.deleteEntry.useMutation({
    onSuccess: () => {
      toast.success("Maintenance entry deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete entry: ${error.message}`);
    },
  });

  const handleEdit = (entry: any) => {
    setSelectedEntry(entry);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this maintenance entry?")) {
      await deleteEntry.mutateAsync({ id });
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedEntry(null);
    refetch();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      planned: "outline",
      approved: "secondary",
      in_progress: "default",
      completed: "default",
      deferred: "secondary",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status.replace("_", " ")}</Badge>;
  };

  const getEntryTypeBadge = (type: string) => {
    return (
      <Badge variant={type === "identified" ? "outline" : "default"}>
        {type === "identified" ? "Identified" : "Executed"}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      immediate: "destructive",
      high: "default",
      medium: "secondary",
      low: "outline",
    };
    return <Badge variant={variants[priority] || "outline"}>{priority}</Badge>;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading maintenance entries...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {costSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Identified Entries</div>
            <div className="text-2xl font-bold">{costSummary.identifiedCount || 0}</div>
            <div className="text-sm text-muted-foreground">
              ${(costSummary.totalEstimated || 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Executed Entries</div>
            <div className="text-2xl font-bold">{costSummary.executedCount || 0}</div>
            <div className="text-sm text-muted-foreground">
              ${(costSummary.totalActual || 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Completed</div>
            <div className="text-2xl font-bold">{costSummary.completedCount || 0}</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Cost Variance</div>
            <div className={`text-2xl font-bold ${(costSummary.totalVariance || 0) > 0 ? "text-red-600" : "text-green-600"}`}>
              {(costSummary.totalVariance || 0) > 0 ? "+" : ""}
              ${(costSummary.totalVariance || 0).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <Select value={entryTypeFilter} onValueChange={(v: any) => setEntryTypeFilter(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Entry Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="identified">Identified</SelectItem>
              <SelectItem value="executed">Executed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="deferred">Deferred</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Entry
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Estimated Cost</TableHead>
              <TableHead>Actual Cost</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries && entries.length > 0 ? (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {entry.componentName}
                    {entry.location && <div className="text-sm text-muted-foreground">{entry.location}</div>}
                  </TableCell>
                  <TableCell>{getEntryTypeBadge(entry.entryType)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{entry.actionType.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                  <TableCell>{getStatusBadge(entry.status)}</TableCell>
                  <TableCell>{getPriorityBadge(entry.priority)}</TableCell>
                  <TableCell>
                    {entry.estimatedCost ? `$${parseFloat(entry.estimatedCost).toLocaleString()}` : "-"}
                  </TableCell>
                  <TableCell>
                    {entry.actualCost ? (
                      <div>
                        <div>${parseFloat(entry.actualCost).toLocaleString()}</div>
                        {entry.costVariance && (
                          <div
                            className={`text-xs ${parseFloat(entry.costVariance) > 0 ? "text-red-600" : "text-green-600"}`}
                          >
                            {parseFloat(entry.costVariance) > 0 ? "+" : ""}
                            ${parseFloat(entry.costVariance).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {entry.dateCompleted
                      ? new Date(entry.dateCompleted).toLocaleDateString()
                      : entry.dateScheduled
                        ? new Date(entry.dateScheduled).toLocaleDateString()
                        : entry.dateIdentified
                          ? new Date(entry.dateIdentified).toLocaleDateString()
                          : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(entry)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                        disabled={deleteEntry.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  No maintenance entries found. Click "Add Entry" to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <MaintenanceEntryDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        projectId={projectId}
        componentName={componentName}
        entry={selectedEntry}
      />
    </div>
  );
}
