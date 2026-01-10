import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Archive, CheckSquare, Square } from "lucide-react";

interface CycleManagementProps {
  cycles: any[];
  onCycleChange?: () => void;
}

export function CycleManagement({ cycles, onCycleChange }: CycleManagementProps) {
  const [manageMode, setManageMode] = useState(false);
  const [selectedCycles, setSelectedCycles] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [deleteType, setDeleteType] = useState<"single" | "bulk">("single");
  const [cycleToDelete, setCycleToDelete] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const deleteCycleMutation = trpc.capitalPlanning.deleteCycle.useMutation({
    onSuccess: () => {
      utils.prioritization.getBudgetCycles.invalidate();
      setDeleteDialogOpen(false);
      setConfirmChecked(false);
      setCycleToDelete(null);
      toast.success("Cycle deleted successfully");
      onCycleChange?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteCyclesBulkMutation = trpc.capitalPlanning.deleteCyclesBulk.useMutation({
    onSuccess: (data) => {
      utils.prioritization.getBudgetCycles.invalidate();
      setDeleteDialogOpen(false);
      setConfirmChecked(false);
      setSelectedCycles([]);
      setManageMode(false);
      toast.success(`${data.deletedCount} cycles deleted successfully`);
      onCycleChange?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const archiveCycleMutation = trpc.capitalPlanning.archiveCycle.useMutation({
    onSuccess: () => {
      utils.prioritization.getBudgetCycles.invalidate();
      toast.success("Cycle archived successfully");
      onCycleChange?.();
    },
  });

  const archiveCyclesBulkMutation = trpc.capitalPlanning.archiveCyclesBulk.useMutation({
    onSuccess: (data) => {
      utils.prioritization.getBudgetCycles.invalidate();
      setSelectedCycles([]);
      setManageMode(false);
      toast.success(`${data.archivedCount} cycles archived successfully`);
      onCycleChange?.();
    },
  });

  const handleSelectCycle = (cycleId: number) => {
    setSelectedCycles((prev) =>
      prev.includes(cycleId)
        ? prev.filter((id) => id !== cycleId)
        : [...prev, cycleId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCycles.length === cycles.length) {
      setSelectedCycles([]);
    } else {
      setSelectedCycles(cycles.map((c) => c.id));
    }
  };

  const handleDeleteSingle = (cycleId: number) => {
    setCycleToDelete(cycleId);
    setDeleteType("single");
    setDeleteDialogOpen(true);
  };

  const handleDeleteBulk = () => {
    if (selectedCycles.length === 0) {
      toast.error("Please select at least one cycle to delete");
      return;
    }
    setDeleteType("bulk");
    setDeleteDialogOpen(true);
  };

  const handleArchiveBulk = () => {
    if (selectedCycles.length === 0) {
      toast.error("Please select at least one cycle to archive");
      return;
    }
    archiveCyclesBulkMutation.mutate({ cycleIds: selectedCycles });
  };

  const handleConfirmDelete = () => {
    if (!confirmChecked) {
      toast.error('Please check the confirmation box to proceed');
      return;
    }

    if (deleteType === "single" && cycleToDelete) {
      deleteCycleMutation.mutate({
        cycleId: cycleToDelete,
        confirmText: "DELETE",
      });
    } else if (deleteType === "bulk") {
      deleteCyclesBulkMutation.mutate({
        cycleIds: selectedCycles,
        confirmText: "DELETE",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      approved: "secondary",
      planning: "outline",
      completed: "secondary",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {status}
      </Badge>
    );
  };

  const selectedCyclesData = cycles.filter((c) => selectedCycles.includes(c.id));
  const hasActiveCycle = selectedCyclesData.some((c) => c.status === "active");
  const hasApprovedCycle = selectedCyclesData.some((c) => c.status === "approved");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Cycle Management</h2>
        <div className="flex gap-2">
          {manageMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="gap-2"
              >
                {selectedCycles.length === cycles.length ? (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4" />
                    Select All
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchiveBulk}
                disabled={selectedCycles.length === 0}
                className="gap-2"
              >
                <Archive className="h-4 w-4" />
                Archive Selected ({selectedCycles.length})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteBulk}
                disabled={selectedCycles.length === 0}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected ({selectedCycles.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setManageMode(false);
                  setSelectedCycles([]);
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setManageMode(true)}
            >
              Manage Cycles
            </Button>
          )}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {manageMode && (
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedCycles.length === cycles.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}
            <TableHead>Name</TableHead>
            <TableHead>Years</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Created</TableHead>
            {!manageMode && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {cycles.map((cycle) => (
            <TableRow key={cycle.id}>
              {manageMode && (
                <TableCell>
                  <Checkbox
                    checked={selectedCycles.includes(cycle.id)}
                    onCheckedChange={() => handleSelectCycle(cycle.id)}
                  />
                </TableCell>
              )}
              <TableCell className="font-medium">{cycle.name}</TableCell>
              <TableCell>
                {cycle.startYear} - {cycle.endYear}
              </TableCell>
              <TableCell>{getStatusBadge(cycle.status)}</TableCell>
              <TableCell>
                ${parseFloat(cycle.totalBudget || "0").toLocaleString()}
              </TableCell>
              <TableCell>
                {new Date(cycle.createdAt).toLocaleDateString()}
              </TableCell>
              {!manageMode && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => archiveCycleMutation.mutate({ cycleId: cycle.id })}
                      disabled={cycle.status === "completed"}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSingle(cycle.id)}
                      disabled={cycle.status === "active"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              {deleteType === "single" ? (
                <div className="space-y-2">
                  <p>You are about to delete 1 cycle.</p>
                  <p className="text-sm text-muted-foreground">
                    This will permanently remove:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    <li>Cycle configuration (years, assumptions)</li>
                    <li>Funding allocations</li>
                    <li>Scenario results</li>
                    <li>Analytics outputs (backlog/risk/unfunded critical)</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-2">
                  <p>You are about to delete {selectedCycles.length} cycles:</p>
                  <ul className="list-disc list-inside text-sm">
                    {selectedCyclesData.map((c) => (
                      <li key={c.id}>
                        {c.name} ({c.startYear}-{c.endYear})
                      </li>
                    ))}
                  </ul>
                  {hasActiveCycle && (
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ Cannot delete active cycle. Please select a replacement active cycle first.
                    </p>
                  )}
                  {hasApprovedCycle && (
                    <p className="text-sm text-amber-600 font-medium">
                      ⚠️ You are deleting approved cycles.
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    This will permanently remove all associated data.
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirmDelete"
                checked={confirmChecked}
                onCheckedChange={(checked) => setConfirmChecked(checked === true)}
              />
              <Label
                htmlFor="confirmDelete"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I understand this action cannot be undone
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setConfirmChecked(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={
                !confirmChecked ||
                deleteCycleMutation.isPending ||
                deleteCyclesBulkMutation.isPending ||
                hasActiveCycle
              }
            >
              {deleteCycleMutation.isPending || deleteCyclesBulkMutation.isPending
                ? "Deleting..."
                : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
