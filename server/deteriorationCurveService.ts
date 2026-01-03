/**
 * Deterioration Curve Service
 * 
 * Provides deterioration modeling using Best/Design/Worst case scenarios.
 * Each curve has 6 parameters representing condition at different time points.
 */

export interface CurveParameters {
  param1: number; // Initial condition (typically 100%)
  param2: number; // Condition at year 1
  param3: number; // Condition at year 2
  param4: number; // Condition at year 3
  param5: number; // Condition at year 4
  param6: number; // Condition at year 5 or failure threshold
}

export interface DeteriorationPrediction {
  predictedFailureYear: number;
  predictedRemainingLife: number;
  predictedCondition: number; // Current condition percentage
  confidenceScore: number; // 0-100
  curveUsed: "best" | "design" | "worst";
  dataPoints: Array<{ year: number; condition: number }>;
}

/**
 * Interpolate condition at a specific year using curve parameters
 */
export function interpolateCondition(
  params: CurveParameters,
  yearsSinceInstall: number,
  interpolationType: "linear" | "polynomial" | "exponential" = "linear"
): number {
  const points = [
    { year: 0, condition: params.param1 },
    { year: 1, condition: params.param2 },
    { year: 2, condition: params.param3 },
    { year: 3, condition: params.param4 },
    { year: 4, condition: params.param5 },
    { year: 5, condition: params.param6 },
  ];

  // If exact year match, return that value
  const exactMatch = points.find((p) => p.year === yearsSinceInstall);
  if (exactMatch) return exactMatch.condition;

  // Find surrounding points for interpolation
  let before = points[0];
  let after = points[points.length - 1];

  for (let i = 0; i < points.length - 1; i++) {
    if (points[i].year <= yearsSinceInstall && points[i + 1].year > yearsSinceInstall) {
      before = points[i];
      after = points[i + 1];
      break;
    }
  }

  // Extrapolate if beyond curve range
  if (yearsSinceInstall > points[points.length - 1].year) {
    before = points[points.length - 2];
    after = points[points.length - 1];
  }

  switch (interpolationType) {
    case "linear":
      return linearInterpolate(before, after, yearsSinceInstall);
    case "polynomial":
      return polynomialInterpolate(points, yearsSinceInstall);
    case "exponential":
      return exponentialInterpolate(before, after, yearsSinceInstall);
    default:
      return linearInterpolate(before, after, yearsSinceInstall);
  }
}

function linearInterpolate(
  before: { year: number; condition: number },
  after: { year: number; condition: number },
  targetYear: number
): number {
  const slope = (after.condition - before.condition) / (after.year - before.year);
  const condition = before.condition + slope * (targetYear - before.year);
  return Math.max(0, Math.min(100, Math.round(condition)));
}

function polynomialInterpolate(
  points: Array<{ year: number; condition: number }>,
  targetYear: number
): number {
  // Simple polynomial interpolation using Lagrange method
  let result = 0;

  for (let i = 0; i < points.length; i++) {
    let term = points[i].condition;
    for (let j = 0; j < points.length; j++) {
      if (i !== j) {
        term *= (targetYear - points[j].year) / (points[i].year - points[j].year);
      }
    }
    result += term;
  }

  return Math.max(0, Math.min(100, Math.round(result)));
}

function exponentialInterpolate(
  before: { year: number; condition: number },
  after: { year: number; condition: number },
  targetYear: number
): number {
  // Exponential decay model: C(t) = C0 * e^(-kt)
  if (before.condition <= 0 || after.condition <= 0) {
    return linearInterpolate(before, after, targetYear);
  }

  const k =
    Math.log(before.condition / after.condition) / (after.year - before.year);
  const condition = before.condition * Math.exp(-k * (targetYear - before.year));

  return Math.max(0, Math.min(100, Math.round(condition)));
}

/**
 * Predict failure year based on curve parameters
 */
export function predictFailureYear(
  params: CurveParameters,
  installYear: number,
  failureThreshold: number = 20, // Condition % below which component is considered failed
  interpolationType: "linear" | "polynomial" | "exponential" = "linear"
): number {
  const currentYear = new Date().getFullYear();
  const maxYearsToCheck = 50; // Look ahead up to 50 years

  for (let year = 0; year <= maxYearsToCheck; year++) {
    const condition = interpolateCondition(params, year, interpolationType);
    if (condition <= failureThreshold) {
      return installYear + year;
    }
  }

  // If no failure predicted within 50 years, return install year + 50
  return installYear + maxYearsToCheck;
}

/**
 * Calculate remaining useful life based on current condition and curve
 */
export function calculateRemainingLife(
  params: CurveParameters,
  installYear: number,
  currentCondition: number,
  failureThreshold: number = 20,
  interpolationType: "linear" | "polynomial" | "exponential" = "linear"
): number {
  const currentYear = new Date().getFullYear();
  const yearsSinceInstall = currentYear - installYear;

  // Find when condition will drop to failure threshold
  const failureYear = predictFailureYear(
    params,
    installYear,
    failureThreshold,
    interpolationType
  );

  const remainingYears = Math.max(0, failureYear - currentYear);
  return remainingYears;
}

/**
 * Generate full deterioration curve data points for visualization
 */
export function generateCurveData(
  params: CurveParameters,
  installYear: number,
  yearsToProject: number = 30,
  interpolationType: "linear" | "polynomial" | "exponential" = "linear"
): Array<{ year: number; condition: number }> {
  const dataPoints: Array<{ year: number; condition: number }> = [];

  for (let year = 0; year <= yearsToProject; year++) {
    const condition = interpolateCondition(params, year, interpolationType);
    dataPoints.push({
      year: installYear + year,
      condition,
    });
  }

  return dataPoints;
}

/**
 * Calculate confidence score based on data quality
 */
export function calculateConfidenceScore(
  assessmentCount: number,
  dataSpanYears: number,
  lastAssessmentAge: number
): number {
  // More assessments = higher confidence
  const assessmentScore = Math.min(100, (assessmentCount / 5) * 40);

  // Longer data span = higher confidence
  const spanScore = Math.min(100, (dataSpanYears / 10) * 30);

  // Recent assessment = higher confidence
  const recencyScore = Math.max(0, 30 - lastAssessmentAge * 3);

  const totalScore = assessmentScore + spanScore + recencyScore;
  return Math.round(Math.min(100, totalScore));
}

/**
 * Default curve parameters for common component types
 */
export const DEFAULT_CURVES: Record<
  string,
  {
    best: CurveParameters;
    design: CurveParameters;
    worst: CurveParameters;
  }
> = {
  // Roofing systems
  B30: {
    best: { param1: 100, param2: 95, param3: 90, param4: 85, param5: 80, param6: 75 },
    design: { param1: 100, param2: 90, param3: 80, param4: 70, param5: 60, param6: 50 },
    worst: { param1: 100, param2: 85, param3: 70, param4: 55, param5: 40, param6: 25 },
  },
  // Exterior walls
  B20: {
    best: { param1: 100, param2: 98, param3: 96, param4: 94, param5: 92, param6: 90 },
    design: { param1: 100, param2: 95, param3: 90, param4: 85, param5: 80, param6: 75 },
    worst: { param1: 100, param2: 92, param3: 84, param4: 76, param5: 68, param6: 60 },
  },
  // HVAC systems
  D30: {
    best: { param1: 100, param2: 93, param3: 86, param4: 79, param5: 72, param6: 65 },
    design: { param1: 100, param2: 88, param3: 76, param4: 64, param5: 52, param6: 40 },
    worst: { param1: 100, param2: 83, param3: 66, param4: 49, param5: 32, param6: 15 },
  },
  // Plumbing
  D20: {
    best: { param1: 100, param2: 96, param3: 92, param4: 88, param5: 84, param6: 80 },
    design: { param1: 100, param2: 92, param3: 84, param4: 76, param5: 68, param6: 60 },
    worst: { param1: 100, param2: 88, param3: 76, param4: 64, param5: 52, param6: 40 },
  },
  // Electrical systems
  D50: {
    best: { param1: 100, param2: 94, param3: 88, param4: 82, param5: 76, param6: 70 },
    design: { param1: 100, param2: 90, param3: 80, param4: 70, param5: 60, param6: 50 },
    worst: { param1: 100, param2: 86, param3: 72, param4: 58, param5: 44, param6: 30 },
  },
  // Default for unknown components
  default: {
    best: { param1: 100, param2: 95, param3: 90, param4: 85, param5: 80, param6: 75 },
    design: { param1: 100, param2: 90, param3: 80, param4: 70, param5: 60, param6: 50 },
    worst: { param1: 100, param2: 85, param3: 70, param4: 55, param5: 40, param6: 25 },
  },
};
