/**
 * Responsive Container Component
 * Ensures content fits properly on all screen sizes
 */

import { useDevice } from "@/contexts/DeviceContext";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

/**
 * Responsive container that adapts padding and max-width based on device
 */
export function ResponsiveContainer({
  children,
  className,
  noPadding = false,
  maxWidth = "full",
}: ResponsiveContainerProps) {
  const { isMobile, isTablet } = useDevice();

  const maxWidthClasses = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    "2xl": "max-w-screen-2xl",
    full: "max-w-full",
  };

  return (
    <div
      className={cn(
        "w-full mx-auto",
        maxWidth !== "full" && maxWidthClasses[maxWidth],
        !noPadding && (isMobile ? "px-4 py-4" : isTablet ? "px-6 py-6" : "px-8 py-8"),
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Responsive section with proper spacing
 */
export function ResponsiveSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { isMobile } = useDevice();

  return (
    <section
      className={cn(
        isMobile ? "space-y-4" : "space-y-6",
        className
      )}
    >
      {children}
    </section>
  );
}

/**
 * Responsive stack (vertical layout)
 */
export function ResponsiveStack({
  children,
  className,
  spacing = "normal",
}: {
  children: ReactNode;
  className?: string;
  spacing?: "tight" | "normal" | "loose";
}) {
  const { isMobile } = useDevice();

  const spacingClasses = {
    tight: isMobile ? "space-y-2" : "space-y-3",
    normal: isMobile ? "space-y-4" : "space-y-6",
    loose: isMobile ? "space-y-6" : "space-y-8",
  };

  return (
    <div className={cn("flex flex-col", spacingClasses[spacing], className)}>
      {children}
    </div>
  );
}

/**
 * Responsive inline group (horizontal layout with wrapping)
 */
export function ResponsiveInline({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { isMobile } = useDevice();

  return (
    <div
      className={cn(
        "flex flex-wrap items-center",
        isMobile ? "gap-2" : "gap-3",
        className
      )}
    >
      {children}
    </div>
  );
}
