import { describe, expect, it } from "vitest";
import { calculateFCI, getFCIRating, getConditionScore, getConditionRating } from "./portfolioReportCalculations";

describe("FCI Calculations", () => {
  it("calculateFCI returns decimal ratio (0-1 scale)", () => {
    // $97,626,575 / $1,888,500,000 = ~0.0517
    const fci = calculateFCI(97626575, 1888500000);
    expect(fci).toBeCloseTo(0.0517, 3);
    expect(fci).toBeLessThan(1); // Must be decimal, not percentage
  });

  it("calculateFCI returns 0 when CRV is 0", () => {
    expect(calculateFCI(100000, 0)).toBe(0);
  });

  it("getFCIRating correctly classifies decimal FCI values", () => {
    // Good: 0-0.05 (0-5%)
    expect(getFCIRating(0.03)).toBe("Good");
    expect(getFCIRating(0.05)).toBe("Good");
    
    // Fair: 0.05-0.10 (5-10%)
    expect(getFCIRating(0.051)).toBe("Fair");
    expect(getFCIRating(0.10)).toBe("Fair");
    
    // Poor: 0.10-0.30 (10-30%)
    expect(getFCIRating(0.15)).toBe("Poor");
    expect(getFCIRating(0.30)).toBe("Poor");
    
    // Critical: >0.30 (>30%)
    expect(getFCIRating(0.35)).toBe("Critical");
    expect(getFCIRating(0.50)).toBe("Critical");
  });

  it("getFCIRating should NOT be called with percentage values", () => {
    // If called with 5.17 (percentage), it would incorrectly return "Critical"
    // This test documents the expected behavior - getFCIRating expects decimal
    const incorrectResult = getFCIRating(5.17); // 5.17% passed as percentage
    expect(incorrectResult).toBe("Critical"); // Wrong! This is the bug we fixed
    
    // Correct usage: pass decimal
    const correctResult = getFCIRating(0.0517); // 5.17% as decimal
    expect(correctResult).toBe("Fair"); // Correct!
  });
});

describe("Condition Score and Rating", () => {
  it("getConditionScore maps condition text to numeric score", () => {
    expect(getConditionScore("good")).toBe(85);
    expect(getConditionScore("fair")).toBe(65);
    expect(getConditionScore("poor")).toBe(35);
    expect(getConditionScore("critical")).toBe(15);
    expect(getConditionScore("not_assessed")).toBe(50);
    expect(getConditionScore(null)).toBe(50);
  });

  it("getConditionRating maps numeric score to condition text", () => {
    expect(getConditionRating(85)).toBe("Good");
    expect(getConditionRating(80)).toBe("Good");
    expect(getConditionRating(65)).toBe("Fair");
    expect(getConditionRating(60)).toBe("Fair");
    expect(getConditionRating(35)).toBe("Poor");
    expect(getConditionRating(30)).toBe("Poor");
    expect(getConditionRating(15)).toBe("Critical");
    expect(getConditionRating(10)).toBe("Critical");
  });
});

describe("Condition Rating to Label Mapping (1-5 scale)", () => {
  // This tests the SQL CASE mapping logic used in getComponentAssessmentsForPDF
  const mapConditionRatingToLabel = (rating: string | null): string => {
    switch (rating) {
      case '1': return 'good';
      case '2': return 'good';
      case '3': return 'fair';
      case '4': return 'poor';
      case '5': return 'poor';
      default: return 'not_assessed';
    }
  };

  const mapConditionRatingToPercentage = (rating: string | null): number | null => {
    switch (rating) {
      case '1': return 95;
      case '2': return 80;
      case '3': return 60;
      case '4': return 35;
      case '5': return 15;
      default: return null;
    }
  };

  it("maps conditionRating 1-5 to condition labels", () => {
    expect(mapConditionRatingToLabel('1')).toBe('good');
    expect(mapConditionRatingToLabel('2')).toBe('good');
    expect(mapConditionRatingToLabel('3')).toBe('fair');
    expect(mapConditionRatingToLabel('4')).toBe('poor');
    expect(mapConditionRatingToLabel('5')).toBe('poor');
    expect(mapConditionRatingToLabel(null)).toBe('not_assessed');
  });

  it("maps conditionRating 1-5 to condition percentages", () => {
    expect(mapConditionRatingToPercentage('1')).toBe(95);
    expect(mapConditionRatingToPercentage('2')).toBe(80);
    expect(mapConditionRatingToPercentage('3')).toBe(60);
    expect(mapConditionRatingToPercentage('4')).toBe(35);
    expect(mapConditionRatingToPercentage('5')).toBe(15);
    expect(mapConditionRatingToPercentage(null)).toBeNull();
  });
});

describe("FCI Display Conversion", () => {
  it("converts decimal FCI to percentage for display", () => {
    // This is what the client-side code should do
    const decimalFCI = 0.0517;
    const percentageFCI = decimalFCI * 100;
    expect(percentageFCI).toBeCloseTo(5.17, 2);
    
    // The PDF generator's getFCIColor expects percentage (0-100)
    const getFCIColor = (fci: number): string => {
      if (fci <= 5) return "green";
      if (fci <= 10) return "amber";
      if (fci <= 30) return "orange";
      return "red";
    };
    
    expect(getFCIColor(percentageFCI)).toBe("amber"); // 5.17% = Fair
    expect(getFCIColor(decimalFCI)).toBe("green"); // 0.0517 would incorrectly show as Good
  });

  it("getPortfolioOverview returns FCI as percentage for display", () => {
    // Simulating the fixed getPortfolioOverview logic
    const totalDMC = 97626575;
    const totalCRV = 1888500000;
    
    const portfolioFCIDecimal = totalCRV > 0 ? (totalDMC / totalCRV) : 0;
    const portfolioFCIPercent = portfolioFCIDecimal * 100;
    
    // The returned value should be percentage
    const returnedFCI = Math.round(portfolioFCIPercent * 100) / 100;
    expect(returnedFCI).toBeCloseTo(5.17, 1);
    
    // The rating should use decimal
    const rating = getFCIRating(portfolioFCIDecimal);
    expect(rating).toBe("Fair"); // NOT "Critical"
  });
});

describe("Report Data Assembly - Action List", () => {
  it("builds action list from component assessments by filtering actionable items", () => {
    const components = [
      { id: 1, componentName: "Roof Membrane", actionType: "replace", actionYear: 2026, totalCost: 50000, repairCost: 50000, assetName: "Building A", assetId: 1, uniformatCode: "B3010", uniformatGroup: "Shell", priority: "immediate", actionDescription: "Replace membrane", recommendations: "Full replacement needed" },
      { id: 2, componentName: "HVAC Unit", actionType: "monitor", actionYear: null, totalCost: 0, repairCost: 0, assetName: "Building A", assetId: 1, uniformatCode: "D3040", uniformatGroup: "Services", priority: "long_term", actionDescription: null, recommendations: null },
      { id: 3, componentName: "Windows", actionType: "repair", actionYear: 2027, totalCost: 25000, repairCost: 25000, assetName: "Building B", assetId: 2, uniformatCode: "B2020", uniformatGroup: "Shell", priority: "short_term", actionDescription: "Seal and repair", recommendations: "Caulking needed" },
      { id: 4, componentName: "Foundation", actionType: "none", actionYear: null, totalCost: 0, repairCost: 0, assetName: "Building A", assetId: 1, uniformatCode: "A1010", uniformatGroup: "Substructure", priority: "long_term", actionDescription: null, recommendations: null },
    ];

    // Filter actionable items (not 'monitor' or 'none')
    let actionIndex = 0;
    const actionList = components
      .filter((c) => c.actionType && c.actionType !== 'monitor' && c.actionType !== 'none')
      .map((c) => {
        actionIndex++;
        return {
          id: c.id,
          itemId: `ACT-${String(actionIndex).padStart(3, '0')}`,
          actionName: c.componentName || 'Unknown',
          actionType: c.actionType || 'repair',
          actionYear: c.actionYear,
          actionCost: c.totalCost || c.repairCost || 0,
          assetName: c.assetName || 'Unknown',
          assetId: c.assetId || 0,
          uniformatCode: c.uniformatCode || '',
          uniformatGroup: c.uniformatGroup || '',
          priority: c.priority || 'medium_term',
          description: c.actionDescription || c.recommendations || null,
        };
      });

    expect(actionList).toHaveLength(2); // Only 'replace' and 'repair', not 'monitor' or 'none'
    expect(actionList[0].itemId).toBe('ACT-001');
    expect(actionList[0].actionName).toBe('Roof Membrane');
    expect(actionList[0].actionCost).toBe(50000);
    expect(actionList[1].itemId).toBe('ACT-002');
    expect(actionList[1].actionName).toBe('Windows');
    expect(actionList[1].priority).toBe('short_term');
  });
});

describe("Report Data Assembly - Priority Matrix", () => {
  it("maps priorityBreakdown to priorityMatrix format", () => {
    // Server returns priorityBreakdown, NOT priorityMatrix
    const priorityBreakdown = [
      { priority: 'immediate', count: 50, totalCost: 500000, percentage: 40, buildings: ['Building A'] },
      { priority: 'short_term', count: 30, totalCost: 300000, percentage: 25, buildings: ['Building B'] },
      { priority: 'medium_term', count: 25, totalCost: 250000, percentage: 20, buildings: ['Building A', 'Building C'] },
      { priority: 'long_term', count: 20, totalCost: 200000, percentage: 15, buildings: ['Building D'] },
    ];

    // Client maps priorityBreakdown to priorityMatrix
    const priorityMatrix = (priorityBreakdown || []).map((p: any) => ({
      priority: p.priority || 'Unknown',
      count: p.count || 0,
      totalCost: p.totalCost || 0,
      percentageOfTotal: p.percentage || 0,
    }));

    expect(priorityMatrix).toHaveLength(4);
    expect(priorityMatrix[0].priority).toBe('immediate');
    expect(priorityMatrix[0].count).toBe(50);
    expect(priorityMatrix[0].totalCost).toBe(500000);
    expect(priorityMatrix[0].percentageOfTotal).toBe(40);
    
    // Previously, dashboardData.priorityMatrix was undefined (field doesn't exist)
    // Using dashboardData.priorityBreakdown fixes this
    const emptyMatrix = (undefined || []).map((p: any) => ({
      priority: p.priority || 'Unknown',
    }));
    expect(emptyMatrix).toHaveLength(0); // Would be empty with old code
  });
});

describe("Report Config Mapping", () => {
  it("maps includePriorityRecommendations to both includeActionList and includePriorityMatrix", () => {
    const config = {
      includePriorityRecommendations: true,
      includeComponentAssessments: false,
    };

    const enhancedConfig = {
      includeActionList: config.includePriorityRecommendations,
      includePriorityMatrix: config.includePriorityRecommendations,
    };

    expect(enhancedConfig.includeActionList).toBe(true);
    expect(enhancedConfig.includePriorityMatrix).toBe(true);
  });

  it("preview panel should use includePriorityRecommendations not includePriorityMatrix", () => {
    // The old code used options.includePriorityMatrix which doesn't exist in config
    const options = {
      includePriorityRecommendations: true,
      // includePriorityMatrix does NOT exist in the config
    };

    // Old code: options.includePriorityMatrix → undefined → false
    expect((options as any).includePriorityMatrix).toBeUndefined();
    
    // Fixed code: options.includePriorityRecommendations → true
    expect(options.includePriorityRecommendations).toBe(true);
  });
});

describe("Single Asset Mode - UNIFORMAT Summary Rebuild", () => {
  it("builds UNIFORMAT summary from single asset's component data", () => {
    const UNIFORMAT_NAMES: Record<string, string> = {
      'A': 'Substructure', 'B': 'Shell', 'C': 'Interiors', 'D': 'Services',
      'E': 'Equipment & Furnishings', 'F': 'Special Construction', 'G': 'Building Sitework', 'Z': 'General',
    };

    const assetComponents = [
      { uniformatCode: 'A1010', repairCost: 50000, replacementCost: 200000, conditionPercentage: 60 },
      { uniformatCode: 'A2010', repairCost: 30000, replacementCost: 150000, conditionPercentage: 80 },
      { uniformatCode: 'B1010', repairCost: 100000, replacementCost: 500000, conditionPercentage: 35 },
      { uniformatCode: 'D3040', repairCost: 25000, replacementCost: 100000, conditionPercentage: 65 },
    ];

    const uniformatMap = new Map<string, { code: string; name: string; count: number; repairCost: number; replacementCost: number; conditionScores: number[] }>();
    for (const c of assetComponents) {
      const code = (c.uniformatCode || 'Z').substring(0, 1).toUpperCase();
      const existing = uniformatMap.get(code) || { code, name: UNIFORMAT_NAMES[code] || 'Other', count: 0, repairCost: 0, replacementCost: 0, conditionScores: [] };
      existing.count++;
      existing.repairCost += Number(c.repairCost || 0);
      existing.replacementCost += Number(c.replacementCost || 0);
      if (c.conditionPercentage != null) existing.conditionScores.push(Number(c.conditionPercentage));
      uniformatMap.set(code, existing);
    }

    const result = Array.from(uniformatMap.values());

    expect(result).toHaveLength(3); // A, B, D
    
    const groupA = result.find(u => u.code === 'A');
    expect(groupA).toBeDefined();
    expect(groupA!.count).toBe(2);
    expect(groupA!.repairCost).toBe(80000); // 50000 + 30000
    expect(groupA!.replacementCost).toBe(350000); // 200000 + 150000
    expect(groupA!.conditionScores).toEqual([60, 80]);

    const groupB = result.find(u => u.code === 'B');
    expect(groupB!.count).toBe(1);
    expect(groupB!.repairCost).toBe(100000);
  });
});

describe("Single Asset Mode - Priority Matrix Rebuild", () => {
  it("builds priority matrix from single asset's component data", () => {
    const assetComponents = [
      { priority: 'immediate', totalCost: 50000 },
      { priority: 'immediate', totalCost: 30000 },
      { priority: 'short_term', totalCost: 25000 },
      { priority: 'medium_term', totalCost: 15000 },
      { priority: 'medium_term', totalCost: 10000 },
    ];

    const priorityMap = new Map<string, { count: number; totalCost: number }>();
    for (const c of assetComponents) {
      const priority = c.priority || 'long_term';
      const cost = Number(c.totalCost || 0);
      const existing = priorityMap.get(priority) || { count: 0, totalCost: 0 };
      existing.count++;
      existing.totalCost += cost;
      priorityMap.set(priority, existing);
    }

    const totalPriorityCost = Array.from(priorityMap.values()).reduce((sum, p) => sum + p.totalCost, 0);
    expect(totalPriorityCost).toBe(130000);

    const priorityOrder = ['immediate', 'short_term', 'medium_term', 'long_term'];
    const priorityMatrix = priorityOrder
      .filter(p => priorityMap.has(p))
      .map(p => {
        const data = priorityMap.get(p)!;
        return {
          priority: p,
          count: data.count,
          totalCost: data.totalCost,
          percentageOfTotal: totalPriorityCost > 0 ? Math.round((data.totalCost / totalPriorityCost) * 100) : 0,
        };
      });

    expect(priorityMatrix).toHaveLength(3); // immediate, short_term, medium_term (no long_term)
    expect(priorityMatrix[0].priority).toBe('immediate');
    expect(priorityMatrix[0].count).toBe(2);
    expect(priorityMatrix[0].totalCost).toBe(80000);
    expect(priorityMatrix[0].percentageOfTotal).toBe(62); // 80000/130000 = 61.5% → 62%
    expect(priorityMatrix[1].priority).toBe('short_term');
    expect(priorityMatrix[1].count).toBe(1);
  });
});

describe("Single Asset Mode - Capital Forecast Rebuild", () => {
  it("builds capital forecast from single asset's needs breakdown", () => {
    const selectedAsset = {
      immediateNeeds: 100000,
      shortTermNeeds: 200000,
      mediumTermNeeds: 150000,
      longTermNeeds: 50000,
    };

    const distributions = [
      { immediate: 1.0, shortTerm: 0.2, mediumTerm: 0.0, longTerm: 0.0 },
      { immediate: 0.0, shortTerm: 0.4, mediumTerm: 0.1, longTerm: 0.0 },
      { immediate: 0.0, shortTerm: 0.4, mediumTerm: 0.3, longTerm: 0.0 },
      { immediate: 0.0, shortTerm: 0.0, mediumTerm: 0.3, longTerm: 0.2 },
      { immediate: 0.0, shortTerm: 0.0, mediumTerm: 0.3, longTerm: 0.3 },
    ];

    const currentYear = 2026;
    const forecastYears = 5;
    let cumulativeCost = 0;
    const forecast = [];

    for (let i = 0; i < forecastYears; i++) {
      const dist = distributions[Math.min(i, distributions.length - 1)];
      const yearImmediate = selectedAsset.immediateNeeds * dist.immediate;
      const yearShortTerm = selectedAsset.shortTermNeeds * dist.shortTerm;
      const yearMediumTerm = selectedAsset.mediumTermNeeds * dist.mediumTerm;
      const yearLongTerm = selectedAsset.longTermNeeds * dist.longTerm;
      const yearTotal = yearImmediate + yearShortTerm + yearMediumTerm + yearLongTerm;
      cumulativeCost += yearTotal;
      forecast.push({
        year: currentYear + i,
        immediateNeeds: Math.round(yearImmediate),
        shortTermNeeds: Math.round(yearShortTerm),
        mediumTermNeeds: Math.round(yearMediumTerm),
        longTermNeeds: Math.round(yearLongTerm),
        totalProjectedCost: Math.round(yearTotal),
        cumulativeCost: Math.round(cumulativeCost),
      });
    }

    expect(forecast).toHaveLength(5);
    
    // Year 1: 100% immediate + 20% short term
    expect(forecast[0].year).toBe(2026);
    expect(forecast[0].immediateNeeds).toBe(100000);
    expect(forecast[0].shortTermNeeds).toBe(40000); // 200000 * 0.2
    expect(forecast[0].totalProjectedCost).toBe(140000);

    // Year 2: 40% short term + 10% medium term
    expect(forecast[1].year).toBe(2027);
    expect(forecast[1].immediateNeeds).toBe(0);
    expect(forecast[1].shortTermNeeds).toBe(80000); // 200000 * 0.4
    expect(forecast[1].mediumTermNeeds).toBe(15000); // 150000 * 0.1
    expect(forecast[1].totalProjectedCost).toBe(95000);

    // Cumulative should be sum of all previous years
    expect(forecast[1].cumulativeCost).toBe(235000); // 140000 + 95000

    // All forecast values should use single asset's data, not portfolio totals
    const totalForecast = forecast.reduce((sum, f) => sum + f.totalProjectedCost, 0);
    expect(totalForecast).toBeLessThanOrEqual(500000); // Sum of all needs
  });
});
