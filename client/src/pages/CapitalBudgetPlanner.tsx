import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CycleSelector } from "@/components/CycleSelector";
import { CapitalBudgetKPIs } from "@/components/CapitalBudgetKPIs";
import { CapitalResultsCharts } from "@/components/CapitalResultsCharts";
import { YearRangeSummary } from "@/components/YearRangeSummary";
import { ProjectFilterBar, ProjectFilters } from "@/components/ProjectFilterBar";
import { CycleManagement } from "@/components/CycleManagement";
import { AssessmentAnalytics } from "@/components/AssessmentAnalytics";
import { Loader2, Plus, Calendar, DollarSign, TrendingUp, FileText, ArrowLeft, Info, HelpCircle, Pencil, Trash2, Check, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useLocation } from "wouter";

/**
 * Capital Budget Planner
 * 4-year capital renewal budget planning with project prioritization
 */
export default function CapitalBudgetPlanner() {
  const [isCreateCycleOpen, setIsCreateCycleOpen] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const [projectFilters, setProjectFilters] = useState<ProjectFilters>({
    assetType: "all",
    conditionLevel: "all",
    fundingStatus: "all",
  });
  const [editingAllocationId, setEditingAllocationId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    priority: number;
    year: number;
    allocatedAmount: number;
    status: string;
    strategicAlignment: string;
  }>({ priority: 1, year: 2025, allocatedAmount: 0, status: "proposed", strategicAlignment: "" });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const handleBack = () => {
    // Try browser history first
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback to capital planning overview
      setLocation("/");
    }
  };

  const { data: cycles, isLoading: cyclesLoading } = trpc.prioritization.getBudgetCycles.useQuery();
  const { data: cycleDetails, isLoading: detailsLoading } = trpc.prioritization.getBudgetCycle.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId }
  );

  const utils = trpc.useUtils();

  const createCycleMutation = trpc.prioritization.createBudgetCycle.useMutation({
    onSuccess: () => {
      utils.prioritization.getBudgetCycles.invalidate();
      setIsCreateCycleOpen(false);
      toast.success("Budget cycle created");
    },
  });

  const updateAllocationMutation = trpc.prioritization.updateAllocation.useMutation({
    onSuccess: () => {
      if (selectedCycleId) {
        utils.prioritization.getBudgetCycle.invalidate({ cycleId: selectedCycleId });
        utils.prioritization.getBudgetCycles.invalidate();
      }
      setEditingAllocationId(null);
      toast.success("Allocation updated successfully");
    },
    onError: (err) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  const deleteAllocationMutation = trpc.prioritization.deleteAllocation.useMutation({
    onSuccess: () => {
      if (selectedCycleId) {
        utils.prioritization.getBudgetCycle.invalidate({ cycleId: selectedCycleId });
        utils.prioritization.getBudgetCycles.invalidate();
      }
      setDeleteConfirmId(null);
      toast.success("Allocation deleted successfully");
    },
    onError: (err) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });

  const startEditing = (allocation: any) => {
    setEditingAllocationId(allocation.id);
    setEditForm({
      priority: allocation.priority,
      year: allocation.year,
      allocatedAmount: parseFloat(allocation.allocatedAmount),
      status: allocation.status || "proposed",
      strategicAlignment: allocation.strategicAlignment || "",
    });
  };

  const saveEdit = () => {
    if (!editingAllocationId) return;
    updateAllocationMutation.mutate({
      allocationId: editingAllocationId,
      priority: editForm.priority,
      year: editForm.year,
      allocatedAmount: editForm.allocatedAmount,
      status: editForm.status as "proposed" | "approved" | "funded" | "completed",
      strategicAlignment: editForm.strategicAlignment,
    });
  };

  const cancelEdit = () => {
    setEditingAllocationId(null);
  };

  if (cyclesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeCycle = cycles?.find((c: any) => c.status === "active");
  const totalBudget = activeCycle ? parseFloat(activeCycle.totalBudget || "0") : 0;

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">Capital Budget Planning</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 space-y-8">
      {/* Page Description and Actions */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            Multi-year capital renewal budget aligned with strategic priorities (1-30 year planning cycles)
          </p>
        </div>
        <Dialog open={isCreateCycleOpen} onOpenChange={setIsCreateCycleOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Budget Cycle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <CreateCycleForm
              onSubmit={(data) => createCycleMutation.mutate(data)}
              isLoading={createCycleMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Enhanced KPI Cards */}
      <CapitalBudgetKPIs
        cycles={cycles || []}
        activeCycle={activeCycle}
        allocatedProjectsCount={cycleDetails?.allocations.length || 0}
        // Future: Add these metrics when backend data is available
        // assessmentCoverage={85}
        // dataConfidence="high"
        // capitalNeedFunded={67}
        // deferredBacklog={2500000}
        // highRiskAddressed={78}
        // fundedVsProposed={{ funded: 12, proposed: 18 }}
      />

      {/* Budget Cycles Selector */}
      {cycles && cycles.length > 0 ? (
        <>
          <CycleSelector
            cycles={cycles}
            selectedCycleId={selectedCycleId || cycles[0]?.id}
            onSelectCycle={setSelectedCycleId}
          />

          {selectedCycleId && (
            <div className="space-y-4">
              {detailsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : cycleDetails ? (
                <>
                  {/* Cycle Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{cycleDetails.cycle.name}</CardTitle>
                      <CardDescription>{cycleDetails.cycle.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Time Period</p>
                          <p className="text-lg font-semibold">
                            {cycleDetails.cycle.startYear} - {cycleDetails.cycle.endYear}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                          <p className="text-lg font-semibold">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              minimumFractionDigits: 0,
                            }).format(parseFloat(cycleDetails.cycle.totalBudget || "0"))}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Status</p>
                          <Badge className="mt-1">{cycleDetails.cycle.status}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Capital Results Visualizations */}
                  <CapitalResultsCharts
                    startYear={cycleDetails.cycle.startYear}
                    endYear={cycleDetails.cycle.endYear}
                    yearlyData={cycleDetails.summary}
                    totalBudget={parseFloat(cycleDetails.cycle.totalBudget || "0")}
                    // Future: Add these when backend data is available
                    // backlogData={[...]}
                    // riskData={[...]}
                    // unfundedCriticalRisks={[...]}
                  />

                  {/* Year-by-Year Summary with Scalability */}
                  <YearRangeSummary
                    startYear={cycleDetails.cycle.startYear}
                    endYear={cycleDetails.cycle.endYear}
                    yearlyData={cycleDetails.summary}
                  />

                  {/* Project Allocations */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Allocations</CardTitle>
                      <CardDescription>Projects funded in this cycle</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Filter Bar */}
                      <ProjectFilterBar
                        filters={projectFilters}
                        onFiltersChange={setProjectFilters}
                        // Future: Pass available asset types from backend
                        // availableAssetTypes={["Building", "Infrastructure", "Equipment"]}
                      />

                      {/* Allocations Table */}
                      <div>
                      {(() => {
                        // Apply filters
                        let filteredAllocations = cycleDetails.allocations;
                        
                        if (projectFilters.fundingStatus && projectFilters.fundingStatus !== "all") {
                          filteredAllocations = filteredAllocations.filter(
                            (a: any) => a.status?.toLowerCase() === projectFilters.fundingStatus
                          );
                        }
                        
                        // Future: Add asset type and condition filtering when data is available
                        
                        return filteredAllocations.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>
                                <div className="flex items-center gap-1">
                                  Priority
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Priority ranking based on multi-criteria</p>
                                      <p>scoring (ASTM E2018 methodology)</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableHead>
                              <TableHead>Project</TableHead>
                              <TableHead className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  Year
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Planned execution year based on</p>
                                      <p>remaining useful life (RUL) and risk</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableHead>
                              <TableHead className="text-right">Allocated Amount</TableHead>
                              <TableHead className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  Status
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Funded: Budget allocated</p>
                                      <p>Proposed: Awaiting approval</p>
                                      <p>Deferred: Postponed to future cycle</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableHead>
                              <TableHead>
                                <div className="flex items-center gap-1">
                                  Strategic Alignment
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Alignment with organizational strategic</p>
                                      <p>priorities and asset management plan (ISO 55000)</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableHead>
                              <TableHead className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  Rationale
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Explanation of funding decision</p>
                                      <p>based on condition, risk, and priority</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableHead>
                              <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredAllocations.map((allocation: any) => (
                              <TableRow key={allocation.id}>
                                <TableCell>
                                  {editingAllocationId === allocation.id ? (
                                    <Input
                                      type="number"
                                      min={1}
                                      value={editForm.priority}
                                      onChange={(e) => setEditForm({ ...editForm, priority: parseInt(e.target.value) || 1 })}
                                      className="w-16 h-8 text-center"
                                    />
                                  ) : (
                                    <Badge variant="outline">#{allocation.priority}</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">{allocation.projectName}</TableCell>
                                <TableCell className="text-center">
                                  {editingAllocationId === allocation.id ? (
                                    <Input
                                      type="number"
                                      min={2020}
                                      max={2060}
                                      value={editForm.year}
                                      onChange={(e) => setEditForm({ ...editForm, year: parseInt(e.target.value) || 2025 })}
                                      className="w-20 h-8 text-center"
                                    />
                                  ) : (
                                    allocation.year
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {editingAllocationId === allocation.id ? (
                                    <Input
                                      type="number"
                                      min={0}
                                      step={1000}
                                      value={editForm.allocatedAmount}
                                      onChange={(e) => setEditForm({ ...editForm, allocatedAmount: parseFloat(e.target.value) || 0 })}
                                      className="w-32 h-8 text-right"
                                    />
                                  ) : (
                                    new Intl.NumberFormat("en-US", {
                                      style: "currency",
                                      currency: "USD",
                                      minimumFractionDigits: 0,
                                    }).format(parseFloat(allocation.allocatedAmount))
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {editingAllocationId === allocation.id ? (
                                    <Select
                                      value={editForm.status}
                                      onValueChange={(val) => setEditForm({ ...editForm, status: val })}
                                    >
                                      <SelectTrigger className="w-28 h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="proposed">Proposed</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="funded">Funded</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Badge>{allocation.status}</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="max-w-md">
                                  {editingAllocationId === allocation.id ? (
                                    <Input
                                      value={editForm.strategicAlignment}
                                      onChange={(e) => setEditForm({ ...editForm, strategicAlignment: e.target.value })}
                                      placeholder="Strategic alignment..."
                                      className="h-8"
                                    />
                                  ) : (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {allocation.strategicAlignment || "—"}
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <Info className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-sm">
                                      <p className="font-semibold mb-1">Funding Decision</p>
                                      <p className="text-xs">
                                        {allocation.status === "funded"
                                          ? `Funded due to priority rank #${allocation.priority} and alignment with strategic objectives. Project addresses critical facility needs within available budget constraints.`
                                          : allocation.status === "proposed"
                                          ? `Proposed for funding pending budget approval. Priority rank #${allocation.priority} indicates importance but requires additional authorization.`
                                          : `Deferred to future cycle due to budget constraints. Priority rank #${allocation.priority} will be re-evaluated in next planning cycle.`}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TableCell>
                                <TableCell className="text-center">
                                  {editingAllocationId === allocation.id ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={saveEdit}
                                        disabled={updateAllocationMutation.isPending}
                                      >
                                        {updateAllocationMutation.isPending ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Check className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                        onClick={cancelEdit}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : deleteConfirmId === allocation.id ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => deleteAllocationMutation.mutate({ allocationId: allocation.id })}
                                        disabled={deleteAllocationMutation.isPending}
                                      >
                                        {deleteAllocationMutation.isPending ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Check className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                        onClick={() => setDeleteConfirmId(null)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => startEditing(allocation)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => setDeleteConfirmId(allocation.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <p>No projects allocated yet.</p>
                          <p className="text-sm mt-2">
                            Use the Prioritization Dashboard to score projects and allocate budget.
                          </p>
                          </div>
                        );
                      })()}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cycle Management */}
                  <CycleManagement
                    cycles={cycles || []}
                    onCycleChange={() => {
                      utils.prioritization.getBudgetCycles.invalidate();
                      if (selectedCycleId) {
                        utils.prioritization.getBudgetCycle.invalidate({ cycleId: selectedCycleId });
                      }
                    }}
                  />

                  {/* Assessment Analytics */}
                  {selectedCycleId && (
                    <AssessmentAnalytics cycleId={selectedCycleId} />
                  )}
                </>
              ) : null}
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Budget Cycles</h3>
            <p className="text-muted-foreground mb-4">
              Create a 4-year capital budget cycle to begin planning
            </p>
            <Button onClick={() => setIsCreateCycleOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Cycle
            </Button>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}

interface CreateCycleFormProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function CreateCycleForm({ onSubmit, isLoading }: CreateCycleFormProps) {
  const currentYear = new Date().getFullYear();
  const [name, setName] = useState(`${currentYear}-${currentYear + 4} Capital Plan`);
  const [description, setDescription] = useState("");
  const [startYear, setStartYear] = useState(currentYear);
  const [endYear, setEndYear] = useState(currentYear + 4);
  const [totalBudget, setTotalBudget] = useState("");
  const [cycleDuration, setCycleDuration] = useState(5);

  const handleDurationChange = (duration: number) => {
    setCycleDuration(duration);
    const newEndYear = startYear + duration - 1;
    setEndYear(newEndYear);
    setName(`${startYear}-${newEndYear} Capital Plan`);
  };

  const handleStartYearChange = (year: number) => {
    setStartYear(year);
    const newEndYear = year + cycleDuration - 1;
    setEndYear(newEndYear);
    setName(`${year}-${newEndYear} Capital Plan`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      startYear,
      endYear,
      totalBudget: totalBudget ? parseFloat(totalBudget) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Create Budget Cycle</DialogTitle>
        <DialogDescription>
          Define a capital renewal budget planning cycle (1-30 years)
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="cycleDuration">Planning Horizon</Label>
          <Select
            value={cycleDuration.toString()}
            onValueChange={(val) => handleDurationChange(parseInt(val))}
          >
            <SelectTrigger id="cycleDuration">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Year (Emergency Plan)</SelectItem>
              <SelectItem value="2">2 Years (Short-term)</SelectItem>
              <SelectItem value="3">3 Years (Short-term)</SelectItem>
              <SelectItem value="5">5 Years (Medium-term)</SelectItem>
              <SelectItem value="10">10 Years (Medium-term)</SelectItem>
              <SelectItem value="15">15 Years (Long-term)</SelectItem>
              <SelectItem value="20">20 Years (Long-term)</SelectItem>
              <SelectItem value="25">25 Years (Long-term)</SelectItem>
              <SelectItem value="30">30 Years (Strategic)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Short-term: 1-3 years | Medium-term: 4-10 years | Long-term: 11-30 years
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Cycle Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., 2025-2029 Capital Plan"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Purpose and goals of this budget cycle"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startYear">Start Year</Label>
            <Input
              id="startYear"
              type="number"
              value={startYear}
              onChange={(e) => handleStartYearChange(parseInt(e.target.value))}
              min={currentYear}
              max={currentYear + 10}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endYear">End Year</Label>
            <Input
              id="endYear"
              type="number"
              value={endYear}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Auto-calculated from start year + duration
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalBudget">Total Budget (Optional)</Label>
          <Input
            id="totalBudget"
            type="number"
            value={totalBudget}
            onChange={(e) => setTotalBudget(e.target.value)}
            placeholder="0"
            min="0"
            step="1000"
          />
          <p className="text-xs text-muted-foreground">
            Total available budget for the entire cycle
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Cycle
        </Button>
      </DialogFooter>
    </form>
  );
}
