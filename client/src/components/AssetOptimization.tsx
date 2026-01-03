import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DollarSign, Calendar, TrendingUp, AlertCircle, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { trpc } from "@/lib/trpc";
import AssetLifecycleCost from "@/components/AssetLifecycleCost";

interface AssetOptimizationProps {
  assetId: number;
  assessments?: any[];
  deficiencies?: any[];
}

export default function AssetOptimization({ assetId, assessments = [], deficiencies = [] }: AssetOptimizationProps) {
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [expandedPriorities, setExpandedPriorities] = useState<Record<string, boolean>>({});

  const togglePriority = (priority: string) => {
    setExpandedPriorities(prev => ({
      ...prev,
      [priority]: !prev[priority]
    }));
  };

  // Helper function to validate and sanitize estimated cost
  const getValidCost = (cost: any): number => {
    if (cost === null || cost === undefined) return 0;
    const numCost = typeof cost === 'number' ? cost : parseFloat(cost);
    return !isNaN(numCost) && isFinite(numCost) && numCost >= 0 ? numCost : 0;
  };

  // Calculate total estimated costs from deficiencies with validation
  const totalEstimatedCost = deficiencies.reduce((sum, d) => sum + getValidCost(d.estimatedCost), 0);

  // Group deficiencies by priority
  const deficienciesByPriority = {
    immediate: deficiencies.filter(d => d.priority === 'immediate'),
    short_term: deficiencies.filter(d => d.priority === 'short_term'),
    medium_term: deficiencies.filter(d => d.priority === 'medium_term'),
    long_term: deficiencies.filter(d => d.priority === 'long_term'),
  };

  // Calculate costs by priority with validation
  const costsByPriority = {
    immediate: deficienciesByPriority.immediate.reduce((sum, d) => sum + getValidCost(d.estimatedCost), 0),
    short_term: deficienciesByPriority.short_term.reduce((sum, d) => sum + getValidCost(d.estimatedCost), 0),
    medium_term: deficienciesByPriority.medium_term.reduce((sum, d) => sum + getValidCost(d.estimatedCost), 0),
    long_term: deficienciesByPriority.long_term.reduce((sum, d) => sum + getValidCost(d.estimatedCost), 0),
  };

  // Calculate budget allocation percentages
  const budgetAllocations = totalBudget > 0 && totalEstimatedCost > 0 ? {
    immediate: (costsByPriority.immediate / totalEstimatedCost) * totalBudget,
    short_term: (costsByPriority.short_term / totalEstimatedCost) * totalBudget,
    medium_term: (costsByPriority.medium_term / totalEstimatedCost) * totalBudget,
    long_term: (costsByPriority.long_term / totalEstimatedCost) * totalBudget,
  } : null;

  // Sort assessments by condition (worst first)
  const conditionPriority = { 'poor': 1, 'fair': 2, 'good': 3, 'not_assessed': 4 };
  const sortedAssessments = [...assessments].sort((a, b) => {
    const aPriority = conditionPriority[a.condition as keyof typeof conditionPriority] || 999;
    const bPriority = conditionPriority[b.condition as keyof typeof conditionPriority] || 999;
    return aPriority - bPriority;
  });

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'poor': return 'destructive';
      case 'fair': return 'secondary';
      case 'good': return 'default';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'immediate': return 'destructive';
      case 'short_term': return 'secondary';
      case 'medium_term': return 'default';
      case 'long_term': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Tabs defaultValue="budget" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="budget">Budget Allocation</TabsTrigger>
        <TabsTrigger value="schedule">Priority Scheduling</TabsTrigger>
        <TabsTrigger value="lifecycle">Lifecycle Cost</TabsTrigger>
      </TabsList>

      {/* Budget Allocation Tab */}
      <TabsContent value="budget" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Budget Planning</CardTitle>
            <CardDescription>
              Allocate budget across repair priorities based on estimated costs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="totalBudget">Total Available Budget</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="totalBudget"
                    type="number"
                    value={totalBudget || ''}
                    onChange={(e) => setTotalBudget(Number(e.target.value))}
                    placeholder="Enter total budget"
                    className="pl-9"
                  />
                </div>
                <Button onClick={() => setTotalBudget(totalEstimatedCost)}>
                  Use Total Cost
                </Button>
              </div>
            </div>

            {totalEstimatedCost === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-lg bg-muted/20">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Repair Costs to Allocate</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                  Add deficiencies with estimated costs to use budget planning and allocation features.
                </p>
                <p className="text-xs text-muted-foreground">
                  Navigate to the Deficiencies tab to add repair items with cost estimates.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Estimated Cost</p>
                    <p className="text-2xl font-bold">${totalEstimatedCost.toLocaleString()}</p>
                  </div>
                  {totalBudget > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-muted-foreground">Budget Coverage</p>
                      <p className="text-2xl font-bold">
                        {((totalBudget / totalEstimatedCost) * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>

                {totalBudget > 0 && budgetAllocations && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Budget Distribution by Priority</h3>
                  
                  <div className="space-y-2">
                    {/* Immediate Priority - Expandable */}
                    <Collapsible open={expandedPriorities.immediate} onOpenChange={() => togglePriority('immediate')}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors">
                          <div className="flex items-center gap-2">
                            {expandedPriorities.immediate ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <div>
                              <p className="font-medium">Immediate</p>
                              <p className="text-xs text-muted-foreground">
                                {deficienciesByPriority.immediate.length} items
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">${budgetAllocations.immediate.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">
                              {((budgetAllocations.immediate / totalBudget) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {deficienciesByPriority.immediate.length > 0 ? (
                          <div className="ml-6 mt-2 space-y-2 border-l-2 border-destructive/30 pl-4">
                            {deficienciesByPriority.immediate.map((item) => (
                              <div key={item.id} className="flex items-start justify-between p-2 bg-muted/30 rounded text-sm">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{item.title || 'Untitled Deficiency'}</p>
                                  {item.location && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <MapPin className="h-3 w-3" />
                                      {item.location}
                                    </p>
                                  )}
                                </div>
                                <p className="font-semibold text-destructive ml-2 whitespace-nowrap">
                                  ${getValidCost(item.estimatedCost).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="ml-6 mt-2 text-sm text-muted-foreground pl-4">No immediate items</p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Short Term Priority - Expandable */}
                    <Collapsible open={expandedPriorities.short_term} onOpenChange={() => togglePriority('short_term')}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2">
                            {expandedPriorities.short_term ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <Calendar className="h-4 w-4 text-orange-500" />
                            <div>
                              <p className="font-medium">Short Term</p>
                              <p className="text-xs text-muted-foreground">
                                {deficienciesByPriority.short_term.length} items
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">${budgetAllocations.short_term.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">
                              {((budgetAllocations.short_term / totalBudget) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {deficienciesByPriority.short_term.length > 0 ? (
                          <div className="ml-6 mt-2 space-y-2 border-l-2 border-orange-500/30 pl-4">
                            {deficienciesByPriority.short_term.map((item) => (
                              <div key={item.id} className="flex items-start justify-between p-2 bg-muted/30 rounded text-sm">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{item.title || 'Untitled Deficiency'}</p>
                                  {item.location && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <MapPin className="h-3 w-3" />
                                      {item.location}
                                    </p>
                                  )}
                                </div>
                                <p className="font-semibold text-orange-600 ml-2 whitespace-nowrap">
                                  ${getValidCost(item.estimatedCost).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="ml-6 mt-2 text-sm text-muted-foreground pl-4">No short term items</p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Medium Term Priority - Expandable */}
                    <Collapsible open={expandedPriorities.medium_term} onOpenChange={() => togglePriority('medium_term')}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2">
                            {expandedPriorities.medium_term ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="font-medium">Medium Term</p>
                              <p className="text-xs text-muted-foreground">
                                {deficienciesByPriority.medium_term.length} items
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">${budgetAllocations.medium_term.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">
                              {((budgetAllocations.medium_term / totalBudget) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {deficienciesByPriority.medium_term.length > 0 ? (
                          <div className="ml-6 mt-2 space-y-2 border-l-2 border-blue-500/30 pl-4">
                            {deficienciesByPriority.medium_term.map((item) => (
                              <div key={item.id} className="flex items-start justify-between p-2 bg-muted/30 rounded text-sm">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{item.title || 'Untitled Deficiency'}</p>
                                  {item.location && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <MapPin className="h-3 w-3" />
                                      {item.location}
                                    </p>
                                  )}
                                </div>
                                <p className="font-semibold text-blue-600 ml-2 whitespace-nowrap">
                                  ${getValidCost(item.estimatedCost).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="ml-6 mt-2 text-sm text-muted-foreground pl-4">No medium term items</p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Long Term Priority - Expandable */}
                    <Collapsible open={expandedPriorities.long_term} onOpenChange={() => togglePriority('long_term')}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2">
                            {expandedPriorities.long_term ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <Calendar className="h-4 w-4 text-green-500" />
                            <div>
                              <p className="font-medium">Long Term</p>
                              <p className="text-xs text-muted-foreground">
                                {deficienciesByPriority.long_term.length} items
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">${budgetAllocations.long_term.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">
                              {((budgetAllocations.long_term / totalBudget) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {deficienciesByPriority.long_term.length > 0 ? (
                          <div className="ml-6 mt-2 space-y-2 border-l-2 border-green-500/30 pl-4">
                            {deficienciesByPriority.long_term.map((item) => (
                              <div key={item.id} className="flex items-start justify-between p-2 bg-muted/30 rounded text-sm">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{item.title || 'Untitled Deficiency'}</p>
                                  {item.location && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <MapPin className="h-3 w-3" />
                                      {item.location}
                                    </p>
                                  )}
                                </div>
                                <p className="font-semibold text-green-600 ml-2 whitespace-nowrap">
                                  ${getValidCost(item.estimatedCost).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="ml-6 mt-2 text-sm text-muted-foreground pl-4">No long term items</p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Priority Scheduling Tab */}
      <TabsContent value="schedule" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Priority Schedule</CardTitle>
            <CardDescription>
              Components ranked by condition and deficiency priority
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sortedAssessments.length > 0 ? (
              <div className="space-y-3">
                {sortedAssessments.map((assessment, index) => (
                  <div 
                    key={assessment.id} 
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{assessment.componentName}</p>
                      <p className="text-sm text-muted-foreground">{assessment.componentCode}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getConditionColor(assessment.condition)}>
                        {assessment.condition}
                      </Badge>
                      {assessment.estimatedCost && (
                        <span className="text-sm font-semibold">
                          ${assessment.estimatedCost.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No assessments available for scheduling
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deficiency Timeline</CardTitle>
            <CardDescription>
              Recommended action timeline based on priority levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(deficienciesByPriority).map(([priority, items]) => (
                items.length > 0 && (
                  <div key={priority} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={getPriorityColor(priority)}>
                        {priority.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {items.length} {items.length === 1 ? 'item' : 'items'}
                      </span>
                      <span className="text-sm font-semibold ml-auto">
                        ${items.reduce((sum, d) => sum + getValidCost(d.estimatedCost), 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="pl-4 space-y-1">
                      {items.map((item) => (
                        <div key={item.id} className="text-sm text-muted-foreground">
                          • {item.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Lifecycle Cost Tab */}
      <TabsContent value="lifecycle" className="space-y-4">
        <AssetLifecycleCost 
          assetId={assetId}
          totalEstimatedCost={totalEstimatedCost}
        />
      </TabsContent>
    </Tabs>
  );
}
