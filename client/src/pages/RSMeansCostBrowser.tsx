import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Search, 
  DollarSign, 
  MapPin, 
  Building2, 
  Calculator,
  ChevronRight,
  Loader2,
  Info,
  Database,
  AlertTriangle,
  Package,
  Wrench,
  Zap,
  Layers,
  FolderTree
} from "lucide-react";
import { toast } from "sonner";

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
  }).format(amount);
}

// Division icons mapping
const divisionIcons: Record<string, React.ReactNode> = {
  '01': <Layers className="h-4 w-4" />,
  '02': <Building2 className="h-4 w-4" />,
  '03': <Building2 className="h-4 w-4" />,
  '04': <Building2 className="h-4 w-4" />,
  '05': <Wrench className="h-4 w-4" />,
  '06': <Package className="h-4 w-4" />,
  '07': <Building2 className="h-4 w-4" />,
  '08': <Building2 className="h-4 w-4" />,
  '09': <Building2 className="h-4 w-4" />,
  '21': <Zap className="h-4 w-4" />,
  '22': <Wrench className="h-4 w-4" />,
  '23': <Zap className="h-4 w-4" />,
  '26': <Zap className="h-4 w-4" />,
};

export default function RSMeansCostBrowser() {
  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCatalog, setSelectedCatalog] = useState("unit-2024-std-imp");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [selectedCostLine, setSelectedCostLine] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [locationSearch, setLocationSearch] = useState("");

  // Queries
  const statusQuery = trpc.rsmeans.getStatus.useQuery();
  const catalogsQuery = trpc.rsmeans.getCatalogs.useQuery();
  const locationsQuery = trpc.rsmeans.getLocations.useQuery({ searchTerm: locationSearch });
  const divisionsQuery = trpc.rsmeans.getDivisions.useQuery({ 
    catalogId: selectedCatalog 
  }, { enabled: !!selectedCatalog });
  
  const costLinesQuery = trpc.rsmeans.searchCostLines.useQuery({
    catalogId: selectedCatalog,
    searchTerm: searchTerm || undefined,
    divisionCode: selectedDivision || undefined,
    limit: 50,
  }, { 
    enabled: !!selectedCatalog && (!!searchTerm || !!selectedDivision),
  });

  const costFactorQuery = trpc.rsmeans.getCostFactors.useQuery({
    locationId: selectedLocation,
  }, { enabled: !!selectedLocation });

  // Calculate cost mutation
  const calculateCostQuery = trpc.rsmeans.calculateCost.useQuery({
    catalogId: selectedCatalog,
    costLineId: selectedCostLine?.id || '',
    locationId: selectedLocation,
    quantity: quantity,
  }, { 
    enabled: !!selectedCostLine && !!selectedLocation && quantity > 0,
  });

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locationsQuery.data || [];
  }, [locationsQuery.data]);

  // Handle search
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      toast.error("Please enter a search term");
      return;
    }
    // Query will auto-refetch due to dependency
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">RSMeans Cost Data</h1>
            <p className="text-muted-foreground">
              Browse construction cost data and calculate estimates
            </p>
          </div>
          {statusQuery.data && (
            <Badge variant={statusQuery.data.usingMock ? "secondary" : "default"}>
              {statusQuery.data.usingMock ? (
                <>
                  <Database className="mr-1 h-3 w-3" />
                  Demo Data
                </>
              ) : (
                <>
                  <DollarSign className="mr-1 h-3 w-3" />
                  Live API
                </>
              )}
            </Badge>
          )}
        </div>

        {/* Mock Data Notice */}
        {statusQuery.data?.usingMock && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Using Demo Data</AlertTitle>
            <AlertDescription>
              RSMeans API key not configured. Showing sample construction cost data for demonstration.
              Contact your administrator to enable live RSMeans data.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1 space-y-4">
            {/* Catalog Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Cost Catalog</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedCatalog} onValueChange={setSelectedCatalog}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select catalog" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogsQuery.data?.map((catalog) => (
                      <SelectItem key={catalog.id} value={catalog.id}>
                        {catalog.catalogName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Location Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </CardTitle>
                <CardDescription>
                  Select location for cost factors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Search locations..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                />
                <ScrollArea className="h-48">
                  <div className="space-y-1">
                    {filteredLocations.map((location) => (
                      <Button
                        key={location.id}
                        variant={selectedLocation === location.id ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start text-left"
                        onClick={() => setSelectedLocation(location.id)}
                      >
                        <span className="truncate">
                          {location.city}, {location.stateCode}
                        </span>
                        {location.countryCode === 'CA' && (
                          <Badge variant="outline" className="ml-auto text-xs">CA</Badge>
                        )}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>

                {/* Cost Factor Display */}
                {costFactorQuery.data && (
                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Cost Factors</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Material:</span>
                        <span className="ml-1 font-medium">{(costFactorQuery.data.materialFactor * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Labor:</span>
                        <span className="ml-1 font-medium">{(costFactorQuery.data.laborFactor * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Equipment:</span>
                        <span className="ml-1 font-medium">{(costFactorQuery.data.equipmentFactor * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <span className="ml-1 font-medium text-primary">{(costFactorQuery.data.totalFactor * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Division Browser */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FolderTree className="h-4 w-4" />
                  Divisions
                </CardTitle>
                <CardDescription>
                  CSI MasterFormat divisions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-1">
                    <Button
                      variant={selectedDivision === null ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setSelectedDivision(null)}
                    >
                      All Divisions
                    </Button>
                    {divisionsQuery.data?.map((division) => (
                      <Button
                        key={division.id}
                        variant={selectedDivision === division.code ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start text-left"
                        onClick={() => setSelectedDivision(division.code)}
                      >
                        {divisionIcons[division.code] || <Layers className="h-4 w-4 mr-2" />}
                        <span className="ml-2 truncate flex-1">
                          {division.code} - {division.description}
                        </span>
                        {division.costLineCount && (
                          <Badge variant="outline" className="ml-auto text-xs">
                            {division.costLineCount}
                          </Badge>
                        )}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search Bar */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search cost items (e.g., concrete, roofing, HVAC)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleSearch}>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            <Tabs defaultValue="list" className="space-y-4">
              <TabsList>
                <TabsTrigger value="list">Cost Lines</TabsTrigger>
                <TabsTrigger value="calculator">Cost Calculator</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-4">
                {/* Results Summary */}
                {costLinesQuery.data && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Found {costLinesQuery.data.recordCount} cost items
                      {selectedDivision && ` in Division ${selectedDivision}`}
                    </p>
                    {costLinesQuery.data.aggregations && (
                      <div className="flex gap-2">
                        {costLinesQuery.data.aggregations.items.slice(0, 3).map((agg) => (
                          <Badge key={agg.divisionId} variant="outline">
                            {agg.description}: {agg.docCount}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Cost Lines Table */}
                <Card>
                  <CardContent className="p-0">
                    {costLinesQuery.isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : costLinesQuery.data?.items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Search className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No results found</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Try a different search term or select a division
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Line Number</TableHead>
                            <TableHead className="w-[40%]">Description</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead className="text-right">Material</TableHead>
                            <TableHead className="text-right">Labor</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {costLinesQuery.data?.items.map((costLine) => (
                            <TableRow 
                              key={costLine.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setSelectedCostLine(costLine)}
                            >
                              <TableCell className="font-mono text-xs">
                                {costLine.lineNumber}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{costLine.description}</p>
                                  {costLine.divisionDescription && (
                                    <p className="text-xs text-muted-foreground">
                                      {costLine.divisionDescription}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{costLine.unit}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(costLine.materialCost)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(costLine.laborCost)}
                              </TableCell>
                              <TableCell className="text-right font-mono font-medium">
                                {formatCurrency(costLine.totalCost)}
                              </TableCell>
                              <TableCell>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="calculator" className="space-y-4">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Selected Item */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Selected Cost Item
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedCostLine ? (
                        <div className="space-y-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Line Number</Label>
                            <p className="font-mono">{selectedCostLine.lineNumber}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Description</Label>
                            <p className="font-medium">{selectedCostLine.description}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs text-muted-foreground">Unit</Label>
                              <p>{selectedCostLine.unit}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Base Cost</Label>
                              <p className="font-medium">{formatCurrency(selectedCostLine.totalCost)}</p>
                            </div>
                          </div>
                          <Separator />
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Material:</span>
                              <p className="font-mono">{formatCurrency(selectedCostLine.materialCost)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Labor:</span>
                              <p className="font-mono">{formatCurrency(selectedCostLine.laborCost)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Equipment:</span>
                              <p className="font-mono">{formatCurrency(selectedCostLine.equipmentCost)}</p>
                            </div>
                          </div>
                          {selectedCostLine.laborHours > 0 && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Labor Hours</Label>
                              <p>{selectedCostLine.laborHours} hrs/{selectedCostLine.unit}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Select a cost item from the list</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Calculator */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Cost Calculator
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={quantity}
                          onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                          placeholder="Enter quantity"
                        />
                        {selectedCostLine && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Unit: {selectedCostLine.unit}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label>Location</Label>
                        <p className="text-sm">
                          {costFactorQuery.data ? (
                            <span className="font-medium">
                              {costFactorQuery.data.city}, {costFactorQuery.data.stateCode}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Select a location</span>
                          )}
                        </p>
                      </div>

                      <Separator />

                      {/* Calculated Results */}
                      {calculateCostQuery.data ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg bg-muted">
                              <Label className="text-xs text-muted-foreground">Material Cost</Label>
                              <p className="text-lg font-mono font-medium">
                                {formatCurrency(calculateCostQuery.data.materialCost)}
                              </p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted">
                              <Label className="text-xs text-muted-foreground">Labor Cost</Label>
                              <p className="text-lg font-mono font-medium">
                                {formatCurrency(calculateCostQuery.data.laborCost)}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg bg-muted">
                              <Label className="text-xs text-muted-foreground">Equipment Cost</Label>
                              <p className="text-lg font-mono font-medium">
                                {formatCurrency(calculateCostQuery.data.equipmentCost)}
                              </p>
                            </div>
                            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                              <Label className="text-xs text-primary">Total Cost</Label>
                              <p className="text-xl font-mono font-bold text-primary">
                                {formatCurrency(calculateCostQuery.data.totalCost)}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground text-center">
                            Unit cost: {formatCurrency(calculateCostQuery.data.unitCost)} per {selectedCostLine?.unit}
                          </div>
                        </div>
                      ) : calculateCostQuery.isLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Select a cost item and location to calculate</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
