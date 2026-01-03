import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation, useSearch } from "wouter";
import { useCallback } from "react";

interface BackButtonProps {
  /**
   * Where to navigate when clicked
   * - "back": Use browser history back
   * - "dashboard": Navigate to "/" (Projects page)
   * - string: Navigate to specific path
   */
  to?: "back" | "dashboard" | string;
  /**
   * Custom label for the button
   */
  label?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether to preserve filter state when navigating back to projects
   * @default true
   */
  preserveFilters?: boolean;
}

export function BackButton({ 
  to = "back", 
  label,
  className = "",
  preserveFilters = true,
}: BackButtonProps) {
  const [, setLocation] = useLocation();
  const searchString = useSearch();

  /**
   * Extract filter parameters from current URL
   * Supports common filter patterns: search, status, dateStart, dateEnd, etc.
   */
  const getFilterQueryString = useCallback(() => {
    if (!preserveFilters || !searchString) return "";
    
    const params = new URLSearchParams(searchString);
    const filterParams = new URLSearchParams();
    
    // List of filter parameter names to preserve
    const filterKeys = ["search", "status", "dateStart", "dateEnd", "type", "priority", "condition"];
    
    filterKeys.forEach((key) => {
      const value = params.get(key);
      if (value) {
        filterParams.set(key, value);
      }
    });
    
    const queryString = filterParams.toString();
    return queryString ? `?${queryString}` : "";
  }, [searchString, preserveFilters]);

  const handleClick = useCallback(() => {
    if (to === "back") {
      // Try to use browser history first
      window.history.back();
    } else if (to === "dashboard") {
      // Navigate to projects page, preserving filters if enabled
      const filterQuery = getFilterQueryString();
      setLocation(`/${filterQuery}`);
    } else {
      // Navigate to specific path
      setLocation(to);
    }
  }, [to, setLocation, getFilterQueryString]);

  const defaultLabel = to === "dashboard" ? "Back to Dashboard" : "Back";
  const icon = to === "dashboard" ? Home : ArrowLeft;
  const Icon = icon;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={`mb-4 -ml-2 ${className}`}
    >
      <Icon className="h-4 w-4 mr-2" />
      {label || defaultLabel}
    </Button>
  );
}
