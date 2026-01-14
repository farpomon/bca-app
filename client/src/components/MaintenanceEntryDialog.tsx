import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface MaintenanceEntryDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  componentName?: string;
  entry?: any | null;
}

export function MaintenanceEntryDialog({
  open,
  onClose,
  projectId,
  componentName: defaultComponentName,
  entry,
}: MaintenanceEntryDialogProps) {
  const [formData, setFormData] = useState({
    componentName: defaultComponentName || "",
    location: "",
    entryType: "identified" as "identified" | "executed",
    actionType: "repair" as any,
    lifecycleStage: "" as any,
    description: "",
    workPerformed: "",
    findings: "",
    estimatedCost: "",
    actualCost: "",
    status: "planned" as any,
    priority: "medium" as any,
    dateIdentified: "",
    dateScheduled: "",
    dateStarted: "",
    dateCompleted: "",
    isRecurring: false,
    recurringFrequency: "" as any,
    nextDueDate: "",
    contractor: "",
    contractorContact: "",
    warrantyExpiry: "",
    componentAge: "",
    notes: "",
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        componentName: entry.componentName || "",
        location: entry.location || "",
        entryType: entry.entryType || "identified",
        actionType: entry.actionType || "repair",
        lifecycleStage: entry.lifecycleStage || "",
        description: entry.description || "",
        workPerformed: entry.workPerformed || "",
        findings: entry.findings || "",
        estimatedCost: entry.estimatedCost || "",
        actualCost: entry.actualCost || "",
        status: entry.status || "planned",
        priority: entry.priority || "medium",
        dateIdentified: entry.dateIdentified ? new Date(entry.dateIdentified).toISOString().split("T")[0] : "",
        dateScheduled: entry.dateScheduled ? new Date(entry.dateScheduled).toISOString().split("T")[0] : "",
        dateStarted: entry.dateStarted ? new Date(entry.dateStarted).toISOString().split("T")[0] : "",
        dateCompleted: entry.dateCompleted ? new Date(entry.dateCompleted).toISOString().split("T")[0] : "",
        isRecurring: entry.isRecurring || false,
        recurringFrequency: entry.recurringFrequency || "",
        nextDueDate: entry.nextDueDate ? new Date(entry.nextDueDate).toISOString().split("T")[0] : "",
        contractor: entry.contractor || "",
        contractorContact: entry.contractorContact || "",
        warrantyExpiry: entry.warrantyExpiry ? new Date(entry.warrantyExpiry).toISOString().split("T")[0] : "",
        componentAge: entry.componentAge?.toString() || "",
        notes: entry.notes || "",
      });
    } else {
      setFormData({
        componentName: defaultComponentName || "",
        location: "",
        entryType: "identified",
        actionType: "repair",
        lifecycleStage: "",
        description: "",
        workPerformed: "",
        findings: "",
        estimatedCost: "",
        actualCost: "",
        status: "planned",
        priority: "medium",
        dateIdentified: new Date().toISOString().split("T")[0],
        dateScheduled: "",
        dateStarted: "",
        dateCompleted: "",
        isRecurring: false,
        recurringFrequency: "",
        nextDueDate: "",
        contractor: "",
        contractorContact: "",
        warrantyExpiry: "",
        componentAge: "",
        notes: "",
      });
    }
  }, [entry, defaultComponentName, open]);

  const createEntry = trpc.maintenance.createEntry.useMutation({
    onSuccess: () => {
      toast.success("Maintenance entry created");
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to create entry: ${error.message}`);
    },
  });

  const updateEntry = trpc.maintenance.updateEntry.useMutation({
    onSuccess: () => {
      toast.success("Maintenance entry updated");
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to update entry: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = {
      projectId,
      componentName: formData.componentName,
      location: formData.location || undefined,
      entryType: formData.entryType,
      actionType: formData.actionType,
      lifecycleStage: formData.lifecycleStage || undefined,
      description: formData.description,
      workPerformed: formData.workPerformed || undefined,
      findings: formData.findings || undefined,
      estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : undefined,
      actualCost: formData.actualCost ? parseFloat(formData.actualCost) : undefined,
      status: formData.status,
      priority: formData.priority,
      dateIdentified: formData.dateIdentified ? new Date(formData.dateIdentified) : undefined,
      dateScheduled: formData.dateScheduled ? new Date(formData.dateScheduled) : undefined,
      dateStarted: formData.dateStarted ? new Date(formData.dateStarted) : undefined,
      dateCompleted: formData.dateCompleted ? new Date(formData.dateCompleted) : undefined,
      isRecurring: formData.isRecurring,
      recurringFrequency: formData.recurringFrequency || undefined,
      nextDueDate: formData.nextDueDate ? new Date(formData.nextDueDate) : undefined,
      contractor: formData.contractor || undefined,
      contractorContact: formData.contractorContact || undefined,
      warrantyExpiry: formData.warrantyExpiry ? new Date(formData.warrantyExpiry) : undefined,
      componentAge: formData.componentAge ? parseInt(formData.componentAge) : undefined,
      notes: formData.notes || undefined,
    };

    if (entry) {
      await updateEntry.mutateAsync({ id: entry.id, ...data });
    } else {
      await createEntry.mutateAsync(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit Maintenance Entry" : "Add Maintenance Entry"}</DialogTitle>
          <DialogDescription>
            {entry ? "Update the maintenance entry details" : "Record a new maintenance activity"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="componentName">Component Name *</Label>
              <Input
                id="componentName"
                value={formData.componentName}
                onChange={(e) => setFormData({ ...formData, componentName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryType">Entry Type *</Label>
              <Select value={formData.entryType} onValueChange={(v: any) => setFormData({ ...formData, entryType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="identified">Identified</SelectItem>
                  <SelectItem value="executed">Executed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionType">Action Type *</Label>
              <Select value={formData.actionType} onValueChange={(v: any) => setFormData({ ...formData, actionType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="rehabilitation">Rehabilitation</SelectItem>
                  <SelectItem value="replacement">Replacement</SelectItem>
                  <SelectItem value="preventive_maintenance">Preventive Maintenance</SelectItem>
                  <SelectItem value="emergency_repair">Emergency Repair</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="upgrade">Upgrade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lifecycleStage">Lifecycle Stage</Label>
              <Select value={formData.lifecycleStage} onValueChange={(v: any) => setFormData({ ...formData, lifecycleStage: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="installation">Installation</SelectItem>
                  <SelectItem value="routine_maintenance">Routine Maintenance</SelectItem>
                  <SelectItem value="major_repair">Major Repair</SelectItem>
                  <SelectItem value="replacement">Replacement</SelectItem>
                  <SelectItem value="decommission">Decommission</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={3}
            />
          </div>

          {formData.entryType === "executed" && (
            <div className="space-y-2">
              <Label htmlFor="workPerformed">Work Performed</Label>
              <Textarea
                id="workPerformed"
                value={formData.workPerformed}
                onChange={(e) => setFormData({ ...formData, workPerformed: e.target.value })}
                rows={3}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimatedCost">Estimated Cost ($)</Label>
              <CurrencyInput
                id="estimatedCost"
                value={formData.estimatedCost}
                onChange={(value) => setFormData({ ...formData, estimatedCost: value })}
                placeholder="0.00"
              />
            </div>

            {formData.entryType === "executed" && (
              <div className="space-y-2">
                <Label htmlFor="actualCost">Actual Cost ($)</Label>
                <CurrencyInput
                  id="actualCost"
                  value={formData.actualCost}
                  onChange={(value) => setFormData({ ...formData, actualCost: value })}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="deferred">Deferred</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select value={formData.priority} onValueChange={(v: any) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="componentAge">Component Age (years)</Label>
              <Input
                id="componentAge"
                type="number"
                value={formData.componentAge}
                onChange={(e) => setFormData({ ...formData, componentAge: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateIdentified">Date Identified</Label>
              <Input
                id="dateIdentified"
                type="date"
                value={formData.dateIdentified}
                onChange={(e) => setFormData({ ...formData, dateIdentified: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateScheduled">Date Scheduled</Label>
              <Input
                id="dateScheduled"
                type="date"
                value={formData.dateScheduled}
                onChange={(e) => setFormData({ ...formData, dateScheduled: e.target.value })}
              />
            </div>
          </div>

          {formData.entryType === "executed" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateStarted">Date Started</Label>
                <Input
                  id="dateStarted"
                  type="date"
                  value={formData.dateStarted}
                  onChange={(e) => setFormData({ ...formData, dateStarted: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateCompleted">Date Completed</Label>
                <Input
                  id="dateCompleted"
                  type="date"
                  value={formData.dateCompleted}
                  onChange={(e) => setFormData({ ...formData, dateCompleted: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isRecurring"
              checked={formData.isRecurring}
              onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: checked as boolean })}
            />
            <Label htmlFor="isRecurring">Recurring Maintenance</Label>
          </div>

          {formData.isRecurring && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recurringFrequency">Frequency</Label>
                <Select
                  value={formData.recurringFrequency}
                  onValueChange={(v: any) => setFormData({ ...formData, recurringFrequency: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="biennial">Biennial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextDueDate">Next Due Date</Label>
                <Input
                  id="nextDueDate"
                  type="date"
                  value={formData.nextDueDate}
                  onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractor">Contractor</Label>
              <Input
                id="contractor"
                value={formData.contractor}
                onChange={(e) => setFormData({ ...formData, contractor: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractorContact">Contractor Contact</Label>
              <Input
                id="contractorContact"
                value={formData.contractorContact}
                onChange={(e) => setFormData({ ...formData, contractorContact: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEntry.isPending || updateEntry.isPending}>
              {entry ? "Update" : "Create"} Entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
