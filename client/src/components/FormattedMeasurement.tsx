import { useUnits, formatArea, formatLength, formatTemperature, formatVolume, formatWeight, formatCostPerArea } from '@/contexts/UnitContext';
import type { UnitSystem } from '@/contexts/UnitContext';

type MeasurementType = 'area' | 'length' | 'temperature' | 'volume' | 'weight' | 'costPerArea';

interface FormattedMeasurementProps {
  value: number | null | undefined;
  type: MeasurementType;
  /** The unit system the source value is in. Defaults to 'imperial' (sq ft, ft, °F) since most BCA data is in imperial */
  sourceUnit?: UnitSystem;
  /** Currency symbol for cost per area. Defaults to '$' */
  currency?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays a measurement value converted to the user's preferred unit system.
 * 
 * @example
 * // Display area (stored in sq ft, displayed in user's preference)
 * <FormattedMeasurement value={1000} type="area" />
 * 
 * // Display length stored in meters
 * <FormattedMeasurement value={10} type="length" sourceUnit="metric" />
 * 
 * // Display cost per area
 * <FormattedMeasurement value={25.50} type="costPerArea" currency="$" />
 */
export function FormattedMeasurement({ 
  value, 
  type, 
  sourceUnit = 'imperial',
  currency = '$',
  className 
}: FormattedMeasurementProps) {
  const { unitSystem } = useUnits();

  if (value === null || value === undefined) {
    return <span className={className}>-</span>;
  }

  // Convert value if source unit differs from display unit
  let displayValue = value;
  if (sourceUnit !== unitSystem) {
    switch (type) {
      case 'area':
        // Convert between sq ft and sq m
        displayValue = sourceUnit === 'imperial' 
          ? value * 0.092903  // sq ft to sq m
          : value * 10.7639;  // sq m to sq ft
        break;
      case 'length':
        displayValue = sourceUnit === 'imperial'
          ? value * 0.3048    // ft to m
          : value * 3.28084;  // m to ft
        break;
      case 'temperature':
        displayValue = sourceUnit === 'imperial'
          ? (value - 32) * 5 / 9  // °F to °C
          : (value * 9 / 5) + 32; // °C to °F
        break;
      case 'volume':
        displayValue = sourceUnit === 'imperial'
          ? value * 0.0283168  // cu ft to cu m
          : value * 35.3147;   // cu m to cu ft
        break;
      case 'weight':
        displayValue = sourceUnit === 'imperial'
          ? value * 0.453592   // lb to kg
          : value * 2.20462;   // kg to lb
        break;
      case 'costPerArea':
        // Cost per sq ft to cost per sq m: multiply by sqft per sqm
        displayValue = sourceUnit === 'imperial'
          ? value * 10.7639    // $/sq ft to $/sq m
          : value * 0.092903;  // $/sq m to $/sq ft
        break;
    }
  }

  let formatted: string;
  switch (type) {
    case 'area':
      formatted = formatArea(displayValue, unitSystem);
      break;
    case 'length':
      formatted = formatLength(displayValue, unitSystem);
      break;
    case 'temperature':
      formatted = formatTemperature(displayValue, unitSystem);
      break;
    case 'volume':
      formatted = formatVolume(displayValue, unitSystem);
      break;
    case 'weight':
      formatted = formatWeight(displayValue, unitSystem);
      break;
    case 'costPerArea':
      formatted = formatCostPerArea(displayValue, unitSystem, currency);
      break;
    default:
      formatted = String(displayValue);
  }

  return <span className={className}>{formatted}</span>;
}

/**
 * Hook to get formatted measurement values programmatically
 */
export function useFormattedMeasurement() {
  const { unitSystem } = useUnits();

  return {
    formatArea: (value: number | null | undefined, sourceUnit: UnitSystem = 'imperial') => {
      if (value === null || value === undefined) return '-';
      let displayValue = value;
      if (sourceUnit !== unitSystem) {
        displayValue = sourceUnit === 'imperial' 
          ? value * 0.092903 
          : value * 10.7639;
      }
      return formatArea(displayValue, unitSystem);
    },
    formatLength: (value: number | null | undefined, sourceUnit: UnitSystem = 'imperial') => {
      if (value === null || value === undefined) return '-';
      let displayValue = value;
      if (sourceUnit !== unitSystem) {
        displayValue = sourceUnit === 'imperial'
          ? value * 0.3048
          : value * 3.28084;
      }
      return formatLength(displayValue, unitSystem);
    },
    formatTemperature: (value: number | null | undefined, sourceUnit: UnitSystem = 'imperial') => {
      if (value === null || value === undefined) return '-';
      let displayValue = value;
      if (sourceUnit !== unitSystem) {
        displayValue = sourceUnit === 'imperial'
          ? (value - 32) * 5 / 9
          : (value * 9 / 5) + 32;
      }
      return formatTemperature(displayValue, unitSystem);
    },
    formatCostPerArea: (value: number | null | undefined, currency: string = '$', sourceUnit: UnitSystem = 'imperial') => {
      if (value === null || value === undefined) return '-';
      let displayValue = value;
      if (sourceUnit !== unitSystem) {
        displayValue = sourceUnit === 'imperial'
          ? value * 10.7639
          : value * 0.092903;
      }
      return formatCostPerArea(displayValue, unitSystem, currency);
    },
    unitSystem,
  };
}

export default FormattedMeasurement;
