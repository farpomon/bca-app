import { Card } from "@/components/ui/card";
import { Loader2, Grid3X3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConditionMatrixProps {
  data: {
    systems: Array<{
      code: string;
      name: string;
      condition: "good" | "fair" | "poor" | "not_assessed";
      componentCount: number;
      estimatedCost: number;
    }>;
  } | undefined;
  isLoading: boolean;
}

const conditionConfig = {
  good: {
    label: "Good",
    bgColor: "bg-teal-50",
    textColor: "text-teal-700",
    borderColor: "border-teal-200",
    dotColor: "bg-teal-500",
  },
  fair: {
    label: "Fair",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
    dotColor: "bg-blue-500",
  },
  poor: {
    label: "Poor",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
    dotColor: "bg-amber-500",
  },
  not_assessed: {
    label: "Not Assessed",
    bgColor: "bg-gray-50",
    textColor: "text-gray-600",
    borderColor: "border-gray-200",
    dotColor: "bg-gray-400",
  },
};

export function ConditionMatrix({ data, isLoading }: ConditionMatrixProps) {
  if (isLoading) {
    return (
      <Card className="stats-card-teal p-6">
        <div className="loading-container h-64">
          <Loader2 className="loading-spinner" />
          <p className="loading-text">Loading condition data...</p>
        </div>
      </Card>
    );
  }

  if (!data || data.systems.length === 0) {
    return (
      <Card className="stats-card-teal p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-3">
          <div className="stats-icon-teal">
            <Grid3X3 className="w-5 h-5" />
          </div>
          Condition Matrix
        </h3>
        <div className="empty-state-container h-64 bg-muted/10 rounded-xl border-2 border-dashed">
          <div className="empty-state-icon">
            <Grid3X3 className="h-10 w-10 text-primary" />
          </div>
          <p className="text-muted-foreground text-center max-w-md">No assessment data available. Complete component assessments to see condition summary.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="stats-card-teal p-6">
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-3">
        <div className="stats-icon-teal">
          <Grid3X3 className="w-5 h-5" />
        </div>
        Building Systems Condition Matrix
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="data-table-header">
              <th className="py-3 px-4 text-left rounded-tl-lg">System</th>
              <th className="py-3 px-4 text-center">Condition</th>
              <th className="py-3 px-4 text-right">Components</th>
              <th className="py-3 px-4 text-right rounded-tr-lg">Est. Repair Cost</th>
            </tr>
          </thead>
          <tbody>
            {data.systems.map((system) => {
              const config = conditionConfig[system.condition];
              return (
                <tr key={system.code} className="data-table-row">
                  <td className="py-3 px-4 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-muted-foreground">{system.code}</span>
                      <span>{system.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={cn(
                        "inline-flex px-3 py-1 rounded-full text-xs font-semibold border",
                        config.bgColor,
                        config.textColor,
                        config.borderColor
                      )}
                    >
                      {config.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-muted-foreground">
                    {system.componentCount}
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {system.estimatedCost > 0 ? `$${system.estimatedCost.toLocaleString()}` : '-'}
                  </td>
                </tr>
              );
            })}
            {/* Summary Row */}
            <tr className="font-bold bg-primary/5">
              <td className="py-4 px-4 rounded-bl-lg" colSpan={2}>Total</td>
              <td className="py-4 px-4 text-right">
                {data.systems.reduce((sum, s) => sum + s.componentCount, 0)}
              </td>
              <td className="py-4 px-4 text-right text-primary rounded-br-lg">
                ${data.systems.reduce((sum, s) => sum + s.estimatedCost, 0).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-medium">Condition Legend:</span>
        </div>
        {Object.entries(conditionConfig).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-block w-3 h-3 rounded-full",
                config.dotColor
              )}
            />
            <span className="text-muted-foreground">{config.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
