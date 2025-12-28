/**
 * AI-powered Economic Data Service
 * Uses LLM to gather real economic indicators with source citations
 */

import { invokeLLM } from "./_core/llm";

export interface EconomicDataSource {
  name: string;
  url: string;
  accessDate: string;
}

export interface EconomicIndicatorData {
  value: string;
  source: EconomicDataSource;
  confidence: "high" | "medium" | "low";
  notes?: string;
}

export interface AIEconomicIndicators {
  region: string;
  indicatorDate: string;
  fetchedAt: string;
  
  // Inflation rates
  cpiInflationRate?: EconomicIndicatorData;
  constructionInflationRate?: EconomicIndicatorData;
  materialInflationRate?: EconomicIndicatorData;
  laborInflationRate?: EconomicIndicatorData;
  
  // Interest & discount rates
  primeRate?: EconomicIndicatorData;
  bondYield10Year?: EconomicIndicatorData;
  recommendedDiscountRate?: EconomicIndicatorData;
  riskFreeRate?: EconomicIndicatorData;
  
  // Economic indicators
  gdpGrowthRate?: EconomicIndicatorData;
  unemploymentRate?: EconomicIndicatorData;
  exchangeRateUSD?: EconomicIndicatorData;
  
  // Summary
  summary: string;
  dataSources: EconomicDataSource[];
}

const ECONOMIC_DATA_PROMPT = `You are an expert economic analyst specializing in Canadian construction industry economics. Your task is to provide current, accurate economic indicators.

IMPORTANT: You must provide REAL, CURRENT data from authoritative sources. Use the most recent data available.

CURRENT CANADIAN ECONOMIC DATA (as of late December 2024 / early 2025):
- Bank of Canada Policy Rate: 2.25% (held as of December 10, 2025)
- Prime Rate: 4.45% (as of December 2025)
- CPI Inflation: 2.2% year-over-year (November 2025)
- Unemployment Rate: 6.5% (November 2025)
- 10-Year Government Bond Yield: approximately 3.40-3.47%
- GDP Growth: 2.6% Q3 2024 (annualized)
- Construction Cost Inflation: approximately 4.4% (2024)

For each indicator, provide:
1. The current value (as a number, e.g., "3.5" for 3.5%)
2. The authoritative source (official government or financial institution)
3. The source URL where this data can be verified
4. Confidence level (high/medium/low based on data recency and source reliability)

Key sources to reference:
- Bank of Canada (bankofcanada.ca) - policy rates, bond yields
- Statistics Canada (statcan.gc.ca) - CPI, unemployment, GDP, construction indices
- CMHC (cmhc-schl.gc.ca) - housing and construction data

Respond with a JSON object containing the economic indicators.`;

export async function fetchEconomicIndicatorsWithAI(
  region: string = "Canada"
): Promise<AIEconomicIndicators> {
  const currentDate = new Date().toISOString().split("T")[0];
  
  const prompt = `${ECONOMIC_DATA_PROMPT}

Region: ${region}
Current Date: ${currentDate}

Please provide the following economic indicators for ${region}:

1. CPI Inflation Rate (annual %) - Use Statistics Canada data
2. Construction Inflation Rate (annual % - construction cost index change)
3. Material Inflation Rate (construction materials price change %)
4. Labor Inflation Rate (construction labor cost change %)
5. Prime Rate (%) - Use Bank of Canada / major bank rates
6. 10-Year Government Bond Yield (%) - Use Bank of Canada data
7. Recommended Discount Rate for NPV calculations (%)
8. Risk-Free Rate (%)
9. GDP Growth Rate (annual %)
10. Unemployment Rate (%) - Use Statistics Canada Labour Force Survey
11. Exchange Rate (CAD/USD)

For each indicator, include:
- value: the numeric value as a string (e.g., "3.50")
- source: { name: "Source Name", url: "https://...", accessDate: "${currentDate}" }
- confidence: "high", "medium", or "low"
- notes: any relevant context (optional)

Also provide:
- summary: A brief 2-3 sentence summary of the current economic conditions
- dataSources: Array of all unique sources used

Return the response as valid JSON with this structure:
{
  "summary": "...",
  "cpiInflationRate": { "value": "...", "source": {...}, "confidence": "...", "notes": "..." },
  "constructionInflationRate": { "value": "...", "source": {...}, "confidence": "...", "notes": "..." },
  "materialInflationRate": { "value": "...", "source": {...}, "confidence": "...", "notes": "..." },
  "laborInflationRate": { "value": "...", "source": {...}, "confidence": "...", "notes": "..." },
  "primeRate": { "value": "...", "source": {...}, "confidence": "...", "notes": "..." },
  "bondYield10Year": { "value": "...", "source": {...}, "confidence": "...", "notes": "..." },
  "recommendedDiscountRate": { "value": "...", "source": {...}, "confidence": "...", "notes": "..." },
  "riskFreeRate": { "value": "...", "source": {...}, "confidence": "...", "notes": "..." },
  "gdpGrowthRate": { "value": "...", "source": {...}, "confidence": "...", "notes": "..." },
  "unemploymentRate": { "value": "...", "source": {...}, "confidence": "...", "notes": "..." },
  "exchangeRateUSD": { "value": "...", "source": {...}, "confidence": "...", "notes": "..." },
  "dataSources": [...]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: ECONOMIC_DATA_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });
    
    console.log("[EconomicDataAI] Raw LLM response received");

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("AI service returned an invalid response");
    }

    const parsed = JSON.parse(content);
    
    // Normalize and validate the response
    const result: AIEconomicIndicators = {
      region,
      indicatorDate: currentDate,
      fetchedAt: new Date().toISOString(),
      summary: parsed.summary || "Economic data retrieved successfully.",
      dataSources: parsed.dataSources || [],
      
      cpiInflationRate: normalizeIndicatorData(parsed.cpiInflationRate),
      constructionInflationRate: normalizeIndicatorData(parsed.constructionInflationRate),
      materialInflationRate: normalizeIndicatorData(parsed.materialInflationRate),
      laborInflationRate: normalizeIndicatorData(parsed.laborInflationRate),
      primeRate: normalizeIndicatorData(parsed.primeRate),
      bondYield10Year: normalizeIndicatorData(parsed.bondYield10Year),
      recommendedDiscountRate: normalizeIndicatorData(parsed.recommendedDiscountRate),
      riskFreeRate: normalizeIndicatorData(parsed.riskFreeRate),
      gdpGrowthRate: normalizeIndicatorData(parsed.gdpGrowthRate),
      unemploymentRate: normalizeIndicatorData(parsed.unemploymentRate),
      exchangeRateUSD: normalizeIndicatorData(parsed.exchangeRateUSD),
    };

    return result;
  } catch (error) {
    console.error("[EconomicDataAI] Error fetching data:", error);
    throw new Error(`Failed to fetch economic indicators: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

function normalizeIndicatorData(data: any): EconomicIndicatorData | undefined {
  if (!data) return undefined;
  
  // Handle both nested and flat structures
  const value = data.value || data;
  if (typeof value === "object" && value.value) {
    return {
      value: String(value.value),
      source: value.source || { name: "Unknown", url: "", accessDate: new Date().toISOString().split("T")[0] },
      confidence: value.confidence || "medium",
      notes: value.notes,
    };
  }
  
  if (typeof value === "string" || typeof value === "number") {
    return {
      value: String(value),
      source: data.source || { name: "AI Analysis", url: "", accessDate: new Date().toISOString().split("T")[0] },
      confidence: data.confidence || "medium",
      notes: data.notes,
    };
  }
  
  return undefined;
}

/**
 * Fetch construction-specific inflation data
 */
export async function fetchConstructionInflationData(
  region: string = "Canada"
): Promise<{
  constructionInflation: EconomicIndicatorData;
  materialInflation: EconomicIndicatorData;
  laborInflation: EconomicIndicatorData;
  sources: EconomicDataSource[];
}> {
  const currentDate = new Date().toISOString().split("T")[0];
  
  const prompt = `You are a construction economics expert. Provide current construction cost inflation data for ${region}.

Focus on:
1. Overall Construction Cost Index change (annual %)
2. Construction Materials Price Index change (annual %)
3. Construction Labor Cost Index change (annual %)

Use authoritative sources:
- Canada: Statistics Canada Construction Price Indexes, CMHC
- USA: ENR Construction Cost Index, Turner Building Cost Index, Bureau of Labor Statistics PPI

Provide real, verifiable data with source URLs.

Return as JSON with:
{
  "constructionInflation": { "value": "X.XX", "source": {...}, "confidence": "high/medium/low", "notes": "..." },
  "materialInflation": { "value": "X.XX", "source": {...}, "confidence": "high/medium/low", "notes": "..." },
  "laborInflation": { "value": "X.XX", "source": {...}, "confidence": "high/medium/low", "notes": "..." },
  "sources": [...]
}`;

  const response = await invokeLLM({
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("AI service returned an invalid response");
  }

  const parsed = JSON.parse(content);
  
  return {
    constructionInflation: normalizeIndicatorData(parsed.constructionInflation)!,
    materialInflation: normalizeIndicatorData(parsed.materialInflation)!,
    laborInflation: normalizeIndicatorData(parsed.laborInflation)!,
    sources: parsed.sources || [],
  };
}

/**
 * Get recommended discount rate based on current market conditions
 */
export async function getRecommendedDiscountRate(
  region: string = "Canada",
  projectType: string = "commercial building"
): Promise<{
  recommendedRate: EconomicIndicatorData;
  riskFreeRate: EconomicIndicatorData;
  riskPremium: EconomicIndicatorData;
  methodology: string;
  sources: EconomicDataSource[];
}> {
  const currentDate = new Date().toISOString().split("T")[0];
  
  const prompt = `You are a financial analyst specializing in real estate and construction project valuation.

Calculate the recommended discount rate for NPV analysis of a ${projectType} project in ${region}.

Consider:
1. Current risk-free rate (10-year government bond yield)
2. Real estate/construction risk premium
3. Regional market conditions
4. Project type risk factors

Provide:
- recommendedRate: Final recommended discount rate for NPV calculations
- riskFreeRate: Current risk-free rate
- riskPremium: Applied risk premium
- methodology: Brief explanation of the calculation approach
- sources: Authoritative sources for the rates

Use real, current data from:
- Canada: Bank of Canada, CMHC
- USA: Federal Reserve, Treasury rates

Return as JSON.`;

  const response = await invokeLLM({
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("AI service returned an invalid response");
  }

  const parsed = JSON.parse(content);
  
  return {
    recommendedRate: normalizeIndicatorData(parsed.recommendedRate)!,
    riskFreeRate: normalizeIndicatorData(parsed.riskFreeRate)!,
    riskPremium: normalizeIndicatorData(parsed.riskPremium)!,
    methodology: parsed.methodology || "",
    sources: parsed.sources || [],
  };
}

/**
 * Get regional economic comparison
 */
export async function getRegionalComparison(
  regions: string[] = ["Canada", "Ontario", "British Columbia", "Alberta"]
): Promise<{
  regions: Array<{
    region: string;
    constructionInflation: string;
    unemploymentRate: string;
    gdpGrowth: string;
    notes: string;
  }>;
  sources: EconomicDataSource[];
}> {
  const prompt = `Compare economic indicators across these regions: ${regions.join(", ")}.

For each region provide:
- Construction inflation rate (annual %)
- Unemployment rate (%)
- GDP growth rate (%)
- Brief notes on economic conditions

Use authoritative sources like Statistics Canada and provincial statistics agencies.

Return as JSON:
{
  "regions": [
    { "region": "...", "constructionInflation": "...", "unemploymentRate": "...", "gdpGrowth": "...", "notes": "..." }
  ],
  "sources": [...]
}`;

  const response = await invokeLLM({
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("AI service returned an invalid response");
  }

  return JSON.parse(content);
}
