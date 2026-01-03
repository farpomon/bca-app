import { useUnits, getUnitSystemLabel } from '@/contexts/UnitContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Ruler, Check } from 'lucide-react';
import type { UnitSystem } from '@/contexts/UnitContext';

interface UnitToggleProps {
  variant?: 'button' | 'dropdown' | 'switch';
  showLabel?: boolean;
  className?: string;
}

export function UnitToggle({ variant = 'dropdown', showLabel = true, className }: UnitToggleProps) {
  const { unitSystem, setUnitSystem, toggleUnitSystem, isLoading } = useUnits();

  if (isLoading) {
    return null;
  }

  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={toggleUnitSystem}
        className={className}
        title={`Switch to ${unitSystem === 'metric' ? 'Imperial' : 'Metric'} units`}
      >
        <Ruler className="h-4 w-4 mr-2" />
        {showLabel && (unitSystem === 'metric' ? 'Metric' : 'Imperial')}
      </Button>
    );
  }

  if (variant === 'switch') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className={`text-sm ${unitSystem === 'metric' ? 'font-medium' : 'text-muted-foreground'}`}>
          Metric
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={unitSystem === 'imperial'}
          onClick={toggleUnitSystem}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${unitSystem === 'imperial' ? 'bg-primary' : 'bg-muted'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${unitSystem === 'imperial' ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
        <span className={`text-sm ${unitSystem === 'imperial' ? 'font-medium' : 'text-muted-foreground'}`}>
          Imperial
        </span>
      </div>
    );
  }

  // Default: dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Ruler className="h-4 w-4 mr-2" />
          {showLabel && getUnitSystemLabel(unitSystem)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setUnitSystem('metric')}>
          <Check className={`h-4 w-4 mr-2 ${unitSystem === 'metric' ? 'opacity-100' : 'opacity-0'}`} />
          Metric (SI)
          <span className="ml-2 text-muted-foreground text-xs">m², m, °C</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setUnitSystem('imperial')}>
          <Check className={`h-4 w-4 mr-2 ${unitSystem === 'imperial' ? 'opacity-100' : 'opacity-0'}`} />
          Imperial (US)
          <span className="ml-2 text-muted-foreground text-xs">sq ft, ft, °F</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact version for use in headers/toolbars
export function UnitToggleCompact({ className }: { className?: string }) {
  const { unitSystem, toggleUnitSystem, isLoading } = useUnits();

  if (isLoading) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleUnitSystem}
      className={`px-2 ${className}`}
      title={`Currently: ${unitSystem === 'metric' ? 'Metric' : 'Imperial'}. Click to switch.`}
    >
      <Ruler className="h-4 w-4" />
      <span className="ml-1 text-xs font-medium">
        {unitSystem === 'metric' ? 'SI' : 'US'}
      </span>
    </Button>
  );
}

export default UnitToggle;
