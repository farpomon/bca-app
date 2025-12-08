/**
 * ML Prediction Service
 * 
 * Uses historical assessment data and AI to predict component deterioration,
 * failure timing, and remaining service life with confidence scoring.
 */

import { invokeLLM } from "./_core/llm";
import type { Assessment } from "../drizzle/schema";

export interface HistoricalDataPoint {
  assessmentDate: Date;
  condition: number; // Percentage
  age: number; // Years since installation
  observations?: string;
}

export interface MLPrediction {
  predictedFailureYear: number;
  predictedRemainingLife: number;
  currentConditionEstimate: number;
  confidenceScore: number;
  deteriorationRate: number; // Percentage per year
  insights: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
}

/**
 * Analyze historical assessment data to predict deterioration
 */
export async function predictDeteriorationML(
  componentCode: string,
  installYear: number,
  historicalData: HistoricalDataPoint[],
  currentYear: number = new Date().getFullYear()
): Promise<MLPrediction> {
  // Calculate deterioration rate from historical data
  const deteriorationRate = calculateDeteriorationRate(historicalData);

  // Estimate current condition based on trend
  const currentConditionEstimate = estimateCurrentCondition(
    historicalData,
    currentYear - installYear
  );

  // Predict failure year
  const predictedFailureYear = predictFailureYearFromTrend(
    installYear,
    currentConditionEstimate,
    deteriorationRate
  );

  const predictedRemainingLife = Math.max(0, predictedFailureYear - currentYear);

  // Calculate confidence based on data quality
  const confidenceScore = calculateMLConfidence(historicalData, currentYear);

  // Determine risk level
  const riskLevel = determineRiskLevel(
    predictedRemainingLife,
    currentConditionEstimate
  );

  // Generate AI insights
  const insights = await generateAIInsights(
    componentCode,
    historicalData,
    deteriorationRate,
    predictedRemainingLife
  );

  return {
    predictedFailureYear,
    predictedRemainingLife,
    currentConditionEstimate,
    confidenceScore,
    deteriorationRate,
    insights,
    riskLevel,
  };
}

/**
 * Calculate average deterioration rate from historical data
 */
function calculateDeteriorationRate(data: HistoricalDataPoint[]): number {
  if (data.length < 2) return 2.0; // Default 2% per year

  // Sort by age
  const sorted = [...data].sort((a, b) => a.age - b.age);

  // Calculate rate between each pair of points
  const rates: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const conditionChange = sorted[i].condition - sorted[i + 1].condition;
    const timeChange = sorted[i + 1].age - sorted[i].age;
    if (timeChange > 0) {
      rates.push(conditionChange / timeChange);
    }
  }

  // Return average rate
  if (rates.length === 0) return 2.0;
  const avgRate = rates.reduce((sum, r) => sum + r, 0) / rates.length;
  return Math.max(0.5, Math.min(10, avgRate)); // Clamp between 0.5% and 10% per year
}

/**
 * Estimate current condition based on historical trend
 */
function estimateCurrentCondition(
  data: HistoricalDataPoint[],
  currentAge: number
): number {
  if (data.length === 0) return 70; // Default estimate

  // Find most recent assessment
  const mostRecent = data.reduce((latest, current) =>
    current.age > latest.age ? current : latest
  );

  // If recent data exists (within 2 years), use it directly
  if (currentAge - mostRecent.age <= 2) {
    return mostRecent.condition;
  }

  // Otherwise, extrapolate using deterioration rate
  const rate = calculateDeteriorationRate(data);
  const yearsElapsed = currentAge - mostRecent.age;
  const estimatedCondition = mostRecent.condition - rate * yearsElapsed;

  return Math.max(0, Math.min(100, Math.round(estimatedCondition)));
}

/**
 * Predict failure year based on linear trend
 */
function predictFailureYearFromTrend(
  installYear: number,
  currentCondition: number,
  deteriorationRate: number,
  failureThreshold: number = 20
): number {
  const yearsToFailure = (currentCondition - failureThreshold) / deteriorationRate;
  const currentYear = new Date().getFullYear();
  return Math.round(currentYear + Math.max(0, yearsToFailure));
}

/**
 * Calculate ML confidence score based on data quality
 */
function calculateMLConfidence(
  data: HistoricalDataPoint[],
  currentYear: number
): number {
  if (data.length === 0) return 20; // Low confidence with no data

  // Factor 1: Number of data points (max 40 points)
  const dataPointScore = Math.min(40, (data.length / 5) * 40);

  // Factor 2: Data span (max 30 points)
  const sorted = [...data].sort((a, b) => a.age - b.age);
  const dataSpan = sorted[sorted.length - 1].age - sorted[0].age;
  const spanScore = Math.min(30, (dataSpan / 10) * 30);

  // Factor 3: Recency of data (max 30 points)
  const mostRecentAge = Math.max(...data.map((d) => d.age));
  const currentAge = currentYear - (currentYear - mostRecentAge); // Simplified
  const recencyScore = Math.max(0, 30 - mostRecentAge * 2);

  const totalScore = dataPointScore + spanScore + recencyScore;
  return Math.round(Math.min(100, totalScore));
}

/**
 * Determine risk level based on remaining life and condition
 */
export function determineRiskLevel(
  remainingLife: number,
  currentCondition: number
): "low" | "medium" | "high" | "critical" {
  if (remainingLife <= 1 || currentCondition <= 20) return "critical";
  if (remainingLife <= 3 || currentCondition <= 40) return "high";
  if (remainingLife <= 5 || currentCondition <= 60) return "medium";
  return "low";
}

/**
 * Generate AI-powered insights from historical data
 */
async function generateAIInsights(
  componentCode: string,
  historicalData: HistoricalDataPoint[],
  deteriorationRate: number,
  remainingLife: number
): Promise<string[]> {
  if (historicalData.length === 0) {
    return [
      "No historical data available for analysis",
      "Consider scheduling an initial assessment to establish baseline",
    ];
  }

  try {
    // Prepare data summary for LLM
    const dataSummary = historicalData
      .map(
        (d) =>
          `Age ${d.age} years: ${d.condition}% condition${d.observations ? ` - ${d.observations.substring(0, 100)}` : ""}`
      )
      .join("\n");

    const prompt = `You are a building condition assessment expert analyzing deterioration patterns.

Component: ${componentCode}
Historical Assessment Data:
${dataSummary}

Current Deterioration Rate: ${deteriorationRate.toFixed(2)}% per year
Predicted Remaining Life: ${remainingLife} years

Provide 3-5 concise, actionable insights about this component's condition trend and maintenance recommendations. Focus on:
1. Deterioration pattern analysis
2. Risk factors
3. Maintenance timing recommendations
4. Cost-saving opportunities

Format as a JSON array of strings, each insight being one sentence.`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a building condition assessment expert. Provide insights in JSON array format.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "insights",
          strict: true,
          schema: {
            type: "object",
            properties: {
              insights: {
                type: "array",
                items: { type: "string" },
                description: "Array of actionable insights",
              },
            },
            required: ["insights"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (content && typeof content === 'string') {
      const parsed = JSON.parse(content);
      return parsed.insights || [];
    }
  } catch (error) {
    console.error("Error generating AI insights:", error);
  }

  // Fallback insights
  return [
    `Component deteriorating at ${deteriorationRate.toFixed(1)}% per year`,
    `Estimated ${remainingLife} years of remaining service life`,
    remainingLife <= 5
      ? "Consider planning replacement or major rehabilitation soon"
      : "Monitor condition annually to track deterioration trend",
  ];
}

/**
 * Analyze patterns across multiple components
 */
export async function analyzeComponentPatterns(
  components: Array<{
    code: string;
    type: string;
    assessments: Assessment[];
  }>
): Promise<{
  acceleratedDeteriorationComponents: string[];
  stableComponents: string[];
  averageDeteriorationRate: number;
  insights: string[];
}> {
  const rates: number[] = [];
  const accelerated: string[] = [];
  const stable: string[] = [];

  for (const component of components) {
    const historicalData: HistoricalDataPoint[] = component.assessments.map((a) => ({
      assessmentDate: a.assessedAt,
      condition: a.conditionPercentage ? parseInt(a.conditionPercentage) : 70,
      age: new Date().getFullYear() - (a.reviewYear || new Date().getFullYear()),
    }));

    const rate = calculateDeteriorationRate(historicalData);
    rates.push(rate);

    if (rate > 4.0) {
      accelerated.push(component.code);
    } else if (rate < 1.5) {
      stable.push(component.code);
    }
  }

  const avgRate = rates.length > 0 ? rates.reduce((sum, r) => sum + r, 0) / rates.length : 2.0;

  const insights = [
    `Average deterioration rate across ${components.length} components: ${avgRate.toFixed(2)}% per year`,
    accelerated.length > 0
      ? `${accelerated.length} components showing accelerated deterioration`
      : "No components showing accelerated deterioration",
    stable.length > 0
      ? `${stable.length} components in stable condition`
      : "No components in stable condition",
  ];

  return {
    acceleratedDeteriorationComponents: accelerated,
    stableComponents: stable,
    averageDeteriorationRate: avgRate,
    insights,
  };
}
