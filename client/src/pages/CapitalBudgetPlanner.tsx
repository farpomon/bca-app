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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Calendar, DollarSign, TrendingUp, FileText } from "lucide-react";
import { toast } from "sonner";

/**
 * Capital Budget Planner
 * 4-year capital renewal budget planning with project prioritization
 */
export default function CapitalBudgetPlanner() {
  const [isCreateCycleOpen, setIsCreateCycleOpen] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);

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
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Capital Budget Planning</h1>
          <p className="text-muted-foreground mt-2">
            4-year capital renewal budget aligned with strategic priorities
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cycle</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeCycle ? `${activeCycle.startYear}-${activeCycle.endYear}` : "None"}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeCycle ? activeCycle.name : "Create a budget cycle"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalBudget > 0
                ? new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 0,
                  }).format(totalBudget)
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground">4-year allocation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Allocated Projects</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cycleDetails?.allocations.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Projects funded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Cycles</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cycles?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Total cycles</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Cycles List */}
      {cycles && cycles.length > 0 ? (
        <Tabs value={selectedCycleId?.toString() || cycles[0]?.id.toString()} onValueChange={(val) => setSelectedCycleId(parseInt(val))}>
          <TabsList>
            {cycles.map((cycle: any) => (
              <TabsTrigger key={cycle.id} value={cycle.id.toString()}>
                {cycle.name}
                <Badge variant="outline" className="ml-2">
                  {cycle.status}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {cycles.map((cycle: any) => (
            <TabsContent key={cycle.id} value={cycle.id.toString()} className="space-y-4">
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

                  {/* Year-by-Year Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Budget Summary by Year</CardTitle>
                      <CardDescription>Annual allocation breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Year</TableHead>
                            <TableHead className="text-right">Allocated Amount</TableHead>
                            <TableHead className="text-center">Project Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cycleDetails.summary.map((yearSummary: any) => (
                            <TableRow key={yearSummary.year}>
                              <TableCell className="font-medium">{yearSummary.year}</TableCell>
                              <TableCell className="text-right">
                                {new Intl.NumberFormat("en-US", {
                                  style: "currency",
                                  currency: "USD",
                                  minimumFractionDigits: 0,
                                }).format(yearSummary.totalAllocated)}
                              </TableCell>
                              <TableCell className="text-center">{yearSummary.projectCount}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Project Allocations */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Allocations</CardTitle>
                      <CardDescription>Projects funded in this cycle</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {cycleDetails.allocations.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Priority</TableHead>
                              <TableHead>Project</TableHead>
                              <TableHead className="text-center">Year</TableHead>
                              <TableHead className="text-right">Allocated Amount</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                              <TableHead>Strategic Alignment</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cycleDetails.allocations.map((allocation: any) => (
                              <TableRow key={allocation.id}>
                                <TableCell>
                                  <Badge variant="outline">#{allocation.priority}</Badge>
                                </TableCell>
                                <TableCell className="font-medium">{allocation.projectName}</TableCell>
                                <TableCell className="text-center">{allocation.year}</TableCell>
                                <TableCell className="text-right">
                                  {new Intl.NumberFormat("en-US", {
                                    style: "currency",
                                    currency: "USD",
                                    minimumFractionDigits: 0,
                                  }).format(parseFloat(allocation.allocatedAmount))}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge>{allocation.status}</Badge>
                                </TableCell>
                                <TableCell className="max-w-md">
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {allocation.strategicAlignment || "—"}
                                  </p>
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
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </TabsContent>
          ))}
        </Tabs>
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
  );
}

interface CreateCycleFormProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function CreateCycleForm({ onSubmit, isLoading }: CreateCycleFormProps) {
  const currentYear = new Date().getFullYear();
  const [name, setName] = useState(`${currentYear}-${currentYear + 3} Capital Plan`);
  const [description, setDescription] = useState("");
  const [startYear, setStartYear] = useState(currentYear);
  const [endYear, setEndYear] = useState(currentYear + 3);
  const [totalBudget, setTotalBudget] = useState("");

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
          Define a 4-year capital renewal budget planning cycle
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Cycle Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., 2025-2028 Capital Plan"
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
              onChange={(e) => setStartYear(parseInt(e.target.value))}
              min={currentYear}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endYear">End Year</Label>
            <Input
              id="endYear"
              type="number"
              value={endYear}
              onChange={(e) => setEndYear(parseInt(e.target.value))}
              min={startYear}
              required
            />
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
