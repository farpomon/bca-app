/**
 * Cost Estimation Service
 * 
 * Estimates repair and replacement costs for building components based on:
 * - Component type (UNIFORMAT II codes)
 * - Condition rating
 * - Regional cost factors
 * - Industry standards (simplified RS Means data)
 */

// Regional cost adjustment factors (Vancouver, BC baseline = 1.15 vs US average)
const REGIONAL_FACTOR = 1.15;

// Condition multipliers for repair costs
const CONDITION_MULTIPLIERS = {
  excellent: 0.05, // Minimal repairs needed
  good: 0.15,      // Minor repairs
  fair: 0.35,      // Moderate repairs
  poor: 0.65,      // Major repairs
  'very poor': 0.85, // Extensive repairs
};

// Base replacement costs per square foot or unit (CAD, Vancouver 2025)
// Simplified from RS Means data
const COMPONENT_COSTS: Record<string, { unit: string; costPerUnit: number; description: string }> = {
  // A - Substructure
  'A10': { unit: 'SF', costPerUnit: 45, description: 'Foundations' },
  'A20': { unit: 'SF', costPerUnit: 35, description: 'Basement Construction' },
  
  // B - Shell
  'B10': { unit: 'SF', costPerUnit: 85, description: 'Superstructure' },
  'B20': { unit: 'SF', costPerUnit: 125, description: 'Exterior Enclosure' },
  'B2010': { unit: 'SF', costPerUnit: 95, description: 'Exterior Walls' },
  'B2020': { unit: 'SF', costPerUnit: 45, description: 'Exterior Windows' },
  'B2030': { unit: 'SF', costPerUnit: 35, description: 'Exterior Doors' },
  'B30': { unit: 'SF', costPerUnit: 65, description: 'Roofing' },
  'B3010': { unit: 'SF', costPerUnit: 55, description: 'Roof Coverings' },
  'B3020': { unit: 'SF', costPerUnit: 25, description: 'Roof Openings' },
  
  // C - Interiors
  'C10': { unit: 'SF', costPerUnit: 45, description: 'Interior Construction' },
  'C1010': { unit: 'SF', costPerUnit: 35, description: 'Partitions' },
  'C1020': { unit: 'SF', costPerUnit: 28, description: 'Interior Doors' },
  'C20': { unit: 'SF', costPerUnit: 18, description: 'Stairs' },
  'C30': { unit: 'SF', costPerUnit: 32, description: 'Interior Finishes' },
  'C3010': { unit: 'SF', costPerUnit: 12, description: 'Wall Finishes' },
  'C3020': { unit: 'SF', costPerUnit: 15, description: 'Floor Finishes' },
  'C3030': { unit: 'SF', costPerUnit: 8, description: 'Ceiling Finishes' },
  
  // D - Services
  'D10': { unit: 'SF', costPerUnit: 15, description: 'Conveying Systems' },
  'D20': { unit: 'SF', costPerUnit: 45, description: 'Plumbing' },
  'D2010': { unit: 'SF', costPerUnit: 25, description: 'Plumbing Fixtures' },
  'D2020': { unit: 'SF', costPerUnit: 35, description: 'Domestic Water Distribution' },
  'D2030': { unit: 'SF', costPerUnit: 28, description: 'Sanitary Waste' },
  'D30': { unit: 'SF', costPerUnit: 55, description: 'HVAC' },
  'D3010': { unit: 'SF', costPerUnit: 35, description: 'Energy Supply' },
  'D3020': { unit: 'SF', costPerUnit: 45, description: 'Heat Generating Systems' },
  'D3030': { unit: 'SF', costPerUnit: 38, description: 'Cooling Generating Systems' },
  'D3040': { unit: 'SF', costPerUnit: 25, description: 'Distribution Systems' },
  'D3050': { unit: 'SF', costPerUnit: 18, description: 'Terminal & Package Units' },
  'D40': { unit: 'SF', costPerUnit: 22, description: 'Fire Protection' },
  'D50': { unit: 'SF', costPerUnit: 35, description: 'Electrical' },
  'D5010': { unit: 'SF', costPerUnit: 18, description: 'Electrical Service & Distribution' },
  'D5020': { unit: 'SF', costPerUnit: 12, description: 'Lighting & Branch Wiring' },
  'D5030': { unit: 'SF', costPerUnit: 8, description: 'Communications & Security' },
  
  // E - Equipment & Furnishings
  'E10': { unit: 'SF', costPerUnit: 25, description: 'Equipment' },
  'E20': { unit: 'SF', costPerUnit: 15, description: 'Furnishings' },
  
  // G - Building Sitework
  'G10': { unit: 'SF', costPerUnit: 12, description: 'Site Preparation' },
  'G20': { unit: 'SF', costPerUnit: 45, description: 'Site Improvements' },
  'G2010': { unit: 'SF', costPerUnit: 55, description: 'Roadways' },
  'G2020': { unit: 'SF', costPerUnit: 38, description: 'Parking Lots' },
  'G2030': { unit: 'SF', costPerUnit: 25, description: 'Pedestrian Paving' },
  'G2040': { unit: 'SF', costPerUnit: 18, description: 'Site Development' },
  'G30': { unit: 'SF', costPerUnit: 35, description: 'Site Mechanical Utilities' },
  'G40': { unit: 'SF', costPerUnit: 28, description: 'Site Electrical Utilities' },
};

// Default cost if component code not found
const DEFAULT_COST_PER_SF = 50;

export interface CostEstimate {
  componentCode: string;
  componentName: string;
  condition: string;
  estimatedRepairCost: number;
  replacementValue: number;
  remainingUsefulLife: number;
  costPerUnit: number;
  unit: string;
  confidence: 'high' | 'medium' | 'low';
  notes: string;
}

/**
 * Estimate costs for a building component
 */
export function estimateComponentCost(
  componentCode: string,
  componentName: string,
  condition: string,
  quantity: number = 1000, // Default 1000 SF
  usefulLife: number = 25  // Default 25 years
): CostEstimate {
  // Normalize condition to lowercase
  const normalizedCondition = condition.toLowerCase();
  
  // Find the most specific matching cost data
  let costData = COMPONENT_COSTS[componentCode];
  
  // If exact match not found, try parent codes (e.g., B2010 -> B20 -> B)
  if (!costData) {
    const parentCodes = getParentCodes(componentCode);
    for (const parentCode of parentCodes) {
      if (COMPONENT_COSTS[parentCode]) {
        costData = COMPONENT_COSTS[parentCode];
        break;
      }
    }
  }
  
  // Use default if still not found
  const costPerUnit = costData?.costPerUnit || DEFAULT_COST_PER_SF;
  const unit = costData?.unit || 'SF';
  
  // Calculate replacement value
  const replacementValue = Math.round(costPerUnit * quantity * REGIONAL_FACTOR);
  
  // Calculate repair cost based on condition
  const conditionMultiplier = CONDITION_MULTIPLIERS[normalizedCondition as keyof typeof CONDITION_MULTIPLIERS] || 0.35;
  const estimatedRepairCost = Math.round(replacementValue * conditionMultiplier);
  
  // Estimate remaining useful life based on condition
  let remainingUsefulLife: number;
  switch (normalizedCondition) {
    case 'excellent':
      remainingUsefulLife = Math.round(usefulLife * 0.95);
      break;
    case 'good':
      remainingUsefulLife = Math.round(usefulLife * 0.75);
      break;
    case 'fair':
      remainingUsefulLife = Math.round(usefulLife * 0.50);
      break;
    case 'poor':
      remainingUsefulLife = Math.round(usefulLife * 0.25);
      break;
    case 'very poor':
      remainingUsefulLife = Math.round(usefulLife * 0.10);
      break;
    default:
      remainingUsefulLife = Math.round(usefulLife * 0.50);
  }
  
  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low';
  if (COMPONENT_COSTS[componentCode]) {
    confidence = 'high';
  } else if (costData) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }
  
  // Generate notes
  const notes = costData 
    ? `Estimated using ${costData.description} costs (${unit} @ $${costPerUnit} CAD)`
    : `Estimated using default construction costs (${unit} @ $${costPerUnit} CAD)`;
  
  return {
    componentCode,
    componentName,
    condition: normalizedCondition,
    estimatedRepairCost,
    replacementValue,
    remainingUsefulLife,
    costPerUnit,
    unit,
    confidence,
    notes,
  };
}

/**
 * Get parent codes for hierarchical lookup
 * Example: B2010 -> [B20, B]
 */
function getParentCodes(code: string): string[] {
  const parents: string[] = [];
  
  // Remove trailing digits one at a time
  let current = code;
  while (current.length > 1) {
    current = current.slice(0, -1);
    parents.push(current);
  }
  
  return parents;
}

/**
 * Estimate costs for multiple components in batch
 */
export function estimateBatchCosts(
  components: Array<{
    componentCode: string;
    componentName: string;
    condition: string;
    quantity?: number;
    usefulLife?: number;
  }>
): CostEstimate[] {
  return components.map(comp => 
    estimateComponentCost(
      comp.componentCode,
      comp.componentName,
      comp.condition,
      comp.quantity,
      comp.usefulLife
    )
  );
}
