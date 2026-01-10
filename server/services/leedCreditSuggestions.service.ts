import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

// LEED v5 Credit Categories
const LEED_CATEGORIES = {
  IP: "Integrative Process",
  LT: "Location and Transportation",
  SS: "Sustainable Sites",
  WE: "Water Efficiency",
  EA: "Energy and Atmosphere",
  MR: "Materials and Resources",
  EQ: "Indoor Environmental Quality",
  IN: "Innovation",
  RP: "Regional Priority",
};

// LEED Credit definitions with achievability criteria
const LEED_CREDITS = [
  // Energy and Atmosphere
  {
    code: "EAp1",
    name: "Fundamental Commissioning and Verification",
    category: "EA",
    type: "prerequisite",
    maxPoints: 0,
    criteria: ["Building commissioning plan", "HVAC systems verification", "Energy systems testing"],
    buildingDataNeeded: ["hvac_type", "building_systems", "commissioning_status"],
  },
  {
    code: "EAc1",
    name: "Optimize Energy Performance",
    category: "EA",
    type: "credit",
    maxPoints: 18,
    criteria: ["Energy use intensity below baseline", "Renewable energy usage", "Building envelope efficiency"],
    buildingDataNeeded: ["energy_use_intensity", "renewable_percentage", "building_envelope_rating"],
  },
  {
    code: "EAc2",
    name: "Renewable Energy",
    category: "EA",
    type: "credit",
    maxPoints: 5,
    criteria: ["On-site renewable energy", "Off-site renewable energy purchase", "Green power contracts"],
    buildingDataNeeded: ["renewable_percentage", "solar_capacity", "green_power_contract"],
  },
  {
    code: "EAc3",
    name: "Enhanced Commissioning",
    category: "EA",
    type: "credit",
    maxPoints: 6,
    criteria: ["Enhanced commissioning scope", "Monitoring-based commissioning", "Envelope commissioning"],
    buildingDataNeeded: ["commissioning_status", "building_automation_system"],
  },
  // Water Efficiency
  {
    code: "WEp1",
    name: "Outdoor Water Use Reduction",
    category: "WE",
    type: "prerequisite",
    maxPoints: 0,
    criteria: ["No irrigation required", "Reduced irrigation by 30%", "Native/adaptive plants"],
    buildingDataNeeded: ["irrigation_type", "landscape_type"],
  },
  {
    code: "WEc1",
    name: "Indoor Water Use Reduction",
    category: "WE",
    type: "credit",
    maxPoints: 6,
    criteria: ["Low-flow fixtures", "Water-efficient appliances", "Process water reduction"],
    buildingDataNeeded: ["fixture_efficiency", "water_use_intensity"],
  },
  {
    code: "WEc2",
    name: "Cooling Tower Water Use",
    category: "WE",
    type: "credit",
    maxPoints: 2,
    criteria: ["Increased cycles of concentration", "Non-potable water use", "No cooling tower"],
    buildingDataNeeded: ["cooling_system_type", "cooling_tower_cycles"],
  },
  // Sustainable Sites
  {
    code: "SSc1",
    name: "Site Assessment",
    category: "SS",
    type: "credit",
    maxPoints: 1,
    criteria: ["Site survey completed", "Environmental assessment", "Habitat identification"],
    buildingDataNeeded: ["site_assessment_status"],
  },
  {
    code: "SSc2",
    name: "Protect or Restore Habitat",
    category: "SS",
    type: "credit",
    maxPoints: 2,
    criteria: ["Native vegetation restoration", "Habitat protection plan", "Green space percentage"],
    buildingDataNeeded: ["green_space_percentage", "native_vegetation"],
  },
  {
    code: "SSc4",
    name: "Rainwater Management",
    category: "SS",
    type: "credit",
    maxPoints: 3,
    criteria: ["Rainwater harvesting", "Permeable surfaces", "Green infrastructure"],
    buildingDataNeeded: ["rainwater_system", "permeable_surface_percentage"],
  },
  {
    code: "SSc5",
    name: "Heat Island Reduction",
    category: "SS",
    type: "credit",
    maxPoints: 2,
    criteria: ["Cool roof", "Shaded parking", "Green roof"],
    buildingDataNeeded: ["roof_type", "parking_shading", "sri_value"],
  },
  // Materials and Resources
  {
    code: "MRc1",
    name: "Building Life-Cycle Impact Reduction",
    category: "MR",
    type: "credit",
    maxPoints: 5,
    criteria: ["Whole building LCA", "Embodied carbon reduction", "Historic building reuse"],
    buildingDataNeeded: ["building_age", "renovation_scope", "lca_completed"],
  },
  {
    code: "MRc2",
    name: "Environmental Product Declarations",
    category: "MR",
    type: "credit",
    maxPoints: 2,
    criteria: ["Products with EPDs", "Industry-wide EPDs", "Product-specific EPDs"],
    buildingDataNeeded: ["epd_products_count"],
  },
  {
    code: "MRc5",
    name: "Construction and Demolition Waste Management",
    category: "MR",
    type: "credit",
    maxPoints: 2,
    criteria: ["Waste diversion rate", "Waste management plan", "Recycling program"],
    buildingDataNeeded: ["waste_diversion_rate", "recycling_program"],
  },
  // Indoor Environmental Quality
  {
    code: "EQc1",
    name: "Enhanced Indoor Air Quality Strategies",
    category: "EQ",
    type: "credit",
    maxPoints: 2,
    criteria: ["Entryway systems", "Interior cross-contamination prevention", "Filtration"],
    buildingDataNeeded: ["air_filtration_level", "entryway_system"],
  },
  {
    code: "EQc2",
    name: "Low-Emitting Materials",
    category: "EQ",
    type: "credit",
    maxPoints: 3,
    criteria: ["Low-VOC paints", "Low-emitting flooring", "Composite wood products"],
    buildingDataNeeded: ["voc_compliant_materials"],
  },
  {
    code: "EQc4",
    name: "Indoor Air Quality Assessment",
    category: "EQ",
    type: "credit",
    maxPoints: 2,
    criteria: ["Air testing completed", "Flush-out procedure", "IAQ management plan"],
    buildingDataNeeded: ["iaq_testing_status"],
  },
  {
    code: "EQc6",
    name: "Daylight",
    category: "EQ",
    type: "credit",
    maxPoints: 3,
    criteria: ["Spatial daylight autonomy", "Annual sunlight exposure", "Daylight simulation"],
    buildingDataNeeded: ["window_to_wall_ratio", "daylight_simulation"],
  },
  {
    code: "EQc7",
    name: "Quality Views",
    category: "EQ",
    type: "credit",
    maxPoints: 1,
    criteria: ["Direct line of sight to outdoors", "View factor calculation", "Multiple view types"],
    buildingDataNeeded: ["view_percentage"],
  },
];

interface BuildingPerformanceData {
  projectId: number;
  projectName: string;
  buildingType?: string;
  grossFloorArea?: number;
  yearBuilt?: number;
  // Energy metrics
  energyUseIntensity?: number;
  renewablePercentage?: number;
  energyScore?: number;
  // Water metrics
  waterUseIntensity?: number;
  waterScore?: number;
  // Waste metrics
  wasteDiversionRate?: number;
  wasteScore?: number;
  // Emissions
  carbonIntensity?: number;
  emissionsScore?: number;
  // Building features
  hvacType?: string;
  roofType?: string;
  hasGreenRoof?: boolean;
  hasSolarPanels?: boolean;
  hasRainwaterHarvesting?: boolean;
  hasBuildingAutomation?: boolean;
  // Certifications
  existingCertifications?: string[];
  // Assessment data
  conditionScore?: number;
  deficiencyCount?: number;
}

interface LeedCreditSuggestion {
  creditCode: string;
  creditName: string;
  category: string;
  categoryName: string;
  maxPoints: number;
  suggestedPoints: number;
  confidence: "high" | "medium" | "low";
  confidenceScore: number;
  rationale: string;
  requiredActions: string[];
  estimatedEffort: "low" | "medium" | "high";
  estimatedCost?: string;
  currentStatus: "achievable" | "partially_achievable" | "needs_work";
  relevantMetrics: Record<string, any>;
}

export async function analyzeLeedCredits(
  projectId: number
): Promise<{
  suggestions: LeedCreditSuggestion[];
  totalPotentialPoints: number;
  recommendedCertificationLevel: string;
  summary: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Gather building performance data
  const buildingData = await gatherBuildingData(projectId);

  // Use AI to analyze and suggest credits
  const suggestions = await generateAISuggestions(buildingData);

  // Calculate totals
  const totalPotentialPoints = suggestions.reduce((sum, s) => sum + s.suggestedPoints, 0);
  
  // Determine certification level
  let recommendedCertificationLevel = "Certified";
  if (totalPotentialPoints >= 80) recommendedCertificationLevel = "Platinum";
  else if (totalPotentialPoints >= 60) recommendedCertificationLevel = "Gold";
  else if (totalPotentialPoints >= 50) recommendedCertificationLevel = "Silver";
  else if (totalPotentialPoints >= 40) recommendedCertificationLevel = "Certified";
  else recommendedCertificationLevel = "Not Yet Certifiable";

  // Generate summary
  const highConfidenceCredits = suggestions.filter(s => s.confidence === "high").length;
  const summary = `Based on current building performance data, ${buildingData.projectName} has potential to achieve ${totalPotentialPoints} LEED points. ${highConfidenceCredits} credits are highly achievable with current performance. Focus areas include ${getTopCategories(suggestions).join(", ")}.`;

  return {
    suggestions,
    totalPotentialPoints,
    recommendedCertificationLevel,
    summary,
  };
}

async function gatherBuildingData(projectId: number): Promise<BuildingPerformanceData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get project info
  const projectResult = await db.execute(sql`
    SELECT id, name, buildingType, yearBuilt 
    FROM projects WHERE id = ${projectId}
  `);
  const projects = Array.isArray(projectResult[0]) ? projectResult[0] : [];
  const project = projects[0] as any;

  // Get latest ESG scores
  const esgResult = await db.execute(sql`
    SELECT energyScore, waterScore, wasteScore, emissionsScore, compositeScore
    FROM esg_scores WHERE projectId = ${projectId}
    ORDER BY scoreDate DESC LIMIT 1
  `);
  const esgScores = Array.isArray(esgResult[0]) ? esgResult[0] : [];
  const esg = esgScores[0] as any;

  // Get assets for total floor area
  const assetsResult = await db.execute(sql`
    SELECT SUM(grossFloorArea) as totalArea FROM assets WHERE projectId = ${projectId}
  `);
  const assets = Array.isArray(assetsResult[0]) ? assetsResult[0] : [];
  const totalArea = (assets[0] as any)?.totalArea;

  // Get certifications
  const certsResult = await db.execute(sql`
    SELECT certificationType FROM esg_certifications 
    WHERE projectId = ${projectId} AND status = 'active'
  `);
  const certs = Array.isArray(certsResult[0]) ? certsResult[0] : [];

  // Get utility data for energy/water intensity
  const utilityResult = await db.execute(sql`
    SELECT utilityType, SUM(CAST(consumption AS DECIMAL(15,2))) as total
    FROM utility_consumption 
    WHERE projectId = ${projectId}
    GROUP BY utilityType
  `);
  const utilities = Array.isArray(utilityResult[0]) ? utilityResult[0] : [];

  // Get deficiency count
  const defResult = await db.execute(sql`
    SELECT COUNT(*) as count FROM deficiencies d
    JOIN assessments a ON d.assessmentId = a.id
    JOIN assets ast ON a.assetId = ast.id
    WHERE ast.projectId = ${projectId}
  `);
  const defCount = (Array.isArray(defResult[0]) ? defResult[0] : [])[0] as any;

  // Get green upgrades
  const upgradesResult = await db.execute(sql`
    SELECT upgradeType, status FROM green_upgrades 
    WHERE projectId = ${projectId} AND status = 'completed'
  `);
  const upgrades = Array.isArray(upgradesResult[0]) ? upgradesResult[0] : [];

  // Calculate intensities
  const area = parseFloat(totalArea) || 10000;
  const electricityTotal = utilities.find((u: any) => u.utilityType === "electricity")?.total || 0;
  const waterTotal = utilities.find((u: any) => u.utilityType === "water")?.total || 0;

  return {
    projectId,
    projectName: project?.name || `Project ${projectId}`,
    buildingType: project?.buildingType,
    grossFloorArea: area,
    yearBuilt: project?.yearBuilt,
    energyUseIntensity: area > 0 ? (parseFloat(electricityTotal) / area) : undefined,
    renewablePercentage: upgrades.some((u: any) => u.upgradeType === "solar") ? 15 : 0,
    energyScore: esg?.energyScore ? parseFloat(esg.energyScore) : undefined,
    waterUseIntensity: area > 0 ? (parseFloat(waterTotal) / area) : undefined,
    waterScore: esg?.waterScore ? parseFloat(esg.waterScore) : undefined,
    wasteDiversionRate: 50, // Default assumption
    wasteScore: esg?.wasteScore ? parseFloat(esg.wasteScore) : undefined,
    emissionsScore: esg?.emissionsScore ? parseFloat(esg.emissionsScore) : undefined,
    hasSolarPanels: upgrades.some((u: any) => u.upgradeType === "solar"),
    hasBuildingAutomation: upgrades.some((u: any) => u.upgradeType === "building_automation"),
    existingCertifications: certs.map((c: any) => c.certificationType),
    deficiencyCount: parseInt(defCount?.count) || 0,
  };
}

async function generateAISuggestions(
  buildingData: BuildingPerformanceData
): Promise<LeedCreditSuggestion[]> {
  const prompt = `You are a LEED certification expert. Analyze the following building performance data and suggest which LEED v5 credits are most achievable.

Building Data:
- Name: ${buildingData.projectName}
- Type: ${buildingData.buildingType || "Commercial"}
- Floor Area: ${buildingData.grossFloorArea?.toLocaleString() || "Unknown"} sq ft
- Year Built: ${buildingData.yearBuilt || "Unknown"}
- Energy Score: ${buildingData.energyScore?.toFixed(1) || "N/A"}/100
- Water Score: ${buildingData.waterScore?.toFixed(1) || "N/A"}/100
- Waste Score: ${buildingData.wasteScore?.toFixed(1) || "N/A"}/100
- Emissions Score: ${buildingData.emissionsScore?.toFixed(1) || "N/A"}/100
- Renewable Energy: ${buildingData.renewablePercentage || 0}%
- Has Solar Panels: ${buildingData.hasSolarPanels ? "Yes" : "No"}
- Has Building Automation: ${buildingData.hasBuildingAutomation ? "Yes" : "No"}
- Existing Certifications: ${buildingData.existingCertifications?.join(", ") || "None"}
- Outstanding Deficiencies: ${buildingData.deficiencyCount || 0}

Based on this data, provide LEED credit suggestions in the following JSON format:
{
  "suggestions": [
    {
      "creditCode": "EAc1",
      "creditName": "Optimize Energy Performance",
      "category": "EA",
      "maxPoints": 18,
      "suggestedPoints": 8,
      "confidence": "high",
      "confidenceScore": 85,
      "rationale": "Building's energy score of 78 indicates good efficiency...",
      "requiredActions": ["Complete energy audit", "Implement recommended improvements"],
      "estimatedEffort": "medium",
      "estimatedCost": "$15,000-$30,000",
      "currentStatus": "achievable"
    }
  ]
}

Focus on the most achievable credits based on the building's current performance. Include 8-12 credit suggestions across different categories. Be realistic about confidence levels and required actions.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a LEED certification expert providing actionable credit recommendations based on building performance data. Always respond with valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    // Validate and enhance suggestions
    const suggestions: LeedCreditSuggestion[] = (parsed.suggestions || []).map((s: any) => ({
      creditCode: s.creditCode || "Unknown",
      creditName: s.creditName || "Unknown Credit",
      category: s.category || "EA",
      categoryName: LEED_CATEGORIES[s.category as keyof typeof LEED_CATEGORIES] || "Unknown",
      maxPoints: s.maxPoints || 0,
      suggestedPoints: Math.min(s.suggestedPoints || 0, s.maxPoints || 0),
      confidence: s.confidence || "medium",
      confidenceScore: s.confidenceScore || 50,
      rationale: s.rationale || "Based on current building performance data.",
      requiredActions: s.requiredActions || [],
      estimatedEffort: s.estimatedEffort || "medium",
      estimatedCost: s.estimatedCost,
      currentStatus: s.currentStatus || "partially_achievable",
      relevantMetrics: {
        energyScore: buildingData.energyScore,
        waterScore: buildingData.waterScore,
        wasteScore: buildingData.wasteScore,
        emissionsScore: buildingData.emissionsScore,
      },
    }));

    return suggestions;
  } catch (error) {
    console.error("Error generating LEED suggestions:", error);
    // Return default suggestions based on scores
    return generateDefaultSuggestions(buildingData);
  }
}

function generateDefaultSuggestions(buildingData: BuildingPerformanceData): LeedCreditSuggestion[] {
  const suggestions: LeedCreditSuggestion[] = [];

  // Energy credits based on energy score
  if (buildingData.energyScore && buildingData.energyScore >= 70) {
    suggestions.push({
      creditCode: "EAc1",
      creditName: "Optimize Energy Performance",
      category: "EA",
      categoryName: "Energy and Atmosphere",
      maxPoints: 18,
      suggestedPoints: Math.floor((buildingData.energyScore / 100) * 12),
      confidence: buildingData.energyScore >= 80 ? "high" : "medium",
      confidenceScore: buildingData.energyScore,
      rationale: `Energy score of ${buildingData.energyScore.toFixed(1)} indicates ${buildingData.energyScore >= 80 ? "excellent" : "good"} energy performance.`,
      requiredActions: ["Document current energy consumption", "Complete energy modeling"],
      estimatedEffort: "medium",
      currentStatus: buildingData.energyScore >= 80 ? "achievable" : "partially_achievable",
      relevantMetrics: { energyScore: buildingData.energyScore },
    });
  }

  // Water credits based on water score
  if (buildingData.waterScore && buildingData.waterScore >= 60) {
    suggestions.push({
      creditCode: "WEc1",
      creditName: "Indoor Water Use Reduction",
      category: "WE",
      categoryName: "Water Efficiency",
      maxPoints: 6,
      suggestedPoints: Math.floor((buildingData.waterScore / 100) * 4),
      confidence: buildingData.waterScore >= 75 ? "high" : "medium",
      confidenceScore: buildingData.waterScore,
      rationale: `Water score of ${buildingData.waterScore.toFixed(1)} shows efficient water use.`,
      requiredActions: ["Audit fixture efficiency", "Document water-saving measures"],
      estimatedEffort: "low",
      currentStatus: buildingData.waterScore >= 75 ? "achievable" : "partially_achievable",
      relevantMetrics: { waterScore: buildingData.waterScore },
    });
  }

  // Waste credits
  if (buildingData.wasteScore && buildingData.wasteScore >= 50) {
    suggestions.push({
      creditCode: "MRc5",
      creditName: "Construction and Demolition Waste Management",
      category: "MR",
      categoryName: "Materials and Resources",
      maxPoints: 2,
      suggestedPoints: buildingData.wasteScore >= 70 ? 2 : 1,
      confidence: buildingData.wasteScore >= 70 ? "high" : "medium",
      confidenceScore: buildingData.wasteScore,
      rationale: `Waste management score indicates ${buildingData.wasteScore >= 70 ? "strong" : "adequate"} diversion practices.`,
      requiredActions: ["Document waste diversion rates", "Implement recycling program"],
      estimatedEffort: "low",
      currentStatus: "achievable",
      relevantMetrics: { wasteScore: buildingData.wasteScore },
    });
  }

  // Solar/renewable credits
  if (buildingData.hasSolarPanels || (buildingData.renewablePercentage && buildingData.renewablePercentage > 0)) {
    suggestions.push({
      creditCode: "EAc2",
      creditName: "Renewable Energy",
      category: "EA",
      categoryName: "Energy and Atmosphere",
      maxPoints: 5,
      suggestedPoints: Math.min(Math.ceil((buildingData.renewablePercentage || 10) / 5), 5),
      confidence: "high",
      confidenceScore: 85,
      rationale: "On-site renewable energy generation qualifies for this credit.",
      requiredActions: ["Document solar capacity", "Calculate renewable percentage"],
      estimatedEffort: "low",
      currentStatus: "achievable",
      relevantMetrics: { renewablePercentage: buildingData.renewablePercentage },
    });
  }

  // Building automation credits
  if (buildingData.hasBuildingAutomation) {
    suggestions.push({
      creditCode: "EAc3",
      creditName: "Enhanced Commissioning",
      category: "EA",
      categoryName: "Energy and Atmosphere",
      maxPoints: 6,
      suggestedPoints: 4,
      confidence: "medium",
      confidenceScore: 70,
      rationale: "Building automation system enables monitoring-based commissioning.",
      requiredActions: ["Implement continuous monitoring", "Document commissioning activities"],
      estimatedEffort: "medium",
      currentStatus: "partially_achievable",
      relevantMetrics: { hasBuildingAutomation: true },
    });
  }

  // Always suggest IAQ credit
  suggestions.push({
    creditCode: "EQc1",
    creditName: "Enhanced Indoor Air Quality Strategies",
    category: "EQ",
    categoryName: "Indoor Environmental Quality",
    maxPoints: 2,
    suggestedPoints: 1,
    confidence: "medium",
    confidenceScore: 60,
    rationale: "Basic IAQ improvements are typically achievable with minimal investment.",
    requiredActions: ["Install entryway systems", "Upgrade air filtration"],
    estimatedEffort: "low",
    estimatedCost: "$5,000-$15,000",
    currentStatus: "partially_achievable",
    relevantMetrics: {},
  });

  return suggestions;
}

function getTopCategories(suggestions: LeedCreditSuggestion[]): string[] {
  const categoryPoints: Record<string, number> = {};
  
  for (const s of suggestions) {
    categoryPoints[s.categoryName] = (categoryPoints[s.categoryName] || 0) + s.suggestedPoints;
  }
  
  return Object.entries(categoryPoints)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);
}

export async function saveLeedSuggestions(
  projectId: number,
  suggestions: LeedCreditSuggestion[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get or create LEED credits in database
  for (const suggestion of suggestions) {
    // Check if credit exists
    const existingResult = await db.execute(sql`
      SELECT id FROM leed_credits WHERE creditCode = ${suggestion.creditCode}
    `);
    const existing = Array.isArray(existingResult[0]) ? existingResult[0] : [];
    
    let creditId: number;
    if (existing.length === 0) {
      // Insert credit
      const insertResult = await db.execute(sql`
        INSERT INTO leed_credits (creditCode, creditName, category, creditType, maxPoints, description)
        VALUES (${suggestion.creditCode}, ${suggestion.creditName}, ${suggestion.category}, 
                ${suggestion.maxPoints === 0 ? 'prerequisite' : 'credit'}, ${suggestion.maxPoints},
                ${suggestion.rationale})
      `);
      creditId = (insertResult[0] as any).insertId;
    } else {
      creditId = (existing[0] as any).id;
    }

    // Update or insert tracking record
    await db.execute(sql`
      INSERT INTO project_leed_tracking 
      (projectId, creditId, status, pointsTargeted, notes, createdAt, updatedAt)
      VALUES (
        ${projectId}, 
        ${creditId}, 
        'not_started',
        ${suggestion.suggestedPoints},
        ${JSON.stringify({
          confidence: suggestion.confidence,
          confidenceScore: suggestion.confidenceScore,
          requiredActions: suggestion.requiredActions,
          estimatedEffort: suggestion.estimatedEffort,
          estimatedCost: suggestion.estimatedCost,
        })},
        NOW(),
        NOW()
      )
      ON DUPLICATE KEY UPDATE
        pointsTargeted = ${suggestion.suggestedPoints},
        notes = ${JSON.stringify({
          confidence: suggestion.confidence,
          confidenceScore: suggestion.confidenceScore,
          requiredActions: suggestion.requiredActions,
          estimatedEffort: suggestion.estimatedEffort,
          estimatedCost: suggestion.estimatedCost,
        })},
        updatedAt = NOW()
    `);
  }
}
