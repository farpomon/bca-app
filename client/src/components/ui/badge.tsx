import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Option B: Modern Gradient & Depth Badge Variants
 * - Gradient badges for primary actions
 * - Amber and Teal accent variants
 * - Soft backgrounds with colored text for status indicators
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        // Option B: Gradient primary badge
        default:
          "border-transparent bg-gradient-to-r from-[oklch(0.59_0.20_255)] to-[oklch(0.55_0.22_270)] text-white shadow-sm [a&]:hover:shadow-md [a&]:hover:shadow-primary/20",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80",
        destructive:
          "border-transparent bg-gradient-to-r from-destructive to-[oklch(0.50_0.24_25)] text-white shadow-sm [a&]:hover:shadow-md [a&]:hover:shadow-destructive/20",
        outline:
          "border-2 border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground [a&]:hover:border-primary/30",
        // Option B: Amber accent badge
        amber:
          "border-transparent bg-[oklch(0.75_0.18_70_/_0.15)] text-[oklch(0.55_0.18_70)] [a&]:hover:bg-[oklch(0.75_0.18_70_/_0.25)]",
        // Option B: Teal accent badge
        teal:
          "border-transparent bg-[oklch(0.65_0.14_175_/_0.15)] text-[oklch(0.45_0.14_175)] [a&]:hover:bg-[oklch(0.65_0.14_175_/_0.25)]",
        // Option B: Success badge (teal-based)
        success:
          "border-transparent bg-[oklch(0.65_0.14_175_/_0.15)] text-[oklch(0.45_0.14_175)] [a&]:hover:bg-[oklch(0.65_0.14_175_/_0.25)]",
        // Option B: Warning badge (amber-based)
        warning:
          "border-transparent bg-[oklch(0.75_0.18_70_/_0.15)] text-[oklch(0.55_0.18_70)] [a&]:hover:bg-[oklch(0.75_0.18_70_/_0.25)]",
        // Option B: Info badge (cyan-based)
        info:
          "border-transparent bg-[oklch(0.68_0.15_195_/_0.15)] text-[oklch(0.48_0.15_195)] [a&]:hover:bg-[oklch(0.68_0.15_195_/_0.25)]",
        // Option B: Gradient badge (full gradient)
        gradient:
          "border-transparent bg-gradient-to-r from-[oklch(0.65_0.14_175)] via-[oklch(0.59_0.20_255)] to-[oklch(0.55_0.22_290)] text-white shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
