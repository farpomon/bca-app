import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

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
}

export function BackButton({ 
  to = "back", 
  label,
  className = "" 
}: BackButtonProps) {
  const [, setLocation] = useLocation();

  const handleClick = () => {
    if (to === "back") {
      window.history.back();
    } else if (to === "dashboard") {
      setLocation("/");
    } else {
      setLocation(to);
    }
  };

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
