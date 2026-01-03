/**
 * RSMeans API Integration Service
 * 
 * This service provides access to RSMeans construction cost data.
 * It supports both real API calls (when RSMEANS_API_KEY is provided)
 * and mock data for development/testing.
 * 
 * API Documentation: https://dataapi-sb.gordian.com/swagger/ui/index.html
 * Base URL: https://dataapi-sb.gordian.com (sandbox) or https://dataapi.gordian.com (production)
 */

import { ENV } from './_core/env';

// Configuration
const RSMEANS_API_BASE_URL = process.env.RSMEANS_API_URL || 'https://dataapi.gordian.com';
const RSMEANS_API_KEY = process.env.RSMEANS_API_KEY || '';
const USE_MOCK_DATA = !RSMEANS_API_KEY;

// Types based on RSMeans API schema
export interface RSMeansLocation {
  id: string;
  city: string;
  stateCode: string;
  countryCode: string;
  href?: string;
}

export interface RSMeansCatalog {
  id: string;
  catalogName: string;
  release: {
    id: string;
    href?: string;
  };
  location?: {
    id: string;
    href?: string;
  };
  laborType?: string;
  measurementSystem?: string;
}

export interface RSMeansDivision {
  id: string;
  code: string;
  description: string;
  level: number;
  parentId?: string;
  children?: RSMeansDivision[];
  costLineCount?: number;
}

export interface RSMeansCostLine {
  id: string;
  lineNumber: string;
  description: string;
  unit: string;
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  totalCost: number;
  laborHours: number;
  crew?: string;
  dailyOutput?: number;
  divisionCode: string;
  divisionDescription?: string;
  release?: {
    id: string;
  };
  catalog?: {
    id: string;
  };
}

export interface RSMeansCostFactor {
  id: string;
  locationId: string;
  city: string;
  stateCode: string;
  materialFactor: number;
  laborFactor: number;
  equipmentFactor: number;
  totalFactor: number;
}

export interface RSMeansSearchResult {
  offset: number;
  limit: number;
  recordCount: number;
  items: RSMeansCostLine[];
  aggregations?: {
    recordCount: number;
    items: {
      divisionId: string;
      description: string;
      docCount: number;
    }[];
  };
}

// API Response types
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Mock Data for development/testing
const MOCK_LOCATIONS: RSMeansLocation[] = [
  { id: 'M4B', city: 'Toronto', stateCode: 'ON', countryCode: 'CA' },
  { id: 'M5V', city: 'Toronto Downtown', stateCode: 'ON', countryCode: 'CA' },
  { id: 'V6B', city: 'Vancouver', stateCode: 'BC', countryCode: 'CA' },
  { id: 'H2Y', city: 'Montreal', stateCode: 'QC', countryCode: 'CA' },
  { id: 'T2P', city: 'Calgary', stateCode: 'AB', countryCode: 'CA' },
  { id: 'T5J', city: 'Edmonton', stateCode: 'AB', countryCode: 'CA' },
  { id: 'K1P', city: 'Ottawa', stateCode: 'ON', countryCode: 'CA' },
  { id: 'R3C', city: 'Winnipeg', stateCode: 'MB', countryCode: 'CA' },
  { id: 'E1C', city: 'Moncton', stateCode: 'NB', countryCode: 'CA' },
  { id: 'B3H', city: 'Halifax', stateCode: 'NS', countryCode: 'CA' },
  { id: '10001', city: 'New York', stateCode: 'NY', countryCode: 'US' },
  { id: '90210', city: 'Los Angeles', stateCode: 'CA', countryCode: 'US' },
  { id: '60601', city: 'Chicago', stateCode: 'IL', countryCode: 'US' },
  { id: '77001', city: 'Houston', stateCode: 'TX', countryCode: 'US' },
  { id: '85001', city: 'Phoenix', stateCode: 'AZ', countryCode: 'US' },
];

const MOCK_CATALOGS: RSMeansCatalog[] = [
  { id: 'unit-2024-std-imp', catalogName: 'Unit Cost 2024 Standard Imperial', release: { id: '2024' }, laborType: 'std', measurementSystem: 'imp' },
  { id: 'unit-2024-opn-imp', catalogName: 'Unit Cost 2024 Open Shop Imperial', release: { id: '2024' }, laborType: 'opn', measurementSystem: 'imp' },
  { id: 'unit-2024-std-met', catalogName: 'Unit Cost 2024 Standard Metric', release: { id: '2024' }, laborType: 'std', measurementSystem: 'met' },
  { id: 'unit-2023-std-imp', catalogName: 'Unit Cost 2023 Standard Imperial', release: { id: '2023' }, laborType: 'std', measurementSystem: 'imp' },
  { id: 'assembly-2024-std-imp', catalogName: 'Assembly Cost 2024 Standard Imperial', release: { id: '2024' }, laborType: 'std', measurementSystem: 'imp' },
];

const MOCK_DIVISIONS: RSMeansDivision[] = [
  { id: 'div-01', code: '01', description: 'General Requirements', level: 1, costLineCount: 245 },
  { id: 'div-02', code: '02', description: 'Existing Conditions', level: 1, costLineCount: 189 },
  { id: 'div-03', code: '03', description: 'Concrete', level: 1, costLineCount: 1256 },
  { id: 'div-04', code: '04', description: 'Masonry', level: 1, costLineCount: 892 },
  { id: 'div-05', code: '05', description: 'Metals', level: 1, costLineCount: 1045 },
  { id: 'div-06', code: '06', description: 'Wood, Plastics, and Composites', level: 1, costLineCount: 1123 },
  { id: 'div-07', code: '07', description: 'Thermal and Moisture Protection', level: 1, costLineCount: 1567 },
  { id: 'div-08', code: '08', description: 'Openings', level: 1, costLineCount: 2134 },
  { id: 'div-09', code: '09', description: 'Finishes', level: 1, costLineCount: 2456 },
  { id: 'div-10', code: '10', description: 'Specialties', level: 1, costLineCount: 567 },
  { id: 'div-11', code: '11', description: 'Equipment', level: 1, costLineCount: 789 },
  { id: 'div-12', code: '12', description: 'Furnishings', level: 1, costLineCount: 456 },
  { id: 'div-13', code: '13', description: 'Special Construction', level: 1, costLineCount: 234 },
  { id: 'div-14', code: '14', description: 'Conveying Equipment', level: 1, costLineCount: 345 },
  { id: 'div-21', code: '21', description: 'Fire Suppression', level: 1, costLineCount: 567 },
  { id: 'div-22', code: '22', description: 'Plumbing', level: 1, costLineCount: 1234 },
  { id: 'div-23', code: '23', description: 'Heating, Ventilating, and Air Conditioning (HVAC)', level: 1, costLineCount: 2345 },
  { id: 'div-26', code: '26', description: 'Electrical', level: 1, costLineCount: 3456 },
  { id: 'div-27', code: '27', description: 'Communications', level: 1, costLineCount: 678 },
  { id: 'div-28', code: '28', description: 'Electronic Safety and Security', level: 1, costLineCount: 456 },
  { id: 'div-31', code: '31', description: 'Earthwork', level: 1, costLineCount: 789 },
  { id: 'div-32', code: '32', description: 'Exterior Improvements', level: 1, costLineCount: 567 },
  { id: 'div-33', code: '33', description: 'Utilities', level: 1, costLineCount: 890 },
];

// Sub-divisions for Division 03 - Concrete
const MOCK_CONCRETE_SUBDIVISIONS: RSMeansDivision[] = [
  { id: 'div-0310', code: '03 10', description: 'Concrete Forming and Accessories', level: 2, parentId: 'div-03', costLineCount: 234 },
  { id: 'div-0320', code: '03 20', description: 'Concrete Reinforcing', level: 2, parentId: 'div-03', costLineCount: 189 },
  { id: 'div-0330', code: '03 30', description: 'Cast-in-Place Concrete', level: 2, parentId: 'div-03', costLineCount: 456 },
  { id: 'div-0340', code: '03 40', description: 'Precast Concrete', level: 2, parentId: 'div-03', costLineCount: 234 },
  { id: 'div-0350', code: '03 50', description: 'Cast Decks and Underlayment', level: 2, parentId: 'div-03', costLineCount: 78 },
  { id: 'div-0360', code: '03 60', description: 'Grouting', level: 2, parentId: 'div-03', costLineCount: 45 },
];

// Sub-divisions for Division 07 - Thermal and Moisture Protection
const MOCK_THERMAL_SUBDIVISIONS: RSMeansDivision[] = [
  { id: 'div-0710', code: '07 10', description: 'Dampproofing and Waterproofing', level: 2, parentId: 'div-07', costLineCount: 189 },
  { id: 'div-0720', code: '07 20', description: 'Thermal Protection', level: 2, parentId: 'div-07', costLineCount: 345 },
  { id: 'div-0730', code: '07 30', description: 'Steep Slope Roofing', level: 2, parentId: 'div-07', costLineCount: 234 },
  { id: 'div-0740', code: '07 40', description: 'Roofing and Siding Panels', level: 2, parentId: 'div-07', costLineCount: 156 },
  { id: 'div-0750', code: '07 50', description: 'Membrane Roofing', level: 2, parentId: 'div-07', costLineCount: 267 },
  { id: 'div-0760', code: '07 60', description: 'Flashing and Sheet Metal', level: 2, parentId: 'div-07', costLineCount: 189 },
  { id: 'div-0770', code: '07 70', description: 'Roof and Wall Specialties and Accessories', level: 2, parentId: 'div-07', costLineCount: 123 },
  { id: 'div-0780', code: '07 80', description: 'Fire and Smoke Protection', level: 2, parentId: 'div-07', costLineCount: 64 },
];

// Mock cost lines - realistic construction items
const MOCK_COST_LINES: RSMeansCostLine[] = [
  // Concrete items
  { id: 'cl-033053-0100', lineNumber: '03 30 53.40 0100', description: 'Concrete, ready mix, regular weight, 3000 PSI', unit: 'C.Y.', materialCost: 145.00, laborCost: 0, equipmentCost: 0, totalCost: 145.00, laborHours: 0, divisionCode: '03 30', divisionDescription: 'Cast-in-Place Concrete' },
  { id: 'cl-033053-0200', lineNumber: '03 30 53.40 0200', description: 'Concrete, ready mix, regular weight, 4000 PSI', unit: 'C.Y.', materialCost: 155.00, laborCost: 0, equipmentCost: 0, totalCost: 155.00, laborHours: 0, divisionCode: '03 30', divisionDescription: 'Cast-in-Place Concrete' },
  { id: 'cl-033053-0300', lineNumber: '03 30 53.40 0300', description: 'Concrete, ready mix, regular weight, 5000 PSI', unit: 'C.Y.', materialCost: 165.00, laborCost: 0, equipmentCost: 0, totalCost: 165.00, laborHours: 0, divisionCode: '03 30', divisionDescription: 'Cast-in-Place Concrete' },
  { id: 'cl-032110-0100', lineNumber: '03 21 10.60 0100', description: 'Reinforcing steel, in place, #3 to #7, A615, Grade 60', unit: 'Ton', materialCost: 1250.00, laborCost: 850.00, equipmentCost: 45.00, totalCost: 2145.00, laborHours: 24, crew: '4 Rodm', divisionCode: '03 20', divisionDescription: 'Concrete Reinforcing' },
  
  // Roofing items
  { id: 'cl-075113-0100', lineNumber: '07 51 13.10 0100', description: 'Built-up roofing, 3 ply organic/asphalt, gravel surfaced', unit: 'Sq.', materialCost: 185.00, laborCost: 245.00, equipmentCost: 35.00, totalCost: 465.00, laborHours: 3.5, crew: 'G-1', divisionCode: '07 50', divisionDescription: 'Membrane Roofing' },
  { id: 'cl-075216-0100', lineNumber: '07 52 16.10 0100', description: 'Modified bitumen roofing, SBS, smooth surface', unit: 'Sq.', materialCost: 225.00, laborCost: 195.00, equipmentCost: 28.00, totalCost: 448.00, laborHours: 2.8, crew: 'G-1', divisionCode: '07 50', divisionDescription: 'Membrane Roofing' },
  { id: 'cl-075416-0100', lineNumber: '07 54 16.10 0100', description: 'TPO roofing, 60 mil, fully adhered', unit: 'Sq.', materialCost: 165.00, laborCost: 175.00, equipmentCost: 22.00, totalCost: 362.00, laborHours: 2.5, crew: 'G-2', divisionCode: '07 50', divisionDescription: 'Membrane Roofing' },
  { id: 'cl-075419-0100', lineNumber: '07 54 19.10 0100', description: 'EPDM roofing, 60 mil, fully adhered', unit: 'Sq.', materialCost: 155.00, laborCost: 165.00, equipmentCost: 20.00, totalCost: 340.00, laborHours: 2.3, crew: 'G-2', divisionCode: '07 50', divisionDescription: 'Membrane Roofing' },
  
  // Insulation items
  { id: 'cl-072116-0100', lineNumber: '07 21 16.10 0100', description: 'Batt insulation, fiberglass, unfaced, R-11, 3-1/2"', unit: 'S.F.', materialCost: 0.45, laborCost: 0.35, equipmentCost: 0, totalCost: 0.80, laborHours: 0.008, crew: '1 Carp', divisionCode: '07 20', divisionDescription: 'Thermal Protection' },
  { id: 'cl-072116-0200', lineNumber: '07 21 16.10 0200', description: 'Batt insulation, fiberglass, unfaced, R-19, 6"', unit: 'S.F.', materialCost: 0.65, laborCost: 0.38, equipmentCost: 0, totalCost: 1.03, laborHours: 0.009, crew: '1 Carp', divisionCode: '07 20', divisionDescription: 'Thermal Protection' },
  { id: 'cl-072116-0300', lineNumber: '07 21 16.10 0300', description: 'Batt insulation, fiberglass, unfaced, R-30, 9-1/2"', unit: 'S.F.', materialCost: 0.95, laborCost: 0.42, equipmentCost: 0, totalCost: 1.37, laborHours: 0.010, crew: '1 Carp', divisionCode: '07 20', divisionDescription: 'Thermal Protection' },
  { id: 'cl-072119-0100', lineNumber: '07 21 19.10 0100', description: 'Rigid insulation, extruded polystyrene, 1"', unit: 'S.F.', materialCost: 0.85, laborCost: 0.28, equipmentCost: 0, totalCost: 1.13, laborHours: 0.006, crew: '1 Carp', divisionCode: '07 20', divisionDescription: 'Thermal Protection' },
  { id: 'cl-072119-0200', lineNumber: '07 21 19.10 0200', description: 'Rigid insulation, extruded polystyrene, 2"', unit: 'S.F.', materialCost: 1.45, laborCost: 0.32, equipmentCost: 0, totalCost: 1.77, laborHours: 0.007, crew: '1 Carp', divisionCode: '07 20', divisionDescription: 'Thermal Protection' },
  
  // HVAC items
  { id: 'cl-233400-0100', lineNumber: '23 34 00.10 0100', description: 'HVAC fan, centrifugal, belt drive, 2000 CFM', unit: 'Ea.', materialCost: 1850.00, laborCost: 425.00, equipmentCost: 85.00, totalCost: 2360.00, laborHours: 8, crew: 'Q-1', divisionCode: '23', divisionDescription: 'HVAC' },
  { id: 'cl-233600-0100', lineNumber: '23 36 00.10 0100', description: 'Air handling unit, 5000 CFM, with filters and coils', unit: 'Ea.', materialCost: 8500.00, laborCost: 1250.00, equipmentCost: 350.00, totalCost: 10100.00, laborHours: 24, crew: 'Q-2', divisionCode: '23', divisionDescription: 'HVAC' },
  { id: 'cl-238126-0100', lineNumber: '23 81 26.10 0100', description: 'Split system heat pump, 3 ton', unit: 'Ea.', materialCost: 4500.00, laborCost: 850.00, equipmentCost: 125.00, totalCost: 5475.00, laborHours: 16, crew: 'Q-1', divisionCode: '23', divisionDescription: 'HVAC' },
  
  // Electrical items
  { id: 'cl-262416-0100', lineNumber: '26 24 16.10 0100', description: 'Panelboard, 100A, 120/240V, 1 phase, 20 circuit', unit: 'Ea.', materialCost: 485.00, laborCost: 325.00, equipmentCost: 0, totalCost: 810.00, laborHours: 6, crew: '1 Elec', divisionCode: '26', divisionDescription: 'Electrical' },
  { id: 'cl-262416-0200', lineNumber: '26 24 16.10 0200', description: 'Panelboard, 200A, 120/240V, 1 phase, 42 circuit', unit: 'Ea.', materialCost: 985.00, laborCost: 485.00, equipmentCost: 0, totalCost: 1470.00, laborHours: 9, crew: '1 Elec', divisionCode: '26', divisionDescription: 'Electrical' },
  { id: 'cl-265100-0100', lineNumber: '26 51 00.10 0100', description: 'LED lighting fixture, 2x4 troffer, 40W', unit: 'Ea.', materialCost: 125.00, laborCost: 65.00, equipmentCost: 0, totalCost: 190.00, laborHours: 1.2, crew: '1 Elec', divisionCode: '26', divisionDescription: 'Electrical' },
  
  // Plumbing items
  { id: 'cl-221116-0100', lineNumber: '22 11 16.10 0100', description: 'Copper pipe, type L, 3/4" diameter', unit: 'L.F.', materialCost: 4.85, laborCost: 8.50, equipmentCost: 0, totalCost: 13.35, laborHours: 0.15, crew: '1 Plum', divisionCode: '22', divisionDescription: 'Plumbing' },
  { id: 'cl-221116-0200', lineNumber: '22 11 16.10 0200', description: 'Copper pipe, type L, 1" diameter', unit: 'L.F.', materialCost: 7.25, laborCost: 9.50, equipmentCost: 0, totalCost: 16.75, laborHours: 0.17, crew: '1 Plum', divisionCode: '22', divisionDescription: 'Plumbing' },
  { id: 'cl-224216-0100', lineNumber: '22 42 16.10 0100', description: 'Water closet, floor mounted, vitreous china', unit: 'Ea.', materialCost: 285.00, laborCost: 195.00, equipmentCost: 0, totalCost: 480.00, laborHours: 3.5, crew: '1 Plum', divisionCode: '22', divisionDescription: 'Plumbing' },
  
  // Windows and Doors
  { id: 'cl-085113-0100', lineNumber: '08 51 13.10 0100', description: 'Aluminum window, double hung, 3\'x4\'', unit: 'Ea.', materialCost: 385.00, laborCost: 125.00, equipmentCost: 0, totalCost: 510.00, laborHours: 2.5, crew: '2 Glaz', divisionCode: '08', divisionDescription: 'Openings' },
  { id: 'cl-085113-0200', lineNumber: '08 51 13.10 0200', description: 'Aluminum window, casement, 3\'x5\'', unit: 'Ea.', materialCost: 425.00, laborCost: 135.00, equipmentCost: 0, totalCost: 560.00, laborHours: 2.7, crew: '2 Glaz', divisionCode: '08', divisionDescription: 'Openings' },
  { id: 'cl-081113-0100', lineNumber: '08 11 13.10 0100', description: 'Steel door, hollow metal, 3\'x7\', 18 gauge', unit: 'Ea.', materialCost: 345.00, laborCost: 185.00, equipmentCost: 0, totalCost: 530.00, laborHours: 3.5, crew: '2 Carp', divisionCode: '08', divisionDescription: 'Openings' },
  
  // Finishes
  { id: 'cl-092116-0100', lineNumber: '09 21 16.10 0100', description: 'Gypsum board, 1/2", taped and finished, level 4', unit: 'S.F.', materialCost: 0.65, laborCost: 1.25, equipmentCost: 0, totalCost: 1.90, laborHours: 0.025, crew: '2 Lath', divisionCode: '09', divisionDescription: 'Finishes' },
  { id: 'cl-099123-0100', lineNumber: '09 91 23.10 0100', description: 'Interior paint, walls, 2 coats, latex', unit: 'S.F.', materialCost: 0.18, laborCost: 0.45, equipmentCost: 0, totalCost: 0.63, laborHours: 0.008, crew: '1 Pord', divisionCode: '09', divisionDescription: 'Finishes' },
  { id: 'cl-096813-0100', lineNumber: '09 68 13.10 0100', description: 'Carpet tile, 24"x24", commercial grade', unit: 'S.Y.', materialCost: 28.50, laborCost: 8.50, equipmentCost: 0, totalCost: 37.00, laborHours: 0.15, crew: '1 Tile', divisionCode: '09', divisionDescription: 'Finishes' },
];

// Mock cost factors by location
const MOCK_COST_FACTORS: RSMeansCostFactor[] = [
  { id: 'cf-M4B', locationId: 'M4B', city: 'Toronto', stateCode: 'ON', materialFactor: 1.05, laborFactor: 1.15, equipmentFactor: 1.02, totalFactor: 1.08 },
  { id: 'cf-M5V', locationId: 'M5V', city: 'Toronto Downtown', stateCode: 'ON', materialFactor: 1.08, laborFactor: 1.22, equipmentFactor: 1.05, totalFactor: 1.12 },
  { id: 'cf-V6B', locationId: 'V6B', city: 'Vancouver', stateCode: 'BC', materialFactor: 1.12, laborFactor: 1.25, equipmentFactor: 1.08, totalFactor: 1.15 },
  { id: 'cf-H2Y', locationId: 'H2Y', city: 'Montreal', stateCode: 'QC', materialFactor: 1.02, laborFactor: 1.08, equipmentFactor: 0.98, totalFactor: 1.03 },
  { id: 'cf-T2P', locationId: 'T2P', city: 'Calgary', stateCode: 'AB', materialFactor: 1.08, laborFactor: 1.18, equipmentFactor: 1.05, totalFactor: 1.10 },
  { id: 'cf-T5J', locationId: 'T5J', city: 'Edmonton', stateCode: 'AB', materialFactor: 1.06, laborFactor: 1.15, equipmentFactor: 1.03, totalFactor: 1.08 },
  { id: 'cf-K1P', locationId: 'K1P', city: 'Ottawa', stateCode: 'ON', materialFactor: 1.04, laborFactor: 1.12, equipmentFactor: 1.00, totalFactor: 1.06 },
  { id: 'cf-R3C', locationId: 'R3C', city: 'Winnipeg', stateCode: 'MB', materialFactor: 0.98, laborFactor: 1.02, equipmentFactor: 0.95, totalFactor: 0.98 },
  { id: 'cf-E1C', locationId: 'E1C', city: 'Moncton', stateCode: 'NB', materialFactor: 0.95, laborFactor: 0.92, equipmentFactor: 0.90, totalFactor: 0.92 },
  { id: 'cf-B3H', locationId: 'B3H', city: 'Halifax', stateCode: 'NS', materialFactor: 0.98, laborFactor: 0.95, equipmentFactor: 0.92, totalFactor: 0.95 },
  { id: 'cf-10001', locationId: '10001', city: 'New York', stateCode: 'NY', materialFactor: 1.15, laborFactor: 1.45, equipmentFactor: 1.12, totalFactor: 1.25 },
  { id: 'cf-90210', locationId: '90210', city: 'Los Angeles', stateCode: 'CA', materialFactor: 1.10, laborFactor: 1.35, equipmentFactor: 1.08, totalFactor: 1.18 },
  { id: 'cf-60601', locationId: '60601', city: 'Chicago', stateCode: 'IL', materialFactor: 1.08, laborFactor: 1.28, equipmentFactor: 1.05, totalFactor: 1.14 },
  { id: 'cf-77001', locationId: '77001', city: 'Houston', stateCode: 'TX', materialFactor: 0.95, laborFactor: 0.88, equipmentFactor: 0.92, totalFactor: 0.92 },
  { id: 'cf-85001', locationId: '85001', city: 'Phoenix', stateCode: 'AZ', materialFactor: 0.92, laborFactor: 0.85, equipmentFactor: 0.88, totalFactor: 0.88 },
];

// Helper function to make API requests
async function makeAPIRequest<T>(endpoint: string, params?: Record<string, string>): Promise<APIResponse<T>> {
  if (USE_MOCK_DATA) {
    console.log(`[RSMeans] Using mock data for: ${endpoint}`);
    return { success: false, error: 'Mock mode - use getMock* functions' };
  }

  try {
    const url = new URL(`${RSMEANS_API_BASE_URL}/v1${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Api-Key': RSMEANS_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[RSMeans] API error: ${response.status} - ${errorText}`);
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('[RSMeans] Request failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Service functions

/**
 * Get all available locations
 */
export async function getLocations(searchTerm?: string): Promise<RSMeansLocation[]> {
  if (USE_MOCK_DATA) {
    let locations = [...MOCK_LOCATIONS];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      locations = locations.filter(loc => 
        loc.city.toLowerCase().includes(term) ||
        loc.stateCode.toLowerCase().includes(term) ||
        loc.id.toLowerCase().includes(term)
      );
    }
    return locations;
  }

  const response = await makeAPIRequest<{ recordCount: number; items: RSMeansLocation[] }>(
    '/costdata/locations',
    searchTerm ? { searchTerm } : undefined
  );
  return response.data?.items || [];
}

/**
 * Get a single location by ID
 */
export async function getLocation(locationId: string): Promise<RSMeansLocation | null> {
  if (USE_MOCK_DATA) {
    return MOCK_LOCATIONS.find(loc => loc.id === locationId) || null;
  }

  const response = await makeAPIRequest<RSMeansLocation>(`/costdata/locations/${locationId}`);
  return response.data || null;
}

/**
 * Get available cost data catalogs
 */
export async function getCatalogs(params?: {
  releaseId?: string;
  locationId?: string;
  laborType?: 'std' | 'opn' | 'fmr' | 'res';
  measurementSystem?: 'imp' | 'met';
}): Promise<RSMeansCatalog[]> {
  if (USE_MOCK_DATA) {
    let catalogs = [...MOCK_CATALOGS];
    if (params?.laborType) {
      catalogs = catalogs.filter(c => c.laborType === params.laborType);
    }
    if (params?.measurementSystem) {
      catalogs = catalogs.filter(c => c.measurementSystem === params.measurementSystem);
    }
    if (params?.releaseId) {
      catalogs = catalogs.filter(c => c.release.id === params.releaseId);
    }
    return catalogs;
  }

  const response = await makeAPIRequest<{ recordCount: number; items: RSMeansCatalog[] }>(
    '/costdata/unit/catalogs',
    params as Record<string, string>
  );
  return response.data?.items || [];
}

/**
 * Get divisions (CSI MasterFormat hierarchy)
 */
export async function getDivisions(catalogId: string, parentDivisionId?: string): Promise<RSMeansDivision[]> {
  if (USE_MOCK_DATA) {
    if (parentDivisionId) {
      // Return sub-divisions
      if (parentDivisionId === 'div-03') {
        return MOCK_CONCRETE_SUBDIVISIONS;
      }
      if (parentDivisionId === 'div-07') {
        return MOCK_THERMAL_SUBDIVISIONS;
      }
      return [];
    }
    return MOCK_DIVISIONS;
  }

  const endpoint = parentDivisionId 
    ? `/costdata/unit/catalogs/${catalogId}/divisions/${parentDivisionId}/children`
    : `/costdata/unit/catalogs/${catalogId}/divisions`;
  
  const response = await makeAPIRequest<{ recordCount: number; items: RSMeansDivision[] }>(endpoint);
  return response.data?.items || [];
}

/**
 * Search cost lines
 */
export async function searchCostLines(params: {
  catalogId: string;
  searchTerm?: string;
  divisionCode?: string;
  offset?: number;
  limit?: number;
  costLineType?: 'unknown' | 'install' | 'demo' | 'trade' | 'equipment';
}): Promise<RSMeansSearchResult> {
  if (USE_MOCK_DATA) {
    let items = [...MOCK_COST_LINES];
    
    if (params.searchTerm) {
      const term = params.searchTerm.toLowerCase();
      items = items.filter(item => 
        item.description.toLowerCase().includes(term) ||
        item.lineNumber.toLowerCase().includes(term)
      );
    }
    
    if (params.divisionCode) {
      items = items.filter(item => item.divisionCode.startsWith(params.divisionCode!));
    }

    const offset = params.offset || 0;
    const limit = params.limit || 25;
    const paginatedItems = items.slice(offset, offset + limit);

    // Build aggregations
    const divisionCounts = new Map<string, { description: string; count: number }>();
    items.forEach(item => {
      const existing = divisionCounts.get(item.divisionCode);
      if (existing) {
        existing.count++;
      } else {
        divisionCounts.set(item.divisionCode, { 
          description: item.divisionDescription || item.divisionCode, 
          count: 1 
        });
      }
    });

    return {
      offset,
      limit,
      recordCount: items.length,
      items: paginatedItems,
      aggregations: {
        recordCount: divisionCounts.size,
        items: Array.from(divisionCounts.entries()).map(([divisionId, data]) => ({
          divisionId,
          description: data.description,
          docCount: data.count,
        })),
      },
    };
  }

  const response = await makeAPIRequest<RSMeansSearchResult>(
    `/costdata/unit/catalogs/${params.catalogId}/costlines/_search`,
    {
      searchTerm: params.searchTerm || '',
      divisionCode: params.divisionCode || '',
      offset: String(params.offset || 0),
      limit: String(params.limit || 25),
      costLineType: params.costLineType || '',
      includeDivisionCount: 'true',
      includeCostLines: 'true',
    }
  );
  
  return response.data || { offset: 0, limit: 25, recordCount: 0, items: [] };
}

/**
 * Get a single cost line by ID
 */
export async function getCostLine(catalogId: string, costLineId: string): Promise<RSMeansCostLine | null> {
  if (USE_MOCK_DATA) {
    return MOCK_COST_LINES.find(cl => cl.id === costLineId) || null;
  }

  const response = await makeAPIRequest<RSMeansCostLine>(
    `/costdata/unit/catalogs/${catalogId}/costlines/${costLineId}`
  );
  return response.data || null;
}

/**
 * Get cost factors for a location
 */
export async function getCostFactors(locationId: string, releaseId?: string): Promise<RSMeansCostFactor | null> {
  if (USE_MOCK_DATA) {
    return MOCK_COST_FACTORS.find(cf => cf.locationId === locationId) || null;
  }

  const response = await makeAPIRequest<{ recordCount: number; items: RSMeansCostFactor[] }>(
    '/costdata/unit/costfactors',
    { locationId, releaseId: releaseId || '' }
  );
  return response.data?.items?.[0] || null;
}

/**
 * Get all cost factors
 */
export async function getAllCostFactors(): Promise<RSMeansCostFactor[]> {
  if (USE_MOCK_DATA) {
    return MOCK_COST_FACTORS;
  }

  const response = await makeAPIRequest<{ recordCount: number; items: RSMeansCostFactor[] }>(
    '/costdata/unit/costfactors'
  );
  return response.data?.items || [];
}

/**
 * Calculate localized cost for a cost line
 */
export function calculateLocalizedCost(
  costLine: RSMeansCostLine,
  costFactor: RSMeansCostFactor,
  quantity: number = 1
): {
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  totalCost: number;
  unitCost: number;
} {
  const materialCost = costLine.materialCost * costFactor.materialFactor * quantity;
  const laborCost = costLine.laborCost * costFactor.laborFactor * quantity;
  const equipmentCost = costLine.equipmentCost * costFactor.equipmentFactor * quantity;
  const totalCost = materialCost + laborCost + equipmentCost;
  const unitCost = quantity > 0 ? totalCost / quantity : 0;

  return {
    materialCost: Math.round(materialCost * 100) / 100,
    laborCost: Math.round(laborCost * 100) / 100,
    equipmentCost: Math.round(equipmentCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    unitCost: Math.round(unitCost * 100) / 100,
  };
}

/**
 * Check if using mock data
 */
export function isUsingMockData(): boolean {
  return USE_MOCK_DATA;
}

/**
 * Get API status
 */
export function getAPIStatus(): { configured: boolean; baseUrl: string; usingMock: boolean } {
  return {
    configured: !!RSMEANS_API_KEY,
    baseUrl: RSMEANS_API_BASE_URL,
    usingMock: USE_MOCK_DATA,
  };
}
