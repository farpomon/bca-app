import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

/**
 * Option B: Modern Gradient & Depth Progress
 * - Gradient fill with Option B colors
 * - Animated progress fills
 * - Glow effect on the indicator
 */
function Progress({
  className,
  value,
  variant = "default",
  animated = true,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  variant?: "default" | "gradient" | "amber" | "teal";
  animated?: boolean;
}) {
  const variantClasses = {
    default: "bg-gradient-to-r from-[oklch(0.59_0.20_255)] to-[oklch(0.55_0.22_270)]",
    gradient: "bg-gradient-to-r from-[oklch(0.65_0.14_175)] via-[oklch(0.59_0.20_255)] to-[oklch(0.55_0.22_290)]",
    amber: "bg-gradient-to-r from-[oklch(0.75_0.18_70)] to-[oklch(0.70_0.20_55)]",
    teal: "bg-gradient-to-r from-[oklch(0.65_0.14_175)] to-[oklch(0.68_0.15_195)]",
  };

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-muted relative h-3 w-full overflow-hidden rounded-full shadow-inner",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 rounded-full shadow-sm",
          variantClasses[variant],
          animated && "transition-all duration-500 ease-out",
          // Subtle glow effect
          variant === "default" && "shadow-[0_0_8px_oklch(0.59_0.20_255_/_0.4)]",
          variant === "gradient" && "shadow-[0_0_8px_oklch(0.59_0.20_255_/_0.4)]",
          variant === "amber" && "shadow-[0_0_8px_oklch(0.75_0.18_70_/_0.4)]",
          variant === "teal" && "shadow-[0_0_8px_oklch(0.65_0.14_175_/_0.4)]"
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

/**
 * Option B: Circular Progress with gradient
 */
function CircularProgress({
  value = 0,
  size = 48,
  strokeWidth = 4,
  variant = "default",
  className,
  children,
}: {
  value?: number;
  size?: number;
  strokeWidth?: number;
  variant?: "default" | "gradient" | "amber" | "teal";
  className?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const gradientId = `progress-gradient-${variant}`;
  const gradientColors = {
    default: { start: "oklch(0.59 0.20 255)", end: "oklch(0.55 0.22 270)" },
    gradient: { start: "oklch(0.65 0.14 175)", end: "oklch(0.55 0.22 290)" },
    amber: { start: "oklch(0.75 0.18 70)", end: "oklch(0.70 0.20 55)" },
    teal: { start: "oklch(0.65 0.14 175)", end: "oklch(0.68 0.15 195)" },
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={gradientColors[variant].start} />
            <stop offset="100%" stopColor={gradientColors[variant].end} />
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
          style={{
            filter: `drop-shadow(0 0 4px ${gradientColors[variant].start})`,
          }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

export { Progress, CircularProgress };
