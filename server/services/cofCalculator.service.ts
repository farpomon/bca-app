/**
 * Consequence of Failure (CoF) Calculator Service
 * 
 * Calculates failure consequences across multiple dimensions:
 * - Safety (injury risk, life safety systems)
 * - Operational (downtime, service disruption)
 * - Financial (repair cost, revenue loss, penalties)
 * - Environmental (spills, emissions, violations)
 * - Reputational (public perception, client satisfaction)
 */

export interface CofInputs {
  // Safety consequences
  safetyImpact?: number; // 1-5 scale
  safetyNotes?: string;
  
  // Operational consequences
  operationalImpact?: number; // 1-5 scale
  downtimeDays?: number;
  affectedSystems?: string[]; // List of dependent systems
  operationalNotes?: string;
  
  // Financial consequences
  financialImpact?: number; // 1-5 scale
  repairCost?: number;
  revenueLoss?: number;
  penaltyCost?: number;
  financialNotes?: string;
  
  // Environmental consequences
  environmentalImpact?: number; // 1-5 scale
  environmentalNotes?: string;
  
  // Reputational consequences
  reputationalImpact?: number; // 1-5 scale
  reputationalNotes?: string;
}

export interface CofResult {
  cof: number; // 1-5 scale
  dimensions: {
    safety: number;
    operational: number;
    financial: number;
    environmental: number;
    reputational: number;
  };
  justification: string;
  criticalityLevel: "low" | "medium" | "high" | "critical";
}

/**
 * Calculate safety consequence
 */
function calculateSafetyConsequence(safetyImpact?: number): number {
  if (safetyImpact === undefined) return 1.0; // Default negligible
  
  // Safety is the most critical dimension
  // 1: No safety impact
  // 2: Minor injury potential
  // 3: Moderate injury potential
  // 4: Major injury or life safety system impact
  // 5: Fatality potential or critical life safety failure
  
  return Math.min(5.0, Math.max(1.0, safetyImpact));
}

/**
 * Calculate operational consequence
 */
function calculateOperationalConsequence(
  operationalImpact?: number,
  downtimeDays?: number,
  affectedSystems?: string[]
): number {
  let consequence = operationalImpact || 1.0;
  
  // Adjust for downtime duration
  if (downtimeDays !== undefined) {
    if (downtimeDays === 0) consequence = Math.min(consequence, 1.0);
    else if (downtimeDays <= 1) consequence = Math.max(consequence, 2.0);
    else if (downtimeDays <= 7) consequence = Math.max(consequence, 3.0);
    else if (downtimeDays <= 30) consequence = Math.max(consequence, 4.0);
    else consequence = Math.max(consequence, 5.0);
  }
  
  // Adjust for cascading failures
  if (affectedSystems && affectedSystems.length > 0) {
    // Each dependent system adds 0.3 to consequence
    const cascadeAdjustment = Math.min(1.0, affectedSystems.length * 0.3);
    consequence = Math.min(5.0, consequence + cascadeAdjustment);
  }
  
  return Math.min(5.0, Math.max(1.0, consequence));
}

/**
 * Calculate financial consequence
 */
function calculateFinancialConsequence(
  financialImpact?: number,
  repairCost?: number,
  revenueLoss?: number,
  penaltyCost?: number
): number {
  let consequence = financialImpact || 1.0;
  
  // Calculate total financial impact
  const totalCost = (repairCost || 0) + (revenueLoss || 0) + (penaltyCost || 0);
  
  if (totalCost > 0) {
    // Financial consequence scale:
    // < $10K: Negligible (1)
    // $10K-$50K: Minor (2)
    // $50K-$250K: Moderate (3)
    // $250K-$1M: Major (4)
    // > $1M: Catastrophic (5)
    
    if (totalCost < 10000) consequence = Math.max(consequence, 1.0);
    else if (totalCost < 50000) consequence = Math.max(consequence, 2.0);
    else if (totalCost < 250000) consequence = Math.max(consequence, 3.0);
    else if (totalCost < 1000000) consequence = Math.max(consequence, 4.0);
    else consequence = Math.max(consequence, 5.0);
  }
  
  return Math.min(5.0, Math.max(1.0, consequence));
}

/**
 * Calculate environmental consequence
 */
function calculateEnvironmentalConsequence(environmentalImpact?: number): number {
  if (environmentalImpact === undefined) return 1.0; // Default negligible
  
  // Environmental consequence scale:
  // 1: No environmental impact
  // 2: Minor localized impact, easily remediated
  // 3: Moderate impact, requires cleanup
  // 4: Major impact, regulatory reporting required
  // 5: Catastrophic impact, major spill/release, regulatory violations
  
  return Math.min(5.0, Math.max(1.0, environmentalImpact));
}

/**
 * Calculate reputational consequence
 */
function calculateReputationalConsequence(reputationalImpact?: number): number {
  if (reputationalImpact === undefined) return 1.0; // Default negligible
  
  // Reputational consequence scale:
  // 1: No public visibility
  // 2: Minor internal impact
  // 3: Moderate client dissatisfaction
  // 4: Major public relations issue
  // 5: Severe brand damage, media coverage
  
  return Math.min(5.0, Math.max(1.0, reputationalImpact));
}

/**
 * Calculate overall Consequence of Failure (CoF)
 * 
 * Uses weighted maximum approach (highest consequence dominates)
 * with weighted average for secondary consequences
 */
export function calculateCoF(inputs: CofInputs): CofResult {
  const dimensions = {
    safety: calculateSafetyConsequence(inputs.safetyImpact),
    operational: calculateOperationalConsequence(
      inputs.operationalImpact,
      inputs.downtimeDays,
      inputs.affectedSystems
    ),
    financial: calculateFinancialConsequence(
      inputs.financialImpact,
      inputs.repairCost,
      inputs.revenueLoss,
      inputs.penaltyCost
    ),
    environmental: calculateEnvironmentalConsequence(inputs.environmentalImpact),
    reputational: calculateReputationalConsequence(inputs.reputationalImpact),
  };
  
  // Safety has highest weight (40%)
  // Operational and Financial are equal (20% each)
  // Environmental and Reputational are lower (10% each)
  const weights = {
    safety: 0.40,
    operational: 0.20,
    financial: 0.20,
    environmental: 0.10,
    reputational: 0.10,
  };
  
  // Weighted average
  const cof =
    dimensions.safety * weights.safety +
    dimensions.operational * weights.operational +
    dimensions.financial * weights.financial +
    dimensions.environmental * weights.environmental +
    dimensions.reputational * weights.reputational;
  
  // Round to 2 decimal places
  const cofRounded = Math.round(cof * 100) / 100;
  
  // Determine criticality level
  let criticalityLevel: CofResult["criticalityLevel"];
  if (dimensions.safety >= 4.5 || cofRounded >= 4.5) {
    criticalityLevel = "critical";
  } else if (dimensions.safety >= 3.5 || cofRounded >= 3.5) {
    criticalityLevel = "high";
  } else if (cofRounded >= 2.5) {
    criticalityLevel = "medium";
  } else {
    criticalityLevel = "low";
  }
  
  // Generate justification
  const justification = generateCofJustification(inputs, dimensions, cofRounded);
  
  return {
    cof: cofRounded,
    dimensions,
    justification,
    criticalityLevel,
  };
}

/**
 * Generate human-readable justification for CoF score
 */
function generateCofJustification(
  inputs: CofInputs,
  dimensions: CofResult["dimensions"],
  cof: number
): string {
  const parts: string[] = [];
  
  // Overall consequence level
  let consequenceLevel = "Moderate";
  if (cof < 2.0) consequenceLevel = "Negligible";
  else if (cof < 3.0) consequenceLevel = "Minor";
  else if (cof < 4.0) consequenceLevel = "Moderate";
  else if (cof < 4.5) consequenceLevel = "Major";
  else consequenceLevel = "Catastrophic";
  
  parts.push(`Overall CoF: ${consequenceLevel} (${cof.toFixed(2)})`);
  
  // Safety consequences
  if (dimensions.safety >= 3.0) {
    parts.push(`Safety: ${getCofLabel(dimensions.safety)}`);
    if (inputs.safetyNotes) {
      parts.push(inputs.safetyNotes);
    }
  }
  
  // Operational consequences
  if (dimensions.operational >= 3.0) {
    let opText = `Operational: ${getCofLabel(dimensions.operational)}`;
    if (inputs.downtimeDays && inputs.downtimeDays > 0) {
      opText += ` (${inputs.downtimeDays} days downtime)`;
    }
    if (inputs.affectedSystems && inputs.affectedSystems.length > 0) {
      opText += ` (affects ${inputs.affectedSystems.length} systems)`;
    }
    parts.push(opText);
  }
  
  // Financial consequences
  if (dimensions.financial >= 3.0) {
    const totalCost = (inputs.repairCost || 0) + (inputs.revenueLoss || 0) + (inputs.penaltyCost || 0);
    let finText = `Financial: ${getCofLabel(dimensions.financial)}`;
    if (totalCost > 0) {
      finText += ` ($${(totalCost / 1000).toFixed(0)}K total impact)`;
    }
    parts.push(finText);
  }
  
  // Environmental consequences
  if (dimensions.environmental >= 3.0) {
    parts.push(`Environmental: ${getCofLabel(dimensions.environmental)}`);
    if (inputs.environmentalNotes) {
      parts.push(inputs.environmentalNotes);
    }
  }
  
  // Reputational consequences
  if (dimensions.reputational >= 3.0) {
    parts.push(`Reputational: ${getCofLabel(dimensions.reputational)}`);
    if (inputs.reputationalNotes) {
      parts.push(inputs.reputationalNotes);
    }
  }
  
  return parts.join(". ");
}

/**
 * Get CoF level label from numeric score
 */
export function getCofLabel(cof: number): string {
  if (cof < 2.0) return "Negligible";
  if (cof < 3.0) return "Minor";
  if (cof < 4.0) return "Moderate";
  if (cof < 4.5) return "Major";
  return "Catastrophic";
}
