/**
 * Probability of Failure (PoF) Calculator Service
 * 
 * Calculates failure probability based on multiple factors:
 * - Age vs Expected Useful Life (Weibull distribution)
 * - Condition Index
 * - Maintenance History
 * - Operating Environment
 * - Equipment-specific failure curves
 */

export interface PofInputs {
  age?: number; // Years since installation
  expectedUsefulLife?: number; // Years
  conditionIndex?: number; // 0-100 scale
  defectSeverity?: "none" | "minor" | "moderate" | "major" | "critical";
  maintenanceFrequency?: "none" | "reactive" | "scheduled" | "preventive" | "predictive";
  deferredMaintenanceYears?: number;
  operatingEnvironment?: "controlled" | "normal" | "harsh" | "extreme";
  utilizationRate?: number; // 0-100 percentage
  equipmentType?: string;
}

export interface PofResult {
  pof: number; // 1-5 scale
  contributingFactors: {
    ageFactor: number;
    conditionFactor: number;
    maintenanceFactor: number;
    environmentFactor: number;
    utilizationFactor: number;
  };
  justification: string;
  remainingLifePercent: number;
}

/**
 * Equipment-specific failure curves (Weibull shape parameters)
 * β > 1: Wear-out failures (increasing failure rate)
 * β = 1: Random failures (constant failure rate)
 * β < 1: Infant mortality (decreasing failure rate)
 */
const EQUIPMENT_FAILURE_CURVES: Record<string, { beta: number; eta: number }> = {
  boiler: { beta: 2.5, eta: 25 }, // Wear-out dominant, 25-year characteristic life
  hvac: { beta: 2.0, eta: 20 }, // Moderate wear-out, 20-year characteristic life
  chiller: { beta: 2.2, eta: 22 },
  "ice plant": { beta: 2.3, eta: 20 },
  electrical: { beta: 1.8, eta: 30 }, // More random failures
  plumbing: { beta: 1.5, eta: 35 }, // Lower wear-out rate
  roof: { beta: 2.5, eta: 25 },
  elevator: { beta: 2.0, eta: 25 },
  "fire protection": { beta: 1.2, eta: 30 }, // High reliability required
  default: { beta: 2.0, eta: 25 }, // Generic equipment
};

/**
 * Calculate age-based failure probability using Weibull distribution
 */
function calculateAgeFactor(
  age: number,
  expectedUsefulLife: number,
  equipmentType?: string
): { factor: number; remainingLifePercent: number } {
  const curve = EQUIPMENT_FAILURE_CURVES[equipmentType?.toLowerCase() || "default"] || EQUIPMENT_FAILURE_CURVES.default;
  
  // Calculate remaining life percentage
  const remainingLifePercent = Math.max(0, ((expectedUsefulLife - age) / expectedUsefulLife) * 100);
  
  // Weibull cumulative distribution function (CDF) gives failure probability
  // F(t) = 1 - exp(-(t/η)^β)
  const t = age;
  const beta = curve.beta;
  const eta = curve.eta;
  
  const failureProbability = 1 - Math.exp(-Math.pow(t / eta, beta));
  
  // Map failure probability (0-1) to PoF scale (1-5)
  // 0-10%: Very Low (1)
  // 10-30%: Low (2)
  // 30-60%: Medium (3)
  // 60-85%: High (4)
  // 85-100%: Very High (5)
  let factor: number;
  if (failureProbability < 0.10) factor = 1.0;
  else if (failureProbability < 0.30) factor = 2.0;
  else if (failureProbability < 0.60) factor = 3.0;
  else if (failureProbability < 0.85) factor = 4.0;
  else factor = 5.0;
  
  return { factor, remainingLifePercent };
}

/**
 * Calculate condition-based failure probability
 */
function calculateConditionFactor(
  conditionIndex?: number,
  defectSeverity?: string
): number {
  let factor = 3.0; // Default medium
  
  // Condition Index (0-100, higher is better)
  if (conditionIndex !== undefined) {
    if (conditionIndex >= 90) factor = 1.0; // Excellent condition
    else if (conditionIndex >= 75) factor = 1.5;
    else if (conditionIndex >= 60) factor = 2.5;
    else if (conditionIndex >= 40) factor = 3.5;
    else if (conditionIndex >= 20) factor = 4.5;
    else factor = 5.0; // Poor condition
  }
  
  // Adjust for defect severity
  const severityAdjustment: Record<string, number> = {
    none: -0.5,
    minor: 0,
    moderate: 0.5,
    major: 1.0,
    critical: 1.5,
  };
  
  if (defectSeverity && severityAdjustment[defectSeverity] !== undefined) {
    factor = Math.min(5.0, Math.max(1.0, factor + severityAdjustment[defectSeverity]));
  }
  
  return factor;
}

/**
 * Calculate maintenance-based failure probability
 */
function calculateMaintenanceFactor(
  maintenanceFrequency?: string,
  deferredMaintenanceYears?: number
): number {
  let factor = 3.0; // Default medium
  
  // Maintenance frequency impact
  const frequencyFactors: Record<string, number> = {
    predictive: 1.0, // Best practice
    preventive: 1.5,
    scheduled: 2.5,
    reactive: 4.0, // Run to failure
    none: 5.0, // No maintenance
  };
  
  if (maintenanceFrequency && frequencyFactors[maintenanceFrequency] !== undefined) {
    factor = frequencyFactors[maintenanceFrequency];
  }
  
  // Deferred maintenance penalty
  if (deferredMaintenanceYears && deferredMaintenanceYears > 0) {
    // Each year of deferred maintenance adds 0.3 to PoF
    factor = Math.min(5.0, factor + (deferredMaintenanceYears * 0.3));
  }
  
  return factor;
}

/**
 * Calculate environment-based failure probability
 */
function calculateEnvironmentFactor(
  operatingEnvironment?: string
): number {
  const environmentFactors: Record<string, number> = {
    controlled: 1.0, // Climate controlled, clean
    normal: 2.0, // Standard conditions
    harsh: 3.5, // Outdoor, high humidity, temperature extremes
    extreme: 5.0, // Corrosive, high vibration, extreme temps
  };
  
  return operatingEnvironment && environmentFactors[operatingEnvironment] !== undefined
    ? environmentFactors[operatingEnvironment]
    : 2.0; // Default normal
}

/**
 * Calculate utilization-based failure probability
 */
function calculateUtilizationFactor(
  utilizationRate?: number
): number {
  if (utilizationRate === undefined) return 2.0; // Default
  
  // Higher utilization = higher failure probability
  // 0-40%: Low usage (1.0)
  // 40-70%: Normal usage (2.0)
  // 70-90%: High usage (3.0)
  // 90-100%: Very high usage (4.0)
  // >100%: Overloaded (5.0)
  
  if (utilizationRate <= 40) return 1.0;
  if (utilizationRate <= 70) return 2.0;
  if (utilizationRate <= 90) return 3.0;
  if (utilizationRate <= 100) return 4.0;
  return 5.0;
}

/**
 * Calculate overall Probability of Failure (PoF)
 * 
 * Uses weighted average of contributing factors
 */
export function calculatePoF(inputs: PofInputs): PofResult {
  const factors = {
    ageFactor: 0,
    conditionFactor: 0,
    maintenanceFactor: 0,
    environmentFactor: 0,
    utilizationFactor: 0,
  };
  
  let remainingLifePercent = 100;
  
  // Calculate age factor (weight: 30%)
  if (inputs.age !== undefined && inputs.expectedUsefulLife !== undefined) {
    const ageResult = calculateAgeFactor(inputs.age, inputs.expectedUsefulLife, inputs.equipmentType);
    factors.ageFactor = ageResult.factor;
    remainingLifePercent = ageResult.remainingLifePercent;
  }
  
  // Calculate condition factor (weight: 30%)
  factors.conditionFactor = calculateConditionFactor(inputs.conditionIndex, inputs.defectSeverity);
  
  // Calculate maintenance factor (weight: 20%)
  factors.maintenanceFactor = calculateMaintenanceFactor(
    inputs.maintenanceFrequency,
    inputs.deferredMaintenanceYears
  );
  
  // Calculate environment factor (weight: 10%)
  factors.environmentFactor = calculateEnvironmentFactor(inputs.operatingEnvironment);
  
  // Calculate utilization factor (weight: 10%)
  factors.utilizationFactor = calculateUtilizationFactor(inputs.utilizationRate);
  
  // Weighted average
  const weights = {
    age: 0.30,
    condition: 0.30,
    maintenance: 0.20,
    environment: 0.10,
    utilization: 0.10,
  };
  
  let pof = 0;
  let totalWeight = 0;
  
  if (factors.ageFactor > 0) {
    pof += factors.ageFactor * weights.age;
    totalWeight += weights.age;
  }
  if (factors.conditionFactor > 0) {
    pof += factors.conditionFactor * weights.condition;
    totalWeight += weights.condition;
  }
  if (factors.maintenanceFactor > 0) {
    pof += factors.maintenanceFactor * weights.maintenance;
    totalWeight += weights.maintenance;
  }
  if (factors.environmentFactor > 0) {
    pof += factors.environmentFactor * weights.environment;
    totalWeight += weights.environment;
  }
  if (factors.utilizationFactor > 0) {
    pof += factors.utilizationFactor * weights.utilization;
    totalWeight += weights.utilization;
  }
  
  // Normalize by total weight
  if (totalWeight > 0) {
    pof = pof / totalWeight;
  } else {
    pof = 3.0; // Default medium if no factors provided
  }
  
  // Round to 2 decimal places
  pof = Math.round(pof * 100) / 100;
  
  // Generate justification
  const justification = generatePofJustification(inputs, factors, pof);
  
  return {
    pof,
    contributingFactors: factors,
    justification,
    remainingLifePercent,
  };
}

/**
 * Generate human-readable justification for PoF score
 */
function generatePofJustification(
  inputs: PofInputs,
  factors: PofResult["contributingFactors"],
  pof: number
): string {
  const parts: string[] = [];
  
  // Overall risk level
  let riskLevel = "Medium";
  if (pof < 2.0) riskLevel = "Very Low";
  else if (pof < 3.0) riskLevel = "Low";
  else if (pof < 4.0) riskLevel = "Medium";
  else if (pof < 4.5) riskLevel = "High";
  else riskLevel = "Very High";
  
  parts.push(`Overall PoF: ${riskLevel} (${pof.toFixed(2)})`);
  
  // Age factor
  if (factors.ageFactor > 0 && inputs.age && inputs.expectedUsefulLife) {
    const agePercent = (inputs.age / inputs.expectedUsefulLife) * 100;
    parts.push(`Age: ${inputs.age}/${inputs.expectedUsefulLife} years (${agePercent.toFixed(0)}% of expected life)`);
  }
  
  // Condition factor
  if (factors.conditionFactor > 0) {
    if (inputs.conditionIndex !== undefined) {
      parts.push(`Condition Index: ${inputs.conditionIndex}/100`);
    }
    if (inputs.defectSeverity) {
      parts.push(`Defect Severity: ${inputs.defectSeverity}`);
    }
  }
  
  // Maintenance factor
  if (factors.maintenanceFactor > 0) {
    if (inputs.maintenanceFrequency) {
      parts.push(`Maintenance: ${inputs.maintenanceFrequency}`);
    }
    if (inputs.deferredMaintenanceYears && inputs.deferredMaintenanceYears > 0) {
      parts.push(`Deferred Maintenance: ${inputs.deferredMaintenanceYears} years`);
    }
  }
  
  // Environment factor
  if (factors.environmentFactor > 0 && inputs.operatingEnvironment) {
    parts.push(`Environment: ${inputs.operatingEnvironment}`);
  }
  
  // Utilization factor
  if (factors.utilizationFactor > 0 && inputs.utilizationRate !== undefined) {
    parts.push(`Utilization: ${inputs.utilizationRate}%`);
  }
  
  return parts.join(". ");
}

/**
 * Get PoF level label from numeric score
 */
export function getPofLevel(pof: number): string {
  if (pof < 2.0) return "Very Low";
  if (pof < 3.0) return "Low";
  if (pof < 4.0) return "Medium";
  if (pof < 4.5) return "High";
  return "Very High";
}
