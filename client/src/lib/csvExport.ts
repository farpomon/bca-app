/**
 * CSV Export Utilities
 * Functions to export report data to CSV format
 */

export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

export function arrayToCSV(headers: string[], rows: any[][]): string {
  const headerRow = headers.map(escapeCSV).join(',');
  const dataRows = rows.map(row => row.map(escapeCSV).join(',')).join('\n');
  return `${headerRow}\n${dataRows}`;
}

interface BuildingData {
  name: string;
  location?: string;
  yearBuilt?: number;
  grossArea?: number;
  crv?: number;
  deferredMaintenance?: number;
  fci?: number;
  conditionRating?: string;
  priorityScore?: number;
}

export function exportBuildingsCSV(buildings: BuildingData[], filename: string = 'buildings.csv') {
  const headers = [
    'Building Name',
    'Location',
    'Year Built',
    'Gross Area (sq ft)',
    'Current Replacement Value',
    'Deferred Maintenance',
    'FCI (%)',
    'Condition Rating',
    'Priority Score'
  ];
  
  const rows = buildings.map(b => [
    b.name,
    b.location || '',
    b.yearBuilt || '',
    b.grossArea || '',
    b.crv || '',
    b.deferredMaintenance || '',
    b.fci !== undefined ? b.fci.toFixed(1) : '',
    b.conditionRating || '',
    b.priorityScore !== undefined ? b.priorityScore.toFixed(1) : ''
  ]);
  
  const csv = arrayToCSV(headers, rows);
  downloadCSV(filename, csv);
}

interface UniformatData {
  code: string;
  description: string;
  totalCost: number;
  percentOfBacklog: number;
  fciImpact?: number;
}

export function exportUniformatCSV(items: UniformatData[], filename: string = 'uniformat-breakdown.csv') {
  const headers = [
    'UNIFORMAT Code',
    'Description',
    'Total Cost',
    '% of Backlog',
    'FCI Impact (%)'
  ];
  
  const rows = items.map(item => [
    item.code,
    item.description,
    item.totalCost,
    item.percentOfBacklog.toFixed(1),
    item.fciImpact !== undefined ? item.fciImpact.toFixed(2) : ''
  ]);
  
  const csv = arrayToCSV(headers, rows);
  downloadCSV(filename, csv);
}

interface DeficiencyData {
  building: string;
  uniformatCode: string;
  uniformatDescription: string;
  description: string;
  severity: string;
  estimatedCost: number;
  priority: string;
  recommendedYear?: number;
}

export function exportDeficienciesCSV(deficiencies: DeficiencyData[], filename: string = 'deficiencies.csv') {
  const headers = [
    'Building',
    'UNIFORMAT Code',
    'System/Component',
    'Description',
    'Severity',
    'Estimated Cost',
    'Priority',
    'Recommended Year'
  ];
  
  const rows = deficiencies.map(d => [
    d.building,
    d.uniformatCode,
    d.uniformatDescription,
    d.description,
    d.severity,
    d.estimatedCost,
    d.priority,
    d.recommendedYear || ''
  ]);
  
  const csv = arrayToCSV(headers, rows);
  downloadCSV(filename, csv);
}

interface CapitalForecastData {
  year: number;
  immediate: number;
  shortTerm: number;
  mediumTerm: number;
  longTerm: number;
  total: number;
}

export function exportCapitalForecastCSV(forecast: CapitalForecastData[], filename: string = 'capital-forecast.csv') {
  const headers = [
    'Year',
    'Immediate (0-1 yr)',
    'Short Term (1-2 yrs)',
    'Medium Term (3-5 yrs)',
    'Long Term (6-10 yrs)',
    'Total'
  ];
  
  const rows = forecast.map(f => [
    f.year,
    f.immediate,
    f.shortTerm,
    f.mediumTerm,
    f.longTerm,
    f.total
  ]);
  
  const csv = arrayToCSV(headers, rows);
  downloadCSV(filename, csv);
}
