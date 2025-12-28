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
import {
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Info,
  CheckCircle,
  AlertCircle,
  Download,
  Globe,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface EconomicDataSource {
  name: string;
  url: string;
  accessDate: string;
}

interface EconomicIndicatorData {
  value: string;
  source: EconomicDataSource;
  confidence: "high" | "medium" | "low";
  notes?: string;
}

interface AIEconomicIndicators {
  region: string;
  indicatorDate: string;
  fetchedAt: string;
  cpiInflationRate?: EconomicIndicatorData;
  constructionInflationRate?: EconomicIndicatorData;
  materialInflationRate?: EconomicIndicatorData;
  laborInflationRate?: EconomicIndicatorData;
  primeRate?: EconomicIndicatorData;
  bondYield10Year?: EconomicIndicatorData;
  recommendedDiscountRate?: EconomicIndicatorData;
  riskFreeRate?: EconomicIndicatorData;
  gdpGrowthRate?: EconomicIndicatorData;
  unemploymentRate?: EconomicIndicatorData;
  exchangeRateUSD?: EconomicIndicatorData;
  summary: string;
  dataSources: EconomicDataSource[];
}

const REGIONS = [
  "Canada",
  "Ontario",
  "British Columbia",
  "Alberta",
  "Quebec",
  "Manitoba",
  "Saskatchewan",
  "Nova Scotia",
  "New Brunswick",
  "United States",
];

export default function EconomicIndicators() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null);
  const [selectedRegion, setSelectedRegion] = useState("Canada");
  const [aiData, setAiData] = useState<AIEconomicIndicators | null>(null);

  const { data: indicators, isLoading, refetch } = trpc.economicIndicators.list.useQuery();
  const { data: regions } = trpc.economicIndicators.getRegions.useQuery();
  const createMutation = trpc.economicIndicators.create.useMutation();
  const updateMutation = trpc.economicIndicators.update.useMutation();
  const deleteMutation = trpc.economicIndicators.delete.useMutation();
  const fetchAIMutation = trpc.economicIndicators.fetchWithAI.useMutation();
  const fetchAndSaveMutation = trpc.economicIndicators.fetchAndSave.useMutation();

  const [formData, setFormData] = useState({
    indicatorDate: new Date().toISOString().split("T")[0],
    region: "Canada",
    cpiInflationRate: "",
    constructionInflationRate: "",
    materialInflationRate: "",
    laborInflationRate: "",
    primeRate: "",
    bondYield10Year: "",
    recommendedDiscountRate: "",
    riskFreeRate: "",
    gdpGrowthRate: "",
    unemploymentRate: "",
    exchangeRateUSD: "",
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
    if (!confirm("Are you sure you want to delete this economic indicator?"))
      return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Economic indicator deleted successfully");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete economic indicator");
    }
  };

  const handleFetchAIData = async () => {
    try {
      toast.info(`Fetching economic data for ${selectedRegion}...`);
      const data = await fetchAIMutation.mutateAsync({ region: selectedRegion });
      setAiData(data as AIEconomicIndicators);
      setIsAIDialogOpen(true);
      toast.success("Economic data fetched successfully with source citations");
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch AI economic data");
    }
  };

  const handleSaveAIData = async () => {
    try {
      await fetchAndSaveMutation.mutateAsync({ region: selectedRegion });
      toast.success("Economic data saved to database");
      setIsAIDialogOpen(false);
      setAiData(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to save economic data");
    }
  };

  const openEditDialog = (indicator: any) => {
    setSelectedIndicator(indicator);
    setFormData({
      indicatorDate: indicator.indicatorDate || "",
      region: indicator.region || "Canada",
      cpiInflationRate: indicator.cpiInflationRate || "",
      constructionInflationRate: indicator.constructionInflationRate || "",
      materialInflationRate: indicator.materialInflationRate || "",
      laborInflationRate: indicator.laborInflationRate || "",
      primeRate: indicator.primeRate || "",
      bondYield10Year: indicator.bondYield10Year || "",
      recommendedDiscountRate: indicator.recommendedDiscountRate || "",
      riskFreeRate: indicator.riskFreeRate || "",
      gdpGrowthRate: indicator.gdpGrowthRate || "",
      unemploymentRate: indicator.unemploymentRate || "",
      exchangeRateUSD: indicator.exchangeRateUSD || "",
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      indicatorDate: new Date().toISOString().split("T")[0],
      region: "Canada",
      cpiInflationRate: "",
      constructionInflationRate: "",
      materialInflationRate: "",
      laborInflationRate: "",
      primeRate: "",
      bondYield10Year: "",
      recommendedDiscountRate: "",
      riskFreeRate: "",
      gdpGrowthRate: "",
      unemploymentRate: "",
      exchangeRateUSD: "",
    });
    setSelectedIndicator(null);
  };

  const formatPercentage = (value: string | null) => {
    if (!value) return "N/A";
    return `${parseFloat(value).toFixed(2)}%`;
  };

  const formatCurrency = (value: string | null) => {
    if (!value) return "N/A";
    return `$${parseFloat(value).toFixed(4)}`;
  };

  const getConfidenceBadge = (confidence: "high" | "medium" | "low") => {
    const colors = {
      high: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      low: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return (
      <Badge variant="outline" className={colors[confidence]}>
        {confidence}
      </Badge>
    );
  };

  const renderAIDataRow = (
    label: string,
    data: EconomicIndicatorData | undefined,
    isPercentage: boolean = true
  ) => {
    if (!data) return null;
    return (
      <TableRow>
        <TableCell className="font-medium">{label}</TableCell>
        <TableCell>
          {isPercentage ? formatPercentage(data.value) : data.value}
        </TableCell>
        <TableCell>{getConfidenceBadge(data.confidence)}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <span className="text-sm">{data.source?.name || "N/A"}</span>
            {data.source?.url && (
              <a
                href={data.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {data.notes || "-"}
        </TableCell>
      </TableRow>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">
          Loading economic indicators...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Economic Indicators
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage construction inflation rates, discount rates, and regional
            economic data for financial forecasting
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[180px]">
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={handleFetchAIData}
              disabled={fetchAIMutation.isPending}
            >
              {fetchAIMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Fetch with AI
            </Button>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Indicator
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>AI-Powered Data Fetching</AlertTitle>
        <AlertDescription>
          Use the "Fetch with AI" button to automatically gather current
          economic indicators from authoritative sources like Bank of Canada,
          Statistics Canada, and construction industry indexes. All data
          includes source citations for verification.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current">Current Indicators</TabsTrigger>
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <Card>
            <CardHeader>
              <CardTitle>Current Economic Indicators</CardTitle>
              <CardDescription>
                View and manage economic data used for NPV calculations and
                financial forecasting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Construction Inflation</TableHead>
                      <TableHead>Discount Rate</TableHead>
                      <TableHead>Prime Rate</TableHead>
                      <TableHead>GDP Growth</TableHead>
                      <TableHead>CPI Inflation</TableHead>
                      <TableHead>Unemployment</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {indicators && indicators.length > 0 ? (
                      indicators.map((indicator) => (
                        <TableRow key={indicator.id}>
                          <TableCell>{indicator.indicatorDate}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{indicator.region}</Badge>
                          </TableCell>
                          <TableCell>
                            {formatPercentage(indicator.constructionInflationRate)}
                          </TableCell>
                          <TableCell>
                            {formatPercentage(indicator.recommendedDiscountRate)}
                          </TableCell>
                          <TableCell>
                            {formatPercentage(indicator.primeRate)}
                          </TableCell>
                          <TableCell>
                            {formatPercentage(indicator.gdpGrowthRate)}
                          </TableCell>
                          <TableCell>
                            {formatPercentage(indicator.cpiInflationRate)}
                          </TableCell>
                          <TableCell>
                            {formatPercentage(indicator.unemploymentRate)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDialog(indicator)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(indicator.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center text-muted-foreground py-8"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
                            <p>No economic indicators found.</p>
                            <p className="text-sm">
                              Use "Fetch with AI" to automatically gather current
                              data, or add indicators manually.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <CardTitle>Authoritative Data Sources</CardTitle>
              <CardDescription>
                Economic indicators are sourced from these official institutions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="font-semibold">Canadian Sources</h3>
                  <div className="space-y-2">
                    <a
                      href="https://www.bankofcanada.ca/rates/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Bank of Canada - Interest Rates
                    </a>
                    <a
                      href="https://www.statcan.gc.ca/en/subjects-start/prices_and_price_indexes"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Statistics Canada - Price Indexes
                    </a>
                    <a
                      href="https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      CMHC - Housing Market Data
                    </a>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold">Construction Industry Sources</h3>
                  <div className="space-y-2">
                    <a
                      href="https://www.enr.com/economics"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      ENR - Construction Cost Index
                    </a>
                    <a
                      href="https://www.rsmeans.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      RSMeans - Construction Cost Data
                    </a>
                    <a
                      href="https://www.turnerconstruction.com/cost-index"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Turner Building Cost Index
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Data Preview Dialog */}
      <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              AI-Fetched Economic Data for {aiData?.region}
            </DialogTitle>
            <DialogDescription>
              Review the data below before saving. All values include source
              citations for verification.
            </DialogDescription>
          </DialogHeader>

          {aiData && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Data Summary</AlertTitle>
                <AlertDescription>{aiData.summary}</AlertDescription>
              </Alert>

              <div className="text-sm text-muted-foreground">
                <p>
                  <strong>Indicator Date:</strong> {aiData.indicatorDate}
                </p>
                <p>
                  <strong>Fetched At:</strong>{" "}
                  {new Date(aiData.fetchedAt).toLocaleString()}
                </p>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Indicator</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renderAIDataRow("CPI Inflation Rate", aiData.cpiInflationRate)}
                    {renderAIDataRow(
                      "Construction Inflation Rate",
                      aiData.constructionInflationRate
                    )}
                    {renderAIDataRow(
                      "Material Inflation Rate",
                      aiData.materialInflationRate
                    )}
                    {renderAIDataRow("Labor Inflation Rate", aiData.laborInflationRate)}
                    {renderAIDataRow("Prime Rate", aiData.primeRate)}
                    {renderAIDataRow("10-Year Bond Yield", aiData.bondYield10Year)}
                    {renderAIDataRow(
                      "Recommended Discount Rate",
                      aiData.recommendedDiscountRate
                    )}
                    {renderAIDataRow("Risk-Free Rate", aiData.riskFreeRate)}
                    {renderAIDataRow("GDP Growth Rate", aiData.gdpGrowthRate)}
                    {renderAIDataRow("Unemployment Rate", aiData.unemploymentRate)}
                    {renderAIDataRow(
                      "Exchange Rate (CAD/USD)",
                      aiData.exchangeRateUSD,
                      false
                    )}
                  </TableBody>
                </Table>
              </div>

              {aiData.dataSources && aiData.dataSources.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Data Sources Used</h4>
                  <div className="flex flex-wrap gap-2">
                    {aiData.dataSources.map((source, index) => (
                      <a
                        key={index}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {source.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAIDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAIData}
              disabled={fetchAndSaveMutation.isPending}
            >
              {fetchAndSaveMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Save to Database
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  onChange={(e) =>
                    setFormData({ ...formData, indicatorDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Select
                  value={formData.region}
                  onValueChange={(value) =>
                    setFormData({ ...formData, region: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cpiInflationRate: e.target.value,
                      })
                    }
                    placeholder="e.g., 2.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="constructionInflationRate">
                    Construction Inflation Rate
                  </Label>
                  <Input
                    id="constructionInflationRate"
                    type="number"
                    step="0.01"
                    value={formData.constructionInflationRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        constructionInflationRate: e.target.value,
                      })
                    }
                    placeholder="e.g., 3.2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="materialInflationRate">
                    Material Inflation Rate
                  </Label>
                  <Input
                    id="materialInflationRate"
                    type="number"
                    step="0.01"
                    value={formData.materialInflationRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        materialInflationRate: e.target.value,
                      })
                    }
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        laborInflationRate: e.target.value,
                      })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, primeRate: e.target.value })
                    }
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bondYield10Year: e.target.value,
                      })
                    }
                    placeholder="e.g., 3.8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recommendedDiscountRate">
                    Recommended Discount Rate
                  </Label>
                  <Input
                    id="recommendedDiscountRate"
                    type="number"
                    step="0.01"
                    value={formData.recommendedDiscountRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recommendedDiscountRate: e.target.value,
                      })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, riskFreeRate: e.target.value })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, gdpGrowthRate: e.target.value })
                    }
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unemploymentRate: e.target.value,
                      })
                    }
                    placeholder="e.g., 5.2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exchangeRateUSD">
                    Exchange Rate (CAD/USD)
                  </Label>
                  <Input
                    id="exchangeRateUSD"
                    type="number"
                    step="0.0001"
                    value={formData.exchangeRateUSD}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        exchangeRateUSD: e.target.value,
                      })
                    }
                    placeholder="e.g., 1.3250"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-indicatorDate">Date</Label>
                <Input
                  id="edit-indicatorDate"
                  type="date"
                  value={formData.indicatorDate}
                  onChange={(e) =>
                    setFormData({ ...formData, indicatorDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-region">Region</Label>
                <Select
                  value={formData.region}
                  onValueChange={(value) =>
                    setFormData({ ...formData, region: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Inflation Rates (%)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-cpiInflationRate">
                    CPI Inflation Rate
                  </Label>
                  <Input
                    id="edit-cpiInflationRate"
                    type="number"
                    step="0.01"
                    value={formData.cpiInflationRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cpiInflationRate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-constructionInflationRate">
                    Construction Inflation Rate
                  </Label>
                  <Input
                    id="edit-constructionInflationRate"
                    type="number"
                    step="0.01"
                    value={formData.constructionInflationRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        constructionInflationRate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-materialInflationRate">
                    Material Inflation Rate
                  </Label>
                  <Input
                    id="edit-materialInflationRate"
                    type="number"
                    step="0.01"
                    value={formData.materialInflationRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        materialInflationRate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-laborInflationRate">
                    Labor Inflation Rate
                  </Label>
                  <Input
                    id="edit-laborInflationRate"
                    type="number"
                    step="0.01"
                    value={formData.laborInflationRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        laborInflationRate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Interest & Discount Rates (%)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-primeRate">Prime Rate</Label>
                  <Input
                    id="edit-primeRate"
                    type="number"
                    step="0.01"
                    value={formData.primeRate}
                    onChange={(e) =>
                      setFormData({ ...formData, primeRate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bondYield10Year">
                    10-Year Bond Yield
                  </Label>
                  <Input
                    id="edit-bondYield10Year"
                    type="number"
                    step="0.01"
                    value={formData.bondYield10Year}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bondYield10Year: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-recommendedDiscountRate">
                    Recommended Discount Rate
                  </Label>
                  <Input
                    id="edit-recommendedDiscountRate"
                    type="number"
                    step="0.01"
                    value={formData.recommendedDiscountRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recommendedDiscountRate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-riskFreeRate">Risk-Free Rate</Label>
                  <Input
                    id="edit-riskFreeRate"
                    type="number"
                    step="0.01"
                    value={formData.riskFreeRate}
                    onChange={(e) =>
                      setFormData({ ...formData, riskFreeRate: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Economic Indicators</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-gdpGrowthRate">GDP Growth Rate (%)</Label>
                  <Input
                    id="edit-gdpGrowthRate"
                    type="number"
                    step="0.01"
                    value={formData.gdpGrowthRate}
                    onChange={(e) =>
                      setFormData({ ...formData, gdpGrowthRate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-unemploymentRate">
                    Unemployment Rate (%)
                  </Label>
                  <Input
                    id="edit-unemploymentRate"
                    type="number"
                    step="0.01"
                    value={formData.unemploymentRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unemploymentRate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-exchangeRateUSD">
                    Exchange Rate (CAD/USD)
                  </Label>
                  <Input
                    id="edit-exchangeRateUSD"
                    type="number"
                    step="0.0001"
                    value={formData.exchangeRateUSD}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        exchangeRateUSD: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
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
