import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Option B: Modern Gradient & Depth Button Variants
 * - Primary: Gradient blue with glow effect on hover
 * - Amber: Warm gradient for secondary actions
 * - Teal: Cool gradient for tertiary actions
 * - All variants feature smooth transitions and subtle lift on hover
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // Option B: Primary gradient with glow
        default: "bg-gradient-to-br from-[oklch(0.59_0.20_255)] to-[oklch(0.55_0.22_270)] text-white shadow-md hover:shadow-lg hover:shadow-[oklch(0.59_0.20_255_/_0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm",
        destructive:
          "bg-gradient-to-br from-destructive to-[oklch(0.50_0.24_25)] text-white shadow-md hover:shadow-lg hover:shadow-destructive/30 hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-destructive/20",
        outline:
          "border-2 border-border bg-transparent shadow-sm hover:border-primary hover:bg-primary/5 hover:shadow-md dark:bg-transparent dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md hover:-translate-y-0.5",
        ghost:
          "hover:bg-accent/50 dark:hover:bg-accent/30",
        link: "text-primary underline-offset-4 hover:underline hover:text-[oklch(0.55_0.22_270)]",
        // Option B: Amber accent variant
        amber: "bg-gradient-to-br from-[oklch(0.75_0.18_70)] to-[oklch(0.70_0.20_55)] text-white shadow-md hover:shadow-lg hover:shadow-[oklch(0.75_0.18_70_/_0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm",
        // Option B: Teal accent variant
        teal: "bg-gradient-to-br from-[oklch(0.65_0.14_175)] to-[oklch(0.68_0.15_195)] text-white shadow-md hover:shadow-lg hover:shadow-[oklch(0.65_0.14_175_/_0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm",
        // Option B: Gradient outline variant
        "gradient-outline": "border-2 border-transparent bg-clip-padding shadow-sm [background:linear-gradient(white,white)_padding-box,linear-gradient(135deg,oklch(0.65_0.14_175),oklch(0.59_0.20_255),oklch(0.55_0.22_290))_border-box] hover:shadow-md hover:-translate-y-0.5 text-foreground",
      },
      size: {
        default: "h-10 px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5 text-xs",
        lg: "h-12 rounded-xl px-8 has-[>svg]:px-6 text-base",
        icon: "size-10 rounded-xl",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
