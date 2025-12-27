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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Target, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function PortfolioTargets() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);

  const { data: targets, isLoading, refetch } = trpc.portfolioTargets.list.useQuery();
  const { data: fciTargets } = trpc.portfolioTargets.getFCITargets.useQuery();
  const createMutation = trpc.portfolioTargets.create.useMutation();
  const updateMutation = trpc.portfolioTargets.update.useMutation();
  const deleteMutation = trpc.portfolioTargets.delete.useMutation();

  const [formData, setFormData] = useState({
    targetYear: new Date().getFullYear() + 1,
    targetType: 'fci' as 'fci' | 'ci' | 'budget' | 'deficiency_reduction' | 'condition_improvement' | 'custom',
    metricName: '',
    targetValue: '',
    currentValue: '',
    baselineValue: '',
    baselineYear: new Date().getFullYear(),
    status: 'on_track' as 'on_track' | 'at_risk' | 'off_track' | 'achieved',
    description: '',
    strategicAlignment: '',
    accountableParty: '',
    reviewFrequency: 'quarterly' as 'monthly' | 'quarterly' | 'semi_annual' | 'annual',
  });

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync(formData);
      toast.success("Portfolio target created successfully");
      setIsCreateDialogOpen(false);
      refetch();
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to create portfolio target");
    }
  };

  const handleUpdate = async () => {
    if (!selectedTarget) return;
    try {
      await updateMutation.mutateAsync({
        id: selectedTarget.id,
        ...formData,
      });
      toast.success("Portfolio target updated successfully");
      setIsEditDialogOpen(false);
      refetch();
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to update portfolio target");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this portfolio target?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Portfolio target deleted successfully");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete portfolio target");
    }
  };

  const openEditDialog = (target: any) => {
    setSelectedTarget(target);
    setFormData({
      targetYear: target.targetYear || new Date().getFullYear() + 1,
      targetType: target.targetType || 'fci',
      metricName: target.metricName || '',
      targetValue: target.targetValue || '',
      currentValue: target.currentValue || '',
      baselineValue: target.baselineValue || '',
      baselineYear: target.baselineYear || new Date().getFullYear(),
      status: target.status || 'on_track',
      description: target.description || '',
      strategicAlignment: target.strategicAlignment || '',
      accountableParty: target.accountableParty || '',
      reviewFrequency: target.reviewFrequency || 'quarterly',
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      targetYear: new Date().getFullYear() + 1,
      targetType: 'fci',
      metricName: '',
      targetValue: '',
      currentValue: '',
      baselineValue: '',
      baselineYear: new Date().getFullYear(),
      status: 'on_track',
      description: '',
      strategicAlignment: '',
      accountableParty: '',
      reviewFrequency: 'quarterly',
    });
    setSelectedTarget(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      on_track: { variant: "default", icon: <TrendingUp className="h-3 w-3" /> },
      at_risk: { variant: "secondary", icon: <AlertCircle className="h-3 w-3" /> },
      off_track: { variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
      achieved: { variant: "default", icon: <Target className="h-3 w-3" /> },
    };
    const config = variants[status] || variants.on_track;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const calculateProgress = (current: string | null, target: string) => {
    if (!current || !target) return 0;
    const currentVal = parseFloat(current);
    const targetVal = parseFloat(target);
    if (targetVal === 0) return 0;
    return Math.min(100, Math.max(0, (currentVal / targetVal) * 100));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading portfolio targets...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8" />
            Portfolio Targets
          </h1>
          <p className="text-muted-foreground mt-1">
            Set and track strategic KPI goals to demonstrate portfolio improvement over time
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Target
        </Button>
      </div>

      {/* FCI Targets Summary */}
      {fciTargets && fciTargets.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {fciTargets.slice(0, 3).map((target) => (
            <Card key={target.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  FCI Target {target.targetYear}
                </CardTitle>
                <CardDescription className="text-xs">
                  {target.metricName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {target.currentValue ? `${parseFloat(target.currentValue).toFixed(1)}%` : 'N/A'}
                  <span className="text-sm text-muted-foreground ml-2">
                    / {parseFloat(target.targetValue).toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={calculateProgress(target.currentValue, target.targetValue)} 
                  className="mt-2"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {target.progressPercentage ? `${parseFloat(target.progressPercentage).toFixed(0)}%` : '0%'} complete
                  </span>
                  {getStatusBadge(target.status)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Portfolio Targets</CardTitle>
          <CardDescription>
            View and manage all strategic targets and KPIs for portfolio management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets && targets.length > 0 ? (
                  targets.map((target) => (
                    <TableRow key={target.id}>
                      <TableCell className="font-medium">{target.targetYear}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{target.targetType.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>{target.metricName}</TableCell>
                      <TableCell>{parseFloat(target.targetValue).toFixed(2)}</TableCell>
                      <TableCell>
                        {target.currentValue ? parseFloat(target.currentValue).toFixed(2) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={calculateProgress(target.currentValue, target.targetValue)} 
                            className="w-20"
                          />
                          <span className="text-xs text-muted-foreground">
                            {target.progressPercentage ? `${parseFloat(target.progressPercentage).toFixed(0)}%` : '0%'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(target.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(target)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(target.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No portfolio targets found. Add your first target to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Portfolio Target</DialogTitle>
            <DialogDescription>
              Set a new strategic KPI goal for portfolio management
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetYear">Target Year</Label>
                <Input
                  id="targetYear"
                  type="number"
                  value={formData.targetYear}
                  onChange={(e) => setFormData({ ...formData, targetYear: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetType">Target Type</Label>
                <Select
                  value={formData.targetType}
                  onValueChange={(value: any) => setFormData({ ...formData, targetType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fci">FCI (Facility Condition Index)</SelectItem>
                    <SelectItem value="ci">CI (Condition Index)</SelectItem>
                    <SelectItem value="budget">Budget</SelectItem>
                    <SelectItem value="deficiency_reduction">Deficiency Reduction</SelectItem>
                    <SelectItem value="condition_improvement">Condition Improvement</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metricName">Metric Name</Label>
              <Input
                id="metricName"
                value={formData.metricName}
                onChange={(e) => setFormData({ ...formData, metricName: e.target.value })}
                placeholder="e.g., Reduce FCI from 12% to 5% by 2030"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baselineValue">Baseline Value</Label>
                <Input
                  id="baselineValue"
                  type="number"
                  step="0.01"
                  value={formData.baselineValue}
                  onChange={(e) => setFormData({ ...formData, baselineValue: e.target.value })}
                  placeholder="e.g., 12.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentValue">Current Value</Label>
                <Input
                  id="currentValue"
                  type="number"
                  step="0.01"
                  value={formData.currentValue}
                  onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                  placeholder="e.g., 10.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetValue">Target Value</Label>
                <Input
                  id="targetValue"
                  type="number"
                  step="0.01"
                  value={formData.targetValue}
                  onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                  placeholder="e.g., 5.0"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baselineYear">Baseline Year</Label>
                <Input
                  id="baselineYear"
                  type="number"
                  value={formData.baselineYear}
                  onChange={(e) => setFormData({ ...formData, baselineYear: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewFrequency">Review Frequency</Label>
                <Select
                  value={formData.reviewFrequency}
                  onValueChange={(value: any) => setFormData({ ...formData, reviewFrequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the target and its strategic importance"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="strategicAlignment">Strategic Alignment</Label>
              <Textarea
                id="strategicAlignment"
                value={formData.strategicAlignment}
                onChange={(e) => setFormData({ ...formData, strategicAlignment: e.target.value })}
                placeholder="How does this target align with organizational strategy?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountableParty">Accountable Party</Label>
              <Input
                id="accountableParty"
                value={formData.accountableParty}
                onChange={(e) => setFormData({ ...formData, accountableParty: e.target.value })}
                placeholder="e.g., Facilities Manager, VP Operations"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Target"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Similar structure to create dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Portfolio Target</DialogTitle>
            <DialogDescription>
              Update the portfolio target details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-targetYear">Target Year</Label>
                <Input
                  id="edit-targetYear"
                  type="number"
                  value={formData.targetYear}
                  onChange={(e) => setFormData({ ...formData, targetYear: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_track">On Track</SelectItem>
                    <SelectItem value="at_risk">At Risk</SelectItem>
                    <SelectItem value="off_track">Off Track</SelectItem>
                    <SelectItem value="achieved">Achieved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-metricName">Metric Name</Label>
              <Input
                id="edit-metricName"
                value={formData.metricName}
                onChange={(e) => setFormData({ ...formData, metricName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-currentValue">Current Value</Label>
                <Input
                  id="edit-currentValue"
                  type="number"
                  step="0.01"
                  value={formData.currentValue}
                  onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-targetValue">Target Value</Label>
                <Input
                  id="edit-targetValue"
                  type="number"
                  step="0.01"
                  value={formData.targetValue}
                  onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Target"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
