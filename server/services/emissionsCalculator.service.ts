/**
 * Emissions Calculator Service
 * Calculates carbon footprint using EPA emission factors
 */

// EPA Emission Factors (kg CO2e per unit)
const EMISSION_FACTORS = {
  // Scope 1 - Direct emissions
  natural_gas: 0.0053, // kg CO2e per cubic foot
  natural_gas_therms: 5.3, // kg CO2e per therm
  diesel: 10.21, // kg CO2e per gallon
  gasoline: 8.89, // kg CO2e per gallon
  propane: 5.72, // kg CO2e per gallon
  
  // Scope 2 - Purchased electricity (US average grid mix)
  electricity: 0.385, // kg CO2e per kWh (US average)
  electricity_renewable: 0, // kg CO2e per kWh (renewable sources)
  
  // Scope 3 - Indirect emissions
  water_supply: 0.344, // kg CO2e per 1000 gallons
  water_treatment: 0.272, // kg CO2e per 1000 gallons
  waste_landfill: 0.45, // kg CO2e per kg waste
  waste_recycling: 0.02, // kg CO2e per kg waste (avoided emissions)
  waste_compost: 0.01, // kg CO2e per kg waste
};

export interface EmissionCalculation {
  scope: "scope1" | "scope2" | "scope3";
  source: string;
  consumption: number;
  unit: string;
  emissionFactor: number;
  co2Equivalent: number; // metric tons
}

export interface CarbonFootprint {
  projectId: number;
  totalEmissions: number; // metric tons CO2e
  scope1: number;
  scope2: number;
  scope3: number;
  breakdown: EmissionCalculation[];
  calculationDate: Date;
}

/**
 * Calculate Scope 1 emissions (direct, on-site combustion)
 */
export function calculateScope1Emissions(
  fuelType: string,
  consumption: number,
  unit: string
): EmissionCalculation {
  let emissionFactor = 0;
  let source = "";
  
  switch (fuelType.toLowerCase()) {
    case "natural_gas":
      if (unit.toLowerCase() === "therms") {
        emissionFactor = EMISSION_FACTORS.natural_gas_therms;
        source = "Natural Gas Combustion (therms)";
      } else {
        emissionFactor = EMISSION_FACTORS.natural_gas;
        source = "Natural Gas Combustion (cubic feet)";
      }
      break;
    case "diesel":
      emissionFactor = EMISSION_FACTORS.diesel;
      source = "Diesel Combustion";
      break;
    case "gasoline":
      emissionFactor = EMISSION_FACTORS.gasoline;
      source = "Gasoline Combustion";
      break;
    case "propane":
      emissionFactor = EMISSION_FACTORS.propane;
      source = "Propane Combustion";
      break;
    default:
      throw new Error(`Unknown fuel type: ${fuelType}`);
  }
  
  const co2Kg = consumption * emissionFactor;
  const co2MT = co2Kg / 1000; // Convert to metric tons
  
  return {
    scope: "scope1",
    source,
    consumption,
    unit,
    emissionFactor,
    co2Equivalent: co2MT,
  };
}

/**
 * Calculate Scope 2 emissions (purchased electricity)
 */
export function calculateScope2Emissions(
  consumption: number, // kWh
  isRenewable: boolean = false
): EmissionCalculation {
  const emissionFactor = isRenewable 
    ? EMISSION_FACTORS.electricity_renewable 
    : EMISSION_FACTORS.electricity;
  
  const co2Kg = consumption * emissionFactor;
  const co2MT = co2Kg / 1000;
  
  return {
    scope: "scope2",
    source: isRenewable ? "Purchased Electricity (Renewable)" : "Purchased Electricity (Grid Mix)",
    consumption,
    unit: "kWh",
    emissionFactor,
    co2Equivalent: co2MT,
  };
}

/**
 * Calculate Scope 3 emissions (indirect, supply chain)
 */
export function calculateScope3Emissions(
  emissionType: string,
  quantity: number,
  unit: string
): EmissionCalculation {
  let emissionFactor = 0;
  let source = "";
  
  switch (emissionType.toLowerCase()) {
    case "water_supply":
      emissionFactor = EMISSION_FACTORS.water_supply / 1000; // per gallon
      source = "Water Supply";
      break;
    case "water_treatment":
      emissionFactor = EMISSION_FACTORS.water_treatment / 1000; // per gallon
      source = "Wastewater Treatment";
      break;
    case "waste_landfill":
      emissionFactor = EMISSION_FACTORS.waste_landfill;
      source = "Waste to Landfill";
      break;
    case "waste_recycling":
      emissionFactor = EMISSION_FACTORS.waste_recycling;
      source = "Waste Recycling (avoided)";
      break;
    case "waste_compost":
      emissionFactor = EMISSION_FACTORS.waste_compost;
      source = "Waste Composting";
      break;
    default:
      throw new Error(`Unknown emission type: ${emissionType}`);
  }
  
  const co2Kg = quantity * emissionFactor;
  const co2MT = co2Kg / 1000;
  
  return {
    scope: "scope3",
    source,
    consumption: quantity,
    unit,
    emissionFactor,
    co2Equivalent: co2MT,
  };
}

/**
 * Calculate total carbon footprint for a facility
 */
export async function calculateFacilityCarbonFootprint(
  projectId: number,
  utilityData: Array<{ type: string; consumption: number; unit: string; isRenewable?: boolean }>,
  wasteData: Array<{ type: string; weight: number; unit: string }>,
  waterConsumption?: number // gallons
): Promise<CarbonFootprint> {
  const breakdown: EmissionCalculation[] = [];
  
  // Calculate Scope 1 & 2 from utility data
  for (const utility of utilityData) {
    try {
      if (utility.type === "electricity") {
        const calc = calculateScope2Emissions(utility.consumption, utility.isRenewable);
        breakdown.push(calc);
      } else {
        const calc = calculateScope1Emissions(utility.type, utility.consumption, utility.unit);
        breakdown.push(calc);
      }
    } catch (error) {
      console.warn(`Skipping unknown utility type: ${utility.type}`);
    }
  }
  
  // Calculate Scope 3 from waste data
  for (const waste of wasteData) {
    try {
      let emissionType = "";
      switch (waste.type) {
        case "general":
          emissionType = "waste_landfill";
          break;
        case "recycling":
          emissionType = "waste_recycling";
          break;
        case "compost":
          emissionType = "waste_compost";
          break;
        default:
          continue; // Skip hazardous/construction waste
      }
      
      const calc = calculateScope3Emissions(emissionType, waste.weight, waste.unit);
      breakdown.push(calc);
    } catch (error) {
      console.warn(`Skipping waste type: ${waste.type}`);
    }
  }
  
  // Calculate Scope 3 from water consumption
  if (waterConsumption && waterConsumption > 0) {
    const waterSupply = calculateScope3Emissions("water_supply", waterConsumption, "gallons");
    const waterTreatment = calculateScope3Emissions("water_treatment", waterConsumption, "gallons");
    breakdown.push(waterSupply, waterTreatment);
  }
  
  // Sum by scope
  const scope1 = breakdown
    .filter(b => b.scope === "scope1")
    .reduce((sum, b) => sum + b.co2Equivalent, 0);
  
  const scope2 = breakdown
    .filter(b => b.scope === "scope2")
    .reduce((sum, b) => sum + b.co2Equivalent, 0);
  
  const scope3 = breakdown
    .filter(b => b.scope === "scope3")
    .reduce((sum, b) => sum + b.co2Equivalent, 0);
  
  const totalEmissions = scope1 + scope2 + scope3;
  
  return {
    projectId,
    totalEmissions,
    scope1,
    scope2,
    scope3,
    breakdown,
    calculationDate: new Date(),
  };
}

/**
 * Calculate emissions reduction from green upgrades
 */
export function calculateEmissionsReduction(
  energySavingsKWh: number,
  waterSavingsGallons: number
): number {
  const electricityReduction = calculateScope2Emissions(energySavingsKWh, false).co2Equivalent;
  const waterReduction = 
    calculateScope3Emissions("water_supply", waterSavingsGallons, "gallons").co2Equivalent +
    calculateScope3Emissions("water_treatment", waterSavingsGallons, "gallons").co2Equivalent;
  
  return electricityReduction + waterReduction;
}
