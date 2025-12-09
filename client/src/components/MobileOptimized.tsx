/**
 * Mobile-optimized component wrappers
 * Automatically adjusts sizing and spacing for mobile devices
 */

import { useDevice } from "@/contexts/DeviceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { forwardRef, ComponentPropsWithoutRef } from "react";

type ButtonProps = ComponentPropsWithoutRef<typeof Button>;
type InputProps = ComponentPropsWithoutRef<typeof Input>;
type TextareaProps = ComponentPropsWithoutRef<typeof Textarea>;

/**
 * Mobile-optimized Button
 * - Larger touch targets on mobile (min 44px height)
 * - Full width on mobile by default
 */
export const MobileButton = forwardRef<HTMLButtonElement, ButtonProps & { mobileFullWidth?: boolean }>(
  ({ className, size, mobileFullWidth = true, ...props }, ref) => {
    const { isMobile } = useDevice();

    return (
      <Button
        ref={ref}
        size={isMobile ? "lg" : size}
        className={cn(
          isMobile && mobileFullWidth && "w-full",
          isMobile && "min-h-[44px]", // iOS minimum touch target
          className
        )}
        {...props}
      />
    );
  }
);
MobileButton.displayName = "MobileButton";

/**
 * Mobile-optimized Input
 * - Larger text size on mobile (16px minimum to prevent zoom on iOS)
 * - Better spacing and padding
 */
export const MobileInput = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    const { isMobile } = useDevice();

    return (
      <Input
        ref={ref}
        className={cn(
          isMobile && "text-base min-h-[44px] px-4", // Larger for mobile
          className
        )}
        {...props}
      />
    );
  }
);
MobileInput.displayName = "MobileInput";

/**
 * Mobile-optimized Textarea
 * - Larger text size on mobile
 * - Better padding
 * - Minimum height for comfortable typing
 */
export const MobileTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    const { isMobile } = useDevice();

    return (
      <Textarea
        ref={ref}
        className={cn(
          isMobile && "text-base min-h-[120px] px-4 py-3",
          className
        )}
        {...props}
      />
    );
  }
);
MobileTextarea.displayName = "MobileTextarea";

/**
 * Mobile-optimized form field wrapper
 * - Better spacing between fields on mobile
 */
export function MobileFormField({ children, className }: { children: React.ReactNode; className?: string }) {
  const { isMobile } = useDevice();

  return (
    <div className={cn(isMobile && "space-y-3", !isMobile && "space-y-2", className)}>
      {children}
    </div>
  );
}

/**
 * Mobile-optimized card
 * - Removes side padding on mobile for full-width content
 * - Better spacing
 */
export function MobileCard({ children, className, removePadding = false }: { children: React.ReactNode; className?: string; removePadding?: boolean }) {
  const { isMobile } = useDevice();

  return (
    <div className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      !removePadding && "p-6",
      isMobile && !removePadding && "p-4",
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Mobile-optimized grid
 * - Single column on mobile
 * - Responsive columns on desktop
 */
export function MobileGrid({ children, className, cols = 2 }: { children: React.ReactNode; className?: string; cols?: 1 | 2 | 3 | 4 }) {
  const { isMobile } = useDevice();

  const gridCols = {
    1: "grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
  };

  return (
    <div className={cn(
      "grid gap-4",
      isMobile ? "grid-cols-1" : gridCols[cols],
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Mobile device info display (for debugging)
 */
export function DeviceInfo() {
  const device = useDevice();

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white text-xs p-2 rounded z-50 font-mono">
      <div>Device: {device.isMobile ? "Mobile" : device.isTablet ? "Tablet" : "Desktop"}</div>
      <div>Touch: {device.isTouchDevice ? "Yes" : "No"}</div>
      <div>Screen: {device.screenSize}</div>
      <div>Orientation: {device.orientation}</div>
      <div>Platform: {device.platform}</div>
    </div>
  );
}
