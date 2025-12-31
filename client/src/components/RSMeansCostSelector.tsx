import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  DollarSign, 
  MapPin, 
  Calculator,
  Loader2,
  Check,
  X,
  Package
} from "lucide-react";

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
  }).format(amount);
}

interface RSMeansCostSelectorProps {
  onSelect: (cost: {
    costLineId: string;
    lineNumber: string;
    description: string;
    unit: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    locationId: string;
    locationName: string;
  }) => void;
  defaultLocationId?: string;
  componentCode?: string; // UNIFORMAT II code for suggestions
  trigger?: React.ReactNode;
}

export function RSMeansCostSelector({ 
  onSelect, 
  defaultLocationId,
  componentCode,
  trigger 
}: RSMeansCostSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(defaultLocationId || "");
  const [selectedCostLine, setSelectedCostLine] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [locationSearch, setLocationSearch] = useState("");

  // Queries
  const locationsQuery = trpc.rsmeans.getLocations.useQuery({ searchTerm: locationSearch });
  
  const costLinesQuery = trpc.rsmeans.searchCostLines.useQuery({
    catalogId: 'unit-2024-std-imp',
    searchTerm: searchTerm || undefined,
    limit: 30,
  }, { 
    enabled: !!searchTerm && searchTerm.length >= 2,
  });

  const costFactorQuery = trpc.rsmeans.getCostFactors.useQuery({
    locationId: selectedLocation,
  }, { enabled: !!selectedLocation });

  // Calculate cost
  const calculateCostQuery = trpc.rsmeans.calculateCost.useQuery({
    catalogId: 'unit-2024-std-imp',
    costLineId: selectedCostLine?.id || '',
    locationId: selectedLocation,
    quantity: quantity,
  }, { 
    enabled: !!selectedCostLine && !!selectedLocation && quantity > 0,
  });

  // Get component suggestions if componentCode is provided
  const componentSuggestionsQuery = trpc.rsmeans.getComponentCostEstimate.useQuery({
    componentCode: componentCode || '',
    locationId: selectedLocation || 'M4B',
    quantity: 1,
  }, { enabled: !!componentCode && open });

  // Handle selection
  const handleSelect = () => {
    if (!selectedCostLine || !calculateCostQuery.data) return;

    const location = locationsQuery.data?.find(l => l.id === selectedLocation);
    
    onSelect({
      costLineId: selectedCostLine.id,
      lineNumber: selectedCostLine.lineNumber,
      description: selectedCostLine.description,
      unit: selectedCostLine.unit,
      quantity,
      unitCost: calculateCostQuery.data.unitCost,
      totalCost: calculateCostQuery.data.totalCost,
      locationId: selectedLocation,
      locationName: location ? `${location.city}, ${location.stateCode}` : selectedLocation,
    });

    setOpen(false);
    resetState();
  };

  const resetState = () => {
    setSearchTerm("");
    setSelectedCostLine(null);
    setQuantity(1);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetState();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <DollarSign className="mr-2 h-4 w-4" />
            Add RSMeans Cost
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Select RSMeans Cost Item
          </DialogTitle>
          <DialogDescription>
            Search for construction cost items and calculate localized estimates
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Left Column - Search & Results */}
          <div className="space-y-4">
            {/* Location Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location for cost factors" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Search locations..."
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      className="mb-2"
                    />
                  </div>
                  {locationsQuery.data?.slice(0, 20).map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.city}, {location.stateCode} ({location.countryCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {costFactorQuery.data && (
                <p className="text-xs text-muted-foreground">
                  Cost factor: {(costFactorQuery.data.totalFactor * 100).toFixed(0)}% of national average
                </p>
              )}
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label>Search Cost Items</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="e.g., concrete, roofing, HVAC..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Component Suggestions */}
            {componentCode && componentSuggestionsQuery.data?.suggestedCostLines && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Suggested for {componentCode}
                </Label>
                <ScrollArea className="h-24 border rounded-md p-2">
                  <div className="space-y-1">
                    {componentSuggestionsQuery.data.suggestedCostLines.slice(0, 5).map((costLine: any) => (
                      <Button
                        key={costLine.id}
                        variant={selectedCostLine?.id === costLine.id ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start text-left h-auto py-1"
                        onClick={() => setSelectedCostLine(costLine)}
                      >
                        <span className="truncate text-xs">{costLine.description}</span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Search Results */}
            <div className="space-y-2">
              <Label>
                Results {costLinesQuery.data && `(${costLinesQuery.data.recordCount})`}
              </Label>
              <ScrollArea className="h-48 border rounded-md">
                {costLinesQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : costLinesQuery.data?.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No results found</p>
                  </div>
                ) : (
                  <Table>
                    <TableBody>
                      {costLinesQuery.data?.items.map((costLine) => (
                        <TableRow 
                          key={costLine.id}
                          className={`cursor-pointer ${selectedCostLine?.id === costLine.id ? 'bg-muted' : ''}`}
                          onClick={() => setSelectedCostLine(costLine)}
                        >
                          <TableCell className="py-2">
                            <div>
                              <p className="text-sm font-medium line-clamp-1">{costLine.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {costLine.lineNumber} • {costLine.unit} • {formatCurrency(costLine.totalCost)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 w-8">
                            {selectedCostLine?.id === costLine.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Right Column - Selected Item & Calculator */}
          <div className="space-y-4">
            {selectedCostLine ? (
              <>
                {/* Selected Item Details */}
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Label className="text-xs text-muted-foreground">Selected Item</Label>
                      <p className="font-medium">{selectedCostLine.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setSelectedCostLine(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Line #:</span>
                      <span className="ml-1 font-mono text-xs">{selectedCostLine.lineNumber}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Unit:</span>
                      <span className="ml-1">{selectedCostLine.unit}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Base Cost:</span>
                      <span className="ml-1">{formatCurrency(selectedCostLine.totalCost)}</span>
                    </div>
                  </div>
                </div>

                {/* Quantity Input */}
                <div className="space-y-2">
                  <Label>Quantity ({selectedCostLine.unit})</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <Separator />

                {/* Calculated Cost */}
                {calculateCostQuery.data ? (
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Calculated Cost
                    </Label>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="p-2 bg-muted rounded">
                        <span className="text-muted-foreground text-xs">Material</span>
                        <p className="font-mono">{formatCurrency(calculateCostQuery.data.materialCost)}</p>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <span className="text-muted-foreground text-xs">Labor</span>
                        <p className="font-mono">{formatCurrency(calculateCostQuery.data.laborCost)}</p>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <span className="text-muted-foreground text-xs">Equipment</span>
                        <p className="font-mono">{formatCurrency(calculateCostQuery.data.equipmentCost)}</p>
                      </div>
                      <div className="p-2 bg-primary/10 border border-primary/20 rounded">
                        <span className="text-primary text-xs">Total</span>
                        <p className="font-mono font-bold text-primary">
                          {formatCurrency(calculateCostQuery.data.totalCost)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Unit cost: {formatCurrency(calculateCostQuery.data.unitCost)} per {selectedCostLine.unit}
                    </p>
                  </div>
                ) : calculateCostQuery.isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : !selectedLocation ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Select a location to calculate cost
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                <Package className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm">Select a cost item from the search results</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSelect}
            disabled={!selectedCostLine || !selectedLocation || !calculateCostQuery.data}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Add Cost Estimate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Compact version for inline use
export function RSMeansCostBadge({ 
  cost 
}: { 
  cost: {
    description: string;
    totalCost: number;
    quantity: number;
    unit: string;
    locationName: string;
  } 
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
      <DollarSign className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{cost.description}</p>
        <p className="text-xs text-muted-foreground">
          {cost.quantity} {cost.unit} @ {cost.locationName}
        </p>
      </div>
      <Badge variant="secondary" className="font-mono">
        {formatCurrency(cost.totalCost)}
      </Badge>
    </div>
  );
}
