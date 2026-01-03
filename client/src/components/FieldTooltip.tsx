import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FieldTooltipProps {
  content: string;
}

/**
 * FieldTooltip - Shows helpful guidance for form fields
 * Displays an info icon that reveals example text or format guidance on hover/tap
 */
export function FieldTooltip({ content }: FieldTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center ml-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Field information"
          >
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
