import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, FolderKanban, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface BudgetCycle {
  id: number;
  name: string;
  description?: string;
  startYear: number;
  endYear: number;
  status: string;
  totalBudget?: string;
  projectCount?: number;
}

interface CycleSelectorProps {
  cycles: BudgetCycle[];
  selectedCycleId: number | null;
  onSelectCycle: (cycleId: number) => void;
}

function getCycleDuration(startYear: number, endYear: number): number {
  return endYear - startYear + 1;
}

function getCycleCategory(duration: number): {
  label: string;
  color: string;
} {
  if (duration <= 3) {
    return { label: "Short-term", color: "bg-blue-500/10 text-blue-700 border-blue-200" };
  } else if (duration <= 10) {
    return { label: "Medium-term", color: "bg-amber-500/10 text-amber-700 border-amber-200" };
  } else {
    return { label: "Long-term", color: "bg-purple-500/10 text-purple-700 border-purple-200" };
  }
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-green-500/10 text-green-700 border-green-200";
    case "draft":
      return "bg-gray-500/10 text-gray-700 border-gray-200";
    case "planning":
      return "bg-blue-500/10 text-blue-700 border-blue-200";
    case "approved":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-200";
    case "archived":
      return "bg-slate-500/10 text-slate-700 border-slate-200";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-200";
  }
}

export function CycleSelector({ cycles, selectedCycleId, onSelectCycle }: CycleSelectorProps) {
  // Group cycles by category
  const groupedCycles = cycles.reduce((acc, cycle) => {
    const duration = getCycleDuration(cycle.startYear, cycle.endYear);
    const category = getCycleCategory(duration);
    const key = category.label;
    
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(cycle);
    return acc;
  }, {} as Record<string, BudgetCycle[]>);

  const categoryOrder = ["Short-term", "Medium-term", "Long-term"];
  const sortedCategories = categoryOrder.filter(cat => groupedCycles[cat]);

  return (
    <div className="space-y-6">
      {sortedCategories.map((category) => {
        const categoryInfo = getCycleCategory(
          category === "Short-term" ? 3 : category === "Medium-term" ? 10 : 30
        );
        
        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("font-semibold", categoryInfo.color)}>
                {category}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {category === "Short-term" && "(1-3 years)"}
                {category === "Medium-term" && "(4-10 years)"}
                {category === "Long-term" && "(11-30 years)"}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {groupedCycles[category].map((cycle) => {
                const duration = getCycleDuration(cycle.startYear, cycle.endYear);
                const isSelected = cycle.id === selectedCycleId;
                const totalBudget = cycle.totalBudget ? parseFloat(cycle.totalBudget) : 0;

                return (
                  <Card
                    key={cycle.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      isSelected && "ring-2 ring-primary shadow-md"
                    )}
                    onClick={() => onSelectCycle(cycle.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base leading-tight truncate">
                            {cycle.name}
                          </CardTitle>
                          {cycle.description && (
                            <CardDescription className="text-xs mt-1 line-clamp-2">
                              {cycle.description}
                            </CardDescription>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {cycle.startYear} - {cycle.endYear}
                        </span>
                        <Badge variant="outline" className="ml-auto text-xs">
                          {duration} {duration === 1 ? "year" : "years"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {totalBudget > 0
                            ? new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: "USD",
                                notation: "compact",
                                maximumFractionDigits: 1,
                              }).format(totalBudget)
                            : "No budget"}
                        </span>
                      </div>

                      {cycle.projectCount !== undefined && (
                        <div className="flex items-center gap-2 text-sm">
                          <FolderKanban className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {cycle.projectCount} {cycle.projectCount === 1 ? "project" : "projects"}
                          </span>
                        </div>
                      )}

                      <div className="pt-2">
                        <Badge
                          variant="outline"
                          className={cn("text-xs font-medium", getStatusColor(cycle.status))}
                        >
                          {cycle.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {cycles.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Budget Cycles</h3>
            <p className="text-muted-foreground mb-4">
              Create a capital budget cycle to begin planning
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
