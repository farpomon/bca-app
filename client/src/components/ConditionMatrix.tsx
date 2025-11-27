import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
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
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200",
  },
  fair: {
    label: "Fair",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-700",
    borderColor: "border-yellow-200",
  },
  poor: {
    label: "Poor",
    bgColor: "bg-orange-50",
    textColor: "text-orange-700",
    borderColor: "border-orange-200",
  },
  not_assessed: {
    label: "Not Assessed",
    bgColor: "bg-gray-50",
    textColor: "text-gray-600",
    borderColor: "border-gray-200",
  },
};

export function ConditionMatrix({ data, isLoading }: ConditionMatrixProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (!data || data.systems.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Condition Matrix</h3>
        <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg border-2 border-dashed">
          <p className="text-muted-foreground">No assessment data available. Complete component assessments to see condition summary.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">Building Systems Condition Matrix</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-3 px-4 font-semibold text-left">System</th>
              <th className="py-3 px-4 font-semibold text-center">Condition</th>
              <th className="py-3 px-4 font-semibold text-right">Components</th>
              <th className="py-3 px-4 font-semibold text-right">Est. Repair Cost</th>
            </tr>
          </thead>
          <tbody>
            {data.systems.map((system) => {
              const config = conditionConfig[system.condition];
              return (
                <tr key={system.code} className="border-b hover:bg-muted/20 transition-colors">
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
            <tr className="font-bold bg-muted/50">
              <td className="py-3 px-4" colSpan={2}>Total</td>
              <td className="py-3 px-4 text-right">
                {data.systems.reduce((sum, s) => sum + s.componentCount, 0)}
              </td>
              <td className="py-3 px-4 text-right text-primary">
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
                "inline-block w-3 h-3 rounded-full border",
                config.bgColor,
                config.borderColor
              )}
            />
            <span className="text-muted-foreground">{config.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
