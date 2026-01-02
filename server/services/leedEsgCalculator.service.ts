/**
 * LEED-Based ESG Calculator Service
 * Calculates sustainability metrics based on LEED v4.1/v5 standards
 * Supports Edmonton's climate and sustainability commitments
 */

// Canadian emission factors (Environment and Climate Change Canada - National Inventory Report)
export const CANADIAN_EMISSION_FACTORS = {
  // Alberta Grid Electricity (kg CO2e per kWh) - 2023 data
  electricity: {
    alberta: 0.54, // High due to coal/natural gas mix
    ontario: 0.03, // Low due to nuclear/hydro
    quebec: 0.002, // Very low due to hydro
    bc: 0.01, // Low due to hydro
    national_avg: 0.12,
  },
  // Natural Gas (kg CO2e per m³)
  natural_gas: 1.888,
  // Natural Gas (kg CO2e per GJ)
  natural_gas_gj: 49.88,
  // Diesel (kg CO2e per litre)
  diesel: 2.663,
  // Propane (kg CO2e per litre)
  propane: 1.515,
  // Water (kg CO2e per m³) - includes treatment
  water: 0.344,
};

// LEED v4.1 Energy Performance Benchmarks (kWh/m²/year by building type)
export const LEED_ENERGY_BENCHMARKS = {
  office: { excellent: 100, good: 150, fair: 200, poor: 300 },
  retail: { excellent: 150, good: 200, fair: 300, poor: 400 },
  education: { excellent: 120, good: 180, fair: 250, poor: 350 },
  healthcare: { excellent: 250, good: 350, fair: 450, poor: 600 },
  warehouse: { excellent: 50, good: 80, fair: 120, poor: 180 },
  residential: { excellent: 80, good: 120, fair: 180, poor: 250 },
  recreation: { excellent: 180, good: 250, fair: 350, poor: 500 },
  default: { excellent: 100, good: 150, fair: 220, poor: 320 },
};

// LEED Water Performance Benchmarks (L/m²/year by building type)
export const LEED_WATER_BENCHMARKS = {
  office: { excellent: 400, good: 600, fair: 900, poor: 1200 },
  retail: { excellent: 300, good: 500, fair: 750, poor: 1000 },
  education: { excellent: 500, good: 750, fair: 1000, poor: 1400 },
  healthcare: { excellent: 800, good: 1200, fair: 1600, poor: 2200 },
  warehouse: { excellent: 100, good: 200, fair: 350, poor: 500 },
  residential: { excellent: 600, good: 900, fair: 1200, poor: 1600 },
  recreation: { excellent: 1000, good: 1500, fair: 2000, poor: 2800 },
  default: { excellent: 400, good: 600, fair: 900, poor: 1200 },
};

// GHG Intensity Benchmarks (kg CO2e/m²/year)
export const GHG_INTENSITY_BENCHMARKS = {
  excellent: 20,
  good: 40,
  fair: 70,
  poor: 120,
};

export interface UtilityInput {
  type: 'electricity' | 'natural_gas' | 'water' | 'diesel' | 'propane';
  consumption: number;
  unit: string; // kWh, m³, GJ, L
  isRenewable?: boolean;
  period: 'monthly' | 'annual';
}

export interface FacilityProfile {
  projectId: number;
  assetId?: number;
  buildingType: string;
  grossFloorArea: number; // m²
  province: string;
  yearBuilt?: number;
}

export interface LEEDScoreResult {
  energyScore: number; // 0-100
  waterScore: number; // 0-100
  ghgScore: number; // 0-100
  compositeScore: number; // 0-100
  leedPoints: number; // Estimated LEED points (0-110)
  energyIntensity: number; // kWh/m²/year
  waterIntensity: number; // L/m²/year
  ghgIntensity: number; // kg CO2e/m²/year
  totalEmissions: number; // tonnes CO2e/year
  benchmarkComparison: {
    energy: 'excellent' | 'good' | 'fair' | 'poor';
    water: 'excellent' | 'good' | 'fair' | 'poor';
    ghg: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

export interface ProjectEnvironmentalImpact {
  projectId: number;
  projectName: string;
  projectType: string; // lighting, hvac, boiler, windows, etc.
  estimatedEnergySavings: number; // kWh/year
  estimatedWaterSavings: number; // L/year
  estimatedGHGReduction: number; // tonnes CO2e/year
  estimatedCostSavings: number; // $/year
  paybackPeriod: number; // years
  environmentalImpactScore: number; // 0-100
}

/**
 * Calculate energy intensity (EUI) in kWh/m²/year
 */
export function calculateEnergyIntensity(
  utilities: UtilityInput[],
  grossFloorArea: number
): number {
  if (grossFloorArea <= 0) return 0;

  let totalEnergyKWh = 0;

  for (const utility of utilities) {
    let energyKWh = 0;

    switch (utility.type) {
      case 'electricity':
        energyKWh = utility.unit === 'kWh' ? utility.consumption : utility.consumption * 1000;
        break;
      case 'natural_gas':
        // Convert to kWh equivalent
        if (utility.unit === 'GJ') {
          energyKWh = utility.consumption * 277.78; // 1 GJ = 277.78 kWh
        } else if (utility.unit === 'm³') {
          energyKWh = utility.consumption * 10.55; // 1 m³ natural gas ≈ 10.55 kWh
        }
        break;
      case 'diesel':
        // 1 litre diesel ≈ 10.7 kWh
        energyKWh = utility.consumption * 10.7;
        break;
      case 'propane':
        // 1 litre propane ≈ 7.1 kWh
        energyKWh = utility.consumption * 7.1;
        break;
    }

    // Annualize if monthly
    if (utility.period === 'monthly') {
      energyKWh *= 12;
    }

    totalEnergyKWh += energyKWh;
  }

  return totalEnergyKWh / grossFloorArea;
}

/**
 * Calculate water intensity in L/m²/year
 */
export function calculateWaterIntensity(
  utilities: UtilityInput[],
  grossFloorArea: number
): number {
  if (grossFloorArea <= 0) return 0;

  let totalWaterL = 0;

  for (const utility of utilities) {
    if (utility.type === 'water') {
      let waterL = utility.consumption;
      if (utility.unit === 'm³') {
        waterL = utility.consumption * 1000; // 1 m³ = 1000 L
      }
      if (utility.period === 'monthly') {
        waterL *= 12;
      }
      totalWaterL += waterL;
    }
  }

  return totalWaterL / grossFloorArea;
}

/**
 * Calculate GHG emissions in tonnes CO2e/year
 */
export function calculateGHGEmissions(
  utilities: UtilityInput[],
  province: string = 'alberta'
): number {
  let totalEmissions = 0;

  const electricityFactor = CANADIAN_EMISSION_FACTORS.electricity[province.toLowerCase() as keyof typeof CANADIAN_EMISSION_FACTORS.electricity] 
    || CANADIAN_EMISSION_FACTORS.electricity.national_avg;

  for (const utility of utilities) {
    let emissionsKg = 0;

    switch (utility.type) {
      case 'electricity':
        if (!utility.isRenewable) {
          const kWh = utility.unit === 'kWh' ? utility.consumption : utility.consumption * 1000;
          emissionsKg = kWh * electricityFactor;
        }
        break;
      case 'natural_gas':
        if (utility.unit === 'GJ') {
          emissionsKg = utility.consumption * CANADIAN_EMISSION_FACTORS.natural_gas_gj;
        } else if (utility.unit === 'm³') {
          emissionsKg = utility.consumption * CANADIAN_EMISSION_FACTORS.natural_gas;
        }
        break;
      case 'water':
        const waterM3 = utility.unit === 'm³' ? utility.consumption : utility.consumption / 1000;
        emissionsKg = waterM3 * CANADIAN_EMISSION_FACTORS.water;
        break;
      case 'diesel':
        emissionsKg = utility.consumption * CANADIAN_EMISSION_FACTORS.diesel;
        break;
      case 'propane':
        emissionsKg = utility.consumption * CANADIAN_EMISSION_FACTORS.propane;
        break;
    }

    // Annualize if monthly
    if (utility.period === 'monthly') {
      emissionsKg *= 12;
    }

    totalEmissions += emissionsKg;
  }

  return totalEmissions / 1000; // Convert to tonnes
}

/**
 * Calculate LEED-based energy score (0-100)
 */
export function calculateEnergyScore(
  energyIntensity: number,
  buildingType: string,
  renewablePercentage: number = 0
): number {
  const benchmarks = LEED_ENERGY_BENCHMARKS[buildingType.toLowerCase() as keyof typeof LEED_ENERGY_BENCHMARKS] 
    || LEED_ENERGY_BENCHMARKS.default;

  let baseScore = 0;

  if (energyIntensity <= benchmarks.excellent) {
    baseScore = 90 + (1 - energyIntensity / benchmarks.excellent) * 10;
  } else if (energyIntensity <= benchmarks.good) {
    baseScore = 70 + ((benchmarks.good - energyIntensity) / (benchmarks.good - benchmarks.excellent)) * 20;
  } else if (energyIntensity <= benchmarks.fair) {
    baseScore = 50 + ((benchmarks.fair - energyIntensity) / (benchmarks.fair - benchmarks.good)) * 20;
  } else if (energyIntensity <= benchmarks.poor) {
    baseScore = 30 + ((benchmarks.poor - energyIntensity) / (benchmarks.poor - benchmarks.fair)) * 20;
  } else {
    baseScore = Math.max(0, 30 - (energyIntensity - benchmarks.poor) * 0.1);
  }

  // Bonus for renewable energy (up to +10 points)
  const renewableBonus = (renewablePercentage / 100) * 10;

  return Math.min(100, Math.max(0, baseScore + renewableBonus));
}

/**
 * Calculate LEED-based water score (0-100)
 */
export function calculateWaterScore(
  waterIntensity: number,
  buildingType: string
): number {
  const benchmarks = LEED_WATER_BENCHMARKS[buildingType.toLowerCase() as keyof typeof LEED_WATER_BENCHMARKS] 
    || LEED_WATER_BENCHMARKS.default;

  if (waterIntensity <= benchmarks.excellent) {
    return 90 + (1 - waterIntensity / benchmarks.excellent) * 10;
  } else if (waterIntensity <= benchmarks.good) {
    return 70 + ((benchmarks.good - waterIntensity) / (benchmarks.good - benchmarks.excellent)) * 20;
  } else if (waterIntensity <= benchmarks.fair) {
    return 50 + ((benchmarks.fair - waterIntensity) / (benchmarks.fair - benchmarks.good)) * 20;
  } else if (waterIntensity <= benchmarks.poor) {
    return 30 + ((benchmarks.poor - waterIntensity) / (benchmarks.poor - benchmarks.fair)) * 20;
  } else {
    return Math.max(0, 30 - (waterIntensity - benchmarks.poor) * 0.02);
  }
}

/**
 * Calculate GHG score (0-100)
 */
export function calculateGHGScore(ghgIntensity: number): number {
  if (ghgIntensity <= GHG_INTENSITY_BENCHMARKS.excellent) {
    return 90 + (1 - ghgIntensity / GHG_INTENSITY_BENCHMARKS.excellent) * 10;
  } else if (ghgIntensity <= GHG_INTENSITY_BENCHMARKS.good) {
    return 70 + ((GHG_INTENSITY_BENCHMARKS.good - ghgIntensity) / (GHG_INTENSITY_BENCHMARKS.good - GHG_INTENSITY_BENCHMARKS.excellent)) * 20;
  } else if (ghgIntensity <= GHG_INTENSITY_BENCHMARKS.fair) {
    return 50 + ((GHG_INTENSITY_BENCHMARKS.fair - ghgIntensity) / (GHG_INTENSITY_BENCHMARKS.fair - GHG_INTENSITY_BENCHMARKS.good)) * 20;
  } else if (ghgIntensity <= GHG_INTENSITY_BENCHMARKS.poor) {
    return 30 + ((GHG_INTENSITY_BENCHMARKS.poor - ghgIntensity) / (GHG_INTENSITY_BENCHMARKS.poor - GHG_INTENSITY_BENCHMARKS.fair)) * 20;
  } else {
    return Math.max(0, 30 - (ghgIntensity - GHG_INTENSITY_BENCHMARKS.poor) * 0.2);
  }
}

/**
 * Get benchmark comparison level
 */
function getBenchmarkLevel(
  value: number,
  benchmarks: { excellent: number; good: number; fair: number; poor: number }
): 'excellent' | 'good' | 'fair' | 'poor' {
  if (value <= benchmarks.excellent) return 'excellent';
  if (value <= benchmarks.good) return 'good';
  if (value <= benchmarks.fair) return 'fair';
  return 'poor';
}

/**
 * Estimate LEED points based on performance
 */
export function estimateLEEDPoints(
  energyScore: number,
  waterScore: number,
  ghgScore: number,
  renewablePercentage: number = 0
): number {
  // LEED v4.1 has up to 110 points total
  // Energy & Atmosphere: up to 33 points
  // Water Efficiency: up to 11 points
  // GHG/Carbon: up to 10 points (in v5)
  
  const energyPoints = (energyScore / 100) * 33;
  const waterPoints = (waterScore / 100) * 11;
  const ghgPoints = (ghgScore / 100) * 10;
  
  // Bonus for renewable energy (up to 5 points)
  const renewablePoints = (renewablePercentage / 100) * 5;
  
  return Math.round(energyPoints + waterPoints + ghgPoints + renewablePoints);
}

/**
 * Calculate comprehensive LEED-based ESG score
 */
export function calculateLEEDScore(
  facility: FacilityProfile,
  utilities: UtilityInput[],
  renewablePercentage: number = 0
): LEEDScoreResult {
  const energyIntensity = calculateEnergyIntensity(utilities, facility.grossFloorArea);
  const waterIntensity = calculateWaterIntensity(utilities, facility.grossFloorArea);
  const totalEmissions = calculateGHGEmissions(utilities, facility.province);
  const ghgIntensity = facility.grossFloorArea > 0 ? (totalEmissions * 1000) / facility.grossFloorArea : 0;

  const energyScore = calculateEnergyScore(energyIntensity, facility.buildingType, renewablePercentage);
  const waterScore = calculateWaterScore(waterIntensity, facility.buildingType);
  const ghgScore = calculateGHGScore(ghgIntensity);

  // Weighted composite score (energy and GHG weighted higher per LEED v5)
  const compositeScore = (energyScore * 0.4) + (waterScore * 0.25) + (ghgScore * 0.35);

  const leedPoints = estimateLEEDPoints(energyScore, waterScore, ghgScore, renewablePercentage);

  const energyBenchmarks = LEED_ENERGY_BENCHMARKS[facility.buildingType.toLowerCase() as keyof typeof LEED_ENERGY_BENCHMARKS] 
    || LEED_ENERGY_BENCHMARKS.default;
  const waterBenchmarks = LEED_WATER_BENCHMARKS[facility.buildingType.toLowerCase() as keyof typeof LEED_WATER_BENCHMARKS] 
    || LEED_WATER_BENCHMARKS.default;

  return {
    energyScore: Math.round(energyScore * 10) / 10,
    waterScore: Math.round(waterScore * 10) / 10,
    ghgScore: Math.round(ghgScore * 10) / 10,
    compositeScore: Math.round(compositeScore * 10) / 10,
    leedPoints,
    energyIntensity: Math.round(energyIntensity * 10) / 10,
    waterIntensity: Math.round(waterIntensity * 10) / 10,
    ghgIntensity: Math.round(ghgIntensity * 10) / 10,
    totalEmissions: Math.round(totalEmissions * 100) / 100,
    benchmarkComparison: {
      energy: getBenchmarkLevel(energyIntensity, energyBenchmarks),
      water: getBenchmarkLevel(waterIntensity, waterBenchmarks),
      ghg: getBenchmarkLevel(ghgIntensity, GHG_INTENSITY_BENCHMARKS),
    },
  };
}

/**
 * Calculate environmental impact score for a project/upgrade
 * Used for prioritization scoring
 */
export function calculateEnvironmentalImpactScore(
  impact: Partial<ProjectEnvironmentalImpact>,
  province: string = 'alberta'
): number {
  const electricityFactor = CANADIAN_EMISSION_FACTORS.electricity[province.toLowerCase() as keyof typeof CANADIAN_EMISSION_FACTORS.electricity] 
    || CANADIAN_EMISSION_FACTORS.electricity.national_avg;

  // Calculate GHG reduction from energy savings
  const ghgFromEnergy = ((impact.estimatedEnergySavings || 0) * electricityFactor) / 1000; // tonnes CO2e
  
  // Calculate GHG reduction from water savings
  const ghgFromWater = ((impact.estimatedWaterSavings || 0) / 1000 * CANADIAN_EMISSION_FACTORS.water) / 1000; // tonnes CO2e
  
  const totalGHGReduction = ghgFromEnergy + ghgFromWater + (impact.estimatedGHGReduction || 0);

  // Score based on GHG reduction (0-100)
  // Excellent: > 100 tonnes/year reduction
  // Good: 50-100 tonnes/year
  // Fair: 10-50 tonnes/year
  // Poor: < 10 tonnes/year
  
  let score = 0;
  if (totalGHGReduction >= 100) {
    score = 90 + Math.min(10, (totalGHGReduction - 100) / 50);
  } else if (totalGHGReduction >= 50) {
    score = 70 + ((totalGHGReduction - 50) / 50) * 20;
  } else if (totalGHGReduction >= 10) {
    score = 40 + ((totalGHGReduction - 10) / 40) * 30;
  } else if (totalGHGReduction > 0) {
    score = (totalGHGReduction / 10) * 40;
  }

  // Bonus for good payback period (< 5 years)
  if (impact.paybackPeriod && impact.paybackPeriod < 5) {
    score += (5 - impact.paybackPeriod) * 2; // Up to +10 points
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Calculate expected savings for common upgrade types
 */
export function calculateProjectSavings(
  projectType: string,
  currentConsumption: { energy?: number; water?: number }, // kWh/year, L/year
  province: string = 'alberta'
): { energySavings: number; waterSavings: number; ghgReduction: number; costSavings: number } {
  // Typical savings percentages by project type
  const savingsPercentages: Record<string, { energy: number; water: number }> = {
    lighting: { energy: 0.30, water: 0 }, // LED upgrades typically save 30%
    hvac: { energy: 0.20, water: 0 }, // HVAC upgrades save ~20%
    boiler: { energy: 0.15, water: 0 }, // Boiler replacement saves ~15%
    windows: { energy: 0.10, water: 0 }, // Window upgrades save ~10%
    insulation: { energy: 0.15, water: 0 }, // Insulation saves ~15%
    solar: { energy: 0.25, water: 0 }, // Solar can offset ~25% of electricity
    water_fixtures: { energy: 0, water: 0.30 }, // Low-flow fixtures save ~30%
    building_automation: { energy: 0.15, water: 0.10 }, // BAS saves ~15% energy, ~10% water
    roof: { energy: 0.08, water: 0 }, // Cool roof saves ~8%
    default: { energy: 0.10, water: 0.05 },
  };

  const savings = savingsPercentages[projectType.toLowerCase()] || savingsPercentages.default;
  
  const energySavings = (currentConsumption.energy || 0) * savings.energy;
  const waterSavings = (currentConsumption.water || 0) * savings.water;

  const electricityFactor = CANADIAN_EMISSION_FACTORS.electricity[province.toLowerCase() as keyof typeof CANADIAN_EMISSION_FACTORS.electricity] 
    || CANADIAN_EMISSION_FACTORS.electricity.national_avg;

  const ghgReduction = (energySavings * electricityFactor + waterSavings / 1000 * CANADIAN_EMISSION_FACTORS.water) / 1000;

  // Estimate cost savings (Alberta rates: ~$0.15/kWh, ~$0.003/L)
  const costSavings = energySavings * 0.15 + waterSavings * 0.003;

  return {
    energySavings: Math.round(energySavings),
    waterSavings: Math.round(waterSavings),
    ghgReduction: Math.round(ghgReduction * 100) / 100,
    costSavings: Math.round(costSavings),
  };
}

/**
 * Get sustainability recommendations based on current performance
 */
export function getSustainabilityRecommendations(
  scores: LEEDScoreResult
): Array<{ priority: 'high' | 'medium' | 'low'; category: string; recommendation: string; potentialSavings: string }> {
  const recommendations: Array<{ priority: 'high' | 'medium' | 'low'; category: string; recommendation: string; potentialSavings: string }> = [];

  // Energy recommendations
  if (scores.energyScore < 50) {
    recommendations.push({
      priority: 'high',
      category: 'Energy',
      recommendation: 'Consider LED lighting upgrades and HVAC optimization to reduce energy consumption significantly.',
      potentialSavings: '20-30% energy reduction',
    });
  } else if (scores.energyScore < 70) {
    recommendations.push({
      priority: 'medium',
      category: 'Energy',
      recommendation: 'Implement building automation systems (BAS) for better energy management.',
      potentialSavings: '10-15% energy reduction',
    });
  }

  // Water recommendations
  if (scores.waterScore < 50) {
    recommendations.push({
      priority: 'high',
      category: 'Water',
      recommendation: 'Install low-flow fixtures and consider rainwater harvesting systems.',
      potentialSavings: '25-35% water reduction',
    });
  } else if (scores.waterScore < 70) {
    recommendations.push({
      priority: 'medium',
      category: 'Water',
      recommendation: 'Implement water metering and leak detection systems.',
      potentialSavings: '10-20% water reduction',
    });
  }

  // GHG recommendations
  if (scores.ghgScore < 50) {
    recommendations.push({
      priority: 'high',
      category: 'Carbon',
      recommendation: 'Evaluate renewable energy options (solar, green power purchase agreements) to reduce carbon footprint.',
      potentialSavings: '30-50% GHG reduction',
    });
  } else if (scores.ghgScore < 70) {
    recommendations.push({
      priority: 'medium',
      category: 'Carbon',
      recommendation: 'Consider electrification of heating systems and procurement of renewable energy certificates.',
      potentialSavings: '15-25% GHG reduction',
    });
  }

  // General recommendations
  if (scores.compositeScore >= 80) {
    recommendations.push({
      priority: 'low',
      category: 'Certification',
      recommendation: 'Facility is performing well. Consider pursuing LEED certification to formalize sustainability achievements.',
      potentialSavings: 'Enhanced property value and marketability',
    });
  }

  return recommendations;
}
