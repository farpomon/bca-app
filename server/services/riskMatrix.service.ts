/**
 * Risk Matrix Service
 * 
 * Calculates risk scores (PoF × CoF) and maps to risk levels
 * Implements 5x5 risk matrix with configurable thresholds
 */

export type RiskLevel = "very_low" | "low" | "medium" | "high" | "critical";

export interface RiskScore {
  pof: number; // 1-5
  cof: number; // 1-5
  riskScore: number; // 1-25 (PoF × CoF)
  riskLevel: RiskLevel;
  riskColor: string; // Hex color for visualization
  priority: number; // 1-5 (for sorting)
}

/**
 * Standard 5x5 risk matrix thresholds
 * 
 * Risk Score = PoF × CoF
 * 
 * Risk Levels:
 * - Very Low (1-3): Acceptable risk, routine monitoring
 * - Low (4-6): Tolerable risk, scheduled maintenance
 * - Medium (7-12): Moderate risk, prioritize for action
 * - High (13-19): Significant risk, urgent action required
 * - Critical (20-25): Extreme risk, immediate action required
 */
const RISK_THRESHOLDS = {
  very_low: { max: 3, color: "#10b981", priority: 1 }, // Green
  low: { max: 6, color: "#84cc16", priority: 2 }, // Light green
  medium: { max: 12, color: "#eab308", priority: 3 }, // Yellow
  high: { max: 19, color: "#f97316", priority: 4 }, // Orange
  critical: { max: 25, color: "#ef4444", priority: 5 }, // Red
};

/**
 * Calculate risk score and level
 */
export function calculateRiskScore(pof: number, cof: number): RiskScore {
  // Validate inputs
  pof = Math.min(5.0, Math.max(1.0, pof));
  cof = Math.min(5.0, Math.max(1.0, cof));
  
  // Calculate risk score (PoF × CoF)
  const riskScore = pof * cof;
  
  // Determine risk level
  let riskLevel: RiskLevel;
  let riskColor: string;
  let priority: number;
  
  if (riskScore <= RISK_THRESHOLDS.very_low.max) {
    riskLevel = "very_low";
    riskColor = RISK_THRESHOLDS.very_low.color;
    priority = RISK_THRESHOLDS.very_low.priority;
  } else if (riskScore <= RISK_THRESHOLDS.low.max) {
    riskLevel = "low";
    riskColor = RISK_THRESHOLDS.low.color;
    priority = RISK_THRESHOLDS.low.priority;
  } else if (riskScore <= RISK_THRESHOLDS.medium.max) {
    riskLevel = "medium";
    riskColor = RISK_THRESHOLDS.medium.color;
    priority = RISK_THRESHOLDS.medium.priority;
  } else if (riskScore <= RISK_THRESHOLDS.high.max) {
    riskLevel = "high";
    riskColor = RISK_THRESHOLDS.high.color;
    priority = RISK_THRESHOLDS.high.priority;
  } else {
    riskLevel = "critical";
    riskColor = RISK_THRESHOLDS.critical.color;
    priority = RISK_THRESHOLDS.critical.priority;
  }
  
  return {
    pof: Math.round(pof * 100) / 100,
    cof: Math.round(cof * 100) / 100,
    riskScore: Math.round(riskScore * 100) / 100,
    riskLevel,
    riskColor,
    priority,
  };
}

/**
 * Get risk matrix cell data for visualization
 * Returns 5x5 matrix with risk levels
 */
export function getRiskMatrix(): {
  pof: number;
  cof: number;
  riskScore: number;
  riskLevel: RiskLevel;
  riskColor: string;
}[][] {
  const matrix: ReturnType<typeof getRiskMatrix> = [];
  
  // Generate 5x5 matrix (PoF on Y-axis, CoF on X-axis)
  for (let pof = 5; pof >= 1; pof--) {
    const row: ReturnType<typeof getRiskMatrix>[0] = [];
    for (let cof = 1; cof <= 5; cof++) {
      const { riskScore, riskLevel, riskColor } = calculateRiskScore(pof, cof);
      row.push({
        pof,
        cof,
        riskScore,
        riskLevel,
        riskColor,
      });
    }
    matrix.push(row);
  }
  
  return matrix;
}

/**
 * Get risk level label
 */
export function getRiskLevelLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    very_low: "Very Low",
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  };
  return labels[level];
}

/**
 * Get risk level description
 */
export function getRiskLevelDescription(level: RiskLevel): string {
  const descriptions: Record<RiskLevel, string> = {
    very_low: "Acceptable risk. Routine monitoring and standard maintenance.",
    low: "Tolerable risk. Scheduled maintenance and periodic inspection.",
    medium: "Moderate risk. Prioritize for action within planned maintenance cycle.",
    high: "Significant risk. Urgent action required. Escalate to management.",
    critical: "Extreme risk. Immediate action required. Consider interim mitigation measures.",
  };
  return descriptions[level];
}

/**
 * Get recommended action for risk level
 */
export function getRecommendedAction(level: RiskLevel): string {
  const actions: Record<RiskLevel, string> = {
    very_low: "Continue routine monitoring",
    low: "Schedule preventive maintenance",
    medium: "Plan corrective action within 6-12 months",
    high: "Execute corrective action within 3-6 months",
    critical: "Immediate action required (0-3 months)",
  };
  return actions[level];
}

/**
 * Calculate portfolio risk metrics
 */
export interface PortfolioRiskMetrics {
  totalComponents: number;
  riskDistribution: Record<RiskLevel, number>;
  averageRiskScore: number;
  highestRiskScore: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  veryLowCount: number;
}

export function calculatePortfolioRiskMetrics(
  riskScores: { pof: number; cof: number }[]
): PortfolioRiskMetrics {
  const distribution: Record<RiskLevel, number> = {
    very_low: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  
  let totalRiskScore = 0;
  let highestRiskScore = 0;
  
  for (const { pof, cof } of riskScores) {
    const { riskScore, riskLevel } = calculateRiskScore(pof, cof);
    distribution[riskLevel]++;
    totalRiskScore += riskScore;
    highestRiskScore = Math.max(highestRiskScore, riskScore);
  }
  
  const totalComponents = riskScores.length;
  const averageRiskScore = totalComponents > 0 ? totalRiskScore / totalComponents : 0;
  
  return {
    totalComponents,
    riskDistribution: distribution,
    averageRiskScore: Math.round(averageRiskScore * 100) / 100,
    highestRiskScore: Math.round(highestRiskScore * 100) / 100,
    criticalCount: distribution.critical,
    highCount: distribution.high,
    mediumCount: distribution.medium,
    lowCount: distribution.low,
    veryLowCount: distribution.very_low,
  };
}
