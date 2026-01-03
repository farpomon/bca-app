import { cn } from "@/lib/utils";

/**
 * Option B: Modern Gradient & Depth Skeleton
 * - Gradient shimmer effect instead of simple pulse
 * - Smooth animation for loading states
 */
function Skeleton({ className, shimmer = true, ...props }: React.ComponentProps<"div"> & { shimmer?: boolean }) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-xl overflow-hidden",
        shimmer 
          ? "relative bg-muted before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent"
          : "bg-muted animate-pulse",
        className
      )}
      {...props}
    />
  );
}

/**
 * Option B: Gradient Shimmer Skeleton
 * Uses the Option B color palette for a more vibrant loading effect
 */
function GradientSkeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="gradient-skeleton"
      className={cn(
        "rounded-xl overflow-hidden relative",
        "bg-gradient-to-r from-muted via-muted/80 to-muted",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-[oklch(0.59_0.20_255_/_0.1)] before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

/**
 * Option B: Card Skeleton with shadow
 */
function CardSkeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-skeleton"
      className={cn(
        "rounded-xl border border-border/60 bg-card p-6 shadow-md",
        "relative overflow-hidden",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-primary/5 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton, GradientSkeleton, CardSkeleton };
