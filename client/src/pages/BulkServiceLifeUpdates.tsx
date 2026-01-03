import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Plus,
  Play,
  Undo2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  ArrowRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";

// Property types
const PROPERTY_TYPES = [
  "Office",
  "School",
  "Hospital",
  "Residential - Multi-Family",
  "Residential - Single Family",
  "Industrial",
  "Retail",
  "Warehouse",
  "Recreation Center",
  "Library",
  "Fire Station",
  "Police Station",
  "Government",
  "Mixed Use",
  "Other",
];

// Building classes
const BUILDING_CLASSES = [
  { value: "class_a", label: "Class A - Premium" },
  { value: "class_b", label: "Class B - Standard" },
  { value: "class_c", label: "Class C - Economy" },
  { value: "all", label: "All Classes" },
];

// Common UNIFORMAT II components
const COMMON_COMPONENTS = [
  { code: "A10", name: "Foundations" },
  { code: "A20", name: "Basement Construction" },
  { code: "B10", name: "Superstructure" },
  { code: "B20", name: "Exterior Enclosure" },
  { code: "B30", name: "Roofing" },
  { code: "C10", name: "Interior Construction" },
  { code: "C20", name: "Stairs" },
  { code: "C30", name: "Interior Finishes" },
  { code: "D10", name: "Conveying Systems" },
  { code: "D20", name: "Plumbing" },
  { code: "D30", name: "HVAC" },
  { code: "D40", name: "Fire Protection" },
  { code: "D50", name: "Electrical" },
  { code: "E10", name: "Equipment" },
  { code: "E20", name: "Furnishings" },
  { code: "F10", name: "Special Construction" },
  { code: "G10", name: "Site Preparation" },
  { code: "G20", name: "Site Improvements" },
  { code: "G30", name: "Site Civil/Mechanical Utilities" },
  { code: "G40", name: "Site Electrical Utilities" },
];

export default function BulkServiceLifeUpdates() {
  const { user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedUpdateId, setSelectedUpdateId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<"execute" | "rollback" | null>(null);

  // Form state
  const [form, setForm] = useState({
    updateType: "component" as "component" | "building_class" | "property_type" | "all",
    componentCode: "",
    buildingClass: "all" as "class_a" | "class_b" | "class_c" | "all",
    propertyType: "",
    previousServiceLife: "",
    newServiceLife: "",
    reason: "",
  });

  // Queries
  const bulkUpdatesQuery = trpc.buildingTemplates.bulkUpdates.list.useQuery({
    companyId: user?.companyId ?? undefined,
  });

  const previewQuery = trpc.buildingTemplates.bulkUpdates.preview.useQuery(
    {
      updateType: form.updateType,
      componentCode: form.componentCode || undefined,
      buildingClass: form.buildingClass,
      propertyType: form.propertyType || undefined,
      newServiceLife: parseInt(form.newServiceLife) || 1,
    },
    {
      enabled: createDialogOpen && !!form.newServiceLife && parseInt(form.newServiceLife) > 0,
    }
  );

  // Mutations
  const createMutation = trpc.buildingTemplates.bulkUpdates.create.useMutation({
    onSuccess: () => {
      toast.success("Bulk update created successfully");
      bulkUpdatesQuery.refetch();
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create bulk update: ${error.message}`);
    },
  });

  const executeMutation = trpc.buildingTemplates.bulkUpdates.execute.useMutation({
    onSuccess: (result) => {
      toast.success(
        `Bulk update executed successfully. Updated ${result.affectedAssessments} assessments across ${result.affectedProjects} projects.`
      );
      bulkUpdatesQuery.refetch();
      setConfirmDialogOpen(false);
      setSelectedUpdateId(null);
    },
    onError: (error) => {
      toast.error(`Failed to execute bulk update: ${error.message}`);
    },
  });

  const rollbackMutation = trpc.buildingTemplates.bulkUpdates.rollback.useMutation({
    onSuccess: (result) => {
      toast.success(`Rollback completed. Restored ${result.rolledBackCount} assessments.`);
      bulkUpdatesQuery.refetch();
      setConfirmDialogOpen(false);
      setSelectedUpdateId(null);
    },
    onError: (error) => {
      toast.error(`Failed to rollback: ${error.message}`);
    },
  });

  // Helper functions
  const resetForm = () => {
    setForm({
      updateType: "component",
      componentCode: "",
      buildingClass: "all",
      propertyType: "",
      previousServiceLife: "",
      newServiceLife: "",
      reason: "",
    });
  };

  const handleCreate = () => {
    const percentageChange = form.previousServiceLife && form.newServiceLife
      ? (((parseInt(form.newServiceLife) - parseInt(form.previousServiceLife)) / parseInt(form.previousServiceLife)) * 100).toFixed(2)
      : undefined;

    createMutation.mutate({
      updateType: form.updateType,
      componentCode: form.componentCode || undefined,
      buildingClass: form.buildingClass,
      propertyType: form.propertyType || undefined,
      previousServiceLife: form.previousServiceLife ? parseInt(form.previousServiceLife) : undefined,
      newServiceLife: parseInt(form.newServiceLife),
      percentageChange,
      reason: form.reason || undefined,
      companyId: user?.companyId ?? undefined,
    });
  };

  const handleExecute = (id: number) => {
    setSelectedUpdateId(id);
    setConfirmAction("execute");
    setConfirmDialogOpen(true);
  };

  const handleRollback = (id: number) => {
    setSelectedUpdateId(id);
    setConfirmAction("rollback");
    setConfirmDialogOpen(true);
  };

  const confirmExecution = () => {
    if (selectedUpdateId && confirmAction === "execute") {
      executeMutation.mutate({ id: selectedUpdateId });
    } else if (selectedUpdateId && confirmAction === "rollback") {
      rollbackMutation.mutate({ id: selectedUpdateId });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "in_progress":
        return <Badge variant="default"><Loader2 className="w-3 h-3 mr-1 animate-spin" />In Progress</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case "rolled_back":
        return <Badge variant="outline"><Undo2 className="w-3 h-3 mr-1" />Rolled Back</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getUpdateTypeLabel = (type: string) => {
    switch (type) {
      case "component":
        return "By Component";
      case "building_class":
        return "By Building Class";
      case "property_type":
        return "By Property Type";
      case "all":
        return "All Assessments";
      default:
        return type;
    }
  };

  const getBuildingClassLabel = (value: string) => {
    return BUILDING_CLASSES.find((c) => c.value === value)?.label || value;
  };

  const getComponentName = (code: string) => {
    return COMMON_COMPONENTS.find((c) => c.code === code)?.name || code;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-8">
        <BackButton to="dashboard" />
        
        <div className="flex items-center gap-3">
          <RefreshCw className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Bulk Service Life Updates</h1>
            <p className="text-muted-foreground">
              Update service life values across your entire portfolio
            </p>
          </div>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Portfolio-Wide Updates</AlertTitle>
          <AlertDescription>
            Bulk updates allow you to change service life values for all matching assessments across your portfolio.
            Updates can be filtered by component, building class, or property type. All changes can be rolled back if needed.
          </AlertDescription>
        </Alert>

        {/* Create New Update */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bulk Update History</CardTitle>
                <CardDescription>
                  View and manage portfolio-wide service life updates
                </CardDescription>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Bulk Update
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {bulkUpdatesQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !bulkUpdatesQuery.data || bulkUpdatesQuery.data.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No bulk updates found. Create your first bulk update to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Update Type</TableHead>
                    <TableHead>Filter</TableHead>
                    <TableHead className="text-center">Service Life Change</TableHead>
                    <TableHead className="text-right">Affected</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkUpdatesQuery.data.map((update) => (
                    <TableRow key={update.id}>
                      <TableCell className="text-sm">
                        {new Date(update.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{getUpdateTypeLabel(update.updateType)}</TableCell>
                      <TableCell className="text-sm">
                        {update.componentCode && (
                          <div>{getComponentName(update.componentCode)} ({update.componentCode})</div>
                        )}
                        {update.buildingClass && update.buildingClass !== "all" && (
                          <div>{getBuildingClassLabel(update.buildingClass)}</div>
                        )}
                        {update.propertyType && <div>{update.propertyType}</div>}
                        {!update.componentCode && !update.propertyType && update.buildingClass === "all" && (
                          <span className="text-muted-foreground">All</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-muted-foreground">
                            {update.previousServiceLife || "—"}
                          </span>
                          <ArrowRight className="w-4 h-4" />
                          <span className="font-medium">{update.newServiceLife}</span>
                          {update.percentageChange && (
                            <Badge variant={parseFloat(update.percentageChange) > 0 ? "default" : "destructive"} className="ml-1">
                              {parseFloat(update.percentageChange) > 0 ? "+" : ""}
                              {update.percentageChange}%
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {update.status === "completed" || update.status === "rolled_back" ? (
                          <div className="text-sm">
                            <div>{update.affectedAssessmentsCount} assessments</div>
                            <div className="text-muted-foreground">{update.affectedProjectsCount} projects</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(update.status)}</TableCell>
                      <TableCell className="text-right">
                        {update.status === "pending" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleExecute(update.id)}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Execute
                          </Button>
                        )}
                        {update.status === "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRollback(update.id)}
                          >
                            <Undo2 className="w-4 h-4 mr-1" />
                            Rollback
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Bulk Service Life Update</DialogTitle>
              <DialogDescription>
                Define the scope and new service life value for a portfolio-wide update
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Update Type */}
              <div className="space-y-2">
                <Label>Update Type *</Label>
                <Select
                  value={form.updateType}
                  onValueChange={(v: any) => setForm({ ...form, updateType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select update type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="component">By Component - Update all assessments for a specific component</SelectItem>
                    <SelectItem value="building_class">By Building Class - Update all assessments in buildings of a specific class</SelectItem>
                    <SelectItem value="property_type">By Property Type - Update all assessments in a specific property type</SelectItem>
                    <SelectItem value="all">All Assessments - Update all assessments portfolio-wide</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filters based on update type */}
              <div className="grid grid-cols-2 gap-4">
                {(form.updateType === "component" || form.updateType === "all") && (
                  <div className="space-y-2">
                    <Label>Component {form.updateType === "component" ? "*" : "(Optional)"}</Label>
                    <Select
                      value={form.componentCode}
                      onValueChange={(v) => setForm({ ...form, componentCode: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select component" />
                      </SelectTrigger>
                      <SelectContent>
                        {form.updateType !== "component" && (
                          <SelectItem value="">All Components</SelectItem>
                        )}
                        {COMMON_COMPONENTS.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.code} - {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(form.updateType === "building_class" || form.updateType === "all") && (
                  <div className="space-y-2">
                    <Label>Building Class {form.updateType === "building_class" ? "*" : "(Optional)"}</Label>
                    <Select
                      value={form.buildingClass}
                      onValueChange={(v: any) => setForm({ ...form, buildingClass: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select building class" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUILDING_CLASSES.map((cls) => (
                          <SelectItem key={cls.value} value={cls.value}>{cls.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(form.updateType === "property_type" || form.updateType === "all") && (
                  <div className="space-y-2">
                    <Label>Property Type {form.updateType === "property_type" ? "*" : "(Optional)"}</Label>
                    <Select
                      value={form.propertyType || "all"}
                      onValueChange={(v) => setForm({ ...form, propertyType: v === "all" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select property type" />
                      </SelectTrigger>
                      <SelectContent>
                        {form.updateType !== "property_type" && (
                          <SelectItem value="all">All Property Types</SelectItem>
                        )}
                        {PROPERTY_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Service Life Values */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Previous Service Life (years)</Label>
                  <Input
                    type="number"
                    value={form.previousServiceLife}
                    onChange={(e) => setForm({ ...form, previousServiceLife: e.target.value })}
                    placeholder="Current value (optional)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional: For reference and percentage calculation
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>New Service Life (years) *</Label>
                  <Input
                    type="number"
                    value={form.newServiceLife}
                    onChange={(e) => setForm({ ...form, newServiceLife: e.target.value })}
                    placeholder="New value"
                  />
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label>Reason for Update</Label>
                <Textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Explain why this update is being made..."
                  rows={2}
                />
              </div>

              {/* Preview */}
              {previewQuery.data && (
                <Alert>
                  <Building2 className="h-4 w-4" />
                  <AlertTitle>Update Preview</AlertTitle>
                  <AlertDescription>
                    This update will affect approximately{" "}
                    <strong>{previewQuery.data.estimatedAffectedAssessments}</strong> assessments
                    across <strong>{previewQuery.data.estimatedAffectedProjects}</strong> projects.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  !form.newServiceLife ||
                  parseInt(form.newServiceLife) <= 0 ||
                  (form.updateType === "component" && !form.componentCode) ||
                  (form.updateType === "property_type" && !form.propertyType) ||
                  createMutation.isPending
                }
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {confirmAction === "execute" ? "Confirm Execution" : "Confirm Rollback"}
              </DialogTitle>
              <DialogDescription>
                {confirmAction === "execute"
                  ? "This will update all matching assessments across your portfolio. This action can be rolled back later."
                  : "This will restore all affected assessments to their previous service life values."}
              </DialogDescription>
            </DialogHeader>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                {confirmAction === "execute"
                  ? "Make sure you have reviewed the update parameters before proceeding."
                  : "This will undo all changes made by this bulk update."}
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={confirmAction === "rollback" ? "destructive" : "default"}
                onClick={confirmExecution}
                disabled={executeMutation.isPending || rollbackMutation.isPending}
              >
                {(executeMutation.isPending || rollbackMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {confirmAction === "execute" ? "Execute Update" : "Rollback"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
