import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Calendar, TrendingUp, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import AssetLifecycleCost from "@/components/AssetLifecycleCost";

interface AssetOptimizationProps {
  assetId: number;
  assessments?: any[];
  deficiencies?: any[];
}

export default function AssetOptimization({ assetId, assessments = [], deficiencies = [] }: AssetOptimizationProps) {
  const [totalBudget, setTotalBudget] = useState<number>(0);

  // Calculate total estimated costs from deficiencies
  const totalEstimatedCost = deficiencies.reduce((sum, d) => sum + (d.estimatedCost || 0), 0);

  // Group deficiencies by priority
  const deficienciesByPriority = {
    immediate: deficiencies.filter(d => d.priority === 'immediate'),
    short_term: deficiencies.filter(d => d.priority === 'short_term'),
    medium_term: deficiencies.filter(d => d.priority === 'medium_term'),
    long_term: deficiencies.filter(d => d.priority === 'long_term'),
  };

  // Calculate costs by priority
  const costsByPriority = {
    immediate: deficienciesByPriority.immediate.reduce((sum, d) => sum + (d.estimatedCost || 0), 0),
    short_term: deficienciesByPriority.short_term.reduce((sum, d) => sum + (d.estimatedCost || 0), 0),
    medium_term: deficienciesByPriority.medium_term.reduce((sum, d) => sum + (d.estimatedCost || 0), 0),
    long_term: deficienciesByPriority.long_term.reduce((sum, d) => sum + (d.estimatedCost || 0), 0),
  };

  // Calculate budget allocation percentages
  const budgetAllocations = totalBudget > 0 ? {
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
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-destructive/5">
                      <div className="flex items-center gap-2">
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

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
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

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
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

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
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
                  </div>
                </div>
              )}
            </div>
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
                        ${items.reduce((sum, d) => sum + (d.estimatedCost || 0), 0).toLocaleString()}
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
