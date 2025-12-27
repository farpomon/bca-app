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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EconomicIndicators() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null);

  const { data: indicators, isLoading, refetch } = trpc.economicIndicators.list.useQuery();
  const { data: regions } = trpc.economicIndicators.getRegions.useQuery();
  const createMutation = trpc.economicIndicators.create.useMutation();
  const updateMutation = trpc.economicIndicators.update.useMutation();
  const deleteMutation = trpc.economicIndicators.delete.useMutation();

  const [formData, setFormData] = useState({
    indicatorDate: new Date().toISOString().split('T')[0],
    region: 'Canada',
    cpiInflationRate: '',
    constructionInflationRate: '',
    materialInflationRate: '',
    laborInflationRate: '',
    primeRate: '',
    bondYield10Year: '',
    recommendedDiscountRate: '',
    riskFreeRate: '',
    gdpGrowthRate: '',
    unemploymentRate: '',
    exchangeRateUSD: '',
  });

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync(formData);
      toast.success("Economic indicator created successfully");
      setIsCreateDialogOpen(false);
      refetch();
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to create economic indicator");
    }
  };

  const handleUpdate = async () => {
    if (!selectedIndicator) return;
    try {
      await updateMutation.mutateAsync({
        id: selectedIndicator.id,
        ...formData,
      });
      toast.success("Economic indicator updated successfully");
      setIsEditDialogOpen(false);
      refetch();
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to update economic indicator");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this economic indicator?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Economic indicator deleted successfully");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete economic indicator");
    }
  };

  const openEditDialog = (indicator: any) => {
    setSelectedIndicator(indicator);
    setFormData({
      indicatorDate: indicator.indicatorDate || '',
      region: indicator.region || 'Canada',
      cpiInflationRate: indicator.cpiInflationRate || '',
      constructionInflationRate: indicator.constructionInflationRate || '',
      materialInflationRate: indicator.materialInflationRate || '',
      laborInflationRate: indicator.laborInflationRate || '',
      primeRate: indicator.primeRate || '',
      bondYield10Year: indicator.bondYield10Year || '',
      recommendedDiscountRate: indicator.recommendedDiscountRate || '',
      riskFreeRate: indicator.riskFreeRate || '',
      gdpGrowthRate: indicator.gdpGrowthRate || '',
      unemploymentRate: indicator.unemploymentRate || '',
      exchangeRateUSD: indicator.exchangeRateUSD || '',
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      indicatorDate: new Date().toISOString().split('T')[0],
      region: 'Canada',
      cpiInflationRate: '',
      constructionInflationRate: '',
      materialInflationRate: '',
      laborInflationRate: '',
      primeRate: '',
      bondYield10Year: '',
      recommendedDiscountRate: '',
      riskFreeRate: '',
      gdpGrowthRate: '',
      unemploymentRate: '',
      exchangeRateUSD: '',
    });
    setSelectedIndicator(null);
  };

  const formatPercentage = (value: string | null) => {
    if (!value) return 'N/A';
    return `${parseFloat(value).toFixed(2)}%`;
  };

  const formatCurrency = (value: string | null) => {
    if (!value) return 'N/A';
    return `$${parseFloat(value).toFixed(4)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading economic indicators...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Economic Indicators
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage construction inflation rates, discount rates, and regional economic data for financial forecasting
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Indicator
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Economic Indicators</CardTitle>
          <CardDescription>
            View and manage economic data used for NPV calculations and financial forecasting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Construction Inflation</TableHead>
                  <TableHead>Discount Rate</TableHead>
                  <TableHead>Prime Rate</TableHead>
                  <TableHead>GDP Growth</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indicators && indicators.length > 0 ? (
                  indicators.map((indicator) => (
                    <TableRow key={indicator.id}>
                      <TableCell>{indicator.indicatorDate}</TableCell>
                      <TableCell>{indicator.region}</TableCell>
                      <TableCell>{formatPercentage(indicator.constructionInflationRate)}</TableCell>
                      <TableCell>{formatPercentage(indicator.recommendedDiscountRate)}</TableCell>
                      <TableCell>{formatPercentage(indicator.primeRate)}</TableCell>
                      <TableCell>{formatPercentage(indicator.gdpGrowthRate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(indicator)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(indicator.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No economic indicators found. Add your first indicator to get started.
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
            <DialogTitle>Add Economic Indicator</DialogTitle>
            <DialogDescription>
              Enter economic data for financial calculations and forecasting
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="indicatorDate">Date</Label>
                <Input
                  id="indicatorDate"
                  type="date"
                  value={formData.indicatorDate}
                  onChange={(e) => setFormData({ ...formData, indicatorDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  placeholder="e.g., Canada, Ontario"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Inflation Rates (%)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpiInflationRate">CPI Inflation Rate</Label>
                  <Input
                    id="cpiInflationRate"
                    type="number"
                    step="0.01"
                    value={formData.cpiInflationRate}
                    onChange={(e) => setFormData({ ...formData, cpiInflationRate: e.target.value })}
                    placeholder="e.g., 2.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="constructionInflationRate">Construction Inflation Rate</Label>
                  <Input
                    id="constructionInflationRate"
                    type="number"
                    step="0.01"
                    value={formData.constructionInflationRate}
                    onChange={(e) => setFormData({ ...formData, constructionInflationRate: e.target.value })}
                    placeholder="e.g., 3.2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="materialInflationRate">Material Inflation Rate</Label>
                  <Input
                    id="materialInflationRate"
                    type="number"
                    step="0.01"
                    value={formData.materialInflationRate}
                    onChange={(e) => setFormData({ ...formData, materialInflationRate: e.target.value })}
                    placeholder="e.g., 4.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="laborInflationRate">Labor Inflation Rate</Label>
                  <Input
                    id="laborInflationRate"
                    type="number"
                    step="0.01"
                    value={formData.laborInflationRate}
                    onChange={(e) => setFormData({ ...formData, laborInflationRate: e.target.value })}
                    placeholder="e.g., 2.8"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Interest & Discount Rates (%)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primeRate">Prime Rate</Label>
                  <Input
                    id="primeRate"
                    type="number"
                    step="0.01"
                    value={formData.primeRate}
                    onChange={(e) => setFormData({ ...formData, primeRate: e.target.value })}
                    placeholder="e.g., 5.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bondYield10Year">10-Year Bond Yield</Label>
                  <Input
                    id="bondYield10Year"
                    type="number"
                    step="0.01"
                    value={formData.bondYield10Year}
                    onChange={(e) => setFormData({ ...formData, bondYield10Year: e.target.value })}
                    placeholder="e.g., 3.8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recommendedDiscountRate">Recommended Discount Rate</Label>
                  <Input
                    id="recommendedDiscountRate"
                    type="number"
                    step="0.01"
                    value={formData.recommendedDiscountRate}
                    onChange={(e) => setFormData({ ...formData, recommendedDiscountRate: e.target.value })}
                    placeholder="e.g., 4.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="riskFreeRate">Risk-Free Rate</Label>
                  <Input
                    id="riskFreeRate"
                    type="number"
                    step="0.01"
                    value={formData.riskFreeRate}
                    onChange={(e) => setFormData({ ...formData, riskFreeRate: e.target.value })}
                    placeholder="e.g., 3.5"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Economic Indicators</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gdpGrowthRate">GDP Growth Rate (%)</Label>
                  <Input
                    id="gdpGrowthRate"
                    type="number"
                    step="0.01"
                    value={formData.gdpGrowthRate}
                    onChange={(e) => setFormData({ ...formData, gdpGrowthRate: e.target.value })}
                    placeholder="e.g., 2.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unemploymentRate">Unemployment Rate (%)</Label>
                  <Input
                    id="unemploymentRate"
                    type="number"
                    step="0.01"
                    value={formData.unemploymentRate}
                    onChange={(e) => setFormData({ ...formData, unemploymentRate: e.target.value })}
                    placeholder="e.g., 5.2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exchangeRateUSD">Exchange Rate (CAD/USD)</Label>
                  <Input
                    id="exchangeRateUSD"
                    type="number"
                    step="0.0001"
                    value={formData.exchangeRateUSD}
                    onChange={(e) => setFormData({ ...formData, exchangeRateUSD: e.target.value })}
                    placeholder="e.g., 1.3250"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Indicator"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Economic Indicator</DialogTitle>
            <DialogDescription>
              Update economic data for financial calculations
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Same form fields as create dialog */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-indicatorDate">Date</Label>
                <Input
                  id="edit-indicatorDate"
                  type="date"
                  value={formData.indicatorDate}
                  onChange={(e) => setFormData({ ...formData, indicatorDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-region">Region</Label>
                <Input
                  id="edit-region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Inflation Rates (%)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-constructionInflationRate">Construction Inflation Rate</Label>
                  <Input
                    id="edit-constructionInflationRate"
                    type="number"
                    step="0.01"
                    value={formData.constructionInflationRate}
                    onChange={(e) => setFormData({ ...formData, constructionInflationRate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-recommendedDiscountRate">Recommended Discount Rate</Label>
                  <Input
                    id="edit-recommendedDiscountRate"
                    type="number"
                    step="0.01"
                    value={formData.recommendedDiscountRate}
                    onChange={(e) => setFormData({ ...formData, recommendedDiscountRate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Indicator"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
