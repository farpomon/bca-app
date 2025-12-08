/**
 * ESG Scoring Service
 * Calculates environmental, social, and governance scores for facilities
 */

export interface ESGScoreBreakdown {
  energyScore: number; // 0-100
  waterScore: number; // 0-100
  wasteScore: number; // 0-100
  emissionsScore: number; // 0-100
  compositeScore: number; // 0-100
  benchmarkPercentile?: number; // 0-100
}

// Industry benchmarks (per square foot per year)
const BENCHMARKS = {
  energy: {
    excellent: 30, // kWh/sqft/year
    good: 50,
    fair: 75,
    poor: 100,
  },
  water: {
    excellent: 15, // gallons/sqft/year
    good: 25,
    fair: 40,
    poor: 60,
  },
  waste: {
    excellent: 0.8, // lbs/sqft/year
    good: 1.5,
    fair: 2.5,
    poor: 4.0,
  },
  emissions: {
    excellent: 5, // kg CO2e/sqft/year
    good: 10,
    fair: 15,
    poor: 25,
  },
  wasteDiversion: {
    excellent: 75, // % diverted from landfill
    good: 50,
    fair: 30,
    poor: 15,
  },
};

/**
 * Calculate energy efficiency score (0-100, higher is better)
 */
export function calculateEnergyScore(
  energyConsumptionKWh: number,
  buildingSquareFeet: number,
  renewablePercentage: number = 0
): number {
  if (buildingSquareFeet === 0) return 0;
  
  const energyIntensity = energyConsumptionKWh / buildingSquareFeet; // kWh/sqft/year
  
  // Base score from energy intensity
  let baseScore = 0;
  if (energyIntensity <= BENCHMARKS.energy.excellent) {
    baseScore = 100;
  } else if (energyIntensity <= BENCHMARKS.energy.good) {
    baseScore = 80;
  } else if (energyIntensity <= BENCHMARKS.energy.fair) {
    baseScore = 60;
  } else if (energyIntensity <= BENCHMARKS.energy.poor) {
    baseScore = 40;
  } else {
    baseScore = Math.max(0, 40 - (energyIntensity - BENCHMARKS.energy.poor) * 0.5);
  }
  
  // Bonus for renewable energy (up to +20 points)
  const renewableBonus = (renewablePercentage / 100) * 20;
  
  return Math.min(100, baseScore + renewableBonus);
}

/**
 * Calculate water efficiency score (0-100, higher is better)
 */
export function calculateWaterScore(
  waterConsumptionGallons: number,
  buildingSquareFeet: number
): number {
  if (buildingSquareFeet === 0) return 0;
  
  const waterIntensity = waterConsumptionGallons / buildingSquareFeet; // gallons/sqft/year
  
  if (waterIntensity <= BENCHMARKS.water.excellent) {
    return 100;
  } else if (waterIntensity <= BENCHMARKS.water.good) {
    return 80;
  } else if (waterIntensity <= BENCHMARKS.water.fair) {
    return 60;
  } else if (waterIntensity <= BENCHMARKS.water.poor) {
    return 40;
  } else {
    return Math.max(0, 40 - (waterIntensity - BENCHMARKS.water.poor) * 0.5);
  }
}

/**
 * Calculate waste management score (0-100, higher is better)
 */
export function calculateWasteScore(
  totalWasteLbs: number,
  recycledLbs: number,
  compostedLbs: number,
  buildingSquareFeet: number
): number {
  if (buildingSquareFeet === 0) return 0;
  
  const wasteIntensity = totalWasteLbs / buildingSquareFeet; // lbs/sqft/year
  const divertedLbs = recycledLbs + compostedLbs;
  const diversionRate = totalWasteLbs > 0 ? (divertedLbs / totalWasteLbs) * 100 : 0;
  
  // Base score from waste intensity (60% weight)
  let intensityScore = 0;
  if (wasteIntensity <= BENCHMARKS.waste.excellent) {
    intensityScore = 100;
  } else if (wasteIntensity <= BENCHMARKS.waste.good) {
    intensityScore = 80;
  } else if (wasteIntensity <= BENCHMARKS.waste.fair) {
    intensityScore = 60;
  } else if (wasteIntensity <= BENCHMARKS.waste.poor) {
    intensityScore = 40;
  } else {
    intensityScore = Math.max(0, 40 - (wasteIntensity - BENCHMARKS.waste.poor) * 5);
  }
  
  // Diversion rate score (40% weight)
  let diversionScore = 0;
  if (diversionRate >= BENCHMARKS.wasteDiversion.excellent) {
    diversionScore = 100;
  } else if (diversionRate >= BENCHMARKS.wasteDiversion.good) {
    diversionScore = 80;
  } else if (diversionRate >= BENCHMARKS.wasteDiversion.fair) {
    diversionScore = 60;
  } else if (diversionRate >= BENCHMARKS.wasteDiversion.poor) {
    diversionScore = 40;
  } else {
    diversionScore = (diversionRate / BENCHMARKS.wasteDiversion.poor) * 40;
  }
  
  return intensityScore * 0.6 + diversionScore * 0.4;
}

/**
 * Calculate emissions score (0-100, higher is better)
 */
export function calculateEmissionsScore(
  totalEmissionsMT: number,
  buildingSquareFeet: number
): number {
  if (buildingSquareFeet === 0) return 0;
  
  const emissionsIntensity = (totalEmissionsMT * 1000) / buildingSquareFeet; // kg CO2e/sqft/year
  
  if (emissionsIntensity <= BENCHMARKS.emissions.excellent) {
    return 100;
  } else if (emissionsIntensity <= BENCHMARKS.emissions.good) {
    return 80;
  } else if (emissionsIntensity <= BENCHMARKS.emissions.fair) {
    return 60;
  } else if (emissionsIntensity <= BENCHMARKS.emissions.poor) {
    return 40;
  } else {
    return Math.max(0, 40 - (emissionsIntensity - BENCHMARKS.emissions.poor) * 1.5);
  }
}

/**
 * Calculate composite ESG score
 */
export function calculateCompositeScore(breakdown: Partial<ESGScoreBreakdown>): number {
  const scores = [];
  
  if (breakdown.energyScore !== undefined) scores.push(breakdown.energyScore);
  if (breakdown.waterScore !== undefined) scores.push(breakdown.waterScore);
  if (breakdown.wasteScore !== undefined) scores.push(breakdown.wasteScore);
  if (breakdown.emissionsScore !== undefined) scores.push(breakdown.emissionsScore);
  
  if (scores.length === 0) return 0;
  
  // Weighted average (energy and emissions have higher weight)
  const weights = {
    energy: 0.3,
    water: 0.2,
    waste: 0.2,
    emissions: 0.3,
  };
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  if (breakdown.energyScore !== undefined) {
    weightedSum += breakdown.energyScore * weights.energy;
    totalWeight += weights.energy;
  }
  if (breakdown.waterScore !== undefined) {
    weightedSum += breakdown.waterScore * weights.water;
    totalWeight += weights.water;
  }
  if (breakdown.wasteScore !== undefined) {
    weightedSum += breakdown.wasteScore * weights.waste;
    totalWeight += weights.waste;
  }
  if (breakdown.emissionsScore !== undefined) {
    weightedSum += breakdown.emissionsScore * weights.emissions;
    totalWeight += weights.emissions;
  }
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Calculate full ESG score for a facility
 */
export function calculateESGScore(
  energyConsumptionKWh: number,
  waterConsumptionGallons: number,
  totalWasteLbs: number,
  recycledLbs: number,
  compostedLbs: number,
  totalEmissionsMT: number,
  buildingSquareFeet: number,
  renewablePercentage: number = 0
): ESGScoreBreakdown {
  const energyScore = calculateEnergyScore(energyConsumptionKWh, buildingSquareFeet, renewablePercentage);
  const waterScore = calculateWaterScore(waterConsumptionGallons, buildingSquareFeet);
  const wasteScore = calculateWasteScore(totalWasteLbs, recycledLbs, compostedLbs, buildingSquareFeet);
  const emissionsScore = calculateEmissionsScore(totalEmissionsMT, buildingSquareFeet);
  
  const breakdown: ESGScoreBreakdown = {
    energyScore,
    waterScore,
    wasteScore,
    emissionsScore,
    compositeScore: 0,
  };
  
  breakdown.compositeScore = calculateCompositeScore(breakdown);
  
  return breakdown;
}

/**
 * Calculate benchmark percentile (where facility ranks vs peers)
 */
export function calculateBenchmarkPercentile(
  facilityScore: number,
  portfolioScores: number[]
): number {
  if (portfolioScores.length === 0) return 50;
  
  const lowerScores = portfolioScores.filter(score => score < facilityScore).length;
  return Math.round((lowerScores / portfolioScores.length) * 100);
}
