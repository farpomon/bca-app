/**
 * Unit conversion utilities for metric/imperial measurements
 */

export type UnitSystem = 'metric' | 'imperial';

// Conversion factors
const SQFT_TO_SQM = 0.092903;
const SQM_TO_SQFT = 10.7639;
const FT_TO_M = 0.3048;
const M_TO_FT = 3.28084;
const FAHRENHEIT_TO_CELSIUS = (f: number) => (f - 32) * 5 / 9;
const CELSIUS_TO_FAHRENHEIT = (c: number) => (c * 9 / 5) + 32;

// Area conversions
export function convertArea(value: number, from: UnitSystem, to: UnitSystem): number {
  if (from === to) return value;
  if (from === 'imperial' && to === 'metric') {
    return value * SQFT_TO_SQM;
  }
  return value * SQM_TO_SQFT;
}

export function formatArea(value: number | null | undefined, system: UnitSystem): string {
  if (value === null || value === undefined) return '-';
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return system === 'metric' ? `${formatted} m²` : `${formatted} sq ft`;
}

export function getAreaUnit(system: UnitSystem): string {
  return system === 'metric' ? 'm²' : 'sq ft';
}

// Length conversions
export function convertLength(value: number, from: UnitSystem, to: UnitSystem): number {
  if (from === to) return value;
  if (from === 'imperial' && to === 'metric') {
    return value * FT_TO_M;
  }
  return value * M_TO_FT;
}

export function formatLength(value: number | null | undefined, system: UnitSystem): string {
  if (value === null || value === undefined) return '-';
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return system === 'metric' ? `${formatted} m` : `${formatted} ft`;
}

export function getLengthUnit(system: UnitSystem): string {
  return system === 'metric' ? 'm' : 'ft';
}

// Temperature conversions
export function convertTemperature(value: number, from: UnitSystem, to: UnitSystem): number {
  if (from === to) return value;
  if (from === 'imperial' && to === 'metric') {
    return FAHRENHEIT_TO_CELSIUS(value);
  }
  return CELSIUS_TO_FAHRENHEIT(value);
}

export function formatTemperature(value: number | null | undefined, system: UnitSystem): string {
  if (value === null || value === undefined) return '-';
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return system === 'metric' ? `${formatted}°C` : `${formatted}°F`;
}

export function getTemperatureUnit(system: UnitSystem): string {
  return system === 'metric' ? '°C' : '°F';
}

// Cost per area conversions
export function convertCostPerArea(value: number, from: UnitSystem, to: UnitSystem): number {
  if (from === to) return value;
  // Cost per sq ft to cost per sq m: multiply by sqft per sqm
  if (from === 'imperial' && to === 'metric') {
    return value * SQM_TO_SQFT;
  }
  // Cost per sq m to cost per sq ft: multiply by sqm per sqft
  return value * SQFT_TO_SQM;
}

export function formatCostPerArea(value: number | null | undefined, system: UnitSystem, currency: string = '$'): string {
  if (value === null || value === undefined) return '-';
  const formatted = value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return system === 'metric' ? `${currency}${formatted}/m²` : `${currency}${formatted}/sq ft`;
}

export function getCostPerAreaUnit(system: UnitSystem): string {
  return system === 'metric' ? '/m²' : '/sq ft';
}

// Volume conversions (cubic feet to cubic meters)
const CUFT_TO_CUM = 0.0283168;
const CUM_TO_CUFT = 35.3147;

export function convertVolume(value: number, from: UnitSystem, to: UnitSystem): number {
  if (from === to) return value;
  if (from === 'imperial' && to === 'metric') {
    return value * CUFT_TO_CUM;
  }
  return value * CUM_TO_CUFT;
}

export function formatVolume(value: number | null | undefined, system: UnitSystem): string {
  if (value === null || value === undefined) return '-';
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return system === 'metric' ? `${formatted} m³` : `${formatted} cu ft`;
}

export function getVolumeUnit(system: UnitSystem): string {
  return system === 'metric' ? 'm³' : 'cu ft';
}

// Weight conversions (pounds to kilograms)
const LB_TO_KG = 0.453592;
const KG_TO_LB = 2.20462;

export function convertWeight(value: number, from: UnitSystem, to: UnitSystem): number {
  if (from === to) return value;
  if (from === 'imperial' && to === 'metric') {
    return value * LB_TO_KG;
  }
  return value * KG_TO_LB;
}

export function formatWeight(value: number | null | undefined, system: UnitSystem): string {
  if (value === null || value === undefined) return '-';
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return system === 'metric' ? `${formatted} kg` : `${formatted} lb`;
}

export function getWeightUnit(system: UnitSystem): string {
  return system === 'metric' ? 'kg' : 'lb';
}

// Utility to get display label for unit system
export function getUnitSystemLabel(system: UnitSystem): string {
  return system === 'metric' ? 'Metric (SI)' : 'Imperial (US)';
}

// Common measurement types for UI
export const MEASUREMENT_TYPES = {
  area: { metric: 'm²', imperial: 'sq ft' },
  length: { metric: 'm', imperial: 'ft' },
  temperature: { metric: '°C', imperial: '°F' },
  volume: { metric: 'm³', imperial: 'cu ft' },
  weight: { metric: 'kg', imperial: 'lb' },
  costPerArea: { metric: '/m²', imperial: '/sq ft' },
} as const;
