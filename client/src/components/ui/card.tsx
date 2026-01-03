import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Option B: Modern Gradient & Depth Card
 * - Layered depth with soft shadows
 * - Hover state elevation (cards lift on hover)
 * - Subtle gradient overlay on hover
 * - Smooth transitions
 */
function Card({ className, interactive = false, ...props }: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border border-border/60 py-6 shadow-md transition-all duration-300 ease-out",
        interactive && "hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/20 cursor-pointer",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold tracking-tight", className)}
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

/**
 * Option B: Interactive Card with enhanced hover effects
 * Use this for clickable cards that need prominent hover feedback
 */
function InteractiveCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="interactive-card"
      className={cn(
        "relative bg-card text-card-foreground flex flex-col gap-6 rounded-xl border border-border/60 py-6 shadow-md transition-all duration-300 ease-out overflow-hidden cursor-pointer",
        "hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1.5 hover:border-primary/30",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/0 before:to-primary/5 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100",
        className
      )}
      {...props}
    />
  );
}

/**
 * Option B: Gradient Card with colored top border
 */
function GradientCard({ className, accentColor = "blue", ...props }: React.ComponentProps<"div"> & { accentColor?: "blue" | "amber" | "teal" }) {
  const accentClasses = {
    blue: "before:from-[oklch(0.65_0.14_175)] before:via-[oklch(0.59_0.20_255)] before:to-[oklch(0.55_0.22_290)]",
    amber: "before:from-[oklch(0.75_0.18_70)] before:to-[oklch(0.70_0.20_55)]",
    teal: "before:from-[oklch(0.65_0.14_175)] before:to-[oklch(0.68_0.15_195)]",
  };

  return (
    <div
      data-slot="gradient-card"
      className={cn(
        "relative bg-card text-card-foreground flex flex-col gap-6 rounded-xl border border-border/60 py-6 shadow-md transition-all duration-300 ease-out overflow-hidden",
        "before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r",
        accentClasses[accentColor],
        "hover:shadow-lg hover:-translate-y-0.5",
        className
      )}
      {...props}
    />
  );
}

/**
 * Option B: Stat Card with prominent value display
 */
function StatCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-card"
      className={cn(
        "relative bg-card text-card-foreground flex flex-col gap-3 rounded-xl border border-border/60 p-6 shadow-md transition-all duration-300 ease-out",
        "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/20",
        className
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  InteractiveCard,
  GradientCard,
  StatCard,
};
