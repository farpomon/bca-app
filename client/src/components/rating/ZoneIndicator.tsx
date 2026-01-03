import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, AlertCircle, XCircle } from "lucide-react";

type Zone = "green" | "yellow" | "orange" | "red";

interface ZoneIndicatorProps {
  zone: Zone;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showIcon?: boolean;
  className?: string;
}

// Zone configuration
const zoneConfig: Record<Zone, { 
  bg: string; 
  text: string; 
  border: string;
  fill: string;
  label: string; 
  description: string;
  icon: typeof CheckCircle;
}> = {
  green: {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    border: "border-emerald-300",
    fill: "bg-emerald-500",
    label: "Excellent",
    description: "Asset in excellent condition",
    icon: CheckCircle,
  },
  yellow: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-300",
    fill: "bg-yellow-500",
    label: "Good",
    description: "Minor attention needed",
    icon: AlertCircle,
  },
  orange: {
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-300",
    fill: "bg-orange-500",
    label: "Fair",
    description: "Plan for repairs",
    icon: AlertTriangle,
  },
  red: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
    fill: "bg-red-500",
    label: "Poor",
    description: "Immediate action required",
    icon: XCircle,
  },
};

const sizeClasses = {
  sm: { badge: "text-xs px-1.5 py-0.5", icon: "w-3 h-3", dot: "w-2 h-2" },
  md: { badge: "text-sm px-2 py-1", icon: "w-4 h-4", dot: "w-3 h-3" },
  lg: { badge: "text-base px-3 py-1.5", icon: "w-5 h-5", dot: "w-4 h-4" },
};

export function ZoneIndicator({ 
  zone, 
  size = "md", 
  showLabel = true,
  showIcon = true,
  className 
}: ZoneIndicatorProps) {
  const config = zoneConfig[zone];
  const sizes = sizeClasses[size];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-medium",
        config.bg,
        config.text,
        config.border,
        sizes.badge,
        className
      )}
    >
      {showIcon && <Icon className={sizes.icon} />}
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}

// Simple dot indicator for compact displays
export function ZoneDot({ zone, size = "md", className }: { zone: Zone; size?: "sm" | "md" | "lg"; className?: string }) {
  const config = zoneConfig[zone];
  const sizes = sizeClasses[size];

  return (
    <span
      className={cn(
        "inline-block rounded-full",
        config.fill,
        sizes.dot,
        className
      )}
      title={config.label}
    />
  );
}

// Zone badge with description tooltip
export function ZoneBadge({ 
  zone, 
  showDescription = false,
  className 
}: { 
  zone: Zone; 
  showDescription?: boolean;
  className?: string;
}) {
  const config = zoneConfig[zone];
  const Icon = config.icon;

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border text-sm px-2 py-1 font-medium",
          config.bg,
          config.text,
          config.border
        )}
      >
        <Icon className="w-4 h-4" />
        <span>{config.label}</span>
      </div>
      {showDescription && (
        <span className="text-xs text-muted-foreground pl-1">
          {config.description}
        </span>
      )}
    </div>
  );
}

// Large zone display for dashboards
export function ZoneDisplay({ 
  zone, 
  score,
  className 
}: { 
  zone: Zone; 
  score?: number;
  className?: string;
}) {
  const config = zoneConfig[zone];
  const Icon = config.icon;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        className={cn(
          "flex items-center justify-center w-16 h-16 rounded-xl border-2",
          config.bg,
          config.border
        )}
      >
        <Icon className={cn("w-8 h-8", config.text)} />
      </div>
      <div className="text-center">
        <div className={cn("text-sm font-semibold", config.text)}>
          {config.label}
        </div>
        {score !== undefined && (
          <div className="text-xs text-muted-foreground">
            Score: {score.toFixed(1)}
          </div>
        )}
      </div>
    </div>
  );
}

// Zone distribution bar chart
export function ZoneDistributionBar({ 
  distribution,
  showCounts = true,
  className 
}: { 
  distribution: Record<Zone, number>;
  showCounts?: boolean;
  className?: string;
}) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const zones: Zone[] = ["green", "yellow", "orange", "red"];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex h-4 rounded-full overflow-hidden bg-muted">
        {zones.map((zone) => {
          const count = distribution[zone] || 0;
          const percentage = (count / total) * 100;
          if (percentage === 0) return null;
          
          return (
            <div
              key={zone}
              className={cn(zoneConfig[zone].fill)}
              style={{ width: `${percentage}%` }}
              title={`${zoneConfig[zone].label}: ${count} (${percentage.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      {showCounts && (
        <div className="flex justify-between text-xs">
          {zones.map((zone) => {
            const count = distribution[zone] || 0;
            return (
              <div key={zone} className="flex items-center gap-1">
                <ZoneDot zone={zone} size="sm" />
                <span className="text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Zone legend
export function ZoneLegend({ className }: { className?: string }) {
  const zones: Zone[] = ["green", "yellow", "orange", "red"];

  return (
    <div className={cn("flex flex-wrap gap-4", className)}>
      {zones.map((zone) => {
        const config = zoneConfig[zone];
        return (
          <div key={zone} className="flex items-center gap-2">
            <ZoneDot zone={zone} />
            <span className="text-sm text-muted-foreground">{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}
