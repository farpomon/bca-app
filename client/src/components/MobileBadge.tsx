/**
 * Mobile-optimized Badge component
 * Automatically adjusts size and layout for mobile devices
 */

import { useDevice } from "@/contexts/DeviceContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ComponentPropsWithoutRef } from "react";

type BadgeProps = ComponentPropsWithoutRef<typeof Badge>;

export function MobileBadge({ className, children, ...props }: BadgeProps) {
  const { isMobile } = useDevice();

  return (
    <Badge
      className={cn(
        isMobile && "text-sm px-3 py-1.5", // Larger on mobile
        !isMobile && "text-xs px-2 py-1", // Standard on desktop
        "whitespace-nowrap", // Prevent wrapping
        className
      )}
      {...props}
    >
      {children}
    </Badge>
  );
}

/**
 * Mobile-optimized Badge Group
 * Wraps badges and ensures they fit on mobile screens
 */
export function MobileBadgeGroup({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  const { isMobile } = useDevice();

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2",
        isMobile && "gap-1.5", // Tighter spacing on mobile
        className
      )}
    >
      {children}
    </div>
  );
}
