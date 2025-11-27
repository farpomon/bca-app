import { Card } from "@/components/ui/card";
import { Loader2, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

interface FCIGaugeProps {
  data: {
    fci: number;
    rating: "good" | "fair" | "poor" | "critical";
    totalRepairCost: number;
    totalReplacementValue: number;
  } | undefined | null;
  isLoading: boolean;
}

const fciConfig = {
  good: {
    label: "Good",
    color: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-100",
    range: "0-5%",
    description: "Facility is in excellent condition with minimal deferred maintenance",
  },
  fair: {
    label: "Fair",
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    bgColor: "bg-yellow-100",
    range: "5-10%",
    description: "Facility requires some attention but is generally well-maintained",
  },
  poor: {
    label: "Poor",
    color: "bg-orange-500",
    textColor: "text-orange-700",
    bgColor: "bg-orange-100",
    range: "10-30%",
    description: "Facility has significant deferred maintenance requiring attention",
  },
  critical: {
    label: "Critical",
    color: "bg-red-600",
    textColor: "text-red-700",
    bgColor: "bg-red-100",
    range: ">30%",
    description: "Facility requires immediate major investment to address critical issues",
  },
};

export function FCIGauge({ data, isLoading }: FCIGaugeProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-muted-foreground" />
          FCI Analysis
        </h3>
        <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg border-2 border-dashed">
          <p className="text-muted-foreground">Add repair costs and replacement values to calculate FCI</p>
        </div>
      </Card>
    );
  }

  const config = fciConfig[data.rating];
  const gaugeRotation = Math.min(data.fci, 100);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-muted-foreground" />
        Facility Condition Index (FCI)
      </h3>

      {/* Gauge Visualization */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-full max-w-[280px] aspect-[2/1]">
          {/* Gauge Background - semicircle */}
          <div className="w-full h-full bg-muted rounded-t-full overflow-hidden relative">
            {/* Rotating colored fill */}
            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 top-0 origin-bottom transition-transform duration-1000 ease-out",
                config.color
              )}
              style={{
                transform: `rotate(${(gaugeRotation / 100) * 180 - 180}deg)`,
              }}
            />
          </div>
          {/* Inner white circle to create gauge effect */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4/5 h-[160%] bg-background rounded-full flex items-end justify-center pb-4">
            <div className="text-center mb-8">
              <span className="text-5xl font-extrabold">{data.fci.toFixed(2)}</span>
              <span className="text-2xl font-bold text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-6 text-center">
          <span
            className={cn(
              "px-4 py-2 rounded-full font-bold text-sm",
              config.bgColor,
              config.textColor
            )}
          >
            {config.label}
          </span>
          <p className="text-xs text-muted-foreground mt-3">Target: &lt;5% (Good)</p>
        </div>
      </div>

      {/* FCI Calculation Formula */}
      <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
        <p className="text-sm font-semibold mb-2">FCI Calculation:</p>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>FCI = (Total Repair Cost / Total Replacement Value) × 100</p>
          <p className="font-mono text-xs">
            = (${data.totalRepairCost.toLocaleString()} / ${data.totalReplacementValue.toLocaleString()}) × 100
          </p>
          <p className="font-mono text-xs">= {data.fci.toFixed(2)}%</p>
        </div>
      </div>

      {/* FCI Rating Definitions */}
      <div className="space-y-3">
        <p className="text-sm font-semibold">FCI Rating Definitions:</p>
        {Object.entries(fciConfig).map(([key, cfg]) => (
          <div key={key} className="flex items-start gap-3 text-sm">
            <span className={cn("inline-block w-3 h-3 rounded-full mt-1 flex-shrink-0", cfg.color)} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">{cfg.label}</span>
                <span className="text-xs text-muted-foreground">({cfg.range})</span>
              </div>
              <p className="text-xs text-muted-foreground">{cfg.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cost Summary */}
      <div className="mt-6 pt-4 border-t grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Total Replacement Value</p>
          <p className="text-lg font-bold">${data.totalReplacementValue.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Current Repair Needs</p>
          <p className="text-lg font-bold text-destructive">${data.totalRepairCost.toLocaleString()}</p>
        </div>
      </div>
    </Card>
  );
}
